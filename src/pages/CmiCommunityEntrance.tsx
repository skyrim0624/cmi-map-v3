import { Link } from 'react-router-dom';
import {
  CMI_EVENTS,
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
const primaryFeaturedEvent = featuredEvents[0];

export default function CmiCommunityEntrance() {
  return (
    <div className="cmi-community-page">
      <h1 className="sr-only">CMI 社区统一入口</h1>
      <main className="cmi-arcade-prototype" aria-label="CMI 社区统一入口">
        <img
          className="cmi-arcade-prototype-image"
          src="/brand/cmi-community-arcade-prototype.png"
          alt=""
          aria-hidden="true"
        />
        <Link
          className="cmi-prototype-hotspot cmi-prototype-hotspot--event"
          to={getCmiEventPath(primaryFeaturedEvent.id)}
          aria-label="近期活动 / 精选内容"
        />
        <a
          className="cmi-prototype-hotspot cmi-prototype-hotspot--map"
          href="https://cmimap.com/v3?screen=map"
          aria-label="CMI MAP"
        />
        <a
          className="cmi-prototype-hotspot cmi-prototype-hotspot--swap"
          href="https://cmiswap.com"
          aria-label="CMI SWAP"
        />
        <Link
          className="cmi-prototype-hotspot cmi-prototype-hotspot--event-create"
          to={getCmiEventCreatePath()}
          aria-label="发起活动"
        />
        <a
          className="cmi-prototype-hotspot cmi-prototype-hotspot--home"
          href="/cmi-home/qr-linke.jpg"
          aria-label="一键住房"
        />
        <a
          className="cmi-prototype-hotspot cmi-prototype-hotspot--partner"
          href="/cmi-home/qr-andreas.jpg"
          aria-label="相关合作"
        />
      </main>
    </div>
  );
}
