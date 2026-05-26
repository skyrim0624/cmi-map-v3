import { CircleCheck, Clock3, MapPin, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  type CmiEvent,
  formatCmiEventTime,
} from '@/data/cmi-events';
import {
  getCmiEventCardImageUrl,
  getCmiEventRegistrationPreviewLabel,
  getCmiEventVisibleTags,
} from './event-card-presentation';

interface CmiEventCardProps {
  event: CmiEvent;
  to?: string;
  onClick?: () => void;
  showActions?: boolean;
  hasRegistered?: boolean;
  isRegistering?: boolean;
  isSharing?: boolean;
  onShare?: () => void;
  onRegister?: () => void;
}

export function CmiEventCard({
  event,
  to,
  onClick,
  showActions = false,
  hasRegistered = false,
  isRegistering = false,
  isSharing = false,
  onShare,
  onRegister,
}: CmiEventCardProps) {
  const visibleTags = getCmiEventVisibleTags(event);
  const imageUrl = getCmiEventCardImageUrl(event);
  const registrationPreviewLabel = getCmiEventRegistrationPreviewLabel(event);
  const isInteractive = Boolean(to || onClick);
  const registrationButtonLabel = hasRegistered
    ? isRegistering
      ? '取消中'
      : '已报名'
    : isRegistering
      ? '报名中'
      : '报名';
  const registrationButtonClassName = hasRegistered
    ? 'bg-[#fff9e8] hover:bg-[#fff1d2]'
    : 'bg-[#2eb45e] hover:bg-[#36c86b]';
  const cardClassName = `overflow-hidden rounded-[1.25rem] border-2 border-[#161616] bg-[#fff9e8] shadow-[4px_5px_0_rgba(0,0,0,0.2)] ${
    isInteractive ? 'cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:shadow-[4px_7px_0_rgba(0,0,0,0.2)] active:scale-[0.99]' : ''
  }`;

  const card = (
    <article
      className={cardClassName}
      role={!to && onClick ? 'button' : undefined}
      tabIndex={!to && onClick ? 0 : undefined}
      aria-label={!to && onClick ? `查看 ${event.title} 活动详情` : undefined}
      onClick={onClick}
      onKeyDown={(keyboardEvent) => {
        if (!onClick || to) return;
        if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
        keyboardEvent.preventDefault();
        onClick();
      }}
    >
      <div className="relative m-3 h-[11.2rem] overflow-hidden rounded-[0.9rem] border-2 border-[#161616] bg-[#f6efe0]">
        <img
          src={imageUrl}
          alt={`${event.title}活动海报`}
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <h2 className="text-[1.52rem] font-black leading-[1.04] text-[#161616]">
          {event.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm font-black leading-relaxed text-[#161616]/72">
          {event.summary}
        </p>

        {visibleTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleTags.map(tag => (
              <span
                key={tag}
                className="rounded-full border border-[#161616]/25 bg-[#2eb45e]/18 px-2.5 py-1 text-[11px] font-black leading-none text-[#161616]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 rounded-[1rem] border-2 border-[#161616]/18 bg-white/58 p-3 text-sm font-black text-[#161616]">
          <div className="grid min-w-0 gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0 text-[#161616]" strokeWidth={2.5} />
              <span className="min-w-0 leading-snug">{formatCmiEventTime(event)}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#161616]" strokeWidth={2.5} />
              <span className="min-w-0 leading-snug">{event.venueName}</span>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 border-t-2 border-dashed border-[#161616]/18 pt-3">
            <div>
              <p className="text-[10px] font-black leading-none text-[#161616]/55">费用</p>
              <p className="mt-1 break-words text-[12px] font-black leading-tight text-[#161616]">{event.priceLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-black leading-none text-[#161616]/55">参与</p>
              <p className="mt-1 break-words text-[12px] font-black leading-tight text-[#161616]">{registrationPreviewLabel}</p>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button
              type="button"
              disabled={isSharing}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-[#161616] bg-[#ff6fba] px-3 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition hover:bg-[#ff83c4] active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.18)] disabled:bg-[#fff9e8] disabled:text-[#161616]/70 disabled:shadow-none"
              onClick={(event) => {
                event.stopPropagation();
                onShare?.();
              }}
              onKeyDown={(event) => event.stopPropagation()}
              aria-label="转发活动到群"
            >
              <Share2 className="h-4 w-4" strokeWidth={2.5} />
              {isSharing ? '生成中' : '转发到群'}
            </button>
            <button
              type="button"
              disabled={isRegistering}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-[#161616] px-3 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.18)] disabled:bg-[#fff9e8] disabled:text-[#161616]/70 disabled:shadow-none ${registrationButtonClassName}`}
              onClick={(event) => {
                event.stopPropagation();
                onRegister?.();
              }}
              onKeyDown={(event) => event.stopPropagation()}
              aria-label={hasRegistered ? '取消报名活动' : '报名活动'}
            >
              <CircleCheck className="h-4 w-4" strokeWidth={2.5} />
              {registrationButtonLabel}
            </button>
          </div>
        )}
      </div>
    </article>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`在地图上查看 ${event.title}`}
        className="block rounded-[1.25rem] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {card}
      </Link>
    );
  }

  return card;
}
