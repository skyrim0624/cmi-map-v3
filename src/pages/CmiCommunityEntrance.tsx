import { CalendarPlus, Handshake, Home, Map as MapIcon, Recycle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCmiEventCardImageUrl } from '@/components/intent/event-card-presentation';
import {
  CMI_EVENTS,
  formatCmiEventTime,
  getCmiEventSortTime,
  isCmiEventExpired,
  isCmiInnEvent,
} from '@/data/cmi-events';
import { getCmiEventCreatePath, getCmiEventPath } from '@/lib/paths';
import './cmi-community-entrance.css';

const getFeaturedEvents = (referenceDate = new Date()) => {
  const upcoming = CMI_EVENTS
    .filter(event => isCmiInnEvent(event))
    .filter(event => !isCmiEventExpired(event, referenceDate))
    .sort((a, b) => getCmiEventSortTime(a) - getCmiEventSortTime(b));

  if (upcoming.length > 0) return upcoming.slice(0, 4);

  return CMI_EVENTS
    .filter(event => isCmiInnEvent(event))
    .sort((a, b) => getCmiEventSortTime(b) - getCmiEventSortTime(a))
    .slice(0, 4);
};

const featuredEvents = getFeaturedEvents();

export default function CmiCommunityEntrance() {
  return (
    <div className="cmi-community-page">
      <h1 className="sr-only">CMI 社区统一入口</h1>
      <main className="cmi-arcade-cabinet" aria-label="CMI 社区统一入口">
        <section className="cmi-arcade-screen" aria-label="近期活动 / 精选内容">
          <div className="cmi-screen-header">
            <div className="cmi-screen-label">近期活动 / 精选内容</div>
            <div className="cmi-screen-count">01/{String(featuredEvents.length).padStart(2, '0')}</div>
          </div>
          <div className="cmi-event-reel">
            {featuredEvents.map(event => (
              <Link className="cmi-event-slide" to={getCmiEventPath(event.id)} key={event.id}>
                <div className="cmi-event-copy">
                  <span className="cmi-event-kicker">CMI EVENT</span>
                  <strong>{event.title}</strong>
                  <span className="cmi-event-time">{formatCmiEventTime(event)}</span>
                  <span className="cmi-event-venue">{event.venueName}</span>
                  <span className="cmi-event-detail">查看详情</span>
                </div>
                <img src={getCmiEventCardImageUrl(event)} alt="" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <div className="cmi-entry-stack" aria-label="核心入口">
          <Link className="cmi-entry-button cmi-entry-button--map" to="/v3?screen=map">
            <MapIcon aria-hidden="true" />
            <span>CMI MAP</span>
          </Link>
          <Link className="cmi-entry-button cmi-entry-button--swap" to="/swap">
            <Recycle aria-hidden="true" />
            <span>CMI SWAP</span>
          </Link>
        </div>

        <nav className="cmi-control-deck" aria-label="快捷动作">
          <div className="cmi-joystick" aria-hidden="true" />
          <Link className="cmi-control-button cmi-control-button--event" to={getCmiEventCreatePath()}>
            <CalendarPlus aria-hidden="true" />
            <span>发起<br />活动</span>
          </Link>
          <a className="cmi-control-button cmi-control-button--home" href="/cmi-home/qr-linke.jpg">
            <Home aria-hidden="true" />
            <span>一键<br />住房</span>
          </a>
          <a className="cmi-control-button cmi-control-button--partner" href="/cmi-home/qr-andreas.jpg">
            <Handshake aria-hidden="true" />
            <span>相关<br />合作</span>
          </a>
        </nav>
      </main>
    </div>
  );
}
