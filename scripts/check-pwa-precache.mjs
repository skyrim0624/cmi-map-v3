#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIST_DIR = fileURLToPath(new URL("../dist/", import.meta.url));
const SERVICE_WORKER_PATH = path.join(DIST_DIR, "sw.js");
const MAX_PRECACHE_BYTES = 8 * 1024 * 1024;
const ALLOWED_PRECACHE_IMAGES = new Set([
  "apple-touch-icon.png",
  "favicon.png",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "brand/page-curl-corner.png",
  "brand/cmi-inn-entry.png",
]);
const BLOCKED_PATH_PARTS = [
  "/.lint/",
  "/docs/",
  "/generated/",
  "/graphify-out/",
  "/playgrounds/",
  "/prototypes/",
];
const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const BLOCKED_DIST_DIR_NAMES = new Set([
  ".lint",
  "docs",
  "generated",
  "graphify-out",
  "playgrounds",
  "prototypes",
]);

if (!existsSync(SERVICE_WORKER_PATH)) {
  throw new Error("缺少 dist/sw.js，无法检查 PWA 预缓存。");
}

const serviceWorkerSource = readFileSync(SERVICE_WORKER_PATH, "utf8");
const precacheUrls = Array.from(
  serviceWorkerSource.matchAll(/url:"([^"]+)"/g),
  match => match[1]
);

const getDistFileSize = (url) => {
  const pathname = url.split("?")[0];
  const filePath = path.join(DIST_DIR, pathname);
  return existsSync(filePath) ? statSync(filePath).size : 0;
};

const precacheBytes = precacheUrls.reduce(
  (total, url) => total + getDistFileSize(url),
  0
);
const unexpectedImages = precacheUrls.filter(
  url => IMAGE_FILE_PATTERN.test(url) && !ALLOWED_PRECACHE_IMAGES.has(url)
);
const blockedUrls = precacheUrls.filter(url =>
  BLOCKED_PATH_PARTS.some(part => `/${url}`.includes(part))
);

const findBlockedDistDirs = (dir, relativeDir = "") => {
  if (!existsSync(dir)) return [];

  const blockedDirs = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const relativePath = path.join(relativeDir, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (BLOCKED_DIST_DIR_NAMES.has(entry.name)) {
      blockedDirs.push(relativePath);
      continue;
    }

    blockedDirs.push(...findBlockedDistDirs(fullPath, relativePath));
  }

  return blockedDirs;
};

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;
const failures = [];

if (precacheBytes > MAX_PRECACHE_BYTES) {
  failures.push(
    `precache 体积 ${formatMB(precacheBytes)} 超过 ${formatMB(MAX_PRECACHE_BYTES)}`
  );
}

if (unexpectedImages.length > 0) {
  failures.push(`以下图片不该进入 precache：${unexpectedImages.join(", ")}`);
}

if (blockedUrls.length > 0) {
  failures.push(`以下调试/过程目录不该进入 precache：${blockedUrls.join(", ")}`);
}

const blockedDistDirs = findBlockedDistDirs(DIST_DIR);
if (blockedDistDirs.length > 0) {
  failures.push(`以下调试/过程目录不该进入 dist：${blockedDistDirs.join(", ")}`);
}

if (failures.length > 0) {
  console.error("PWA precache 检查失败：");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `PWA precache 检查通过：${precacheUrls.length} 项，${formatMB(precacheBytes)}。`
);
