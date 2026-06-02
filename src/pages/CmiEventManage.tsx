import { ArrowLeft, CalendarDays, Check, Loader2, Mail, MapPin, Search, Send, Sparkles, ToggleLeft, ToggleRight, UsersRound, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  CMI_EVENT_TYPE_OPTIONS,
  type CmiEvent,
  type CmiEventAttendeeVisibility,
  type CmiEventType,
  formatCmiEventTime,
} from '@/data/cmi-events';
import { getAllRecommendations } from '@/db/api';
import {
  approveCmiEvent,
  getCmiEventForManagement,
  getManagedCmiEventRegistrations,
  updateCmiEventDetails,
  updateCmiEventRegistrationStatus,
  uploadCmiEventPoster,
  type CmiEventRegistration,
} from '@/db/cmi-events';
import { buildCmiEventDescriptionDraft, buildCmiEventSummaryFromDescription } from '@/features/cmi-events/event-description';
import {
  CMI_INN_VENUE_SPACES,
  isCmiEventManager,
  isCmiInnVenue,
  parseCmiEventManagerEmails,
  type CmiInnVenueSpaceId,
} from '@/features/cmi-events/event-management';
import { EventPosterField } from '@/features/cmi-events/event-poster-field';
import {
  buildEventPlaceCandidates,
  createEventPlaceCandidateFromExternalPlace,
  createEventPlaceCandidateFromQuery,
  inferEventPlaceCandidatesFromText,
  searchEventPlaceCandidates,
  type EventPlaceCandidate,
} from '@/features/cmi-events/event-place-binding';
import { summarizeEventRegistrations } from '@/features/cmi-events/event-rsvp-utils';
import { searchExternalPlaceCandidates } from '@/features/places/external-place-search';
import { useDebounce } from '@/hooks/use-debounce';
import { getCmiEventPath } from '@/lib/paths';
import { isPublicMapRecommendation } from '@/types/types';

const EVENT_TYPE_OPTIONS = CMI_EVENT_TYPE_OPTIONS.filter(
  (option): option is { id: CmiEventType; label: string } =>
    option.id !== 'all' && option.id !== 'stable'
);

const todayInBangkok = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const toBangkokIso = (date: string, time: string) =>
  date && time ? `${date}T${time}:00+07:00` : '';

const getBangkokDateTimeParts = (value: string | undefined, fallbackDate: string, fallbackTime = '') => {
  if (!value) return { date: fallbackDate, time: fallbackTime };

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
};

const parseOptionalNumber = (value: string) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const decodeRouteParam = (value: string | undefined) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function CmiEventManage() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = useMemo(() => decodeRouteParam(eventIdParam), [eventIdParam]);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const defaultDate = useMemo(() => todayInBangkok(), []);
  const [event, setEvent] = useState<CmiEvent | null>(null);
  const [registrations, setRegistrations] = useState<CmiEventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [type, setType] = useState<CmiEventType>('meetup');
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('19:00');
  const [endDate, setEndDate] = useState(defaultDate);
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [area, setArea] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [priceLabel, setPriceLabel] = useState('免费参与');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [managerEmailsText, setManagerEmailsText] = useState('');
  const [capacity, setCapacity] = useState('');
  const [attendeeVisibility, setAttendeeVisibility] = useState<CmiEventAttendeeVisibility>('public');
  const [descriptionText, setDescriptionText] = useState('');
  const [venueSpace, setVenueSpace] = useState<CmiInnVenueSpaceId | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');
  const [placeCandidates, setPlaceCandidates] = useState<EventPlaceCandidate[]>(() => buildEventPlaceCandidates([]));
  const [selectedPlace, setSelectedPlace] = useState<EventPlaceCandidate | null>(null);
  const [placeCandidatesLoading, setPlaceCandidatesLoading] = useState(false);
  const [externalPlaceCandidates, setExternalPlaceCandidates] = useState<EventPlaceCandidate[]>([]);
  const [externalPlaceCandidatesLoading, setExternalPlaceCandidatesLoading] = useState(false);
  const [externalPlaceCandidatesError, setExternalPlaceCandidatesError] = useState<string | null>(null);
  const debouncedVenueName = useDebounce(venueName, 520);
  const summary = summarizeEventRegistrations(registrations, event?.capacity);
  const canManage = isCmiEventManager(event, {
    userId: user?.id,
    email: user?.email,
    role: profile?.role,
  });
  const canEditOrganizerEmail = canManage;
  const searchPlaceCandidates = useMemo(
    () =>
      selectedPlace
        ? []
        : searchEventPlaceCandidates(placeCandidates, venueName, venueName.trim() ? 5 : 3),
    [placeCandidates, selectedPlace, venueName]
  );
  const naturalPlaceCandidates = useMemo(
    () =>
      selectedPlace
        ? []
        : inferEventPlaceCandidatesFromText(
          placeCandidates,
          [venueName, area, descriptionText].filter(Boolean).join(' ')
        ),
    [area, descriptionText, placeCandidates, selectedPlace, venueName]
  );
  const hasVenueQuery = Boolean(venueName.trim());
  const visibleInternalPlaceCandidates = hasVenueQuery ? searchPlaceCandidates : naturalPlaceCandidates;
  const shouldSearchExternalPlaces =
    hasVenueQuery &&
    debouncedVenueName.trim().length >= 2 &&
    !selectedPlace &&
    !placeCandidatesLoading &&
    searchPlaceCandidates.length === 0;
  const visibleExternalPlaceCandidates = shouldSearchExternalPlaces ? externalPlaceCandidates : [];
  const isAdmin = profile?.role === 'admin';
  const isCmiInnLocation = isCmiInnVenue({ venueName, area });
  const canApproveEvent = Boolean(
    event &&
    isAdmin &&
    (event.visibilityStatus !== 'published' || event.verificationStatus === 'needs-review')
  );

  const syncFormFromEvent = (nextEvent: CmiEvent) => {
    const startParts = getBangkokDateTimeParts(nextEvent.startAt, defaultDate, '19:00');
    const endParts = getBangkokDateTimeParts(nextEvent.endAt, startParts.date, '');
    const mapLocation = nextEvent.mapLocation;
    const nextSelectedPlace = mapLocation
      ? createEventPlaceCandidateFromQuery({
        placeName: nextEvent.venueName,
        area: nextEvent.area,
        category: mapLocation.category,
        latitude: String(mapLocation.latitude),
        longitude: String(mapLocation.longitude),
      })
      : null;

    setType(nextEvent.type === 'stable' ? 'meetup' : nextEvent.type);
    setStartDate(startParts.date);
    setStartTime(startParts.time);
    setEndDate(endParts.date);
    setEndTime(nextEvent.endAt ? endParts.time : '');
    setVenueName(nextEvent.venueName);
    setArea(nextEvent.area);
    setLatitude(mapLocation ? String(mapLocation.latitude) : '');
    setLongitude(mapLocation ? String(mapLocation.longitude) : '');
    setPriceLabel(nextEvent.priceLabel);
    setOrganizerName(nextEvent.organizerName || nextEvent.hostName || '');
    setOrganizerEmail(nextEvent.organizerEmail || user?.email || '');
    setManagerEmailsText((nextEvent.managerEmails ?? []).join('\n'));
    setCapacity(nextEvent.capacity ? String(nextEvent.capacity) : '');
    setAttendeeVisibility(nextEvent.attendeeVisibility ?? 'public');
    setDescriptionText(buildCmiEventDescriptionDraft(nextEvent.summary, nextEvent.detailBody));
    setVenueSpace((nextEvent.venueSpace as CmiInnVenueSpaceId | undefined) ?? null);
    setCoverImageUrl(nextEvent.coverImageUrl ?? '');
    setPosterFile(null);
    setPosterPreviewUrl('');
    setSelectedPlace(nextSelectedPlace);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const eventWithManagers = await getCmiEventForManagement(eventId);
        const isManager = isCmiEventManager(eventWithManagers, {
          userId: user?.id,
          email: user?.email,
          role: profile?.role,
        });

        if (!isManager) {
          if (!isMounted) return;
          setEvent(eventWithManagers);
          setRegistrations([]);
          return;
        }

        const data = await getManagedCmiEventRegistrations(eventId);

        if (!isMounted) return;
        setEvent(eventWithManagers);
        if (eventWithManagers) syncFormFromEvent(eventWithManagers);
        setRegistrations(data);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : '暂时无法读取报名名单');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [defaultDate, eventId, profile?.role, user?.email, user?.id]);

  useEffect(() => {
    let isMounted = true;
    setPlaceCandidatesLoading(true);

    getAllRecommendations()
      .then(recommendations => {
        if (!isMounted) return;
        setPlaceCandidates(buildEventPlaceCandidates(recommendations.filter(isPublicMapRecommendation)));
      })
      .catch(() => {
        if (!isMounted) return;
        setPlaceCandidates(buildEventPlaceCandidates([]));
      })
      .finally(() => {
        if (isMounted) setPlaceCandidatesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldSearchExternalPlaces) {
      setExternalPlaceCandidates([]);
      setExternalPlaceCandidatesLoading(false);
      setExternalPlaceCandidatesError(null);
      return;
    }

    const controller = new AbortController();
    setExternalPlaceCandidatesLoading(true);
    setExternalPlaceCandidatesError(null);

    searchExternalPlaceCandidates(debouncedVenueName, {
      signal: controller.signal,
      limit: 5,
    })
      .then(places => {
        setExternalPlaceCandidates(places.map(createEventPlaceCandidateFromExternalPlace));
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setExternalPlaceCandidates([]);
        setExternalPlaceCandidatesError('外部地点暂时搜不到，可以先填写地点名和区域');
      })
      .finally(() => {
        if (!controller.signal.aborted) setExternalPlaceCandidatesLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedVenueName, shouldSearchExternalPlaces]);

  useEffect(() => {
    if (!isCmiInnLocation) setVenueSpace(null);
  }, [isCmiInnLocation]);

  const applyPlaceCandidate = (candidate: EventPlaceCandidate) => {
    setSelectedPlace(candidate);
    setVenueName(candidate.placeName);
    setArea(candidate.areaLabel);
    setLatitude(String(candidate.latitude));
    setLongitude(String(candidate.longitude));
    toast.success(candidate.bindingSource === 'external' ? '已定位外部地点' : '已绑定地图地点', {
      description: candidate.placeName,
    });
  };

  const handleVenueNameChange = (value: string) => {
    setVenueName(value);
    if (!selectedPlace) return;
    if (selectedPlace.placeName !== value) setSelectedPlace(null);
  };

  const handleClearPlaceBinding = () => {
    setSelectedPlace(null);
    setVenueName('');
    setArea('');
    setLatitude('');
    setLongitude('');
  };

  const handlePosterFileChange = (file: File) => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setPosterFile(file);
    setPosterPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemovePoster = () => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setPosterFile(null);
    setPosterPreviewUrl('');
    setCoverImageUrl('');
  };

  useEffect(() => () => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
  }, [posterPreviewUrl]);

  const handleSaveDetails = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!event || !user) return;

    const startAt = toBangkokIso(startDate, startTime);
    const endAt = endTime ? toBangkokIso(endDate || startDate, endTime) : null;

    const trimmedDescription = descriptionText.trim();
    if (!startAt || !venueName.trim() || !trimmedDescription || !organizerEmail.trim()) {
      toast.error('时间、地点、活动说明和发起人邮箱必须填写');
      return;
    }

    setSavingDetails(true);
    try {
      const uploadedPosterUrl = posterFile ? await uploadCmiEventPoster(posterFile) : null;
      if (posterFile && !uploadedPosterUrl) {
        toast.error('海报上传失败，请重试或先移除海报');
        return;
      }

      const updatedEvent = await updateCmiEventDetails({
        id: event.id,
        type,
        startAt,
        endAt,
        venueName,
        area,
        latitude: parseOptionalNumber(latitude),
        longitude: parseOptionalNumber(longitude),
        priceLabel,
        organizerName: organizerName || user.email || 'CMI Map 用户',
        organizerEmail,
        managerEmails: parseCmiEventManagerEmails(managerEmailsText),
        coverImageUrl: uploadedPosterUrl ?? coverImageUrl,
        capacity: parseOptionalNumber(capacity),
        attendeeVisibility,
        summary: buildCmiEventSummaryFromDescription(trimmedDescription),
        detailBody: trimmedDescription,
        venueSpace: isCmiInnLocation ? venueSpace : null,
        updatedBy: user.id,
      });

      setEvent(updatedEvent);
      syncFormFromEvent(updatedEvent);
      toast.success('活动信息已更新');
    } catch (error) {
      toast.error('更新活动信息失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleApproveEvent = async () => {
    if (!event || !user || !canApproveEvent) return;

    setApproving(true);
    try {
      const approvedEvent = await approveCmiEvent(event.id, user.id);
      setEvent(approvedEvent);
      syncFormFromEvent(approvedEvent);
      toast.success('活动已审核通过并发布');
    } catch (error) {
      toast.error('审核发布失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setApproving(false);
    }
  };

  const handleToggleRegistration = async () => {
    if (!event) return;

    const nextStatus = event.registrationStatus === 'open' ? 'closed' : 'open';
    setUpdating(true);
    try {
      await updateCmiEventRegistrationStatus(event.id, nextStatus);
      setEvent({ ...event, registrationStatus: nextStatus });
      toast.success(nextStatus === 'open' ? '报名已重新开启' : '报名已关闭');
    } catch (error) {
      toast.error('更新报名状态失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#fffdf8] text-[#242424]">
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在读取活动管理页
        </div>
      </div>
    );
  }

  if (errorMessage || !event || !canManage) {
    return (
      <div className="min-h-[100dvh] bg-[#fffdf8] px-4 py-[calc(env(safe-area-inset-top)+28px)] text-[#242424]">
        <div className="mx-auto max-w-[520px] rounded-[1.5rem] border border-[#2e2a23]/10 bg-white p-5 shadow-sm">
          <p className="text-lg font-black">暂时不能管理这个活动</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#6d6a62]">
            {errorMessage ?? '只有活动发起人或管理员可以查看报名邮箱和备注。'}
          </p>
          <Button
            className="mt-5 min-h-12 rounded-full bg-[#3f6e52] px-5 font-black text-white"
            onClick={() => navigate(getCmiEventPath(eventId))}
          >
            回到活动页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#fffdf8] text-[#242424]">
      <header className="sticky top-0 z-30 border-b border-[#2e2a23]/10 bg-[#fffdf8]/94 px-4 py-[calc(env(safe-area-inset-top)+10px)] pb-3 backdrop-blur">
        <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="min-h-11 rounded-full border border-[#2e2a23]/12 bg-white px-4 font-black"
            onClick={() => navigate(getCmiEventPath(event.id))}
          >
            <ArrowLeft className="h-4 w-4" />
            活动页
          </Button>
          <span className="rounded-full bg-[#e8f2e7] px-3 py-1.5 text-[12px] font-black text-[#3f6e52]">
            管理活动
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] px-4 pb-20 pt-4">
        <section className="rounded-[1.4rem] border border-[#2e2a23]/10 bg-[#fff7df] p-4 shadow-[0_14px_34px_rgba(46,42,35,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-[#8b5f32]">活动管理</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{event.title}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#6d6a62]">
                <CalendarDays className="h-4 w-4" />
                {formatCmiEventTime(event)}
              </p>
            </div>
            <Button
              disabled={updating}
              onClick={handleToggleRegistration}
              className="min-h-11 shrink-0 rounded-full bg-[#3f6e52] px-4 font-black text-white"
            >
              {event.registrationStatus === 'open' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {event.registrationStatus === 'open' ? '关闭' : '开启'}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/78 p-3 text-center">
              <p className="text-2xl font-black text-[#3f6e52]">{summary.goingCount}</p>
              <p className="text-[11px] font-black text-[#6d6a62]">已报名</p>
            </div>
            <div className="rounded-2xl bg-white/78 p-3 text-center">
              <p className="text-2xl font-black text-[#3f6e52]">{summary.capacity ?? '不限'}</p>
              <p className="text-[11px] font-black text-[#6d6a62]">名额</p>
            </div>
            <div className="rounded-2xl bg-white/78 p-3 text-center">
              <p className="text-2xl font-black text-[#3f6e52]">{event.registrationStatus === 'open' ? '开' : '关'}</p>
              <p className="text-[11px] font-black text-[#6d6a62]">报名</p>
            </div>
          </div>

          {event.visibilityStatus !== 'published' && (
            <div className="mt-4 rounded-2xl border border-[#d99513]/25 bg-[#fff3cf] p-3">
              <p className="text-sm font-black text-[#8b5f32]">这个活动正在等待审核</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-[#6d6a62]">
                审核通过后才会出现在公开活动页和地图里。
              </p>
              {canApproveEvent && (
                <Button
                  type="button"
                  disabled={approving}
                  onClick={handleApproveEvent}
                  className="mt-3 min-h-11 rounded-full bg-[#3f6e52] px-4 font-black text-white"
                >
                  {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  审核通过并发布
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[1.4rem] border border-[#2e2a23]/10 bg-[#fff7df] p-4 shadow-[0_14px_34px_rgba(46,42,35,0.08)]">
          <div className="mb-4 flex items-center gap-2 text-[#3f6e52]">
            <MapPin className="h-5 w-5" strokeWidth={2.6} />
            <h2 className="text-xl font-black leading-tight text-[#242424]">活动信息</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSaveDetails}>
            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">活动主题</span>
              <input
                value={event.title}
                disabled
                className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-[#f5f0e8] px-4 text-base font-black text-[#6d6a62]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">活动海报</span>
              <EventPosterField
                posterUrl={posterPreviewUrl || coverImageUrl}
                fileName={posterFile?.name}
                onFileChange={handlePosterFileChange}
                onRemove={handleRemovePoster}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-black text-[#6d6a62]">类型</span>
                <select
                  value={type}
                  onChange={inputEvent => setType(inputEvent.target.value as CmiEventType)}
                  className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-black outline-none focus:border-[#3f6e52]"
                >
                  {EVENT_TYPE_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-black text-[#6d6a62]">人数上限</span>
                <input
                  value={capacity}
                  onChange={inputEvent => setCapacity(inputEvent.target.value)}
                  inputMode="numeric"
                  className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-bold outline-none focus:border-[#3f6e52]"
                  placeholder="不填则不限"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-[#2e2a23]/8 bg-white/72 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#8b5f32]">
                <CalendarDays className="h-4 w-4" />
                时间
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={startDate} onChange={inputEvent => setStartDate(inputEvent.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
                <input type="time" value={startTime} onChange={inputEvent => setStartTime(inputEvent.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
                <input type="date" value={endDate} onChange={inputEvent => setEndDate(inputEvent.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
                <input type="time" value={endTime} onChange={inputEvent => setEndTime(inputEvent.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
              </div>
            </div>

            <div className="rounded-2xl border border-[#2e2a23]/8 bg-white/72 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#8b5f32]">
                <MapPin className="h-4 w-4" />
                地点
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b5f32]" />
                  <input
                    value={venueName}
                    onChange={inputEvent => handleVenueNameChange(inputEvent.target.value)}
                    className="min-h-12 w-full rounded-xl border border-[#2e2a23]/12 bg-white px-9 text-sm font-bold outline-none focus:border-[#3f6e52]"
                    placeholder="搜地点，例如 清迈客栈 / North Gate Jazz"
                  />
                  {selectedPlace && (
                    <button
                      type="button"
                      onClick={handleClearPlaceBinding}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5f0e8] text-[#6d6a62]"
                      aria-label="清除地点绑定"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {selectedPlace ? (
                  <div className="rounded-2xl border border-[#3f6e52]/20 bg-[#e8f2e7] p-3 text-sm font-bold text-[#315a3f]">
                    <div className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-black">已绑定：{selectedPlace.placeName}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#53705b]">
                          {selectedPlace.areaLabel} · 地图位置已绑定
                        </p>
                      </div>
                    </div>
                  </div>
                ) : visibleInternalPlaceCandidates.length > 0 || visibleExternalPlaceCandidates.length > 0 ? (
                  <div className="rounded-2xl border border-[#2e2a23]/10 bg-[#fffdf8] p-2">
                    <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-black text-[#8b5f32]">
                      {hasVenueQuery ? <MapPin className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {visibleExternalPlaceCandidates.length > 0
                        ? '外部地点候选'
                        : hasVenueQuery ? 'CMI 地点候选' : '从文字里识别到'}
                    </div>
                    <div className="space-y-1.5">
                      {visibleInternalPlaceCandidates.map(candidate => (
                        <button
                          key={`${candidate.placeName}-${candidate.latitude}-${candidate.longitude}`}
                          type="button"
                          onClick={() => applyPlaceCandidate(candidate)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-white px-3 py-2 text-left transition active:scale-[0.99]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-[#242424]">{candidate.placeName}</span>
                            <span className="mt-0.5 block truncate text-[11px] font-bold text-[#6d6a62]">
                              {candidate.areaLabel} · {candidate.recommendationCount} 条痕迹
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-[#e8f2e7] px-2.5 py-1 text-[11px] font-black text-[#3f6e52]">
                            使用
                          </span>
                        </button>
                      ))}
                      {visibleExternalPlaceCandidates.map(candidate => (
                        <button
                          key={`${candidate.externalPlaceId}-${candidate.latitude}-${candidate.longitude}`}
                          type="button"
                          onClick={() => applyPlaceCandidate(candidate)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#3f6e52]/15 bg-[#f5fbf6] px-3 py-2 text-left transition active:scale-[0.99]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-[#242424]">{candidate.placeName}</span>
                            <span className="mt-0.5 block truncate text-[11px] font-bold text-[#53705b]">
                              {candidate.areaLabel} · 外部地点，尚无 CMI 痕迹
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-[#3f6e52] px-2.5 py-1 text-[11px] font-black text-white">
                            定位
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : externalPlaceCandidatesLoading ? (
                  <p className="flex items-center gap-2 rounded-xl bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[#8b5f32]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    正在查清迈外部地点
                  </p>
                ) : externalPlaceCandidatesError ? (
                  <p className="rounded-xl bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[#8b5f32]">
                    {externalPlaceCandidatesError}
                  </p>
                ) : placeCandidatesLoading ? (
                  <p className="rounded-xl bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[#8b5f32]">
                    正在同步 CMI Map 地点候选
                  </p>
                ) : null}

                {isCmiInnLocation && (
                  <div className="rounded-2xl border border-[#3f6e52]/18 bg-[#f5fbf6] p-3">
                    <span className="mb-2 block text-[11px] font-black text-[#315a3f]">清迈客栈区域</span>
                    <div className="grid grid-cols-2 gap-2">
                      {CMI_INN_VENUE_SPACES.map(space => {
                        const selected = venueSpace === space.id;

                        return (
                          <button
                            key={space.id}
                            type="button"
                            onClick={() => setVenueSpace(space.id)}
                            className={`min-h-12 rounded-xl border px-3 text-left text-sm font-black transition ${
                              selected
                                ? 'border-[#3f6e52] bg-[#e8f2e7] text-[#315a3f]'
                                : 'border-[#2e2a23]/12 bg-white text-[#242424] active:scale-[0.99]'
                            }`}
                          >
                            <span className="block">{space.label}</span>
                            <span className="mt-0.5 block text-[10px] font-black opacity-70">
                              {selected ? '已选择' : '可选'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <input value={area} onChange={inputEvent => setArea(inputEvent.target.value)} className="min-h-12 w-full rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" placeholder="区域，例如 Nimman / 古城北门" />
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">活动说明</span>
              <textarea value={descriptionText} onChange={inputEvent => setDescriptionText(inputEvent.target.value)} className="min-h-44 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 py-3 text-sm font-bold leading-relaxed outline-none focus:border-[#3f6e52]" placeholder="谁适合来、会发生什么、为什么值得去；流程、集合方式、注意事项也写在这里" />
            </label>

            <div className="rounded-2xl border border-[#2e2a23]/8 bg-white/72 p-3">
              <div className="mb-3 text-xs font-black text-[#8b5f32]">发布设置</div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black text-[#6d6a62]">费用</span>
                  <input
                    value={priceLabel}
                    onChange={inputEvent => setPriceLabel(inputEvent.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-bold"
                    placeholder="免费 / AA / 100 THB"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black text-[#6d6a62]">发起人</span>
                  <input
                    value={organizerName}
                    onChange={inputEvent => setOrganizerName(inputEvent.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-bold"
                    placeholder="你的名字"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-[11px] font-black text-[#6d6a62]">发起人邮箱</span>
                <input
                  value={organizerEmail}
                  onChange={inputEvent => setOrganizerEmail(inputEvent.target.value)}
                  disabled={!canEditOrganizerEmail}
                  className={`min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 px-4 text-sm font-bold ${canEditOrganizerEmail ? 'bg-white' : 'bg-[#f5f0e8] text-[#6d6a62]'}`}
                  placeholder="这个邮箱登录后可以管理活动"
                />
              </label>

              <label className="mt-3 block space-y-1.5">
                <span className="text-[11px] font-black text-[#6d6a62]">管理员邮箱</span>
                <textarea
                  value={managerEmailsText}
                  onChange={inputEvent => setManagerEmailsText(inputEvent.target.value)}
                  className="min-h-20 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 py-3 text-sm font-bold leading-relaxed"
                  placeholder="每行一个邮箱；这些人登录后能看报名名单，也会收到报名邮件"
                />
              </label>

              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-black text-[#6d6a62]">报名名单显示</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${attendeeVisibility === 'public' ? 'border-[#3f6e52] bg-[#e8f2e7] text-[#3f6e52]' : 'border-[#2e2a23]/12 bg-white text-[#6d6a62]'}`}
                    onClick={() => setAttendeeVisibility('public')}
                  >
                    显示报名昵称
                  </button>
                  <button
                    type="button"
                    className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${attendeeVisibility === 'count-only' ? 'border-[#3f6e52] bg-[#e8f2e7] text-[#3f6e52]' : 'border-[#2e2a23]/12 bg-white text-[#6d6a62]'}`}
                    onClick={() => setAttendeeVisibility('count-only')}
                  >
                    只显示人数
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingDetails}
              className="min-h-12 w-full rounded-full bg-[#3f6e52] text-base font-black text-white"
            >
              {savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              保存活动信息
            </Button>
          </form>
        </section>

        <section className="mt-4 rounded-[1.4rem] border border-[#2e2a23]/10 bg-white p-4 shadow-[0_14px_34px_rgba(46,42,35,0.06)]">
          <div className="mb-3 flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-[#3f6e52]" />
            <h2 className="text-xl font-black">报名名单</h2>
          </div>

          {registrations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#2e2a23]/16 bg-[#fffaf0] p-4 text-sm font-bold text-[#6d6a62]">
              还没有人报名。
            </p>
          ) : (
            <div className="space-y-2">
              {registrations.map(registration => (
                <article key={registration.id} className="rounded-2xl border border-[#2e2a23]/10 bg-[#fffdf8] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black">{registration.attendeeName}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-bold text-[#6d6a62]">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {registration.attendeeEmail}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e8f2e7] px-2.5 py-1 text-[11px] font-black text-[#3f6e52]">
                      {registration.status === 'going' ? '已报名' : '已取消'}
                    </span>
                  </div>
                  {registration.note && (
                    <p className="mt-2 rounded-xl bg-[#f5f0ff] px-3 py-2 text-xs font-bold leading-relaxed text-[#6d5b82]">
                      {registration.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
