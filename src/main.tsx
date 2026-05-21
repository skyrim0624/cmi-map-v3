import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

const STALE_BUILD_RELOAD_KEY = "cmi-map:stale-build-reload-path";

const isStaleBuildError = (error: unknown) => {
  const message = String(
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? (error as { message?: unknown }).message
        : error
  );

  return [
    "Failed to fetch dynamically imported module",
    "Importing a module script failed",
    "error loading dynamically imported module",
    "ChunkLoadError",
    "Loading chunk",
  ].some(fragment => message.includes(fragment));
};

const recoverFromStaleBuild = (error: unknown) => {
  if (!isStaleBuildError(error)) return;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (sessionStorage.getItem(STALE_BUILD_RELOAD_KEY) === currentPath) return;

  // NOTE: 用户可能在我们部署时还停留在旧 JS 里。旧代码跳转懒加载新页面时会白屏，刷新一次即可拿到最新构建。
  sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, currentPath);
  window.location.reload();
};

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromStaleBuild(event.payload);
});

window.addEventListener("unhandledrejection", (event) => {
  recoverFromStaleBuild(event.reason);
});

window.addEventListener("error", (event) => {
  recoverFromStaleBuild(event.error || event.message);
});

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });

  if ("caches" in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
