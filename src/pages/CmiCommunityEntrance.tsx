import { CalendarDays, MapPin, X } from 'lucide-react';
import { type MouseEvent, type PointerEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCmiEventCardImageUrl } from '@/components/intent/event-card-presentation';
import { CMI_EVENTS, formatCmiEventTime } from '@/data/cmi-events';
import { getCmiEventCreatePath, getCmiEventPath } from '@/lib/paths';
import './cmi-community-entrance.css';

const referenceImageUrl = '/cmi-home/community-entry-reference.png';
const linkeQrImageUrl = '/cmi-home/qr-linke.jpg';
const carouselIntervalMs = 5000;
const minimumSwipeDistance = 42;
const featuredEventIds = [
  'cmi-secondhand-auction-2026-06-06',
  'cmi-my-octopus-teacher-screening-2026-06-06',
  'cmi-ai-3d-spaceship-workshop-2026-06-07',
  'cmi-talk-fathers-day-speaker-call-2026-06-07',
  'cmi-kongxiang-canteen-hotpot-2026-06-05',
];

const featuredEvents = featuredEventIds
  .map(eventId => CMI_EVENTS.find(event => event.id === eventId))
  .filter(event => event !== undefined);

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
  const activeContactModal = contactModalType ? contactModalCopy[contactModalType] : null;
  const showDynamicScreen = activeEventIndex > 0;
  const carouselCountLabel = `${String(activeEventIndex + 1).padStart(2, '0')}/${String(featuredEvents.length).padStart(2, '0')}`;

  const changeActiveEventIndex = useCallback((step: number) => {
    setActiveEventIndex(previousIndex => {
      if (featuredEvents.length <= 1) return previousIndex;
      return (previousIndex + step + featuredEvents.length) % featuredEvents.length;
    });
  }, []);

  useEffect(() => {
    if (!contactModalType) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContactModalType(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contactModalType]);

  useEffect(() => {
    if (contactModalType || featuredEvents.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      changeActiveEventIndex(1);
    }, carouselIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [activeEventIndex, changeActiveEventIndex, contactModalType]);

  const goPrevious = useCallback(() => {
    changeActiveEventIndex(-1);
  }, [changeActiveEventIndex]);

  const goNext = useCallback(() => {
    changeActiveEventIndex(1);
  }, [changeActiveEventIndex]);

  const beginScreenSwipe = (clientX: number, clientY: number) => {
    swipeStartXRef.current = clientX;
    swipeStartYRef.current = clientY;
    swipedRef.current = false;
  };

  const finishScreenSwipe = (clientX: number, clientY: number) => {
    if (swipeStartXRef.current === null || swipeStartYRef.current === null) return;

    const deltaX = clientX - swipeStartXRef.current;
    const deltaY = clientY - swipeStartYRef.current;
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;

    if (Math.abs(deltaX) < minimumSwipeDistance || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    swipedRef.current = true;
    if (deltaX > 0) {
      goPrevious();
    } else {
      goNext();
    }
  };

  const handleScreenPointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    beginScreenSwipe(event.clientX, event.clientY);
  };

  const handleScreenPointerUp = (event: PointerEvent<HTMLAnchorElement>) => {
    finishScreenSwipe(event.clientX, event.clientY);
  };

  const handleScreenTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    beginScreenSwipe(touch.clientX, touch.clientY);
  };

  const handleScreenTouchEnd = (event: TouchEvent<HTMLAnchorElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const previousSwiped = swipedRef.current;
    finishScreenSwipe(touch.clientX, touch.clientY);
    if (!previousSwiped && swipedRef.current) event.preventDefault();
  };

  const handleScreenClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!swipedRef.current) return;
    event.preventDefault();
    swipedRef.current = false;
  };

  const resetScreenSwipe = () => {
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
  };

  return (
    <div className="cmi-community-page">
      <h1 className="sr-only">CMI 社区统一入口</h1>
      <main className="cmi-reference-entry" aria-label="CMI 社区统一入口">
        <img className="cmi-reference-image" src={referenceImageUrl} alt="" decoding="async" />
        <section
          className={`cmi-reference-screen ${showDynamicScreen ? 'is-visible' : ''}`}
          aria-hidden={!showDynamicScreen}
        >
          <div className="cmi-reference-screen-header">
            <span>近期活动 / 精选内容</span>
            <strong>{carouselCountLabel}</strong>
          </div>
          <div className="cmi-reference-screen-card">
            <div className="cmi-reference-screen-copy">
              <span className="cmi-reference-screen-kicker">CMI EVENT</span>
              <strong>{selectedFeaturedEvent.title}</strong>
              <span>
                <CalendarDays aria-hidden="true" />
                {formatCmiEventTime(selectedFeaturedEvent)}
              </span>
              <span>
                <MapPin aria-hidden="true" />
                {selectedFeaturedEvent.venueName}
              </span>
              <em>查看详情 ›</em>
            </div>
            <img
              className="cmi-reference-screen-poster"
              src={getCmiEventCardImageUrl(selectedFeaturedEvent)}
              alt=""
              decoding="async"
            />
          </div>
          <div className="cmi-reference-screen-dots">
            {featuredEvents.map((event, index) => (
              <span key={event.id} className={index === activeEventIndex ? 'is-active' : undefined} />
            ))}
          </div>
        </section>
        <button
          type="button"
          className="cmi-reference-arrow cmi-reference-arrow--previous"
          aria-label="上一个活动"
          onClick={goPrevious}
        />
        <button
          type="button"
          className="cmi-reference-arrow cmi-reference-arrow--next"
          aria-label="下一个活动"
          onClick={goNext}
        />
        <Link
          className="cmi-reference-hotspot cmi-reference-hotspot--event"
          to={getCmiEventPath(selectedFeaturedEvent.id)}
          aria-label={`查看活动：${selectedFeaturedEvent.title}`}
          onClick={handleScreenClick}
          onPointerCancel={resetScreenSwipe}
          onPointerDown={handleScreenPointerDown}
          onPointerUp={handleScreenPointerUp}
          onTouchCancel={resetScreenSwipe}
          onTouchEnd={handleScreenTouchEnd}
          onTouchStart={handleScreenTouchStart}
        />
        <a
          className="cmi-reference-hotspot cmi-reference-hotspot--map"
          href="https://cmimap.com"
          aria-label="CMI MAP"
        />
        <a
          className="cmi-reference-hotspot cmi-reference-hotspot--swap"
          href="https://cmiswap.com"
          aria-label="CMI SWAP"
        />
        <Link
          className="cmi-reference-hotspot cmi-reference-hotspot--create"
          to={getCmiEventCreatePath()}
          aria-label="发起活动"
        />
        <button
          type="button"
          className="cmi-reference-hotspot cmi-reference-hotspot--booking"
          aria-label="一键订房"
          onClick={() => setContactModalType('booking')}
        />
        <button
          type="button"
          className="cmi-reference-hotspot cmi-reference-hotspot--partner"
          aria-label="相关合作"
          onClick={() => setContactModalType('partner')}
        />
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
