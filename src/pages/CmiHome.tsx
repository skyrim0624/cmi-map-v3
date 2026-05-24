import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  Home,
  MapPin,
  MessageCircle,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  Stamp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getCmiEventCardBackgroundUrl, getCmiEventPosterUrl } from '@/data/cmi-event-details';
import {
  CMI_EVENTS,
  type CmiEvent,
  formatCmiEventTime,
  getUpcomingCmiEventsFromList,
} from '@/data/cmi-events';
import { getAvailableStickers, getProfilesByUserNames, getRecommendationsByPlace, type PublicProfile } from '@/db/api';
import {
  getCmiEventStampDeviceId,
  getCmiEventStamps,
  placeCmiEventStamp,
} from '@/db/cmi-event-stamps';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { createCmiEventShareCard, type CmiEventShareCardResult } from '@/lib/cmi-event-share-card';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { getAddTracePath, getCmiEventPath, getProfilePath } from '@/lib/paths';
import { CMI_INN_LOGO_ICON_URL, CMI_INN_PLACE_NAME, type Recommendation, type Sticker } from '@/types/types';

type FileShareData = {
  files?: File[];
  title?: string;
  text?: string;
};

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

const CMI_INN_TIME_ZONE = 'Asia/Bangkok';
const CMI_INN_DOT_STYLE = {
  backgroundImage:
    'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.12) 1px, transparent 0)',
  backgroundSize: '10px 10px',
};
const CMI_INN_DASH_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 14px)',
  backgroundSize: '100% 2px',
  backgroundRepeat: 'repeat-x',
};

interface CmiHomeContact {
  id: string;
  name: string;
  role: string;
  hint: string;
  imageUrl: string;
}

const cmiHomeContacts: CmiHomeContact[] = [
  {
    id: 'linke',
    name: '林可',
    role: '客栈订房 / 社区合作',
    hint: '订房、合作、到访沟通',
    imageUrl: '/cmi-home/qr-linke.jpg',
  },
  {
    id: 'official-account',
    name: '公众号',
    role: 'CMI 清迈客栈',
    hint: '活动预告、社区动态',
    imageUrl: '/cmi-home/qr-cmi-official.jpg',
  },
  {
    id: 'andreas',
    name: '子扬',
    role: '社区活动运营',
    hint: '想参加或举办活动的朋友加他',
    imageUrl: '/cmi-home/qr-andreas.jpg',
  },
];

interface CmiHomeIntroFact {
  id: string;
  label: string;
  value: string;
  description: string;
  Icon: LucideIcon;
}

const cmiHomeIntroFacts: CmiHomeIntroFact[] = [
  {
    id: 'stay',
    label: '客栈住宿',
    value: '能住',
    description: '到清迈先落脚，订房、问路和附近生活都能从这里开始。',
    Icon: Home,
  },
  {
    id: 'living-room',
    label: '社区客厅',
    value: '能坐',
    description: '白天来院子坐一会儿，常会碰见正在清迈生活的人。',
    Icon: UsersRound,
  },
  {
    id: 'events',
    label: '活动现场',
    value: '能参加',
    description: '晚餐、分享、正念、观影和市集会持续同步到活动看板。',
    Icon: Sparkles,
  },
];

const getPrimaryInnEvents = (events: CmiEvent[], referenceDate: Date) =>
  getUpcomingCmiEventsFromList(events, referenceDate).filter(
    event => event.isCmiRelated || event.venueName.includes('清迈客栈') || event.area.includes('清迈客栈')
  );

const formatBangkokDateTime = (value: string | number | undefined) => {
  if (!value) return '等待同步';

  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return '等待同步';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: CMI_INN_TIME_ZONE,
  }).format(date);
};

const formatRecordDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: CMI_INN_TIME_ZONE,
  }).format(date);
};

const getNewestTimestamp = (values: Array<string | undefined>) => {
  const timestamps = values
    .map(value => (value ? new Date(value).getTime() : Number.NaN))
    .filter(Number.isFinite);

  return timestamps.length > 0 ? Math.max(...timestamps) : undefined;
};

const getRecordImages = (record: Recommendation) =>
  (Array.isArray(record.images) ? record.images : []).filter(Boolean);

const downloadCmiEventShareCard = (card: CmiEventShareCardResult) => {
  const downloadUrl = URL.createObjectURL(card.blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = card.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
};

function ChapterHeader({
  chapter,
  title,
  align = 'left',
}: {
  chapter: string;
  title: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className="mb-3 text-[#161616]">
      <div className="flex items-center justify-between gap-3 text-[12px] font-black leading-none">
        <span>{chapter}</span>
        <span className={align === 'right' ? 'text-right' : ''}>{title}</span>
      </div>
      <div className="mt-2 h-[2px] text-[#161616]/80" style={CMI_INN_DASH_STYLE} />
    </div>
  );
}

function QuestionAnswerBlock({
  question,
  answer,
  inverted = false,
}: {
  question: string;
  answer: string;
  inverted?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1.4rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm font-black leading-relaxed ${inverted ? 'text-white' : 'text-[#161616]'}`}>
      <p className="text-[1.05rem] leading-none">Q</p>
      <p>{question}</p>
      <p className="text-[1.05rem] leading-none">A</p>
      <p className={inverted ? 'text-white/88' : 'text-[#1e1e1e]/82'}>{answer}</p>
    </div>
  );
}

function ChapterPill({
  children,
  tone = 'cream',
}: {
  children: ReactNode;
  tone?: 'cream' | 'green' | 'pink' | 'yellow';
}) {
  const toneClass = {
    cream: 'bg-[#fff9e8] text-[#161616]',
    green: 'bg-[#245f3b] text-white',
    pink: 'bg-[#ff6fba] text-[#161616]',
    yellow: 'bg-[#ffe35b] text-[#161616]',
  }[tone];

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border-2 border-[#161616] px-3 text-[11px] font-black leading-none shadow-[2px_3px_0_rgba(0,0,0,0.18)] ${toneClass}`}>
      {children}
    </span>
  );
}

function InnHeroChapter() {
  return (
    <section className="relative overflow-hidden rounded-[1.45rem] border-2 border-[#161616] bg-[#2eb45e] p-3 text-[#161616] shadow-[8px_9px_0_rgba(0,0,0,0.42)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.2]" style={CMI_INN_DOT_STYLE} />
      <ChapterHeader chapter="Chapter One" title="CMI Inn as Living Room" />
      <div className="overflow-hidden rounded-[0.9rem] border-2 border-[#161616] bg-[#fff9e8]">
        <img
          src="/cmi-home/yard-scene.jpg"
          alt="清迈客栈院子插画"
          className="aspect-[1/0.9] w-full object-cover object-center"
        />
      </div>

      <div className="mt-4">
        <h1 className="text-[3.15rem] font-black leading-[0.88] tracking-normal text-[#161616]">
          清迈客栈
        </h1>
        <p className="mt-3 max-w-[18rem] text-[15px] font-black leading-relaxed text-[#161616]/82">
          一个能住、能来坐、能参加活动，也能从这里接上清迈生活的人情入口。
        </p>
      </div>

      <div className="mt-5 rounded-[1.1rem] border-2 border-[#161616] bg-[#fff9e8] p-4 shadow-[4px_5px_0_rgba(0,0,0,0.18)]">
        <QuestionAnswerBlock
          question="清迈客栈到底是什么？"
          answer="它不是一个只负责睡觉的地方，更像 CMI 在清迈的线下客厅。先来落脚、坐一会儿，接下来要认识谁、去哪儿、参加什么活动，都会慢慢接上。"
        />
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[50%] border-2 border-[#161616] bg-white px-7 py-8 text-center shadow-[4px_5px_0_rgba(0,0,0,0.18)]">
        <p className="absolute left-1/2 top-3 -translate-x-1/2 rounded-sm border border-[#161616] bg-[#ffe35b] px-3 py-1 text-[13px] font-black leading-none">
          CMI Home
        </p>
        <div className="mx-auto flex h-[10.5rem] w-full max-w-[17rem] items-center justify-center">
          <img
            src={CMI_INN_LOGO_ICON_URL}
            alt="清迈客栈 logo"
            className="h-full w-full object-contain drop-shadow-[0_6px_0_rgba(0,0,0,0.08)]"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

function InnIntroSection() {
  return (
    <section className="mt-5" id="inn-intro">
      <div className="relative overflow-hidden rounded-[1.35rem] border-2 border-[#161616] bg-[#ffe35b] p-4 shadow-[6px_7px_0_rgba(0,0,0,0.36)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={CMI_INN_DOT_STYLE} />
        <ChapterHeader chapter="CMI Note" title="first stop in Chiang Mai" />
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            <ChapterPill tone="green">能住</ChapterPill>
            <ChapterPill>能坐</ChapterPill>
            <ChapterPill tone="pink">能参加活动</ChapterPill>
          </div>
          <h2 className="mt-4 text-[2.1rem] font-black leading-[0.98] text-[#161616]">
            清迈客栈是 CMI 在清迈的线下入口。
          </h2>
          <p className="mt-3 text-[15px] font-black leading-relaxed text-[#161616]/78">
            第一次到清迈，可以先从这个院子接上人和生活；住下、坐下、聊一下，再决定今晚去哪儿。
          </p>
        </div>
      </div>
    </section>
  );
}

function InnDetailSection({
  onOpenMap,
  onLeaveTrace,
}: {
  onOpenMap: () => void;
  onLeaveTrace: () => void;
}) {
  return (
    <section className="mt-5" id="inn-detail">
      <div className="relative overflow-hidden rounded-[1.45rem] border-2 border-[#161616] bg-[#2eb45e] p-4 shadow-[7px_8px_0_rgba(0,0,0,0.38)]">
        <ChapterHeader chapter="Chapter Three" title="how this courtyard works" />
        <div className="relative">
          <h2 className="text-[2.12rem] font-black leading-[0.98] text-[#161616]">
            一个可以落脚、碰面、留下故事的清迈院子
          </h2>
          <div className="mt-4 rounded-[1.1rem] border-2 border-[#161616] bg-[#fff9e8] p-4 shadow-[4px_5px_0_rgba(0,0,0,0.18)]">
            <QuestionAnswerBlock
              question="为什么要把详细介绍放在活动后面？"
              answer="先看最近有什么现场，再看这个院子适合怎么用。有人住几晚，有人参加一场活动，也有人只是路过，和桌边的人聊起接下来要做什么。"
            />
          </div>

          <div className="mt-4 grid gap-2">
            {cmiHomeIntroFacts.map(({ id, label, value, description, Icon }) => (
              <div
                key={id}
                className="grid grid-cols-[3.7rem_minmax(0,1fr)] items-center gap-3 rounded-[1.05rem] border-2 border-[#161616] bg-[#fff9e8] p-3 shadow-[3px_4px_0_rgba(0,0,0,0.16)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#161616] bg-[#ffe35b] text-[#161616]">
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[1.2rem] font-black leading-none text-[#161616]">{value}</p>
                    <p className="rounded-full border border-[#161616]/20 bg-[#ff6fba] px-2 py-0.5 text-[11px] font-black text-[#161616]">{label}</p>
                  </div>
                  <p className="mt-1 text-[12px] font-black leading-relaxed text-[#161616]/70">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="min-h-11 rounded-full border-2 border-[#161616] bg-[#245f3b] text-sm font-black text-white shadow-[3px_4px_0_rgba(0,0,0,0.24)] transition active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(0,0,0,0.2)]"
              onClick={onOpenMap}
            >
              <MapPin className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
              地图位置
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full border-2 border-[#161616] bg-[#fff9e8] text-sm font-black text-[#161616] shadow-[3px_4px_0_rgba(0,0,0,0.18)] transition active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(0,0,0,0.16)]"
              onClick={onLeaveTrace}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
              留一句
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventStampButton({
  hasStamped,
  isStamping,
  onStamp,
}: {
  hasStamped: boolean;
  isStamping: boolean;
  onStamp: () => void;
}) {
  return (
    <button
      type="button"
      disabled={hasStamped || isStamping}
      className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-[#161616] bg-[#2eb45e] px-3 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition hover:bg-[#36c86b] active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.18)] disabled:bg-[#fff9e8] disabled:text-[#161616]/70 disabled:shadow-none"
      onClick={(event) => {
        event.stopPropagation();
        onStamp();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label="盖戳"
    >
      <Stamp className="h-4 w-4" strokeWidth={2.5} />
      {hasStamped ? '已盖戳' : isStamping ? '盖戳中' : '盖戳'}
    </button>
  );
}

function EventShareButton({
  isSharing,
  onShare,
}: {
  isSharing: boolean;
  onShare: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isSharing}
      className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-[#161616] bg-[#ff6fba] px-3 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition hover:bg-[#ff83c4] active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.18)] disabled:bg-[#fff9e8] disabled:text-[#161616]/70 disabled:shadow-none"
      onClick={(event) => {
        event.stopPropagation();
        onShare();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label="转发活动到群"
    >
      <Share2 className="h-4 w-4" strokeWidth={2.5} />
      {isSharing ? '生成中' : '转发到群'}
    </button>
  );
}

function EventStickerDrawer({
  stickers,
  loading,
  onClose,
  onSelect,
}: {
  stickers: Sticker[];
  loading: boolean;
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/32 px-4"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        className="mx-auto w-full max-w-[520px] rounded-t-[1.55rem] border-2 border-[#2e2a23]/10 bg-[#fffdf8] p-5 pb-[calc(1.1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_48px_rgba(46,42,35,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-black text-[#8b5f32]">选择图章</p>
            <h2 className="mt-1 text-lg font-black leading-tight text-[#242424]">盖一个喜欢的戳</h2>
          </div>
          <button
            type="button"
            className="rounded-full border-2 border-[#2e2a23]/12 bg-white px-3 py-1.5 text-sm font-black text-[#5f4523] shadow-sm transition active:scale-[0.98]"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[5.8rem] animate-pulse rounded-[1rem] bg-[#edf6ee]" />
            ))
          ) : stickers.length > 0 ? (
            stickers.map(sticker => (
              <button
                key={sticker.id}
                type="button"
                className="flex min-h-[5.8rem] flex-col items-center justify-center gap-1.5 rounded-[1rem] border-2 border-[#2e2a23]/10 bg-white/88 p-2 text-center shadow-[2px_3px_0_rgba(46,42,35,0.08)] transition hover:bg-[#edf6ee] active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(46,42,35,0.08)]"
                onClick={() => onSelect(sticker)}
              >
                <img
                  src={sticker.icon_url}
                  alt=""
                  className="h-12 w-12 object-contain saturate-[0.85] contrast-[1.08]"
                  style={{ mixBlendMode: 'multiply' }}
                  loading="lazy"
                  decoding="async"
                />
                <span className="max-w-full truncate text-[11px] font-black leading-none text-[#5f4523]">
                  {sticker.name}
                </span>
              </button>
            ))
          ) : (
            <div className="col-span-4 rounded-[1rem] border border-[#2e2a23]/8 bg-white/86 p-4 text-sm font-black text-[#5f4523]">
              图章暂时没加载出来，稍后再试。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventPreviewCard({
  event,
  referenceDate,
  onOpenEvent,
  hasStamped,
  isStamping,
  isSharing,
  onShareEvent,
  onStampEvent,
}: {
  event: CmiEvent;
  referenceDate: Date;
  onOpenEvent: () => void;
  hasStamped: boolean;
  isStamping: boolean;
  isSharing: boolean;
  onShareEvent: () => void;
  onStampEvent: () => void;
}) {
  const posterUrl = getCmiEventPosterUrl(event.id) ?? getCmiEventCardBackgroundUrl(event.id) ?? '/cmi-home/event-ai-courtyard.png';
  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLElement>) => {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    keyboardEvent.preventDefault();
    onOpenEvent();
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={onOpenEvent}
      onKeyDown={handleKeyDown}
      className="cursor-pointer overflow-hidden rounded-[1.25rem] border-2 border-[#161616] bg-[#fff9e8] shadow-[4px_5px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:shadow-[4px_7px_0_rgba(0,0,0,0.22)] active:scale-[0.99]"
      aria-label={`查看${event.title}活动详情`}
    >
      <div className="relative m-3 h-[11.2rem] overflow-hidden rounded-[0.9rem] border-2 border-[#161616] bg-[#f6efe0]">
        <img
          src={posterUrl}
          alt={`${event.title}活动海报`}
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute right-3 top-3 rounded-sm border-2 border-[#161616] bg-[#ff6fba] px-3 py-1.5 text-[11px] font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.2)]">
          {event.priceLabel}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[1.52rem] font-black leading-[1.04] text-[#161616]">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-black leading-relaxed text-[#161616]/72">
          {event.summary}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="rounded-full border border-[#161616]/25 bg-[#2eb45e]/18 px-2.5 py-1 text-[11px] font-black leading-none text-[#161616]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(7.4rem,0.78fr)] gap-3 rounded-[1rem] border-2 border-[#161616]/18 bg-white/58 p-3 text-sm font-black text-[#161616]">
          <div className="grid min-w-0 gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0 text-[#161616]" strokeWidth={2.5} />
              <span className="min-w-0 leading-snug">{formatCmiEventTime(event, referenceDate)}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#161616]" strokeWidth={2.5} />
              <span className="min-w-0 leading-snug">{event.venueName}</span>
            </div>
          </div>
          <div className="grid min-w-0 content-center gap-1.5 border-l-2 border-dashed border-[#161616]/26 pl-3 text-right">
            <div>
              <p className="text-[10px] font-black leading-none text-[#161616]/55">费用</p>
              <p className="mt-1 text-[12px] font-black leading-tight text-[#161616]">{event.priceLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-black leading-none text-[#161616]/55">参与</p>
              <p className="mt-1 text-[12px] font-black leading-tight text-[#161616]">{event.registrationLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <EventShareButton isSharing={isSharing} onShare={onShareEvent} />
          <EventStampButton
            hasStamped={hasStamped}
            isStamping={isStamping}
            onStamp={onStampEvent}
          />
        </div>
      </div>
    </article>
  );
}

function YardNoticeWall({
  innEvents,
  referenceDate,
  onOpenAllEvents,
  onOpenEvent,
  stampedEventIds,
  stampingEventIds,
  sharingEventIds,
  onShareEvent,
  onStampEvent,
}: {
  innEvents: CmiEvent[];
  referenceDate: Date;
  onOpenAllEvents: () => void;
  onOpenEvent: (eventId: string) => void;
  stampedEventIds: Record<string, boolean>;
  stampingEventIds: Record<string, boolean>;
  sharingEventIds: Record<string, boolean>;
  onShareEvent: (event: CmiEvent) => void;
  onStampEvent: (eventId: string) => void;
}) {
  const visibleInnEvents = innEvents.slice(0, 4);
  const latestCheckedAtLabel = formatBangkokDateTime(
    getNewestTimestamp(innEvents.map(event => event.lastCheckedAt))
  );
  const verifiedEventCount = innEvents.filter(event => event.isVerified).length;

  return (
    <section className="mt-5" id="tomorrow-events">
      <div className="relative overflow-hidden rounded-[1.45rem] border-2 border-[#161616] bg-[#ffe35b] p-3 shadow-[8px_9px_0_rgba(0,0,0,0.4)]">
        <ChapterHeader chapter="Chapter Two" title="today at CMI inn" />
        <div className="relative mb-3 flex items-center justify-between gap-3 px-1 pt-1">
          <div>
            <p className="text-[12px] font-black text-[#161616]/72">自动同步看板</p>
            <h2 className="mt-1 text-[2.2rem] font-black leading-none text-[#161616]">客栈活动</h2>
          </div>
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[#161616] bg-[#fff9e8] px-3 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.18)] transition active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.16)]"
            onClick={onOpenAllEvents}
          >
            全部
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-[1rem] border-2 border-[#161616] bg-[#fff9e8] p-3 shadow-[2px_3px_0_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#161616]">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.5} />
              近期
            </div>
            <p className="mt-1 text-[1.25rem] font-black leading-none text-[#161616]">{innEvents.length} 场</p>
          </div>
          <div className="rounded-[1rem] border-2 border-[#161616] bg-[#fff9e8] p-3 shadow-[2px_3px_0_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#161616]">
              <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
              已核实
            </div>
            <p className="mt-1 text-[1.25rem] font-black leading-none text-[#161616]">{verifiedEventCount} 场</p>
          </div>
          <div className="rounded-[1rem] border-2 border-[#161616] bg-[#fff9e8] p-3 shadow-[2px_3px_0_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#161616]">
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
              同步
            </div>
            <p className="mt-1 text-[12px] font-black leading-tight text-[#161616]">{latestCheckedAtLabel}</p>
          </div>
        </div>

        <div className="relative space-y-3">
          {innEvents.length > 0 ? (
            visibleInnEvents.map(event => (
              <EventPreviewCard
                key={event.id}
                event={event}
                referenceDate={referenceDate}
                onOpenEvent={() => onOpenEvent(event.id)}
                hasStamped={Boolean(stampedEventIds[event.id])}
                isStamping={Boolean(stampingEventIds[event.id])}
                isSharing={Boolean(sharingEventIds[event.id])}
                onShareEvent={() => onShareEvent(event)}
                onStampEvent={() => onStampEvent(event.id)}
              />
            ))
          ) : (
            <div className="rounded-[1.2rem] border-2 border-[#161616] bg-[#fff9e8] p-4 text-sm font-black leading-relaxed text-[#161616] shadow-[3px_4px_0_rgba(0,0,0,0.18)]">
              <p>暂时还没贴新的客栈活动。晚点再来看看。</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-full border-2 border-[#161616] bg-[#2eb45e] px-4 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.18)] transition active:scale-[0.98]"
                onClick={onOpenAllEvents}
              >
                看清迈近期活动
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function InnRecordCard({
  record,
  profile,
  onOpenProfile,
}: {
  record: Recommendation;
  profile?: PublicProfile;
  onOpenProfile: () => void;
}) {
  const imageUrls = getRecordImages(record);
  const reasonText = getRecommendationReasonText(record);
  const displayName = profile?.user_name || record.user_name || 'CMI 朋友';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <article className="overflow-hidden rounded-[1.18rem] border-2 border-[#161616] bg-[#fff9e8] shadow-[4px_5px_0_rgba(0,0,0,0.2)]">
      <div className={imageUrls.length === 1 ? 'grid' : 'grid grid-cols-2 gap-1.5 p-1.5'}>
        {imageUrls.map((imageUrl, index) => (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`清迈客栈记录照片 ${index + 1}`}
            className={imageUrls.length === 1
              ? 'h-[12rem] w-full border-b-2 border-[#161616] object-cover'
              : 'h-[8.6rem] w-full rounded-[0.85rem] border-2 border-[#161616] object-cover'}
            loading="lazy"
          />
        ))}
      </div>
      <div className="p-4">
        <p className="text-[15px] font-black leading-relaxed text-[#161616]">
          “{reasonText}”
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-black text-[#161616]/72">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 rounded-full pr-2 text-left transition hover:text-[#245f3b] active:scale-[0.98]"
            onClick={onOpenProfile}
            aria-label={`打开${displayName}的个人主页`}
          >
            <Avatar className="h-8 w-8 border-2 border-[#161616] bg-[#2eb45e]">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} className="object-cover" />}
              <AvatarFallback className="bg-[#2eb45e] text-[12px] font-black text-[#161616]">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate">—— {displayName}</span>
          </button>
          <span className="shrink-0">{formatRecordDate(record.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function InnRecordsSection({
  records,
  loading,
  error,
  profilesByUserName,
  onOpenProfile,
}: {
  records: Recommendation[];
  loading: boolean;
  error: string | null;
  profilesByUserName: Record<string, PublicProfile>;
  onOpenProfile: () => void;
}) {
  const visibleRecords = records.filter(record => getRecordImages(record).length > 0).slice(0, 3);

  return (
    <section className="mt-5" id="inn-records">
      <div className="relative overflow-hidden rounded-[1.45rem] border-2 border-[#161616] bg-[#2eb45e] p-3 shadow-[8px_9px_0_rgba(0,0,0,0.4)]">
        <ChapterHeader chapter="Chapter Four" title="guest notes with photos" />
        <div className="relative">
          <div className="mb-3 flex items-end justify-between gap-3 px-1 pt-1">
            <h2 className="text-[2.1rem] font-black leading-tight text-[#161616]">大家说</h2>
            <ChapterPill tone="yellow">照片记录</ChapterPill>
          </div>

          <div className="grid gap-3">
            {loading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[10rem] animate-pulse rounded-[1.3rem] bg-white/70"
                />
              ))
            ) : error ? (
              <div className="rounded-[1.15rem] border-2 border-[#161616] bg-[#fff9e8] p-4 text-sm font-black leading-relaxed text-[#161616] shadow-[3px_4px_0_rgba(0,0,0,0.18)]">
                {error}
              </div>
            ) : visibleRecords.length > 0 ? (
              visibleRecords.map(record => (
                <InnRecordCard
                  key={record.id}
                  record={record}
                  profile={profilesByUserName[record.user_name]}
                  onOpenProfile={onOpenProfile}
                />
              ))
            ) : (
              <div className="rounded-[1.15rem] border-2 border-[#161616] bg-[#fff9e8] p-4 text-sm font-black leading-relaxed text-[#161616] shadow-[3px_4px_0_rgba(0,0,0,0.18)]">
                暂时还没有带照片的清迈客栈记录。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactQrCard({ contact }: { contact: CmiHomeContact }) {
  return (
    <a
      href={contact.imageUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-[10.2rem] flex-col items-center rounded-[1rem] border-2 border-[#161616] bg-[#fff9e8] px-1.5 py-2 text-center shadow-[3px_4px_0_rgba(0,0,0,0.18)] transition active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.16)]"
      aria-label={`打开${contact.name}的微信二维码`}
    >
      <div className="shrink-0">
        <img
          src={contact.imageUrl}
          alt={`${contact.name}微信二维码`}
          className="h-[4.65rem] w-[4.65rem] rounded-[0.4rem] border border-[#161616]/18 object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-[1.05rem] font-black leading-tight text-[#161616]">{contact.name}</h3>
        <p className="mt-1 text-[10.5px] font-black leading-tight text-[#161616]/72">{contact.role}</p>
        <p className="mt-1 text-[10px] font-bold leading-snug text-[#161616]/58">{contact.hint}</p>
      </div>
    </a>
  );
}

function ContactQrSection() {
  return (
    <section className="mt-5" id="wechat-contact">
      <div className="relative overflow-hidden rounded-[1.45rem] border-2 border-[#161616] bg-[#ff6fba] p-3 shadow-[8px_9px_0_rgba(0,0,0,0.4)]">
        <ChapterHeader chapter="Extra" title="wechat contact" />
        <div className="relative">
          <div className="mb-3 flex items-end justify-between gap-3 px-1 pt-1">
            <div>
              <p className="text-[12px] font-black text-[#161616]/72">微信联系</p>
              <h2 className="mt-1 text-[1.9rem] font-black leading-tight text-[#161616]">欢迎添加</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#161616] bg-[#ffe35b] text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.18)]">
              <QrCode className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.5} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {cmiHomeContacts.map(contact => (
              <ContactQrCard key={contact.id} contact={contact} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CmiHome() {
  const navigate = useNavigate();
  const referenceDate = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<CmiEvent[]>(CMI_EVENTS);
  const innEvents = useMemo(() => getPrimaryInnEvents(events, referenceDate), [events, referenceDate]);
  const visibleInnEventIdsKey = useMemo(
    () => innEvents.slice(0, 4).map(event => event.id).join('|'),
    [innEvents]
  );
  const [stampedEventIds, setStampedEventIds] = useState<Record<string, boolean>>({});
  const [stampingEventIds, setStampingEventIds] = useState<Record<string, boolean>>({});
  const [sharingEventIds, setSharingEventIds] = useState<Record<string, boolean>>({});
  const [availableStickers, setAvailableStickers] = useState<Sticker[]>([]);
  const [stickersLoading, setStickersLoading] = useState(true);
  const [activeStampEventId, setActiveStampEventId] = useState<string | null>(null);
  const [innRecords, setInnRecords] = useState<Recommendation[]>([]);
  const [innRecordsLoading, setInnRecordsLoading] = useState(true);
  const [innRecordsError, setInnRecordsError] = useState<string | null>(null);
  const [profilesByUserName, setProfilesByUserName] = useState<Record<string, PublicProfile>>({});

  useEffect(() => {
    let isMounted = true;

    getPublishedCmiEvents().then(data => {
      if (!isMounted) return;
      setEvents(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setStickersLoading(true);

    getAvailableStickers()
      .then(stickers => {
        if (!isMounted) return;
        setAvailableStickers(stickers);
      })
      .finally(() => {
        if (!isMounted) return;
        setStickersLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setInnRecordsLoading(true);
    setInnRecordsError(null);

    getRecommendationsByPlace(CMI_INN_PLACE_NAME, { throwOnError: true })
      .then(records => {
        if (!isMounted) return;
        setInnRecords(records);
      })
      .catch(() => {
        if (!isMounted) return;
        setInnRecords([]);
        setInnRecordsError('记录墙暂时没连上，稍后再刷新看看。');
      })
      .finally(() => {
        if (!isMounted) return;
        setInnRecordsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const userNames = innRecords.map(record => record.user_name);

    getProfilesByUserNames(userNames).then(profiles => {
      if (!isMounted) return;
      setProfilesByUserName(
        profiles.reduce<Record<string, PublicProfile>>((profilesByName, profile) => {
          if (profile.user_name) profilesByName[profile.user_name] = profile;
          return profilesByName;
        }, {})
      );
    });

    return () => {
      isMounted = false;
    };
  }, [innRecords]);

  const handleOpenProfile = () => {
    navigate(getProfilePath());
  };

  useEffect(() => {
    let isMounted = true;
    const eventIds = visibleInnEventIdsKey.split('|').filter(Boolean);

    if (eventIds.length === 0) {
      setStampedEventIds({});
      return () => {
        isMounted = false;
      };
    }

    const deviceId = getCmiEventStampDeviceId();

    getCmiEventStamps(eventIds).then(stamps => {
      if (!isMounted) return;

      setStampedEventIds(
        eventIds.reduce<Record<string, boolean>>((state, eventId) => {
          state[eventId] = stamps.some(stamp => stamp.eventId === eventId && stamp.deviceId === deviceId);
          return state;
        }, {})
      );
    });

    return () => {
      isMounted = false;
    };
  }, [visibleInnEventIdsKey]);

  const handleOpenStampDrawer = (eventId: string) => {
    if (stampedEventIds[eventId]) {
      toast('你已经给这个活动盖过戳了');
      return;
    }

    setActiveStampEventId(eventId);
  };

  const handleStampEvent = async (eventId: string, sticker: Sticker) => {
    setStampingEventIds(prev => ({ ...prev, [eventId]: true }));
    setActiveStampEventId(null);

    try {
      const nextStamp = await placeCmiEventStamp(eventId, { stampLabel: sticker.name });

      if (nextStamp) {
        setStampedEventIds(prev => ({ ...prev, [eventId]: true }));
        toast.success(`已盖上「${sticker.name}」`);
        return;
      }

      const deviceId = getCmiEventStampDeviceId();
      const refreshedStamps = await getCmiEventStamps([eventId]);
      setStampedEventIds(prev => ({
        ...prev,
        [eventId]: refreshedStamps.some(stamp => stamp.deviceId === deviceId),
      }));
      toast('这个活动已经有你的盖戳了');
    } finally {
      setStampingEventIds(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleSelectEventSticker = (sticker: Sticker) => {
    if (!activeStampEventId) return;
    void handleStampEvent(activeStampEventId, sticker);
  };

  const handleShareEvent = async (event: CmiEvent) => {
    const posterUrl = getCmiEventPosterUrl(event.id) ?? getCmiEventCardBackgroundUrl(event.id);

    if (!posterUrl) {
      toast.error('这个活动还没有可分享的海报');
      return;
    }

    setSharingEventIds(prev => ({ ...prev, [event.id]: true }));

    try {
      const card = await createCmiEventShareCard({
        event,
        posterUrl,
        referenceDate,
      });
      const file = new File([card.blob], card.fileName, { type: 'image/png' });
      const shareData: FileShareData = {
        files: [file],
        title: `CMI Map · ${event.title}`,
        text: `${event.title}｜${formatCmiEventTime(event, referenceDate)}，${event.venueName}`,
      };
      const navigatorWithFileShare = navigator as NavigatorWithFileShare;

      if (navigatorWithFileShare.share && (!navigatorWithFileShare.canShare || navigatorWithFileShare.canShare(shareData))) {
        try {
          await navigatorWithFileShare.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Failed to share CMI event card:', error);
        }
      }

      downloadCmiEventShareCard(card);
      toast.success('当前浏览器不支持直接分享，已改为下载活动图片');
    } catch (error) {
      console.error('Failed to create CMI event share card:', error);
      toast.error('活动卡片生成失败，请稍后再试');
    } finally {
      setSharingEventIds(prev => ({ ...prev, [event.id]: false }));
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#050505] text-[#161616]">
      <div className="pointer-events-none absolute left-[-3.4rem] top-[45%] h-24 w-24 rounded-full border-[5px] border-white/95" />
      <div className="pointer-events-none absolute right-[-2.4rem] top-[52%] h-20 w-20 rounded-full border-[5px] border-white/95" />

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="mx-auto flex max-w-[440px] items-center justify-between gap-3">
          <button
            type="button"
            className="pointer-events-auto min-h-12 rounded-full border-2 border-white/20 bg-white px-5 text-2xl font-black text-[#161616] shadow-[4px_5px_0_rgba(255,255,255,0.18)] transition active:scale-[0.98]"
            onClick={() => navigate('/')}
            aria-label="返回 CMI Map 首页"
          >
            CMI Map
          </button>
          <button
            type="button"
            className="pointer-events-auto group flex min-h-12 items-center rounded-full border-2 border-[#ffe35b] bg-[#ffe35b] py-1 pl-1 pr-4 font-black text-[#161616] shadow-[4px_5px_0_rgba(255,227,91,0.2)] transition active:scale-[0.98]"
            onClick={() => navigate('/map?scene=community')}
            aria-label="在地图上查看清迈客栈"
          >
            <img
              src="/cmi-home/go-inn-et-manga-button-icon.png"
              alt=""
              className="mr-2 h-10 w-10 rounded-full border-2 border-[#161616] object-cover transition group-active:scale-95"
              loading="eager"
              decoding="async"
            />
            <span>去客栈逛逛</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto h-full max-w-[440px] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+42px)] pt-[calc(env(safe-area-inset-top)+92px)]">
        <InnHeroChapter />

        <InnIntroSection />

        <YardNoticeWall
          innEvents={innEvents}
          referenceDate={referenceDate}
          onOpenAllEvents={() => navigate('/list?scene=tomorrow-events')}
          onOpenEvent={(eventId) => navigate(getCmiEventPath(eventId))}
          stampedEventIds={stampedEventIds}
          stampingEventIds={stampingEventIds}
          sharingEventIds={sharingEventIds}
          onShareEvent={handleShareEvent}
          onStampEvent={handleOpenStampDrawer}
        />

        <InnDetailSection
          onOpenMap={() => navigate('/map?scene=community')}
          onLeaveTrace={() => navigate(getAddTracePath(CMI_INN_PLACE_NAME))}
        />

        <InnRecordsSection
          records={innRecords}
          loading={innRecordsLoading}
          error={innRecordsError}
          profilesByUserName={profilesByUserName}
          onOpenProfile={handleOpenProfile}
        />

        <ContactQrSection />
      </main>

      {activeStampEventId && (
        <EventStickerDrawer
          stickers={availableStickers}
          loading={stickersLoading}
          onClose={() => setActiveStampEventId(null)}
          onSelect={handleSelectEventSticker}
        />
      )}
    </div>
  );
}
