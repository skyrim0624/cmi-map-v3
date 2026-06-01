import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Loader2,
  type LucideIcon,
  MapPin,
  Navigation,
  Send,
  Share2,
  Ticket,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/data/cmi-events';
import {
  type CmiEventPublicRegistration,
  type CmiEventRegistration,
  getCmiEventManagerEmails,
  getCurrentUserCmiEventRegistrations,
  getManagedCmiEventRegistrations,
  getPublicCmiEventRegistrations,
  getPublishedCmiEvents,
  registerForCmiEvent,
} from '@/db/cmi-events';
import {
  type EventDetailRegistrationButtonTone,
  getEventDetailRegistrationButtonState,
} from '@/features/cmi-events/event-detail-registration-state';
import { isCapacityFullRegistrationError } from '@/features/cmi-events/event-list-registration-state';
import { isCmiEventManager } from '@/features/cmi-events/event-management';
import {
  CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION,
  getVisibleEventAttendees,
  summarizeEventRegistrations,
} from '@/features/cmi-events/event-rsvp-utils';
import { type CmiEventShareCardResult, createCmiEventShareCard } from '@/lib/cmi-event-share-card';
import {
  getCmiEventManagePath,
  getCmiHomePath,
  getPublicCmiEventUrl,
} from '@/lib/paths';
import { cn } from '@/lib/utils';

type FileShareData = {
  files: File[];
  title: string;
  text: string;
};

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

const decodeRouteParam = (value: string | undefined) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const blocksFromText = (text: string | undefined) =>
  text
    ? text
      .split(/\n{2,}/)
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => ({ kind: 'paragraph' as const, text: value }))
    : [];

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

const getExternalRegistrationClipboardValue = (registrationLabel: string) => {
  const wechatMatch = registrationLabel.match(/微信\s*([A-Za-z0-9_-]{4,})/);
  return wechatMatch?.[1] ?? registrationLabel.trim();
};

const EVENT_POST_HEADING_MARKERS = ['❓', '🌊', '📻', '⏱️', '💿'];

const splitEventPostHeading = (text: string) => {
  const marker = EVENT_POST_HEADING_MARKERS.find(candidate => text.startsWith(candidate));

  if (!marker) {
    return { marker: null, text };
  }

  return { marker, text: text.slice(marker.length).trim() };
};

const renderPostBlock = (block: CmiEventDetailBlock, index: number) => {
  if (block.kind === 'heading') {
    const { marker, text } = splitEventPostHeading(block.text);

    return (
      <h3
        key={`${block.kind}-${index}`}
        className={cn(
          'cmi-event-post-heading flex items-center gap-3 text-[1.2rem] font-black leading-[1.2] text-[#121827]',
          index === 0 ? 'mt-0' : 'mt-10'
        )}
      >
        {marker && (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#121827] text-[0.95rem] leading-none text-[#f7f1e7]">
            {marker}
          </span>
        )}
        <span>{text}</span>
      </h3>
    );
  }

  if (block.kind === 'list') {
    return (
      <ul
        key={`${block.kind}-${index}`}
        className="cmi-event-post-list my-2 space-y-2.5 border-l-[3px] border-[#121827]/18 pl-4"
      >
        {block.items.map(item => (
          <li key={item} className="flex gap-2 text-[15px] font-semibold leading-[1.75] text-[#25304a]">
            <span className="mt-[0.72rem] h-1 w-1 shrink-0 rounded-full bg-[#121827]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p
      key={`${block.kind}-${index}`}
      className="cmi-event-post-paragraph whitespace-pre-line text-[16px] font-medium leading-[1.82] text-[#25304a]"
    >
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
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b-[2px] border-dashed border-[#050505]/18 py-3 last:border-b-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] border-[2px] border-[#050505] bg-[#ffe466] text-[#050505]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black leading-none text-[#6b4ca8]">{label}</p>
        <p className="mt-1.5 break-words text-[15px] font-black leading-snug text-[#050505]">{value}</p>
      </div>
    </div>
  );
}

const getRegistrationButtonClass = (tone: EventDetailRegistrationButtonTone) =>
  cn(
    'flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-full border-[3px] border-[#050505] px-2 text-[14px] font-black shadow-[3px_4px_0_rgba(5,5,5,0.18)] transition active:scale-95 disabled:active:scale-100',
    tone === 'closed' && 'bg-[#d8d4dd] text-[#645e6e] shadow-none',
    tone === 'busy' && 'bg-[#fff7df] text-[#050505]',
    tone === 'registered' && 'bg-[#dff4df] text-[#245d37]',
    tone === 'external' && 'bg-[#ffe466] text-[#050505]',
    tone === 'active' && 'bg-[#160f25] text-white'
  );

export default function CmiEventDetail() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = useMemo(() => decodeRouteParam(eventIdParam), [eventIdParam]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const referenceDate = useMemo(() => new Date(), []);
  const [event, setEvent] = useState<CmiEvent | null>(() => getCmiEventById(eventId));
  const [loading, setLoading] = useState(true);
  const [managerEmails, setManagerEmails] = useState<string[]>([]);
  const [managedRegistrations, setManagedRegistrations] = useState<CmiEventRegistration[]>([]);
  const [publicRegistrations, setPublicRegistrations] = useState<CmiEventPublicRegistration[]>([]);
  const [currentUserRegistered, setCurrentUserRegistered] = useState(false);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [registrationMarkedFull, setRegistrationMarkedFull] = useState(false);
  const [sharingEvent, setSharingEvent] = useState(false);

  const detailContent = getCmiEventDetailContent(eventId);
  const posterUrl =
    detailContent?.posterUrl ??
    event?.coverImageUrl ??
    getCmiEventPosterUrl(eventId) ??
    '/cmi-home/event-ai-courtyard.png';
  const postTitle = detailContent?.postTitle ?? event?.title ?? '活动详情';
  const postSummary = detailContent ? null : event?.summary;
  const bodyPostBlocks = blocksFromText(event?.detailBody);
  const postBlocks =
    detailContent?.postBlocks ??
    (bodyPostBlocks.length > 0
      ? bodyPostBlocks
      : [
      {
        kind: 'paragraph' as const,
        text: event?.summary ?? '这场活动的完整推文还在整理中，先放上已经核实的时间、地点和参与方式。',
      },
    ]);
  const locationLabel = event ? `${event.venueName}${event.area ? ` · ${event.area}` : ''}` : '';
  const canManageEvent =
    isCmiEventManager(event ? { ...event, managerEmails } : null, {
      userId: user?.id,
      email: user?.email,
      role: profile?.role,
    });
  const registrationsForSummary =
    canManageEvent && managedRegistrations.length > 0
      ? managedRegistrations
      : publicRegistrations;
  const registrationSummary = useMemo(
    () => summarizeEventRegistrations(registrationsForSummary, event?.capacity),
    [event?.capacity, registrationsForSummary]
  );
  const visibleAttendees = useMemo(
    () =>
      getVisibleEventAttendees(
        registrationsForSummary,
        event?.attendeeVisibility ?? 'count-only'
      ),
    [event?.attendeeVisibility, registrationsForSummary]
  );
  const registrationButtonState = event
    ? getEventDetailRegistrationButtonState({
      event,
      hasRegistered: currentUserRegistered,
      isSubmitting: submittingRegistration,
      isFull: registrationSummary.isFull || registrationMarkedFull,
    })
    : null;

  const registrationInfoValue = event?.registrationEnabled
    ? registrationSummary.capacity
      ? `${registrationSummary.goingCount}/${registrationSummary.capacity} 人已报名`
      : registrationSummary.goingCount > 0
        ? `${registrationSummary.goingCount} 人已报名`
        : event.registrationLabel
    : event?.registrationLabel ?? '报名方式待确认';

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
    setPublicRegistrations([]);
    setRegistrationMarkedFull(false);

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

    if (!eventId || !event?.registrationEnabled) {
      setPublicRegistrations([]);
      return;
    }

    getPublicCmiEventRegistrations(eventId)
      .then(registrations => {
        if (isMounted) setPublicRegistrations(registrations);
      })
      .catch(() => {
        if (isMounted) setPublicRegistrations([]);
      });

    return () => {
      isMounted = false;
    };
  }, [event?.registrationEnabled, eventId]);

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

  const refreshRegistrationSummary = async (targetEventId: string) => {
    const [nextPublicRegistrations, nextManagedRegistrations] = await Promise.all([
      getPublicCmiEventRegistrations(targetEventId),
      canManageEvent ? getManagedCmiEventRegistrations(targetEventId) : Promise.resolve(null),
    ]);

    setPublicRegistrations(nextPublicRegistrations);
    if (nextManagedRegistrations) setManagedRegistrations(nextManagedRegistrations);
  };

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
    if (registrationSummary.isFull || registrationMarkedFull) {
      toast.error('这个活动名额已满');
      return;
    }
    if (event.registrationStatus === 'closed') {
      toast.error('这个活动暂时关闭报名');
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
      setCurrentUserRegistered(true);
      await refreshRegistrationSummary(event.id);

      if (result.notificationError) {
        toast.warning('报名成功，邮件通知稍后需要补发', {
          description: `${CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION} ${result.notificationError.message}`,
        });
      } else {
        toast.success('报名成功', {
          description: CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      if (message.toLowerCase().includes('duplicate')) {
        setCurrentUserRegistered(true);
        toast('你已经报名这个活动了');
        return;
      }
      if (isCapacityFullRegistrationError(message)) {
        setRegistrationMarkedFull(true);
        toast.error('这个活动名额已满');
        return;
      }

      toast.error('报名失败', { description: message });
    } finally {
      setSubmittingRegistration(false);
    }
  };

  const handleExternalRegistration = async () => {
    if (!event) return;
    const clipboardValue = getExternalRegistrationClipboardValue(event.registrationLabel);

    try {
      await navigator.clipboard.writeText(clipboardValue);
      toast.success('已复制报名方式', { description: event.registrationLabel });
    } catch {
      toast(event.registrationLabel);
    }
  };

  const handleRegistrationAction = () => {
    if (!registrationButtonState) return;
    if (registrationButtonState.action === 'external') {
      void handleExternalRegistration();
      return;
    }
    if (registrationButtonState.action === 'internal') {
      void handleOneClickRegistration();
    }
  };

  const handleShareEvent = async () => {
    if (!event) return;

    setSharingEvent(true);
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
      setSharingEvent(false);
    }
  };

  const handleBack = useCallback(() => {
    const historyState = window.history.state as { idx?: number } | null;
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (typeof historyState?.idx === 'number' && historyState.idx > 0) {
      navigate(-1);
      window.setTimeout(() => {
        const nextLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (nextLocation === currentLocation) {
          navigate('/', { replace: true });
        }
      }, 320);
      return;
    }

    // NOTE: 相机扫码或外部 App 直开活动页时没有站内上一页，直接 -1 会看起来没反应。
    navigate('/', { replace: true });
  }, [navigate]);

  const handleOpenGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${navigationTarget.latitude},${navigationTarget.longitude}`,
      '_blank'
    );
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
      <div className="relative mx-auto min-h-[100dvh] max-w-[520px] bg-[#8b61ee]">
        <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] pt-[calc(env(safe-area-inset-top)+14px)]">
          <div className="mx-auto flex max-w-[520px] items-start justify-between gap-3 px-4">
            <Button
              variant="ghost"
              className="pointer-events-auto min-h-11 rounded-full border-[3px] border-[#050505] bg-white px-4 text-base font-black text-[#050505] shadow-[4px_5px_0_rgba(5,5,5,0.18)]"
              onClick={handleBack}
              aria-label="返回上一页"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            {canManageEvent && (
              <Button
                variant="ghost"
                className="pointer-events-auto min-h-10 rounded-full border-[3px] border-[#050505] bg-[#ffe466] px-3 text-xs font-black text-[#050505] shadow-[3px_4px_0_rgba(5,5,5,0.16)]"
                onClick={() => navigate(getCmiEventManagePath(event.id))}
              >
                管理
              </Button>
            )}
          </div>
        </header>

        <main className="pb-32">
          <section className="overflow-hidden bg-[#0d45a3]">
            <img
              src={posterUrl}
              alt={`${event.title}活动海报`}
              className="block h-auto w-full"
              loading="eager"
            />
          </section>

          <section className="cmi-event-post-section border-b-[4px] border-[#050505] bg-white px-6 pb-10 pt-8">
            <h1 className="cmi-event-post-title break-words text-[2rem] font-black leading-[1.08] text-[#121827]">
              {postTitle}
            </h1>
            {postSummary && (
              <p className="cmi-event-post-paragraph mt-5 text-[16px] font-semibold leading-[1.75] text-[#25304a]">
                {postSummary}
              </p>
            )}
            <div className="mt-7 space-y-5 border-t-[2px] border-[#121827]/10 pt-8">
              {postBlocks.map(renderPostBlock)}
            </div>
          </section>

          <section className="bg-white px-5 py-6">
            <div className="mb-2 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-[#6b4ca8]" strokeWidth={2.5} />
              <h2 className="text-[1.35rem] font-black leading-tight text-[#050505]">基本信息</h2>
            </div>
            <EventInfoRow Icon={Clock3} label="时间" value={formatCmiEventTime(event, referenceDate)} />
            <EventInfoRow Icon={MapPin} label="地点" value={locationLabel} />
            <EventInfoRow Icon={Ticket} label="费用" value={event.priceLabel} />
            <EventInfoRow Icon={Send} label="报名方式" value={registrationInfoValue} />
            {visibleAttendees.length > 0 && (
              <div className="pt-4">
                <p className="flex items-center gap-1.5 text-[11px] font-black leading-none text-[#6b4ca8]">
                  <UsersRound className="h-3.5 w-3.5" />
                  已报名
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleAttendees.slice(0, 12).map(attendee => (
                    <span
                      key={attendee.id}
                      className="rounded-full border-[2px] border-[#050505] bg-[#dff4df] px-3 py-1.5 text-xs font-black text-[#245d37]"
                    >
                      {attendee.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto grid max-w-[520px] grid-cols-3 gap-2">
            <button
              type="button"
              className="pointer-events-auto flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-full border-[3px] border-[#050505] bg-white px-2 text-[14px] font-black text-[#050505] shadow-[3px_4px_0_rgba(5,5,5,0.18)] transition active:scale-95 disabled:opacity-80"
              onClick={() => void handleShareEvent()}
              disabled={sharingEvent}
            >
              {sharingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              分享
            </button>
            <button
              type="button"
              className={cn('pointer-events-auto', getRegistrationButtonClass(registrationButtonState?.tone ?? 'closed'))}
              onClick={handleRegistrationAction}
              disabled={registrationButtonState?.disabled ?? true}
              aria-label={registrationButtonState?.ariaLabel ?? '报名活动'}
            >
              {registrationButtonState?.tone === 'busy' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : registrationButtonState?.tone === 'registered' ? (
                <Check className="h-4 w-4" />
              ) : registrationButtonState?.tone === 'external' ? (
                <Copy className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {registrationButtonState?.label ?? '报名'}
            </button>
            <button
              type="button"
              className="pointer-events-auto flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-full border-[3px] border-[#050505] bg-[#160f25] px-2 text-[14px] font-black text-white shadow-[3px_4px_0_rgba(5,5,5,0.18)] transition active:scale-95"
              onClick={handleOpenGoogleMaps}
            >
              <Navigation className="h-4 w-4" />
              导航
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
