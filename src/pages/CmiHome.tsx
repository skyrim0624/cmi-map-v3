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
  Sparkles,
  Stamp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getCmiEventCardBackgroundUrl } from '@/data/cmi-event-details';
import {
  CMI_EVENTS,
  type CmiEvent,
  formatCmiEventTime,
  getCmiEventTimeBucketLabel,
  getUpcomingCmiEventsFromList,
} from '@/data/cmi-events';
import { getAvailableStickers, getProfilesByUserNames, getRecommendationsByPlace, type PublicProfile } from '@/db/api';
import {
  getCmiEventStampDeviceId,
  getCmiEventStamps,
  placeCmiEventStamp,
} from '@/db/cmi-event-stamps';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { getAddTracePath, getCmiEventPath, getPersonMapPath } from '@/lib/paths';
import type { Recommendation, Sticker } from '@/types/types';

const CMI_INN_PLACE_NAME = '清迈客栈';
const CMI_INN_TIME_ZONE = 'Asia/Bangkok';

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

const formatEventStartClock = (event: CmiEvent) => {
  if (event.stableSchedule && event.tags.includes('具体时段待确认')) {
    return '待定';
  }

  if (event.startAt) {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    }).format(new Date(event.startAt));
  }

  return event.recurrence?.startTime ?? '待定';
};

function InnIntroSection() {
  return (
    <section className="mt-5" id="inn-intro">
      <div className="rounded-[1.45rem] border-2 border-[#2e2a23]/10 bg-[#fff9ec] px-4 py-4 shadow-[0_12px_30px_rgba(46,42,35,0.08)]">
        <p className="text-[12px] font-black text-[#8b5f32]">客栈介绍</p>
        <h2 className="mt-1 text-[1.55rem] font-black leading-tight text-[#242424]">
          清迈客栈是 CMI 在清迈的线下入口。
        </h2>
        <p className="mt-2 text-[14px] font-bold leading-relaxed text-[#4a463d]">
          能住、能来坐，也能参加社区活动；第一次到清迈，可以先从这个院子接上人和生活。
        </p>
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
      <div className="overflow-hidden rounded-[1.8rem] border-2 border-[#2e2a23]/10 bg-[#fff9ec] shadow-[0_16px_42px_rgba(46,42,35,0.09)]">
        <div className="px-4 py-4">
          <p className="text-[12px] font-black text-[#8b5f32]">客栈介绍</p>
          <h2 className="mt-1 text-[1.9rem] font-black leading-tight text-[#242424]">
            一个可以落脚、碰面、留下故事的清迈院子
          </h2>
          <p className="mt-3 text-[15px] font-bold leading-relaxed text-[#4a463d]">
            清迈客栈不是单纯的住宿点。它更像 CMI 社区在清迈的线下客厅：有人来住几晚，有人来参加一场活动，也有人只是路过院子，和桌边的人聊起接下来要做什么。
          </p>

          <div className="mt-4 grid gap-2">
            {cmiHomeIntroFacts.map(({ id, label, value, description, Icon }) => (
              <div
                key={id}
                className="grid grid-cols-[3.6rem_minmax(0,1fr)] items-center gap-3 rounded-[1.05rem] border border-[#2e2a23]/8 bg-white/76 p-3"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-[#e8f1e5] text-[#3f6e52]">
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[1.15rem] font-black leading-none text-[#242424]">{value}</p>
                    <p className="rounded-full bg-[#fff0d5] px-2 py-0.5 text-[11px] font-black text-[#8b5f32]">{label}</p>
                  </div>
                  <p className="mt-1 text-[12px] font-bold leading-relaxed text-[#6d6a62]">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="min-h-11 rounded-full bg-[#3f6e52] text-sm font-black text-white shadow-[0_10px_20px_rgba(63,110,82,0.18)]"
              onClick={onOpenMap}
            >
              <MapPin className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
              地图位置
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full border-[#8b5f32]/25 bg-white text-sm font-black text-[#5f4523]"
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
      className="ml-auto mt-3 flex min-h-9 w-fit items-center justify-center gap-1.5 rounded-full border border-[#3f6e52]/18 bg-white/88 px-3 text-sm font-black text-[#3f6e52] shadow-sm transition hover:bg-[#edf6ee] active:scale-[0.97] disabled:bg-[#e8f1e5] disabled:text-[#3f6e52] disabled:shadow-none"
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
        className="mx-auto w-full max-w-[520px] rounded-t-[1.55rem] border border-[#2e2a23]/10 bg-[#fffdf8] p-5 pb-[calc(1.1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_48px_rgba(46,42,35,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-black text-[#8b5f32]">选择图章</p>
            <h2 className="mt-1 text-lg font-black leading-tight text-[#242424]">盖一个喜欢的戳</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-[#2e2a23]/10 bg-white px-3 py-1.5 text-sm font-black text-[#5f4523] shadow-sm transition active:scale-[0.98]"
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
                className="flex min-h-[5.8rem] flex-col items-center justify-center gap-1.5 rounded-[1rem] border border-[#2e2a23]/10 bg-white/88 p-2 text-center shadow-sm transition hover:bg-[#edf6ee] active:scale-[0.96]"
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
  onStampEvent,
}: {
  event: CmiEvent;
  referenceDate: Date;
  onOpenEvent: () => void;
  hasStamped: boolean;
  isStamping: boolean;
  onStampEvent: () => void;
}) {
  const cardBackgroundUrl = getCmiEventCardBackgroundUrl(event.id) ?? '/cmi-home/event-ai-courtyard.png';
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
      className="cursor-pointer overflow-hidden rounded-[1.55rem] border-2 border-[#2e2a23]/10 bg-[#fffdf6] shadow-[5px_6px_0_rgba(46,42,35,0.10),0_16px_34px_rgba(46,42,35,0.10)] transition hover:-translate-y-0.5 hover:shadow-[5px_8px_0_rgba(46,42,35,0.10),0_18px_38px_rgba(46,42,35,0.12)] active:scale-[0.99]"
      aria-label={`查看${event.title}活动详情`}
    >
      <div className="relative h-[11.2rem] overflow-hidden border-b-2 border-[#2e2a23]/10 bg-[#f6efe0]">
        <img
          src={cardBackgroundUrl}
          alt={`${event.title}活动横幅图`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1f2f25]/64 via-[#1f2f25]/16 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1c1a15]/45 to-transparent" />
        <div className="absolute right-3 top-3 rounded-full bg-[#fff8df]/95 px-3 py-1.5 text-[11px] font-black text-[#335941] shadow-sm">
          {event.priceLabel}
        </div>
        <div className="absolute left-3 top-3 flex min-h-[4rem] w-[4.9rem] flex-col items-center justify-center rounded-[1.05rem] border-2 border-white/45 bg-[#3f7a60] px-3 text-center text-white shadow-[0_10px_22px_rgba(25,55,42,0.28)]">
          <span className="text-[11px] font-black leading-none text-white/80">
            {getCmiEventTimeBucketLabel(event, referenceDate)}
          </span>
          <span className="mt-1 text-[1.28rem] font-black leading-none">
            {formatEventStartClock(event)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[1.48rem] font-black leading-[1.08] text-[#242424]">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-relaxed text-[#5b564d]">
          {event.summary}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="rounded-full border border-[#3f6e52]/15 bg-[#edf6ee] px-2.5 py-1 text-[11px] font-black leading-none text-[#3f6e52]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(7.4rem,0.78fr)] gap-3 rounded-[1.05rem] border border-[#2e2a23]/8 bg-[#fff7df] p-3 text-sm font-black text-[#3d3a33]">
          <div className="grid min-w-0 gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0 text-[#8b5f32]" strokeWidth={2.5} />
              <span className="min-w-0 leading-snug">{formatCmiEventTime(event, referenceDate)}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#8b5f32]" strokeWidth={2.5} />
              <span className="min-w-0 leading-snug">{event.venueName}</span>
            </div>
          </div>
          <div className="grid min-w-0 content-center gap-1.5 border-l border-[#8b5f32]/20 pl-3 text-right">
            <div>
              <p className="text-[10px] font-black leading-none text-[#8b5f32]/75">费用</p>
              <p className="mt-1 text-[12px] font-black leading-tight text-[#3d3a33]">{event.priceLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-black leading-none text-[#8b5f32]/75">参与</p>
              <p className="mt-1 text-[12px] font-black leading-tight text-[#3d3a33]">{event.registrationLabel}</p>
            </div>
          </div>
        </div>

        <EventStampButton
          hasStamped={hasStamped}
          isStamping={isStamping}
          onStamp={onStampEvent}
        />
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
  onStampEvent,
}: {
  innEvents: CmiEvent[];
  referenceDate: Date;
  onOpenAllEvents: () => void;
  onOpenEvent: (eventId: string) => void;
  stampedEventIds: Record<string, boolean>;
  stampingEventIds: Record<string, boolean>;
  onStampEvent: (eventId: string) => void;
}) {
  const visibleInnEvents = innEvents.slice(0, 4);
  const latestCheckedAtLabel = formatBangkokDateTime(
    getNewestTimestamp(innEvents.map(event => event.lastCheckedAt))
  );
  const verifiedEventCount = innEvents.filter(event => event.isVerified).length;

  return (
    <section className="mt-5" id="tomorrow-events">
      <div className="relative overflow-hidden rounded-[1.8rem] border-2 border-[#2e2a23]/10 bg-[#fff9ec] p-3 shadow-[0_16px_42px_rgba(46,42,35,0.10)]">
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: 'linear-gradient(#3f6e52 1px, transparent 1px), linear-gradient(90deg, #3f6e52 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative mb-3 flex items-center justify-between gap-3 px-1 pt-1">
          <div>
            <p className="text-[12px] font-black text-[#3f6e52]">自动同步看板</p>
            <h2 className="mt-1 text-[2.05rem] font-black leading-none text-[#242424]">客栈活动</h2>
          </div>
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-[#2e2a23]/8 bg-white/82 px-3 text-sm font-black text-[#3f6e52] shadow-sm transition active:scale-[0.98]"
            onClick={onOpenAllEvents}
          >
            全部
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-[1rem] border border-[#3f6e52]/12 bg-white/78 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#3f6e52]">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.5} />
              近期
            </div>
            <p className="mt-1 text-[1.25rem] font-black leading-none text-[#242424]">{innEvents.length} 场</p>
          </div>
          <div className="rounded-[1rem] border border-[#3f6e52]/12 bg-white/78 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#3f6e52]">
              <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
              已核实
            </div>
            <p className="mt-1 text-[1.25rem] font-black leading-none text-[#242424]">{verifiedEventCount} 场</p>
          </div>
          <div className="rounded-[1rem] border border-[#3f6e52]/12 bg-white/78 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[#3f6e52]">
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
              同步
            </div>
            <p className="mt-1 text-[12px] font-black leading-tight text-[#242424]">{latestCheckedAtLabel}</p>
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
                onStampEvent={() => onStampEvent(event.id)}
              />
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-white/90 p-4 text-sm font-black leading-relaxed text-[#5f4523] shadow-[0_14px_35px_rgba(46,42,35,0.08)]">
              <p>暂时还没贴新的客栈活动。晚点再来看看。</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-full bg-[#3f6e52] px-4 text-sm font-black text-white shadow-[0_10px_20px_rgba(63,110,82,0.18)] transition active:scale-[0.98]"
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
    <article className="overflow-hidden rounded-[1.3rem] border border-[#2e2a23]/8 bg-white/90 shadow-[0_14px_30px_rgba(46,42,35,0.08)]">
      <div className={imageUrls.length === 1 ? 'grid' : 'grid grid-cols-2 gap-1.5 p-1.5'}>
        {imageUrls.map((imageUrl, index) => (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`清迈客栈记录照片 ${index + 1}`}
            className={imageUrls.length === 1
              ? 'h-[12rem] w-full object-cover'
              : 'h-[8.6rem] w-full rounded-[1rem] object-cover'}
            loading="lazy"
          />
        ))}
      </div>
      <div className="p-4">
        <p className="text-[15px] font-black leading-relaxed text-[#242424]">
          “{reasonText}”
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-black text-[#7a6b58]">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 rounded-full pr-2 text-left transition hover:text-[#3f6e52] active:scale-[0.98]"
            onClick={onOpenProfile}
            aria-label={`打开${displayName}的清迈地图`}
          >
            <Avatar className="h-8 w-8 border border-[#2e2a23]/10 bg-[#e8f1e5]">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} className="object-cover" />}
              <AvatarFallback className="bg-[#e8f1e5] text-[12px] font-black text-[#3f6e52]">
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
  onOpenProfile: (userName: string) => void;
}) {
  const visibleRecords = records.filter(record => getRecordImages(record).length > 0).slice(0, 3);

  return (
    <section className="mt-5" id="inn-records">
      <div className="mb-3 px-1">
        <h2 className="text-[1.7rem] font-black leading-tight text-[#242424]">大家说</h2>
      </div>

      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-[8.8rem] animate-pulse rounded-[1.3rem] bg-white/70"
            />
          ))
        ) : error ? (
          <div className="rounded-[1.3rem] border border-[#2e2a23]/8 bg-white/86 p-4 text-sm font-black leading-relaxed text-[#5f4523] shadow-[0_12px_26px_rgba(46,42,35,0.06)]">
            {error}
          </div>
        ) : visibleRecords.length > 0 ? (
          visibleRecords.map(record => (
            <InnRecordCard
              key={record.id}
              record={record}
              profile={profilesByUserName[record.user_name]}
              onOpenProfile={() => onOpenProfile(record.user_name)}
            />
          ))
        ) : (
          <div className="rounded-[1.3rem] border border-[#2e2a23]/8 bg-white/86 p-4 text-sm font-black leading-relaxed text-[#5f4523] shadow-[0_12px_26px_rgba(46,42,35,0.06)]">
            暂时还没有带照片的清迈客栈记录。
          </div>
        )}
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
      className="group flex min-h-[9.4rem] flex-col items-center px-1 py-1 text-center transition active:scale-[0.99]"
      aria-label={`打开${contact.name}的微信二维码`}
    >
      <div className="shrink-0">
        <img
          src={contact.imageUrl}
          alt={`${contact.name}微信二维码`}
          className="h-[4.65rem] w-[4.65rem] rounded-[0.4rem] object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-[1.05rem] font-black leading-tight text-[#242424]">{contact.name}</h3>
        <p className="mt-1 text-[10.5px] font-black leading-tight text-[#5f4523]">{contact.role}</p>
        <p className="mt-1 text-[10px] font-bold leading-snug text-[#6d6a62]">{contact.hint}</p>
      </div>
    </a>
  );
}

function ContactQrSection() {
  return (
    <section className="mt-5" id="wechat-contact">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[12px] font-black text-[#8b5f32]">微信联系</p>
          <h2 className="mt-1 text-[1.7rem] font-black leading-tight text-[#242424]">欢迎添加</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/86 text-[#8b5f32] shadow-sm">
          <QrCode className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.5} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {cmiHomeContacts.map(contact => (
          <ContactQrCard key={contact.id} contact={contact} />
        ))}
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

  const handleOpenProfile = (userName: string) => {
    if (!userName) return;
    navigate(getPersonMapPath(userName));
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

  return (
    <div
      className="min-h-[100dvh] bg-[#fffdf8] text-[#242424]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 8%, rgba(63,110,82,0.12), transparent 28%), radial-gradient(circle at 92% 28%, rgba(143,119,191,0.12), transparent 30%), linear-gradient(rgba(139,95,50,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,95,50,0.04) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 30px 30px, 30px 30px',
      }}
    >
      <header className="sticky top-0 z-30 border-b border-[#2e2a23]/10 bg-[#fffdf8]/90 px-4 py-[calc(env(safe-area-inset-top)+10px)] pb-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="min-h-11 rounded-full border border-[#2e2a23]/12 bg-white/90 px-5 text-xl font-black text-[#242424] shadow-sm"
            onClick={() => navigate('/')}
            aria-label="返回 CMI Map 首页"
          >
            CMI Map
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="group min-h-12 rounded-full border-[#3f6e52]/25 bg-white py-1 pl-1 pr-4 font-black text-[#335941] shadow-[0_8px_18px_rgba(63,110,82,0.12)] transition active:scale-[0.98]"
            onClick={() => navigate('/map?scene=community')}
            aria-label="在地图上查看清迈客栈"
          >
            <img
              src="/cmi-home/go-inn-et-manga-button-icon.png"
              alt=""
              className="mr-2 h-10 w-10 rounded-full border border-[#3f6e52]/15 object-cover shadow-sm transition group-active:scale-95"
              loading="eager"
              decoding="async"
            />
            <span>去客栈逛逛</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-5">
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-[#2e2a23]/12 bg-[#eef6ea] shadow-[0_18px_45px_rgba(63,110,82,0.14)]">
          <img
            src="/cmi-home/yard-scene.jpg"
            alt="清迈客栈院子插画"
            className="aspect-[1/0.92] w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-[2.65rem] font-black leading-[0.95] text-white drop-shadow-sm">
              清迈客栈
            </h1>
            <p className="mt-2 max-w-[330px] text-sm font-bold leading-relaxed text-white/90">
              一个能住、能来坐、能参加活动，也能从这里接上清迈生活的人情入口。
            </p>
          </div>
        </section>

        <InnIntroSection />

        <YardNoticeWall
          innEvents={innEvents}
          referenceDate={referenceDate}
          onOpenAllEvents={() => navigate('/list?scene=tomorrow-events')}
          onOpenEvent={(eventId) => navigate(getCmiEventPath(eventId))}
          stampedEventIds={stampedEventIds}
          stampingEventIds={stampingEventIds}
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
