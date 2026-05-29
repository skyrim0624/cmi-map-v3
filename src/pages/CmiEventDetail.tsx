import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  Clock3,
  Loader2,
  type LucideIcon,
  MapPin,
  MessageSquareText,
  Navigation,
  Send,
  Ticket,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  getCurrentUserCmiEventRegistrations,
  getCmiEventManagerEmails,
  getManagedCmiEventRegistrations,
  getPublishedCmiEvents,
  registerForCmiEvent,
  type CmiEventRegistration,
} from '@/db/cmi-events';
import { isCmiEventManager } from '@/features/cmi-events/event-management';
import {
  getCmiEventManagePath,
  getCmiHomePath,
} from '@/lib/paths';
import { getVisibleEventAttendees, summarizeEventRegistrations } from '@/features/cmi-events/event-rsvp-utils';
import { cn } from '@/lib/utils';

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
      <h3 key={`${block.kind}-${index}`} className="pt-2 text-lg font-black leading-tight text-white">
        {block.text}
      </h3>
    );
  }

  if (block.kind === 'list') {
    return (
      <ul key={`${block.kind}-${index}`} className="space-y-2">
        {block.items.map(item => (
          <li key={item} className="flex gap-2 text-[15px] font-bold leading-relaxed text-white/85">
            <span className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffe466]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={`${block.kind}-${index}`} className="text-[15px] font-bold leading-[1.85] text-white/85">
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
    <div className="grid grid-cols-[2.35rem_minmax(0,1fr)] gap-3 rounded-[1rem] border-[3px] border-[#050505] bg-white/76 p-3 shadow-[3px_4px_0_rgba(5,5,5,0.16)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-[0.85rem] border-2 border-[#050505] bg-[#fff7df] text-[#050505]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black leading-none text-[#6b4ca8]">{label}</p>
        <p className="mt-1.5 break-words text-[14px] font-black leading-snug text-[#050505]">{value}</p>
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
    <div className="rounded-[1rem] border-[3px] border-[#050505] bg-white/76 p-3 shadow-[3px_4px_0_rgba(5,5,5,0.16)]">
      <div className="flex items-center gap-1.5 text-[11px] font-black leading-none text-[#6b4ca8]">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        {label}
      </div>
      <p className="mt-2 break-words text-[13px] font-black leading-snug text-[#050505]">{value}</p>
    </div>
  );
}

export default function CmiEventDetail() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = useMemo(() => decodeRouteParam(eventIdParam), [eventIdParam]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const referenceDate = useMemo(() => new Date(), []);
  const [event, setEvent] = useState<CmiEvent | null>(() => getCmiEventById(eventId));
  const [loading, setLoading] = useState(true);
  const [rideDialogOpen, setRideDialogOpen] = useState(false);
  const [managerEmails, setManagerEmails] = useState<string[]>([]);
  const [managedRegistrations, setManagedRegistrations] = useState<CmiEventRegistration[]>([]);
  const [currentUserRegistered, setCurrentUserRegistered] = useState(false);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  const detailContent = getCmiEventDetailContent(eventId);
  const posterUrl = event?.coverImageUrl ?? detailContent?.posterUrl ?? getCmiEventPosterUrl(eventId) ?? '/cmi-home/event-ai-courtyard.png';
  const postTitle = detailContent?.postTitle ?? event?.title ?? '活动详情';
  const postBlocks = event?.detailBody
    ? event.detailBody
      .split(/\n{2,}/)
      .map(text => text.trim())
      .filter(Boolean)
      .map(text => ({ kind: 'paragraph' as const, text }))
    : detailContent?.postBlocks ?? [
      {
        kind: 'paragraph' as const,
        text: event?.summary ?? '这场活动的完整推文还在整理中，先放上已经核实的时间、地点和参与方式。',
      },
    ];
  const locationLabel = event ? `${event.venueName}${event.area ? ` · ${event.area}` : ''}` : '';
  const canManageEvent =
    isCmiEventManager(event ? { ...event, managerEmails } : null, {
      userId: user?.id,
      email: user?.email,
      role: profile?.role,
    });
  const registrationsForSummary = canManageEvent ? managedRegistrations : [];
  const registrationSummary = useMemo(
    () => summarizeEventRegistrations(registrationsForSummary, event?.capacity),
    [event?.capacity, registrationsForSummary]
  );
  const visibleAttendees = useMemo(
    () =>
      canManageEvent
        ? getVisibleEventAttendees(managedRegistrations, event?.attendeeVisibility ?? 'count-only')
        : [],
    [canManageEvent, event?.attendeeVisibility, managedRegistrations]
  );
  const isInternalRegistrationEnabled = Boolean(event?.registrationEnabled);
  const isRegistrationOpen =
    isInternalRegistrationEnabled &&
    event?.registrationStatus === 'open' &&
    !registrationSummary.isFull;

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
    setManagerEmails([]);
    setManagedRegistrations([]);

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
    let isMounted = true;

    if (!eventId || !user?.id) {
      setManagerEmails([]);
      return;
    }

    getCmiEventManagerEmails(eventId)
      .then(emails => {
        if (isMounted) setManagerEmails(emails);
      })
      .catch(() => {
        if (isMounted) setManagerEmails([]);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, user?.id]);

  useEffect(() => {
    let isMounted = true;

    if (!eventId || !event?.registrationEnabled || !canManageEvent) {
      setManagedRegistrations([]);
      return;
    }

    getManagedCmiEventRegistrations(eventId)
      .then(registrations => {
        if (isMounted) setManagedRegistrations(registrations);
      })
      .catch(() => {
        if (isMounted) setManagedRegistrations([]);
      });

    return () => {
      isMounted = false;
    };
  }, [canManageEvent, event?.registrationEnabled, eventId]);

  useEffect(() => {
    let isMounted = true;

    if (!eventId || !user?.id) {
      setCurrentUserRegistered(false);
      return;
    }

    getCurrentUserCmiEventRegistrations([eventId], user.id)
      .then(registrations => {
        if (!isMounted) return;
        setCurrentUserRegistered(registrations.some(registration => registration.eventId === eventId));
      })
      .catch(() => {
        if (isMounted) setCurrentUserRegistered(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, user?.id]);

  const handleOneClickRegistration = async () => {
    if (!event) return;
    if (!user?.id || !user.email) {
      toast('登录后可以一键报名', { description: '注册只需要一个邮箱。' });
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (currentUserRegistered) {
      toast('你已经报名这个活动了');
      return;
    }
    if (!isRegistrationOpen) {
      toast.error(registrationSummary.isFull ? '这个活动名额已满' : '这个活动暂时关闭报名');
      return;
    }

    const attendeeName = profile?.user_name?.trim() || user.email.split('@')[0] || 'CMI 朋友';

    setSubmittingRegistration(true);
    try {
      const result = await registerForCmiEvent({
        eventId: event.id,
        attendeeName,
        attendeeEmail: user.email,
        note: '从活动详情页一键报名',
        userId: user.id,
      });
      if (canManageEvent) {
        const nextRegistrations = await getManagedCmiEventRegistrations(event.id);
        setManagedRegistrations(nextRegistrations);
      }
      setCurrentUserRegistered(true);

      if (result.notificationError) {
        toast.warning('报名成功，邮件通知稍后需要补发', {
          description: result.notificationError.message,
        });
      } else {
        toast.success('报名成功');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      if (message.toLowerCase().includes('duplicate')) {
        setCurrentUserRegistered(true);
        toast('你已经报名这个活动了');
        return;
      }

      toast.error(message.includes('duplicate') ? '这个邮箱已经报名过了' : '报名失败', {
        description: message.includes('duplicate') ? undefined : message,
      });
    } finally {
      setSubmittingRegistration(false);
    }
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#8b61ee] text-[#050505]">
        <div className="flex items-center gap-2 rounded-full border-[3px] border-[#050505] bg-white px-4 py-3 text-sm font-black shadow-[4px_5px_0_rgba(5,5,5,0.18)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在打开活动详情
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] px-4 py-[calc(env(safe-area-inset-top)+28px)] text-[#050505]">
        <div className="mx-auto max-w-[520px] rounded-[2rem] border-[4px] border-[#050505] bg-[#9b74f4] p-5 shadow-sm">
          <p className="text-lg font-black">这个活动暂时没找到</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#2b2241]">
            可能是活动已经下线，或者链接里的活动编号不完整。
          </p>
          <Button
            className="mt-5 min-h-12 rounded-full border-[3px] border-[#050505] bg-[#160f25] px-5 font-black text-white"
            onClick={() => navigate(getCmiHomePath())}
          >
            回到清迈客栈
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-[#050505]">
      <div
        className="mx-auto min-h-[100dvh] max-w-[520px] bg-[#8b61ee]"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(155,116,244,0.98), rgba(130,86,231,0.98)), radial-gradient(circle, rgba(5,5,5,0.14) 1px, transparent 1.3px)',
          backgroundSize: 'auto, 18px 18px',
        }}
      >
      <header className="sticky top-0 z-40 border-b-[3px] border-[#050505]/18 bg-[#9b74f4]/94 px-5 py-[calc(env(safe-area-inset-top)+12px)] pb-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="min-h-11 rounded-full border-[3px] border-[#050505] bg-white px-4 text-base font-black text-[#050505] shadow-[4px_5px_0_rgba(5,5,5,0.16)]"
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <span className="rounded-full border-[3px] border-[#050505] bg-[#fff7df] px-3 py-1.5 text-[12px] font-black text-[#050505] shadow-[3px_4px_0_rgba(5,5,5,0.14)]">
            活动详情
          </span>
          {canManageEvent && (
            <Button
              variant="ghost"
              className="min-h-10 rounded-full border-[3px] border-[#050505] bg-white px-3 text-xs font-black text-[#050505]"
              onClick={() => navigate(getCmiEventManagePath(event.id))}
            >
              管理
            </Button>
          )}
        </div>
      </header>

      <main className="px-5 pb-32 pt-4">
        <section className="pb-2 pt-1">
          <h1 className="text-[3rem] font-black leading-none tracking-normal text-[#050505] sm:text-[3.7rem]">
            CMI Map
          </h1>
          <img
            src="/cmi-home/cmi-map-slogan-handwritten.png?v=20260528-strong"
            alt="清迈活动和好去处，都在这里"
            className="mt-3 h-auto w-[82%] max-w-[420px]"
            loading="eager"
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-[1.7rem] border-[4px] border-[#050505] bg-[#fff9ec] shadow-[5px_6px_0_rgba(5,5,5,0.22)]">
          <img
            src={posterUrl}
            alt={`${event.title}完整海报`}
            className="max-h-[74vh] w-full bg-[#f7efe0] object-contain"
            loading="eager"
          />
        </section>

        <section className="mt-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f2e7] px-3 py-1.5 text-[12px] font-black text-[#3f6e52] shadow-[2px_3px_0_rgba(5,5,5,0.12)]">
              <CalendarDays className="h-3.5 w-3.5" />
              {getCmiEventTimeBucketLabel(event, referenceDate)}
            </span>
            <span className="rounded-full bg-[#f2e8ff] px-3 py-1.5 text-[12px] font-black text-[#755da9] shadow-[2px_3px_0_rgba(5,5,5,0.12)]">
              {getCmiEventTypeLabel(event.type)}
            </span>
          </div>

          <h2 className="break-words text-[2.15rem] font-black leading-[1.02] text-[#050505] sm:text-[2.55rem]">
            {event.title}
          </h2>

          <div className="mt-4 rounded-[1.25rem] border-[4px] border-[#050505] bg-[#160f25] p-5 shadow-[5px_6px_0_rgba(5,5,5,0.2)]">
            <div className="flex items-center gap-2 text-[12px] font-black text-[#ffe466]">
              <MessageSquareText className="h-4 w-4" strokeWidth={2.5} />
              活动内容
            </div>
            <p className="mt-3 text-[17px] font-black leading-[1.72] text-white">
              {event.summary}
            </p>
          </div>

          <div className="mt-4 grid gap-3 rounded-[1.3rem] border-[3px] border-[#050505]/20 bg-[#a982f7]/70 p-3 text-sm font-black text-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <EventInfoRow Icon={MapPin} label="活动地点" value={locationLabel} />
            <EventInfoRow Icon={Clock3} label="活动时间" value={formatCmiEventTime(event, referenceDate)} />
            {isInternalRegistrationEnabled ? (
              <EventInfoRow Icon={Ticket} label="价格" value={event.priceLabel} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <EventInfoTile Icon={MessageSquareText} label="参与/报名" value={event.registrationLabel} />
                <EventInfoTile Icon={Ticket} label="价格" value={event.priceLabel} />
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[1.4rem] border-[4px] border-[#050505] bg-[#160f25] p-5 shadow-[5px_6px_0_rgba(5,5,5,0.2)]">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[#ffe466]" strokeWidth={2.5} />
            <h2 className="text-xl font-black leading-tight text-white">详细说明</h2>
          </div>
          <h3 className="mb-3 text-[1.35rem] font-black leading-tight text-white">{postTitle}</h3>
          <div className="space-y-3">
            {postBlocks.map(renderPostBlock)}
          </div>
        </section>

        {isInternalRegistrationEnabled && (
          <section className="mt-5 rounded-[1.4rem] border-[4px] border-[#050505] bg-[#a982f7]/82 p-4 shadow-[5px_6px_0_rgba(5,5,5,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-black text-[#432277]">活动报名</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-[#050505]">
                  {canManageEvent ? `${registrationSummary.goingCount} 人已报名` : '一键报名参加'}
                </h2>
                <p className="mt-1 text-sm font-bold leading-relaxed text-[#2c2240]">
                  {canManageEvent && registrationSummary.capacity
                    ? `名额 ${registrationSummary.capacity}，剩余 ${registrationSummary.remainingSpots} 个`
                    : registrationSummary.capacity
                    ? `名额 ${registrationSummary.capacity}`
                    : '不限人数'}
                </p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black',
                isRegistrationOpen
                  ? 'border-[3px] border-[#050505] bg-white text-[#050505]'
                  : 'border-[3px] border-[#050505] bg-[#f7e7e4] text-[#b44c40]'
              )}>
                {isRegistrationOpen ? '报名中' : registrationSummary.isFull ? '已满' : '已关闭'}
              </span>
            </div>

            {visibleAttendees.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleAttendees.slice(0, 12).map(attendee => (
                  <span key={attendee.id} className="rounded-full border-2 border-[#050505] bg-white px-3 py-1.5 text-xs font-black text-[#050505] shadow-sm">
                    {attendee.name}
                  </span>
                ))}
              </div>
            )}

            {isRegistrationOpen ? (
              <Button
                type="button"
                disabled={submittingRegistration || currentUserRegistered}
                className={cn(
                  'mt-4 min-h-14 w-full rounded-full border-[3px] border-[#050505] text-base font-black shadow-[4px_5px_0_rgba(5,5,5,0.2)]',
                  currentUserRegistered
                    ? 'bg-white text-[#050505] opacity-100'
                    : 'bg-[#160f25] text-white'
                )}
                onClick={handleOneClickRegistration}
              >
                {submittingRegistration ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentUserRegistered ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {currentUserRegistered ? '已报名' : user?.id ? '一键报名' : '登录后报名'}
              </Button>
            ) : (
              <p className="mt-4 rounded-2xl border-[3px] border-[#050505] bg-white/78 p-3 text-sm font-bold leading-relaxed text-[#2c2240]">
                {registrationSummary.isFull ? '这个活动已经满员。' : '发起人暂时关闭了报名。'}
              </p>
            )}
          </section>
        )}

      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t-[4px] border-[#050505] bg-[#8b61ee]/94 px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[520px] gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border-[3px] border-[#050505] bg-[#160f25] text-sm font-black text-white shadow-[3px_4px_0_rgba(5,5,5,0.16)] transition active:scale-95"
              onClick={handleOpenGoogleMaps}
            >
              <Navigation className="h-4 w-4" />
              导航
            </button>
            <button
              type="button"
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border-[3px] border-[#050505] bg-white text-sm font-black text-[#050505] shadow-[3px_4px_0_rgba(5,5,5,0.16)] transition active:scale-95"
              onClick={() => setRideDialogOpen(true)}
            >
              <Car className="h-4 w-4" />
              叫车
            </button>
          </div>
        </div>
      </div>

      <Dialog open={rideDialogOpen} onOpenChange={setRideDialogOpen}>
        <DialogContent className="max-w-[430px] rounded-3xl border-[4px] border-[#050505] bg-[#fff7df] p-5 text-[#050505]">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-black">叫车去这里</DialogTitle>
            <DialogDescription className="font-semibold leading-relaxed">
              会先复制「{navigationTarget.clipboardName}」，打开 App 后粘贴搜索更稳。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12 rounded-full border-[3px] border-[#050505] bg-white font-black text-[#050505]"
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
              className="h-12 rounded-full border-[3px] border-[#050505] bg-white font-black text-[#050505]"
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
    </div>
  );
}
