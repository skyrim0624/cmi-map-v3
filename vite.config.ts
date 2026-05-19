import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { defineConfig } from "vite";
import { miaodaDevPlugin } from "miaoda-sc-plugin";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname);
const CODEX_ROUTE_MODEL = process.env.CMI_CODEX_BRIDGE_MODEL || "gpt-5.3-codex-spark";
const CODEX_ROUTE_TIMEOUT_MS = Number(process.env.CMI_CODEX_BRIDGE_TIMEOUT_MS || 20000);

const readJsonBody = (request: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    let rawBody = "";

    request.setEncoding("utf8");
    request.on("data", chunk => {
      rawBody += chunk;

      if (rawBody.length > 300_000) {
        reject(new Error("request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

const writeJson = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const parseJsonFromCodex = (rawValue: string) => {
  const value = rawValue.trim();

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("codex returned non-json output");
    }

    return JSON.parse(value.slice(start, end + 1)) as Record<string, unknown>;
  }
};

const buildRouteDraftPrompt = (payload: unknown) => [
  "你是 CMI Map 的路线生成器。",
  "任务：根据用户输入，从 payload.candidates 和 payload.events 中选择 2-4 站，生成一条清迈路线草案。",
  "硬性规则：",
  "1. 只能使用候选地点和候选活动里的名称，不要编造新地点。",
  "2. 优先满足 startArea、theme、preferenceText、budget、transport、mustVisit、avoidText。",
  "3. 如果资料不足，把需要确认的点写进 uncertainty，不要假装已经确认。",
  "4. 每个 step 的 placeName、eventTitle、caveat 不适用时用空字符串。",
  "5. 输出必须是中文 JSON，严格符合 schema；provider 固定为 codex-local。",
  "payload:",
  JSON.stringify(payload),
].join("\n");

const runCodexRouteDraft = async (payload: unknown) => {
  const codexBin = process.env.CMI_CODEX_BIN || "codex";
  const schemaPath = path.join(PROJECT_ROOT, "scripts/cmi-route-draft.schema.json");
  const tempDir = await mkdtemp(path.join(tmpdir(), "cmi-route-"));
  const outputPath = path.join(tempDir, `${randomUUID()}.json`);
  const prompt = buildRouteDraftPrompt(payload);

  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        codexBin,
        [
          "exec",
          "-m",
          CODEX_ROUTE_MODEL,
          "-c",
          'model_reasoning_effort="low"',
          "--disable",
          "plugins",
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--ephemeral",
          "--ignore-user-config",
          "--ignore-rules",
          "--output-schema",
          schemaPath,
          "-o",
          outputPath,
          "-C",
          PROJECT_ROOT,
          "-",
        ],
        {
          cwd: PROJECT_ROOT,
          env: {
            ...process.env,
            CI: "1",
          },
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let stdoutBuffer = "";
      let stderrBuffer = "";
      let settled = false;

      const finish = (error: Error | null, output = "") => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        if (error) {
          reject(error);
          return;
        }

        resolve(output);
      };

      const timeoutId = setTimeout(() => {
        child.kill("SIGTERM");
        finish(new Error(`codex bridge timeout after ${CODEX_ROUTE_TIMEOUT_MS}ms`));
      }, CODEX_ROUTE_TIMEOUT_MS);

      child.stdout.on("data", chunk => {
        stdoutBuffer += chunk.toString();
      });
      child.stderr.on("data", chunk => {
        stderrBuffer += chunk.toString();
      });
      child.on("error", error => finish(error));
      child.on("close", code => {
        if (code !== 0) {
          console.warn("[cmi-ai-route-bridge]", stderrBuffer || stdoutBuffer);
          finish(new Error(`codex exited ${code}`));
          return;
        }

        finish(null, stdoutBuffer);
      });

      child.stdin.write(prompt);
      child.stdin.end();
    });

    const outputFile = await readFile(outputPath, "utf8").catch(() => "");
    const route = parseJsonFromCodex(outputFile || stdout);

    if (!Array.isArray(route.steps) || route.steps.length === 0) {
      throw new Error("codex returned empty route steps");
    }

    return {
      ...route,
      provider: "codex-local",
    };
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};

// NOTE: 这个桥只服务本地产品验证，线上正式版后续切到 API provider。
const cmiAiRouteBridgePlugin = () => ({
  name: "cmi-ai-route-bridge",
  configureServer(server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse) => void) => void } }) {
    server.middlewares.use("/api/ai-route-draft", async (request, response) => {
      if (request.method !== "POST") {
        writeJson(response, 405, { error: "method not allowed" });
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const route = await runCodexRouteDraft(payload);

        writeJson(response, 200, {
          route,
          model: CODEX_ROUTE_MODEL,
        });
      } catch (error) {
        writeJson(response, 504, {
          error: error instanceof Error ? error.message : "codex bridge failed",
          model: CODEX_ROUTE_MODEL,
        });
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    cmiAiRouteBridgePlugin(),
    react(),
    miaodaDevPlugin(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
