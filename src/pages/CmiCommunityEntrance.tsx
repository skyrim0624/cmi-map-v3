import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Home,
  Map as MapIcon,
  MapPin,
  Repeat2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import {
  CMI_EVENTS,
  formatCmiEventTime,
  getCmiEventSortTime,
  isCmiEventExpired,
  isCmiInnEvent,
} from '@/data/cmi-events';
import { getCmiEventCardImageUrl } from '@/components/intent/event-card-presentation';
import { getCmiEventCreatePath, getCmiEventPath } from '@/lib/paths';
import './cmi-community-entrance.css';

const featuredEventLimit = 5;
const minimumSwipeDistance = 44;
const linkeQrImageUrl = '/cmi-home/qr-linke.jpg';

const getFeaturedEvents = (referenceDate = new Date()) => {
  const cmiInnEvents = CMI_EVENTS
    .filter(event => event.visibilityStatus !== 'draft')
    .filter(isCmiInnEvent);

  const upcoming = cmiInnEvents
    .filter(event => !isCmiEventExpired(event, referenceDate))
    .sort((a, b) => getCmiEventSortTime(a, referenceDate) - getCmiEventSortTime(b, referenceDate));

  if (upcoming.length > 0) return upcoming.slice(0, featuredEventLimit);

  return cmiInnEvents
    .sort((a, b) => getCmiEventSortTime(b, referenceDate) - getCmiEventSortTime(a, referenceDate))
    .slice(0, featuredEventLimit);
};

const featuredEvents = getFeaturedEvents();
const featuredPosterUrls = featuredEvents.map(event => getCmiEventCardImageUrl(event));

type ContactModalType = 'booking' | 'partner';

const contactModalCopy: Record<ContactModalType, { eyebrow: string; title: string; hint: string }> = {
  booking: {
    eyebrow: 'CMI INN',
    title: '欢迎入住清迈客栈！',
    hint: '扫码添加林可，确认房型、日期和入住安排。',
  },
  partner: {
    eyebrow: 'CMI COLLAB',
    title: '合作事宜请扫码',
    hint: '活动共创、场地合作、社区资源对接都可以从这里开始。',
  },
};

export default function CmiCommunityEntrance() {
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [contactModalType, setContactModalType] = useState<ContactModalType | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const selectedFeaturedEvent = featuredEvents[activeEventIndex] ?? featuredEvents[0] ?? CMI_EVENTS[0];
  const selectedFeaturedPosterUrl = getCmiEventCardImageUrl(selectedFeaturedEvent);
  const featuredEventCount = featuredEvents.length;
  const activeContactModal = contactModalType ? contactModalCopy[contactModalType] : null;
  const carouselCountLabel =
    featuredEventCount > 0
      ? `${String(activeEventIndex + 1).padStart(2, '0')}/${String(featuredEventCount).padStart(2, '0')}`
      : '00/00';

  useEffect(() => {
    if (!contactModalType) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContactModalType(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contactModalType]);

  useEffect(() => {
    const preloadedImages = featuredPosterUrls.map(src => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      return image;
    });

    return () => {
      preloadedImages.forEach(image => {
        image.src = '';
      });
    };
  }, []);

  useEffect(() => {
    if (featuredEventCount <= 1) return undefined;

    const carouselTimer = window.setInterval(() => {
      setActiveEventIndex(previousIndex => (previousIndex + 1) % featuredEventCount);
    }, 5600);

    return () => window.clearInterval(carouselTimer);
  }, [featuredEventCount]);

  const goToEvent = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= featuredEventCount) return;
    setActiveEventIndex(nextIndex);
  };

  const goPrevious = () => goToEvent(activeEventIndex - 1);
  const goNext = () => goToEvent(activeEventIndex + 1);

  const handleEventPointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    swipeStartXRef.current = event.clientX;
    swipeStartYRef.current = event.clientY;
    swipedRef.current = false;
  };

  const handleEventPointerUp = (event: PointerEvent<HTMLAnchorElement>) => {
    if (swipeStartXRef.current === null || swipeStartYRef.current === null) return;

    const deltaX = event.clientX - swipeStartXRef.current;
    const deltaY = event.clientY - swipeStartYRef.current;
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;

    if (Math.abs(deltaX) < minimumSwipeDistance || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
      return;
    }

    swipedRef.current = true;
    if (deltaX > 0) {
      goPrevious();
    } else {
      goNext();
    }
  };

  const handleEventCardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!swipedRef.current) return;
    event.preventDefault();
    swipedRef.current = false;
  };

  const resetEventSwipe = () => {
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
  };

  return (
    <div className="cmi-community-page">
      <h1 className="sr-only">CMI 社区统一入口</h1>
      <main className="cmi-toy-entry" aria-label="CMI 社区统一入口">
        <header className="cmi-toy-header">
          <div className="cmi-toy-logo" aria-hidden="true">CMI</div>
          <div className="cmi-toy-title">
            <span>COMMUNITY</span>
            <strong>社区统一入口</strong>
          </div>
        </header>

        <section className="cmi-lcd-panel" aria-label="近期活动 / 精选内容">
          <div className="cmi-lcd-header">
            <span>近期活动 / 精选内容</span>
            <strong>{carouselCountLabel}</strong>
          </div>
          <Link
            className="cmi-featured-event-card"
            to={getCmiEventPath(selectedFeaturedEvent.id)}
            aria-label={`查看活动：${selectedFeaturedEvent.title}`}
            onClick={handleEventCardClick}
            onPointerCancel={resetEventSwipe}
            onPointerDown={handleEventPointerDown}
            onPointerUp={handleEventPointerUp}
          >
            <div className="cmi-featured-event-copy">
              <span className="cmi-event-kicker">CMI EVENT</span>
              <strong>{selectedFeaturedEvent.title}</strong>
              <span className="cmi-event-meta">
                <CalendarDays aria-hidden="true" />
                {formatCmiEventTime(selectedFeaturedEvent)}
              </span>
              <span className="cmi-event-meta">
                <MapPin aria-hidden="true" />
                {selectedFeaturedEvent.venueName}
              </span>
              <span className="cmi-event-detail-button">查看详情</span>
            </div>
            <img
              className="cmi-featured-event-poster"
              src={selectedFeaturedPosterUrl}
              alt={`${selectedFeaturedEvent.title} 海报`}
              decoding="async"
            />
          </Link>
          <div className="cmi-carousel-controls" aria-label="活动轮播控制">
            <button type="button" aria-label="上一个活动" onClick={goPrevious} disabled={activeEventIndex === 0}>
              <ChevronLeft aria-hidden="true" />
            </button>
            <div className="cmi-carousel-dots" aria-hidden="true">
              {featuredEvents.map(event => (
                <span
                  key={event.id}
                  className={event.id === selectedFeaturedEvent.id ? 'is-active' : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="下一个活动"
              onClick={goNext}
              disabled={activeEventIndex >= featuredEventCount - 1}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <nav className="cmi-main-entry-list" aria-label="CMI 主入口">
          <a className="cmi-main-entry-button" href="https://cmimap.com" aria-label="CMI MAP">
            <MapIcon aria-hidden="true" />
            <span>CMI MAP</span>
            <ChevronRight aria-hidden="true" />
          </a>
          <a className="cmi-main-entry-button" href="https://cmiswap.com" aria-label="CMI SWAP">
            <Repeat2 aria-hidden="true" />
            <span>CMI SWAP</span>
            <ChevronRight aria-hidden="true" />
          </a>
        </nav>

        <div className="cmi-action-row" aria-label="社区操作入口">
          <Link className="cmi-round-action cmi-round-action--event" to={getCmiEventCreatePath()}>
            <CalendarPlus aria-hidden="true" />
            <span>
              发起
              <br />
              活动
            </span>
          </Link>
          <button
            type="button"
            className="cmi-round-action cmi-round-action--home"
            onClick={() => setContactModalType('booking')}
          >
            <Home aria-hidden="true" />
            <span>
              一键
              <br />
              订房
            </span>
          </button>
          <button
            type="button"
            className="cmi-round-action cmi-round-action--partner"
            onClick={() => setContactModalType('partner')}
          >
            <Handshake aria-hidden="true" />
            <span>
              相关
              <br />
              合作
            </span>
          </button>
        </div>
      </main>

      {activeContactModal && (
        <div
          className="cmi-contact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmi-contact-title"
          onClick={() => setContactModalType(null)}
        >
          <div className="cmi-contact-panel" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="cmi-contact-close"
              aria-label="关闭弹窗"
              onClick={() => setContactModalType(null)}
            >
              <X aria-hidden="true" />
            </button>
            <span className="cmi-contact-eyebrow">{activeContactModal.eyebrow}</span>
            <h2 id="cmi-contact-title">{activeContactModal.title}</h2>
            <div className="cmi-contact-qr">
              <img src={linkeQrImageUrl} alt="林可微信二维码" decoding="async" />
            </div>
            <p>{activeContactModal.hint}</p>
            <strong>林可微信</strong>
          </div>
        </div>
      )}
    </div>
  );
}
