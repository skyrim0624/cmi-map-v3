import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  Clock3,
  Loader2,
  type LucideIcon,
  MapPin,
  MapPinned,
  MessageSquareText,
  Navigation,
  Stamp,
  Ticket,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CMI_INN_EVENT_LOCATION,
  type CmiEventDetailBlock,
  getCmiEventDetailContent,
  getCmiEventPosterUrl,
} from '@/data/cmi-event-details';
import {
  type CmiEvent,
  formatCmiEventTime,
  getCmiEventById,
  getCmiEventTimeBucketLabel,
  getCmiEventTypeLabel,
} from '@/data/cmi-events';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { getCmiBlackboardPath, getCmiHomePath, getPlaceMapPath, getSceneMapPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

const WANT_TO_GO_STORAGE_PREFIX = 'cmi-map:event-want-to-go:';

const decodeRouteParam = (value: string | undefined) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const renderPostBlock = (block: CmiEventDetailBlock, index: number) => {
  if (block.kind === 'heading') {
    return (
      <h3 key={`${block.kind}-${index}`} className="pt-2 text-lg font-black leading-tight text-[#242424]">
        {block.text}
      </h3>
    );
  }

  if (block.kind === 'list') {
    return (
      <ul key={`${block.kind}-${index}`} className="space-y-2">
        {block.items.map(item => (
          <li key={item} className="flex gap-2 text-[15px] font-bold leading-relaxed text-[#4f4639]">
            <span className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#3f6e52]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={`${block.kind}-${index}`} className="text-[15px] font-bold leading-[1.85] text-[#4f4639]">
      {block.text}
    </p>
  );
};

function EventInfoRow({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[2.35rem_minmax(0,1fr)] gap-3 rounded-[1rem] border border-[#2e2a23]/8 bg-white/78 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-[0.85rem] bg-[#fff0d5] text-[#8b5f32]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black leading-none text-[#8b5f32]">{label}</p>
        <p className="mt-1.5 text-[14px] font-black leading-snug text-[#30302b]">{value}</p>
      </div>
    </div>
  );
}

function EventInfoTile({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[#2e2a23]/8 bg-white/78 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-black leading-none text-[#8b5f32]">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        {label}
      </div>
      <p className="mt-2 text-[13px] font-black leading-snug text-[#30302b]">{value}</p>
    </div>
  );
}

export default function CmiEventDetail() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = useMemo(() => decodeRouteParam(eventIdParam), [eventIdParam]);
  const navigate = useNavigate();
  const referenceDate = useMemo(() => new Date(), []);
  const [event, setEvent] = useState<CmiEvent | null>(() => getCmiEventById(eventId));
  const [loading, setLoading] = useState(true);
  const [rideDialogOpen, setRideDialogOpen] = useState(false);
  const [wantToGo, setWantToGo] = useState(false);

  const detailContent = getCmiEventDetailContent(eventId);
  const posterUrl = detailContent?.posterUrl ?? getCmiEventPosterUrl(eventId) ?? '/cmi-home/event-ai-courtyard.png';
  const postTitle = detailContent?.postTitle ?? event?.title ?? '活动详情';
  const postBlocks = detailContent?.postBlocks ?? [
    {
      kind: 'paragraph' as const,
      text: event?.summary ?? '这场活动的完整推文还在整理中，先放上已经核实的时间、地点和参与方式。',
    },
  ];
  const locationLabel = event ? `${event.venueName}${event.area ? ` · ${event.area}` : ''}` : '';

  const navigationTarget = useMemo(() => {
    if (event?.mapLocation) {
      return {
        name: event.venueName,
        clipboardName: event.venueName,
        latitude: event.mapLocation.latitude,
        longitude: event.mapLocation.longitude,
      };
    }

    return CMI_INN_EVENT_LOCATION;
  }, [event]);

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    setEvent(getCmiEventById(eventId));

    getPublishedCmiEvents()
      .then(events => {
        if (!isMounted) return;
        setEvent(events.find(candidate => candidate.id === eventId) ?? getCmiEventById(eventId));
      })
      .catch(() => {
        if (!isMounted) return;
        setEvent(getCmiEventById(eventId));
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    setWantToGo(window.localStorage.getItem(`${WANT_TO_GO_STORAGE_PREFIX}${eventId}`) === '1');
  }, [eventId]);

  const handleToggleWantToGo = () => {
    if (!eventId) return;

    const nextValue = !wantToGo;
    setWantToGo(nextValue);

    if (nextValue) {
      window.localStorage.setItem(`${WANT_TO_GO_STORAGE_PREFIX}${eventId}`, '1');
      toast.success('已盖上想去戳');
    } else {
      window.localStorage.removeItem(`${WANT_TO_GO_STORAGE_PREFIX}${eventId}`);
      toast('已取消想去戳');
    }
  };

  const handleOpenCmiMap = () => {
    if (event?.mapLocation) {
      navigate(getSceneMapPath('tomorrow-events', { eventId: event.id }));
      return;
    }

    navigate(getPlaceMapPath(CMI_INN_EVENT_LOCATION.name));
  };

  const handleOpenBlackboardComposer = () => {
    if (!event) return;
    navigate(getCmiBlackboardPath({ compose: true, eventId: event.id }));
  };

  const handleOpenGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${navigationTarget.latitude},${navigationTarget.longitude}`,
      '_blank'
    );
  };

  const copyNavigationTargetName = async (appName: string) => {
    try {
      await navigator.clipboard.writeText(navigationTarget.clipboardName);
      toast.success('已复制地点名称', { description: `打开 ${appName} 后粘贴搜索更稳。` });
    } catch {
      toast(`正在打开 ${appName}`);
    }
  };

  const handleGrab = async () => {
    await copyNavigationTargetName('Grab');
    setTimeout(() => {
      const dropOffName = encodeURIComponent(navigationTarget.clipboardName);
      window.open(
        `grab://open?screenType=RIDE&dropOffLatitude=${navigationTarget.latitude}&dropOffLongitude=${navigationTarget.longitude}&dropOffName=${dropOffName}`,
        '_self'
      );
    }, 600);
  };

  const handleBolt = async () => {
    await copyNavigationTargetName('Bolt');
    setTimeout(() => {
      const webFallback = `https://m.bolt.eu/ride/request?destination_lat=${navigationTarget.latitude}&destination_lng=${navigationTarget.longitude}`;
      let didLeave = false;
      const onVisibilityChange = () => {
        didLeave = true;
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.location.href = `bolt://ride?destination_lat=${navigationTarget.latitude}&destination_lng=${navigationTarget.longitude}`;

      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (!didLeave) {
          window.open(webFallback, '_blank');
        }
      }, 1500);
    }, 600);
  };

  if (loading && !event) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#fffdf8] text-[#242424]">
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在打开活动详情
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[100dvh] bg-[#fffdf8] px-4 py-[calc(env(safe-area-inset-top)+28px)] text-[#242424]">
        <div className="mx-auto max-w-[520px] rounded-[1.5rem] border border-[#2e2a23]/10 bg-white p-5 shadow-sm">
          <p className="text-lg font-black">这个活动暂时没找到</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#6d6a62]">
            可能是活动已经下线，或者链接里的活动编号不完整。
          </p>
          <Button
            className="mt-5 min-h-12 rounded-full bg-[#3f6e52] px-5 font-black text-white"
            onClick={() => navigate(getCmiHomePath())}
          >
            回到清迈客栈
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-[#fffdf8] text-[#242424]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 6%, rgba(63,110,82,0.14), transparent 28%), radial-gradient(circle at 92% 28%, rgba(143,119,191,0.12), transparent 30%), linear-gradient(rgba(139,95,50,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,95,50,0.04) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 30px 30px, 30px 30px',
      }}
    >
      <header className="sticky top-0 z-40 border-b border-[#2e2a23]/10 bg-[#fffdf8]/92 px-4 py-[calc(env(safe-area-inset-top)+10px)] pb-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="min-h-11 rounded-full border border-[#2e2a23]/12 bg-white/90 px-4 text-base font-black text-[#242424] shadow-sm"
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <span className="rounded-full bg-[#e8f2e7] px-3 py-1.5 text-[12px] font-black text-[#3f6e52]">
            活动详情
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] px-4 pb-28 pt-4">
        <section className="overflow-hidden rounded-[1.7rem] border-2 border-[#2e2a23]/10 bg-[#fff9ec] shadow-[5px_6px_0_rgba(46,42,35,0.10),0_18px_42px_rgba(46,42,35,0.10)]">
          <img
            src={posterUrl}
            alt={`${event.title}完整海报`}
            className="max-h-[74vh] w-full bg-[#f7efe0] object-contain"
            loading="eager"
          />
        </section>

        <section className="mt-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f2e7] px-3 py-1.5 text-[12px] font-black text-[#3f6e52]">
              <CalendarDays className="h-3.5 w-3.5" />
              {getCmiEventTimeBucketLabel(event, referenceDate)}
            </span>
            <span className="rounded-full bg-[#f2e8ff] px-3 py-1.5 text-[12px] font-black text-[#755da9]">
              {getCmiEventTypeLabel(event.type)}
            </span>
          </div>

          <h1 className="text-[2.15rem] font-black leading-[1.02] text-[#242424]">
            {event.title}
          </h1>

          <div className="mt-4 rounded-[1.25rem] border border-[#3f6e52]/16 bg-[#edf6ee] p-4 shadow-[0_12px_26px_rgba(63,110,82,0.10)]">
            <div className="flex items-center gap-2 text-[12px] font-black text-[#3f6e52]">
              <MessageSquareText className="h-4 w-4" strokeWidth={2.5} />
              活动内容
            </div>
            <p className="mt-2 text-[15px] font-black leading-[1.72] text-[#304235]">
              {event.summary}
            </p>
          </div>

          <button
            type="button"
            className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-[#3f6e52] px-5 text-lg font-black text-white shadow-[0_14px_28px_rgba(63,110,82,0.24)] transition active:scale-[0.98]"
            onClick={handleOpenBlackboardComposer}
          >
            <UsersRound className="h-5 w-5" strokeWidth={2.7} />
            一起去
            <span className="text-sm font-black text-white/78">发到看板找搭子</span>
          </button>

          <div className="mt-3 grid gap-2 rounded-[1.2rem] border border-[#2e2a23]/8 bg-[#fff7df] p-3 text-sm font-black text-[#3d3a33]">
            <EventInfoRow Icon={MapPin} label="活动地点" value={locationLabel} />
            <EventInfoRow Icon={Clock3} label="活动时间" value={formatCmiEventTime(event, referenceDate)} />
            <div className="grid grid-cols-2 gap-2">
              <EventInfoTile Icon={MessageSquareText} label="参与/报名" value={event.registrationLabel} />
              <EventInfoTile Icon={Ticket} label="价格" value={event.priceLabel} />
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[1.4rem] border border-[#2e2a23]/8 bg-white/78 p-4 shadow-[0_14px_34px_rgba(46,42,35,0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[#3f6e52]" strokeWidth={2.5} />
            <h2 className="text-xl font-black leading-tight text-[#242424]">详细说明</h2>
          </div>
          <h3 className="mb-3 text-[1.35rem] font-black leading-tight text-[#242424]">{postTitle}</h3>
          <div className="space-y-3">
            {postBlocks.map(renderPostBlock)}
          </div>
        </section>

        <section className="mt-5 rounded-[1.4rem] border border-[#2e2a23]/8 bg-[#f5f0ff] p-4 shadow-[0_14px_34px_rgba(46,42,35,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-[#755da9]">活动盖戳</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[#242424]">想去就盖一下</h2>
              <p className="mt-2 text-sm font-bold leading-relaxed text-[#6d5b82]">
                这个戳会保存在你这台设备上，方便下次回来确认。
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleWantToGo}
              className={cn(
                'relative flex h-24 w-24 shrink-0 rotate-[-8deg] items-center justify-center rounded-full border-[3px] border-dashed text-lg font-black transition active:scale-95',
                wantToGo
                  ? 'border-[#d55747] bg-[#fff7f2] text-[#d55747] shadow-[0_10px_22px_rgba(213,87,71,0.18)]'
                  : 'border-[#755da9]/45 bg-white/72 text-[#755da9]'
              )}
              aria-pressed={wantToGo}
              aria-label="盖想去戳"
            >
              <span className="absolute inset-3 rounded-full border border-current/55" />
              <span className="relative flex flex-col items-center leading-none">
                {wantToGo ? <Check className="mb-1 h-5 w-5" /> : <Stamp className="mb-1 h-5 w-5" />}
                想去
              </span>
            </button>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2e2a23]/10 bg-[#fffdf8]/92 px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[520px] gap-2">
          <button
            type="button"
            className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-[#3f6e52] text-base font-black text-white shadow-[0_12px_24px_rgba(63,110,82,0.24)] transition active:scale-95"
            onClick={handleOpenBlackboardComposer}
          >
            <UsersRound className="h-[18px] w-[18px]" strokeWidth={2.7} />
            一起去
            <span className="text-xs font-black text-white/78">预填发帖</span>
          </button>
          <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#2e2a23]/10 bg-white text-sm font-black text-[#242424] shadow-sm transition active:scale-95"
            onClick={handleOpenCmiMap}
          >
            <MapPinned className="h-4 w-4" />
            CMI地图
          </button>
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3f6e52] text-sm font-black text-white shadow-sm transition active:scale-95"
            onClick={handleOpenGoogleMaps}
          >
            <Navigation className="h-4 w-4" />
            导航
          </button>
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border-2 border-[#2e2a23]/10 bg-white text-sm font-black text-[#242424] shadow-sm transition active:scale-95"
            onClick={() => setRideDialogOpen(true)}
          >
            <Car className="h-4 w-4" />
            叫车
          </button>
          </div>
        </div>
      </div>

      <Dialog open={rideDialogOpen} onOpenChange={setRideDialogOpen}>
        <DialogContent className="max-w-[430px] rounded-3xl border-2 border-foreground p-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-black">叫车去这里</DialogTitle>
            <DialogDescription className="font-semibold leading-relaxed">
              会先复制「{navigationTarget.clipboardName}」，打开 App 后粘贴搜索更稳。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12 rounded-full border-2 font-black"
              onClick={() => {
                setRideDialogOpen(false);
                void handleGrab();
              }}
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-[#00B14F]" />
              Grab
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-full border-2 font-black"
              onClick={() => {
                setRideDialogOpen(false);
                void handleBolt();
              }}
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-[#26D686]" />
              Bolt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
