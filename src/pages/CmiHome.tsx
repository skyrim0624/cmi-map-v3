import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  QrCode,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  type CmiEvent,
  formatCmiEventTime,
  getCmiEventTimeBucketLabel,
  getTomorrowCmiEvents,
} from '@/data/cmi-events';

interface CmiHomeCheckIn {
  id: string;
  author: string;
  dateLabel: string;
  imageUrl: string;
  title: string;
  note: string;
}

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

const cmiHomeCheckIns: CmiHomeCheckIn[] = [
  {
    id: 'yard-table',
    author: '来听分享的人',
    dateLabel: '5 月',
    imageUrl: '/cmi-home/checkin-yard-table.jpg',
    title: '活动散了也没人急着走。',
    note: '活动后大家又在院子里聊了很久。',
  },
  {
    id: 'doorway',
    author: '住过一晚的人',
    dateLabel: '5 月',
    imageUrl: '/cmi-home/checkin-doorway.jpg',
    title: '第一次来不太会尴尬。',
    note: '不用很会社交，先坐下就好。',
  },
  {
    id: 'garden',
    author: '下午来坐的人',
    dateLabel: '5 月',
    imageUrl: '/cmi-home/checkin-garden.jpg',
    title: '下午有树荫，能坐一会儿。',
    note: '不是景点，更像一个能缓一下的地方。',
  },
  {
    id: 'zebra',
    author: '拍照的人',
    dateLabel: '5 月',
    imageUrl: '/cmi-home/checkin-zebra.jpg',
    title: '一眼就记住那只斑马。',
    note: '院子里有一些奇怪但好记的小东西。',
  },
  {
    id: 'entrance',
    author: '活动组织者',
    dateLabel: '5 月',
    imageUrl: '/cmi-home/checkin-entrance.jpg',
    title: '活动前的院子很安静。',
    note: '活动开始前，大家会慢慢到。',
  },
];

const formatTomorrowLabel = (referenceDate: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 1));

const getPrimaryTomorrowEvents = (referenceDate: Date) => {
  const tomorrowEvents = getTomorrowCmiEvents(referenceDate);
  const cmiRelatedEvents = tomorrowEvents.filter(
    event => event.isCmiRelated || event.venueName.includes('清迈客栈') || event.area.includes('清迈客栈')
  );

  return cmiRelatedEvents.length > 0 ? cmiRelatedEvents : tomorrowEvents;
};

const formatEventStartClock = (event: CmiEvent) => {
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

function EventPreviewCard({ event, referenceDate }: { event: CmiEvent; referenceDate: Date }) {
  return (
    <article className="overflow-hidden rounded-[1.55rem] border-2 border-[#2e2a23]/10 bg-[#fffdf6] shadow-[5px_6px_0_rgba(46,42,35,0.10),0_16px_34px_rgba(46,42,35,0.10)]">
      <div className="relative h-[8.4rem] overflow-hidden border-b-2 border-[#2e2a23]/10">
        <img
          src="/cmi-home/event-ai-courtyard.png"
          alt=""
          className="h-full w-full object-cover object-left"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1f2f25]/78 via-[#1f2f25]/24 to-transparent" />
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
        <div className="mb-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#e8f2e7] px-2.5 py-1 text-[11px] font-black text-[#3f6e52]">
            客栈现场
          </span>
          <span className="rounded-full bg-[#f2e8ff] px-2.5 py-1 text-[11px] font-black text-[#755da9]">
            中文友好
          </span>
        </div>
        <h3 className="text-[1.48rem] font-black leading-[1.08] text-[#242424]">
          {event.title}
        </h3>

        <div className="mt-4 grid gap-2 rounded-[1.05rem] border border-[#2e2a23]/8 bg-[#fff7df] p-3 text-sm font-black text-[#3d3a33]">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#8b5f32]" strokeWidth={2.5} />
            <span>{formatCmiEventTime(event, referenceDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#8b5f32]" strokeWidth={2.5} />
            <span>{event.venueName}</span>
          </div>
        </div>

        {event.sourceUrl && (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3f6e52] px-4 text-base font-black text-white shadow-[0_10px_22px_rgba(63,110,82,0.22)] transition active:scale-[0.98]"
            aria-label={`${event.registrationLabel}: ${event.title}`}
          >
            {event.registrationLabel}
            <ChevronRight className="h-4 w-4" strokeWidth={3} />
          </a>
        )}
      </div>
    </article>
  );
}

function YardNoticeWall({
  tomorrowEvents,
  referenceDate,
  tomorrowLabel,
}: {
  tomorrowEvents: CmiEvent[];
  referenceDate: Date;
  tomorrowLabel: string;
}) {
  return (
    <section className="mt-5" id="tomorrow-events">
      <div className="relative overflow-hidden rounded-[1.8rem] border-2 border-[#2e2a23]/10 bg-[#fff9ec] p-3 shadow-[0_16px_42px_rgba(46,42,35,0.10)]">
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: 'linear-gradient(#3f6e52 1px, transparent 1px), linear-gradient(90deg, #3f6e52 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative mb-3 flex items-center justify-between gap-3 px-1 pt-1">
          <div>
            <p className="text-[12px] font-black text-[#3f6e52]">明天在客栈</p>
            <h2 className="mt-1 text-[2.05rem] font-black leading-none text-[#242424]">{tomorrowLabel}</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2e2a23]/8 bg-white/82 text-[#3f6e52] shadow-sm">
            <CalendarDays className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        <div className="relative space-y-3">
          {tomorrowEvents.length > 0 ? (
            tomorrowEvents.slice(0, 2).map(event => (
              <EventPreviewCard key={event.id} event={event} referenceDate={referenceDate} />
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-white/90 p-4 text-sm font-black leading-relaxed text-[#5f4523] shadow-[0_14px_35px_rgba(46,42,35,0.08)]">
              明天还没贴活动。晚点再来看看。
            </div>
          )}
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

function MemoryNoteCard({ checkIn }: { checkIn: CmiHomeCheckIn }) {
  return (
    <article className="flex gap-3 rounded-[1.15rem] bg-white/62 px-2 py-3">
      <div className="relative h-[4.6rem] w-[4.6rem] shrink-0 overflow-hidden rounded-[0.85rem] bg-[#f7f0e5]">
        {checkIn.imageUrl && (
          <img
            src={checkIn.imageUrl}
            alt={checkIn.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black leading-none text-[#6d6a62]">
          {checkIn.dateLabel} · {checkIn.author}
        </p>
        <p className="mt-1 text-[1.05rem] font-black leading-snug text-[#242424]">{checkIn.title}</p>
        <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-[#5f4523]">{checkIn.note}</p>
      </div>
    </article>
  );
}

function MemoryWall() {
  return (
    <section id="memory-wall" className="mt-5">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[12px] font-black text-[#8b5f32]">地点记录</p>
          <h2 className="mt-1 text-[1.7rem] font-black leading-tight text-[#242424]">大家在客栈留下的</h2>
        </div>
        <span className="rounded-full border border-[#8b5f32]/15 bg-white/70 px-3 py-1.5 text-[11px] font-black text-[#5f4523]">
          推荐 / 记忆
        </span>
      </div>

      <div className="space-y-2.5">
        {cmiHomeCheckIns.map(checkIn => (
          <MemoryNoteCard key={checkIn.id} checkIn={checkIn} />
        ))}
      </div>
    </section>
  );
}

export default function CmiHome() {
  const navigate = useNavigate();
  const referenceDate = useMemo(() => new Date(), []);
  const tomorrowEvents = useMemo(() => getPrimaryTomorrowEvents(referenceDate), [referenceDate]);
  const tomorrowLabel = useMemo(() => formatTomorrowLabel(referenceDate), [referenceDate]);

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

        <YardNoticeWall tomorrowEvents={tomorrowEvents} referenceDate={referenceDate} tomorrowLabel={tomorrowLabel} />

        <ContactQrSection />

        <MemoryWall />
      </main>
    </div>
  );
}
