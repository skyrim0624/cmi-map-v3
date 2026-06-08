import { Link } from 'react-router-dom';
import { type CSSProperties, type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
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
const getFeaturedEvents = (referenceDate = new Date()) => {
  const upcoming = CMI_EVENTS
    .filter(event => isCmiInnEvent(event))
    .filter(event => !isCmiEventExpired(event, referenceDate))
    .sort((a, b) => getCmiEventSortTime(a) - getCmiEventSortTime(b));

  if (upcoming.length > 0) return upcoming.slice(0, featuredEventLimit);

  return CMI_EVENTS
    .filter(event => isCmiInnEvent(event))
    .sort((a, b) => getCmiEventSortTime(b) - getCmiEventSortTime(a))
    .slice(0, featuredEventLimit);
};

const featuredEvents = getFeaturedEvents();
const primaryFeaturedEvent = featuredEvents[0];
const featuredPosterUrls = featuredEvents.map(event => getCmiEventCardImageUrl(event));
const minimumSwipeDistance = 44;
const linkeQrImageUrl = '/cmi-home/qr-linke.jpg';

type ContactModalType = 'booking' | 'partner';
type ControlPressId = 'map' | 'swap' | 'event-create' | 'home' | 'partner';

const contactModalCopy: Record<ContactModalType, { eyebrow: string; title: string; hint: string }> = {
  booking: {
    eyebrow: 'CMI INN CHECK-IN',
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
  const [joystickMotion, setJoystickMotion] = useState<{
    direction: 'left' | 'right' | null;
    tick: number;
  }>({ direction: null, tick: 0 });
  const [controlPress, setControlPress] = useState<{ id: ControlPressId; tick: number } | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const controlPressTimeoutRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const selectedFeaturedEvent = featuredEvents[activeEventIndex] ?? primaryFeaturedEvent;
  const selectedFeaturedPosterUrl = getCmiEventCardImageUrl(selectedFeaturedEvent);
  const featuredEventCount = featuredEvents.length;
  const activeContactModal = contactModalType ? contactModalCopy[contactModalType] : null;
  const canGoPrevious = activeEventIndex > 0;
  const canGoNext = activeEventIndex < featuredEventCount - 1;
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
    return () => {
      if (controlPressTimeoutRef.current) window.clearTimeout(controlPressTimeoutRef.current);
    };
  }, []);

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

  const triggerControlPress = (id: ControlPressId) => {
    if (controlPressTimeoutRef.current) window.clearTimeout(controlPressTimeoutRef.current);
    setControlPress(previous => ({ id, tick: (previous?.tick ?? 0) + 1 }));
    controlPressTimeoutRef.current = window.setTimeout(() => setControlPress(null), 520);
  };

  const triggerJoystickMotion = (direction: 'left' | 'right') => {
    setJoystickMotion(({ tick }) => ({ direction, tick: tick + 1 }));
  };

  const goToEvent = (nextIndex: number, direction: 'left' | 'right') => {
    if (nextIndex < 0 || nextIndex >= featuredEventCount) return;
    setActiveEventIndex(nextIndex);
    triggerJoystickMotion(direction);
  };

  const goPrevious = () => goToEvent(activeEventIndex - 1, 'left');
  const goNext = () => goToEvent(activeEventIndex + 1, 'right');

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

  const handleEventHotspotClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!swipedRef.current) return;
    event.preventDefault();
    swipedRef.current = false;
  };

  const resetEventSwipe = () => {
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
  };

  const openContactModalWithPress = (type: ContactModalType, id: Extract<ControlPressId, 'home' | 'partner'>) => {
    triggerControlPress(id);
    window.setTimeout(() => setContactModalType(type), 180);
  };

  const arcadePressClassName = controlPress
    ? `cmi-arcade-prototype cmi-arcade-prototype--press-${controlPress.id}`
    : 'cmi-arcade-prototype';
  const joystickClassName = joystickMotion.direction
    ? `cmi-prototype-joystick-stick cmi-prototype-joystick-stick--${joystickMotion.direction}`
    : 'cmi-prototype-joystick-stick';

  return (
    <div className="cmi-community-page">
      <h1 className="sr-only">CMI 社区统一入口</h1>
      <main className={arcadePressClassName} aria-label="CMI 社区统一入口">
        <img
          className="cmi-arcade-prototype-image"
          src="/brand/cmi-community-arcade-prototype.png"
          alt=""
          aria-hidden="true"
        />
        <div className="cmi-prototype-motion" aria-hidden="true">
          <span className="cmi-prototype-screen-header-cover" />
          <div className="cmi-prototype-screen-event" key={selectedFeaturedEvent.id}>
            <div className="cmi-prototype-screen-copy">
              <span>CMI EVENT</span>
              <strong>{selectedFeaturedEvent.title}</strong>
              <em>{formatCmiEventTime(selectedFeaturedEvent)}</em>
              <em>{selectedFeaturedEvent.venueName}</em>
              <b>查看详情</b>
            </div>
            <div
              className="cmi-prototype-screen-poster"
              style={{ '--cmi-poster-image': `url("${selectedFeaturedPosterUrl}")` } as CSSProperties}
            />
          </div>
          <span className="cmi-prototype-crt" />
          <span className="cmi-prototype-led cmi-prototype-led--top" />
          <span className="cmi-prototype-led cmi-prototype-led--bottom" />
          <span className="cmi-prototype-entry-glow cmi-prototype-entry-glow--map" />
          <span className="cmi-prototype-entry-glow cmi-prototype-entry-glow--swap" />
          <span className="cmi-prototype-control-deck-cover" />
          <span className="cmi-prototype-joystick-base" />
          <span key={joystickMotion.tick} className={joystickClassName} />
          <span className="cmi-prototype-control-button cmi-prototype-control-button--event-create">
            发起
            <br />
            活动
          </span>
          <span className="cmi-prototype-control-button cmi-prototype-control-button--home">
            一键
            <br />
            订房
          </span>
          <span className="cmi-prototype-control-button cmi-prototype-control-button--partner">
            相关
            <br />
            合作
          </span>
          <span className="cmi-prototype-home-label-fix">
            一键
            <br />
            订房
          </span>
          <span className="cmi-prototype-pixel-label cmi-prototype-pixel-label--screen-title">
            近期活动 / 精选内容
          </span>
          <span className="cmi-prototype-pixel-label cmi-prototype-pixel-label--screen-count">
            {carouselCountLabel}
          </span>
          <span className="cmi-prototype-carousel-dots">
            {featuredEvents.map(event => (
              <span
                key={event.id}
                className={
                  event.id === selectedFeaturedEvent.id
                    ? 'cmi-prototype-carousel-dot cmi-prototype-carousel-dot--active'
                    : 'cmi-prototype-carousel-dot'
                }
              />
            ))}
          </span>
          <span className="cmi-prototype-pixel-label cmi-prototype-pixel-label--map">CMI MAP</span>
          <span className="cmi-prototype-pixel-label cmi-prototype-pixel-label--swap">CMI SWAP</span>
        </div>
        {canGoPrevious && (
          <button
            className="cmi-prototype-carousel-arrow cmi-prototype-carousel-arrow--previous"
            type="button"
            aria-label="上一个活动"
            onClick={goPrevious}
          />
        )}
        {canGoNext && (
          <button
            className="cmi-prototype-carousel-arrow cmi-prototype-carousel-arrow--next"
            type="button"
            aria-label="下一个活动"
            onClick={goNext}
          />
        )}
        <Link
          className="cmi-prototype-hotspot cmi-prototype-hotspot--event"
          to={getCmiEventPath(selectedFeaturedEvent.id)}
          aria-label="近期活动 / 精选内容"
          onClick={handleEventHotspotClick}
          onPointerCancel={resetEventSwipe}
          onPointerDown={handleEventPointerDown}
          onPointerUp={handleEventPointerUp}
        />
        <a
          className="cmi-prototype-hotspot cmi-prototype-hotspot--map"
          href="https://cmimap.com"
          aria-label="CMI MAP"
          onPointerDown={() => triggerControlPress('map')}
        />
        <a
          className="cmi-prototype-hotspot cmi-prototype-hotspot--swap"
          href="https://cmiswap.com"
          aria-label="CMI SWAP"
          onPointerDown={() => triggerControlPress('swap')}
        />
        <Link
          className="cmi-prototype-hotspot cmi-prototype-hotspot--event-create"
          to={getCmiEventCreatePath()}
          aria-label="发起活动"
          onPointerDown={() => triggerControlPress('event-create')}
        />
        <button
          type="button"
          className="cmi-prototype-hotspot cmi-prototype-hotspot--home"
          aria-label="一键订房"
          onPointerDown={() => triggerControlPress('home')}
          onClick={() => openContactModalWithPress('booking', 'home')}
        />
        <button
          type="button"
          className="cmi-prototype-hotspot cmi-prototype-hotspot--partner"
          aria-label="相关合作"
          onPointerDown={() => triggerControlPress('partner')}
          onClick={() => openContactModalWithPress('partner', 'partner')}
        />
      </main>
      {activeContactModal && (
        <div
          className="cmi-arcade-contact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmi-arcade-contact-title"
          onClick={() => setContactModalType(null)}
        >
          <div className="cmi-arcade-contact-panel" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="cmi-arcade-contact-close"
              aria-label="关闭弹窗"
              onClick={() => setContactModalType(null)}
            >
              ×
            </button>
            <span className="cmi-arcade-contact-eyebrow">{activeContactModal.eyebrow}</span>
            <h2 id="cmi-arcade-contact-title">{activeContactModal.title}</h2>
            <div className="cmi-arcade-contact-qr">
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
