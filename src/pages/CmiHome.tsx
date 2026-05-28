import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  Home,
  type LucideIcon,
  MapPin,
  MessageCircle,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getCmiEventCardBackgroundUrl, getCmiEventPosterUrl } from '@/data/cmi-event-details';
import {
  CMI_EVENTS,
  type CmiEvent,
  formatCmiEventTime,
  getUpcomingCmiEventsFromList,
} from '@/data/cmi-events';
import {
  getProfilesByUserIds,
  getProfilesByUserNames,
  getRecommendationsByPlace,
  type PublicProfile,
} from '@/db/api';
import {
  cancelCmiEventRegistration,
  getCurrentUserCmiEventRegistrations,
  getPublishedCmiEvents,
  registerForCmiEvent,
} from '@/db/cmi-events';
import { getStableProfileIdentity } from '@/features/profiles/profile-identity';
import { type CmiEventShareCardResult, createCmiEventShareCard } from '@/lib/cmi-event-share-card';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { getAddTracePath, getCmiEventPath, getPersonMapPath, getPublicCmiEventUrl } from '@/lib/paths';
import { CMI_INN_LOGO_ICON_URL, CMI_INN_PLACE_NAME, type Recommendation } from '@/types/types';

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
          一个运营三年的清迈华人社区，用温暖和安心照顾每一个到来的朋友。
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

function EventRegisterButton({
  hasRegistered,
  isRegistering,
  onRegister,
}: {
  hasRegistered: boolean;
  isRegistering: boolean;
  onRegister: () => void;
}) {
  const label = hasRegistered
    ? isRegistering
      ? '取消中'
      : '已报名'
    : isRegistering
      ? '报名中'
      : '报名';
  const buttonClassName = hasRegistered
    ? 'bg-[#fff9e8] hover:bg-[#fff1d2]'
    : 'bg-[#2eb45e] hover:bg-[#36c86b]';

  return (
    <button
      type="button"
      disabled={isRegistering}
      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-[#161616] px-3 text-sm font-black text-[#161616] shadow-[2px_3px_0_rgba(0,0,0,0.2)] transition active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(0,0,0,0.18)] disabled:bg-[#fff9e8] disabled:text-[#161616]/70 disabled:shadow-none ${buttonClassName}`}
      onClick={(event) => {
        event.stopPropagation();
        onRegister();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={hasRegistered ? '取消报名活动' : '报名活动'}
    >
      <CircleCheck className="h-4 w-4" strokeWidth={2.5} />
      {label}
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

function EventPreviewCard({
  event,
  referenceDate,
  onOpenEvent,
  hasRegistered,
  isRegistering,
  isSharing,
  onShareEvent,
  onRegisterEvent,
}: {
  event: CmiEvent;
  referenceDate: Date;
  onOpenEvent: () => void;
  hasRegistered: boolean;
  isRegistering: boolean;
  isSharing: boolean;
  onShareEvent: () => void;
  onRegisterEvent: () => void;
}) {
  const posterUrl =
    event.coverImageUrl?.trim() ||
    getCmiEventPosterUrl(event.id) ||
    getCmiEventCardBackgroundUrl(event.id) ||
    '/cmi-home/event-ai-courtyard.png';
  const registrationPreviewLabel = event.registrationLabel.includes('http')
    ? event.registrationLabel.split(/[；。]/)[0]?.trim() || '查看详情报名'
    : event.registrationLabel;
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

        <div className="mt-4 grid gap-3 rounded-[1rem] border-2 border-[#161616]/18 bg-white/58 p-3 text-sm font-black text-[#161616]">
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

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <EventShareButton isSharing={isSharing} onShare={onShareEvent} />
          <EventRegisterButton
            hasRegistered={hasRegistered}
            isRegistering={isRegistering}
            onRegister={onRegisterEvent}
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
  registeredEventIds,
  registeringEventIds,
  sharingEventIds,
  onShareEvent,
  onRegisterEvent,
}: {
  innEvents: CmiEvent[];
  referenceDate: Date;
  onOpenAllEvents: () => void;
  onOpenEvent: (eventId: string) => void;
  registeredEventIds: Record<string, boolean>;
  registeringEventIds: Record<string, boolean>;
  sharingEventIds: Record<string, boolean>;
  onShareEvent: (event: CmiEvent) => void;
  onRegisterEvent: (event: CmiEvent) => void;
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
                hasRegistered={Boolean(registeredEventIds[event.id])}
                isRegistering={Boolean(registeringEventIds[event.id])}
                isSharing={Boolean(sharingEventIds[event.id])}
                onShareEvent={() => onShareEvent(event)}
                onRegisterEvent={() => onRegisterEvent(event)}
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
  onOpenProfile: (record: Recommendation, profile?: PublicProfile) => void;
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
            onClick={() => onOpenProfile(record, profile)}
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
  profilesByUserId,
  profilesByUserName,
  onOpenProfile,
}: {
  records: Recommendation[];
  loading: boolean;
  error: string | null;
  profilesByUserId: Record<string, PublicProfile>;
  profilesByUserName: Record<string, PublicProfile>;
  onOpenProfile: (record: Recommendation, profile?: PublicProfile) => void;
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
                  profile={(record.user_id && profilesByUserId[record.user_id]) || profilesByUserName[record.user_name]}
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
  const { user, profile } = useAuth();
  const referenceDate = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<CmiEvent[]>(CMI_EVENTS);
  const innEvents = useMemo(() => getPrimaryInnEvents(events, referenceDate), [events, referenceDate]);
  const visibleInnEventIdsKey = useMemo(
    () => innEvents.slice(0, 4).map(event => event.id).join('|'),
    [innEvents]
  );
  const [registeredEventIds, setRegisteredEventIds] = useState<Record<string, boolean>>({});
  const [registeringEventIds, setRegisteringEventIds] = useState<Record<string, boolean>>({});
  const [sharingEventIds, setSharingEventIds] = useState<Record<string, boolean>>({});
  const [innRecords, setInnRecords] = useState<Recommendation[]>([]);
  const [innRecordsLoading, setInnRecordsLoading] = useState(true);
  const [innRecordsError, setInnRecordsError] = useState<string | null>(null);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, PublicProfile>>({});
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

    Promise.all([
      getProfilesByUserIds(innRecords.map(record => record.user_id)),
      getProfilesByUserNames(innRecords.filter(record => !record.user_id).map(record => record.user_name)),
    ]).then(([profilesById, profilesByLegacyName]) => {
      if (!isMounted) return;
      setProfilesByUserId(
        profilesById.reduce<Record<string, PublicProfile>>((profilesByIdMap, profile) => {
          profilesByIdMap[profile.id] = profile;
          return profilesByIdMap;
        }, {})
      );
      setProfilesByUserName(
        [...profilesById, ...profilesByLegacyName].reduce<Record<string, PublicProfile>>((profilesByName, profile) => {
          if (profile.user_name) profilesByName[profile.user_name] = profile;
          return profilesByName;
        }, {})
      );
    });

    return () => {
      isMounted = false;
    };
  }, [innRecords]);

  const handleOpenProfile = (record: Recommendation, profile?: PublicProfile) => {
    const identity = profile ? getStableProfileIdentity(profile) : record.user_id || record.user_name;
    navigate(getPersonMapPath(identity));
  };

  useEffect(() => {
    let isMounted = true;
    const eventIds = visibleInnEventIdsKey.split('|').filter(Boolean);

    if (eventIds.length === 0 || !user?.id) {
      setRegisteredEventIds({});
      return () => {
        isMounted = false;
      };
    }

    getCurrentUserCmiEventRegistrations(eventIds, user.id).then(registrations => {
      if (!isMounted) return;

      setRegisteredEventIds(
        eventIds.reduce<Record<string, boolean>>((state, eventId) => {
          state[eventId] = registrations.some(registration => registration.eventId === eventId);
          return state;
        }, {})
      );
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id, visibleInnEventIdsKey]);

  const handleQuickRegisterEvent = async (event: CmiEvent) => {
    if (!user?.id || !user.email) {
      toast('登录后可以一键报名', { description: '注册只需要一个邮箱。' });
      navigate('/login', { state: { from: '/cmi-home' } });
      return;
    }

    if (registeredEventIds[event.id]) {
      const confirmed = window.confirm(`确定要取消「${event.title}」的报名吗？`);
      if (!confirmed) return;

      setRegisteringEventIds(prev => ({ ...prev, [event.id]: true }));
      try {
        await cancelCmiEventRegistration({
          eventId: event.id,
          userId: user.id,
        });
        setRegisteredEventIds(prev => ({ ...prev, [event.id]: false }));
        toast.success('已取消报名');
      } catch (error) {
        const message = error instanceof Error ? error.message : '请稍后重试';
        toast.error('取消报名失败', { description: message });
      } finally {
        setRegisteringEventIds(prev => ({ ...prev, [event.id]: false }));
      }
      return;
    }

    if (!event.registrationEnabled || event.registrationStatus !== 'open') {
      toast.error('这个活动暂时不能一键报名');
      return;
    }

    const attendeeName = profile?.user_name?.trim() || user.email.split('@')[0] || 'CMI 朋友';

    setRegisteringEventIds(prev => ({ ...prev, [event.id]: true }));
    try {
      const result = await registerForCmiEvent({
        eventId: event.id,
        attendeeName,
        attendeeEmail: user.email,
        note: '从清迈客栈主页一键报名',
        userId: user.id,
      });

      setRegisteredEventIds(prev => ({ ...prev, [event.id]: true }));

      if (result.notificationError) {
        toast.warning('报名成功，邮件通知稍后需要补发');
      } else {
        toast.success('报名成功');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      if (message.toLowerCase().includes('duplicate')) {
        setRegisteredEventIds(prev => ({ ...prev, [event.id]: true }));
        toast('你已经报名这个活动了');
        return;
      }

      toast.error('报名失败', { description: message });
    } finally {
      setRegisteringEventIds(prev => ({ ...prev, [event.id]: false }));
    }
  };

  const handleShareEvent = async (event: CmiEvent) => {
    const posterUrl =
      event.coverImageUrl?.trim() || getCmiEventPosterUrl(event.id) || getCmiEventCardBackgroundUrl(event.id);

    if (!posterUrl) {
      toast.error('这个活动还没有可分享的海报');
      return;
    }

    setSharingEventIds(prev => ({ ...prev, [event.id]: true }));

    try {
      const eventPageUrl = getPublicCmiEventUrl(event.id);

      const card = await createCmiEventShareCard({
        event,
        posterUrl,
        referenceDate,
        eventPageUrl,
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
          registeredEventIds={registeredEventIds}
          registeringEventIds={registeringEventIds}
          sharingEventIds={sharingEventIds}
          onShareEvent={handleShareEvent}
          onRegisterEvent={handleQuickRegisterEvent}
        />

        <InnDetailSection
          onOpenMap={() => navigate('/map?scene=community')}
          onLeaveTrace={() => navigate(getAddTracePath(CMI_INN_PLACE_NAME))}
        />

        <InnRecordsSection
          records={innRecords}
          loading={innRecordsLoading}
          error={innRecordsError}
          profilesByUserId={profilesByUserId}
          profilesByUserName={profilesByUserName}
          onOpenProfile={handleOpenProfile}
        />

        <ContactQrSection />
      </main>
    </div>
  );
}
