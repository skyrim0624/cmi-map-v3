import { ArrowLeft, Recycle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CMI_EVENTS,
  formatCmiEventTime,
  getCmiEventSortTime,
  type CmiEvent,
} from '@/data/cmi-events';
import { getCmiEventPath } from '@/lib/paths';
import './cmi-community-entrance.css';

const CMI_SWAP_EVENT_KEYWORDS = ['旧物交换', '二手物品', '拍卖'];

const isSwapEvent = (event: CmiEvent) => {
  const source = [event.title, event.summary, ...event.tags, ...event.suitableFor].join(' ');
  return CMI_SWAP_EVENT_KEYWORDS.some(keyword => source.includes(keyword));
};

const swapEvents = CMI_EVENTS
  .filter(isSwapEvent)
  .sort((a, b) => getCmiEventSortTime(b) - getCmiEventSortTime(a));

export default function CmiSwapPage() {
  return (
    <div className="cmi-swap-page">
      <main className="cmi-swap-panel" aria-label="CMI Swap">
        <Link className="cmi-swap-back" to="/community" aria-label="返回统一入口">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <section className="cmi-swap-screen">
          <Recycle aria-hidden="true" />
          <h1>CMI SWAP</h1>
        </section>
        <div className="cmi-swap-list">
          {swapEvents.map(event => (
            <Link className="cmi-swap-card" to={getCmiEventPath(event.id)} key={event.id}>
              <span>{formatCmiEventTime(event)}</span>
              <strong>{event.title}</strong>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

