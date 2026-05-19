import { useEffect, useRef, useState } from 'react';

const PAGE_CURL_OPEN_DELAY_MS = 520;

export function PageCurlMapEntry({ onClick }: { onClick: () => void }) {
  const [isOpening, setIsOpening] = useState(false);
  const openTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  const handleOpen = () => {
    if (isOpening) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClick();
      return;
    }

    setIsOpening(true);
    openTimerRef.current = window.setTimeout(onClick, PAGE_CURL_OPEN_DELAY_MS);
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={`page-curl-entry absolute right-0 top-0 z-40 h-20 w-20 touch-manipulation overflow-visible sm:h-24 sm:w-24 ${isOpening ? 'is-opening' : ''}`}
      aria-label="打开完整地图"
    >
      <img
        className="page-curl-generated-image"
        src="/brand/page-curl-corner.png"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
      />
      <span className="sr-only">打开完整地图</span>
    </button>
  );
}
