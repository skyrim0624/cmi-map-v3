import { CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CMI_EVENT_VERIFICATION_LABELS,
  type CmiEvent,
  type CmiEventType,
  formatCmiEventDateParts,
  formatCmiEventTime,
  getCmiEventTypeLabel,
} from '@/data/cmi-events';

interface CmiEventCardProps {
  event: CmiEvent;
  to?: string;
  onClick?: () => void;
}

const EVENT_STYLE_BY_TYPE: Record<CmiEventType, {
  accent: string;
  date: string;
  icon: string;
  tag: string;
}> = {
  cmi: {
    accent: 'text-[#6f4a8e]',
    date: 'border-[#dac8e6] bg-[#f7f1fb] text-[#6f4a8e]',
    icon: 'text-[#7b4d92]',
    tag: 'border-[#e5d8ee] bg-[#fbf7fd] text-[#6f4a8e]',
  },
  tech: {
    accent: 'text-[#446d85]',
    date: 'border-[#cfe0e8] bg-[#f3f9fb] text-[#446d85]',
    icon: 'text-[#337fa6]',
    tag: 'border-[#d8e6ec] bg-[#f7fbfc] text-[#446d85]',
  },
  market: {
    accent: 'text-[#4d765d]',
    date: 'border-[#cfe0d4] bg-[#f5faf6] text-[#4d765d]',
    icon: 'text-[#4f8d6b]',
    tag: 'border-[#dce9df] bg-[#f8fbf8] text-[#4d765d]',
  },
  festival: {
    accent: 'text-[#a7654f]',
    date: 'border-[#ead7ce] bg-[#fff7f3] text-[#a7654f]',
    icon: 'text-[#b95f43]',
    tag: 'border-[#eeded6] bg-[#fff9f6] text-[#a7654f]',
  },
  workshop: {
    accent: 'text-[#816739]',
    date: 'border-[#e5dac1] bg-[#fffaf0] text-[#816739]',
    icon: 'text-[#8a6b2f]',
    tag: 'border-[#eee5cf] bg-[#fffbf4] text-[#816739]',
  },
  exhibition: {
    accent: 'text-[#5f6f8c]',
    date: 'border-[#d8deea] bg-[#f7f8fc] text-[#5f6f8c]',
    icon: 'text-[#52678e]',
    tag: 'border-[#e1e6f1] bg-[#fafbfe] text-[#5f6f8c]',
  },
  music: {
    accent: 'text-[#875779]',
    date: 'border-[#e5d3df] bg-[#fff6fb] text-[#875779]',
    icon: 'text-[#8f5281]',
    tag: 'border-[#ecdce7] bg-[#fffafd] text-[#875779]',
  },
  meetup: {
    accent: 'text-[#5e734f]',
    date: 'border-[#d8e3ce] bg-[#f8fbf5] text-[#5e734f]',
    icon: 'text-[#526f43]',
    tag: 'border-[#e0ead8] bg-[#fbfdf9] text-[#5e734f]',
  },
  wellness: {
    accent: 'text-[#4c7974]',
    date: 'border-[#d2e4e1] bg-[#f4faf9] text-[#4c7974]',
    icon: 'text-[#437b74]',
    tag: 'border-[#dcebe8] bg-[#f9fcfb] text-[#4c7974]',
  },
  meditation: {
    accent: 'text-[#65708c]',
    date: 'border-[#d9deea] bg-[#f6f8fd] text-[#65708c]',
    icon: 'text-[#5d688c]',
    tag: 'border-[#e2e6f0] bg-[#fafbfe] text-[#65708c]',
  },
  sport: {
    accent: 'text-[#9a6747]',
    date: 'border-[#ead9cb] bg-[#fff7f1] text-[#9a6747]',
    icon: 'text-[#9c5933]',
    tag: 'border-[#eee2d7] bg-[#fffbf8] text-[#9a6747]',
  },
  stable: {
    accent: 'text-[#66756f]',
    date: 'border-[#d9e1dd] bg-[#f8faf8] text-[#66756f]',
    icon: 'text-[#566c64]',
    tag: 'border-[#e2e8e5] bg-[#fbfcfb] text-[#66756f]',
  },
};

export function CmiEventCard({ event, to, onClick }: CmiEventCardProps) {
  const visibleTags = Array.from(
    new Map([getCmiEventTypeLabel(event.type), ...event.tags].map(tag => [tag.trim(), tag.trim()])).values()
  ).slice(0, 5);
  const isInteractive = Boolean(to || onClick);
  const style = event.isCmiRelated ? EVENT_STYLE_BY_TYPE.cmi : EVENT_STYLE_BY_TYPE[event.type];
  const dateParts = formatCmiEventDateParts(event);
  const cardClassName = `rounded-lg border border-[#dedbd2] bg-[#fffefa] p-4 shadow-[0_2px_8px_rgba(35,31,26,0.05)] ${
    isInteractive ? 'cursor-pointer transition duration-150 active:translate-y-px active:bg-[#fffdf5]' : ''
  }`;

  const card = (
    <article
      className={cardClassName}
      role={!to && onClick ? 'button' : undefined}
      tabIndex={!to && onClick ? 0 : undefined}
      aria-label={!to && onClick ? `在地图上查看 ${event.title}` : undefined}
      onClick={onClick}
      onKeyDown={(keyboardEvent) => {
        if (!onClick || to) return;
        if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
        keyboardEvent.preventDefault();
        onClick();
      }}
    >
      <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 gap-y-3">
        <div className={`flex h-[4.25rem] w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-lg border text-center ${style.date}`}>
          <p className="w-full whitespace-nowrap text-center text-[1.12rem] font-black leading-none tracking-normal">
            {dateParts.monthDay}
          </p>
          {dateParts.weekday && (
            <p className="mt-1.5 w-full whitespace-nowrap text-center text-[0.86rem] font-black leading-none tracking-normal">
              {dateParts.weekday}
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className={`min-w-0 truncate text-[11px] font-black uppercase tracking-[0.12em] ${style.accent}`}>
              {event.isCmiRelated ? 'CMI EVENT' : event.sourceLabel}
            </p>
            <span className="shrink-0 rounded-full border border-[#e7e0d4] bg-[#fffaf1] px-2.5 py-1 text-[11px] font-black leading-none text-foreground/64">
              {event.priceLabel}
            </span>
          </div>
          <h2 className="mt-1.5 text-[1.22rem] font-black leading-[1.18] text-foreground">
            {event.title}
          </h2>
        </div>

        <div className="col-start-2 min-w-0 space-y-3">
          <p className="text-[0.92rem] font-semibold leading-relaxed text-foreground/74">
            {event.summary}
          </p>

          <div className="grid grid-cols-[1.05rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 border-l border-[#e0ddd4] pl-3 text-xs font-bold text-foreground/58">
            <MapPin className={`mt-0.5 h-3.5 w-3.5 ${style.icon}`} strokeWidth={2.5} />
            <p className="min-w-0 leading-relaxed">
              {event.venueName} · {event.area}
            </p>
            <CalendarDays className={`mt-0.5 h-3.5 w-3.5 ${style.icon}`} strokeWidth={2.5} />
            <p className="min-w-0 leading-relaxed">
              {formatCmiEventTime(event)}
            </p>
            <ShieldCheck className={`mt-0.5 h-3.5 w-3.5 ${style.icon}`} strokeWidth={2.5} />
            <p className="min-w-0 leading-relaxed">
              {CMI_EVENT_VERIFICATION_LABELS[event.verificationStatus]} · {event.sourceLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag, index) => (
              <span key={`${tag}-${index}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${style.tag}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`在地图上查看 ${event.title}`}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {card}
      </Link>
    );
  }

  return card;
}
