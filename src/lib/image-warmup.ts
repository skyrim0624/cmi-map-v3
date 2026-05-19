const warmedImageUrls = new Set<string>();

type WarmupOptions = {
  batchSize?: number;
  delayMs?: number;
};

type BrowserWindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
};

const uniqueUrls = (urls: string[]) =>
  Array.from(new Set(urls.filter(Boolean)));

const scheduleWhenIdle = (callback: () => void, delayMs = 250) => {
  if (typeof window === "undefined") return;

  const browserWindow = window as BrowserWindowWithIdleCallback;

  if (typeof browserWindow.requestIdleCallback === "function") {
    browserWindow.requestIdleCallback(callback, { timeout: Math.max(delayMs, 1000) });
    return;
  }

  browserWindow.setTimeout(callback, delayMs);
};

export const preloadImages = (urls: string[]) => {
  if (typeof document === "undefined") return;

  uniqueUrls(urls).forEach((href) => {
    const hasExistingPreload = Array.from(
      document.head.querySelectorAll('link[rel="preload"][as="image"]')
    ).some(link => link.getAttribute("href") === href);

    if (!hasExistingPreload) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
    }

    if (warmedImageUrls.has(href)) return;
    warmedImageUrls.add(href);

    const image = new Image();
    image.decoding = "async";
    image.src = href;
  });
};

export const warmupImages = (urls: string[], options: WarmupOptions = {}) => {
  if (typeof window === "undefined") return;

  const batchSize = options.batchSize ?? 6;
  const delayMs = options.delayMs ?? 120;
  const pendingUrls = uniqueUrls(urls).filter(url => !warmedImageUrls.has(url));

  if (pendingUrls.length === 0) return;

  const warmNextBatch = (startIndex: number) => {
    pendingUrls.slice(startIndex, startIndex + batchSize).forEach((url) => {
      warmedImageUrls.add(url);
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    });

    const nextIndex = startIndex + batchSize;
    if (nextIndex < pendingUrls.length) {
      window.setTimeout(() => warmNextBatch(nextIndex), delayMs);
    }
  };

  scheduleWhenIdle(() => warmNextBatch(0), delayMs);
};
