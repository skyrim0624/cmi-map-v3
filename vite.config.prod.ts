import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import { rmSync } from "fs";

import { VitePWA } from "vite-plugin-pwa";

const CORE_PRECACHE_ASSETS = [
  "apple-touch-icon.png",
  "favicon.png",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "brand/page-curl-corner.png",
  "brand/cmi-inn-entry.png",
];

const DEBUG_PUBLIC_DIRS = [
  ".lint",
  "docs",
  "graphify-out",
  "playgrounds",
  "prototypes",
];

const removeDebugPublicAssets = () => ({
  name: "remove-debug-public-assets",
  apply: "build" as const,
  closeBundle() {
    DEBUG_PUBLIC_DIRS.forEach((dir) => {
      rmSync(path.resolve(__dirname, "dist", dir), { recursive: true, force: true });
    });
  },
});

// 生产构建专用配置 — 不含 MiaoDa 开发插件
export default defineConfig({
  plugins: [
    removeDebugPublicAssets(),
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: CORE_PRECACHE_ASSETS,
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico}"],
        globIgnores: [
          "**/docs/**",
          "**/generated/**",
          "**/graphify-out/**",
          "**/playgrounds/**",
          "**/prototypes/**",
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && request.destination === "image",
            handler: "NetworkFirst",
            options: {
              cacheName: "cmi-map-runtime-images-v2",
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 180,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: "CMI Map",
        short_name: "CMI Map",
        description: "清迈社区游牧生活地图",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("leaflet")) return "map-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@radix-ui")) return "radix-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          return "vendor";
        },
      },
    },
  },
});
