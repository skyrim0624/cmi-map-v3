import { ArrowLeft, CalendarDays, Check, Crosshair, Loader2, MapPin, Search, Send, Sparkles, UsersRound, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LeafletMap } from '@/components/map/LeafletMap';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { CMI_EVENT_TYPE_OPTIONS, type CmiEventAttendeeVisibility, type CmiEventType } from '@/data/cmi-events';
import { getAllRecommendations } from '@/db/api';
import { createCmiEvent, uploadCmiEventPoster } from '@/db/cmi-events';
import { EventPosterField } from '@/features/cmi-events/event-poster-field';
import {
  buildEventPlaceCandidates,
  createEventPlaceCandidateFromExternalPlace,
  createEventPlaceCandidateFromMapPick,
  createEventPlaceCandidateFromQuery,
  findExactEventPlaceCandidate,
  inferEventPlaceCandidatesFromText,
  searchEventPlaceCandidates,
  type EventPlaceCandidate,
} from '@/features/cmi-events/event-place-binding';
import { searchExternalPlaceCandidates } from '@/features/places/external-place-search';
import { useDebounce } from '@/hooks/use-debounce';
import { getCmiEventPath, getSceneListPath } from '@/lib/paths';
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

const CHIANG_MAI_MAP_CENTER = { lat: 18.7883, lng: 98.9853 };

const parseOptionalNumber = (value: string) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

function EventLocationMapPicker({
  center,
  onCenterChange,
  onConfirm,
  onClose,
}: {
  center: { lat: number; lng: number };
  onCenterChange: (center: { lat: number; lng: number }) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const initialCenterRef = useRef(center);

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-white sm:bg-[#2e2a23]/35" role="presentation">
      <section
        className="flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-[0_0_44px_rgba(46,42,35,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="地图选点"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2e2a23]/10 bg-white px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-[#242424] active:bg-[#f5f0e8]"
            onClick={onClose}
            aria-label="返回发布活动"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.35} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[1.15rem] font-black leading-tight text-[#242424]">地图选点</p>
            <p className="mt-0.5 text-[0.78rem] font-bold text-[#6d6a62]">
              拖动地图，让红点对准活动地点。
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-[#3f6e52] px-4 py-2 text-sm font-black text-white"
            onClick={onConfirm}
          >
            确认
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <LeafletMap
            mode="mark"
            defaultCenter={initialCenterRef.current}
            defaultZoom={16}
            markTargetYRatio={0.5}
            onCenterChange={(lat, lng) => onCenterChange({ lat, lng })}
            className="h-full w-full border-none outline-none"
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1002] -translate-x-1/2 -translate-y-full text-[#e53b35] drop-shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
            <MapPin className="h-12 w-12 fill-[#e53b35]" strokeWidth={2.2} />
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[1002] rounded-2xl bg-white/92 px-4 py-3 text-center shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur">
            <p className="text-sm font-black text-[#242424]">
              {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CmiEventCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const defaultDate = useMemo(() => todayInBangkok(), []);
  const [title, setTitle] = useState('');
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
  const [organizerName, setOrganizerName] = useState(profile?.user_name ?? '');
  const [organizerEmail, setOrganizerEmail] = useState(user?.email ?? '');
  const [organizerNameAutoFilled, setOrganizerNameAutoFilled] = useState(Boolean(profile?.user_name));
  const [organizerEmailAutoFilled, setOrganizerEmailAutoFilled] = useState(Boolean(user?.email));
  const [capacity, setCapacity] = useState('');
  const [attendeeVisibility, setAttendeeVisibility] = useState<CmiEventAttendeeVisibility>('public');
  const [summary, setSummary] = useState('');
  const [detailBody, setDetailBody] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placeCandidates, setPlaceCandidates] = useState<EventPlaceCandidate[]>(() => buildEventPlaceCandidates([]));
  const [selectedPlace, setSelectedPlace] = useState<EventPlaceCandidate | null>(null);
  const [placeCandidatesLoading, setPlaceCandidatesLoading] = useState(false);
  const [externalPlaceCandidates, setExternalPlaceCandidates] = useState<EventPlaceCandidate[]>([]);
  const [externalPlaceCandidatesLoading, setExternalPlaceCandidatesLoading] = useState(false);
  const [externalPlaceCandidatesError, setExternalPlaceCandidatesError] = useState<string | null>(null);
  const [initialPlaceApplied, setInitialPlaceApplied] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerCenter, setMapPickerCenter] = useState(CHIANG_MAI_MAP_CENTER);
  const debouncedVenueName = useDebounce(venueName, 520);

  const manualPlaceCandidate = useMemo(
    () =>
      createEventPlaceCandidateFromQuery({
        placeName: searchParams.get('place'),
        area: searchParams.get('area'),
        category: searchParams.get('category'),
        latitude: searchParams.get('lat'),
        longitude: searchParams.get('lng'),
      }),
    [searchParams]
  );

  const naturalPlaceCandidates = useMemo(
    () =>
      selectedPlace
        ? []
        : inferEventPlaceCandidatesFromText(
          placeCandidates,
          [title, summary, detailBody].filter(Boolean).join(' ')
        ),
    [detailBody, placeCandidates, selectedPlace, summary, title]
  );

  const searchPlaceCandidates = useMemo(
    () =>
      selectedPlace
        ? []
        : searchEventPlaceCandidates(placeCandidates, venueName, venueName.trim() ? 5 : 3),
    [placeCandidates, selectedPlace, venueName]
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

  useEffect(() => {
    if (!organizerNameAutoFilled && !organizerName && profile?.user_name) {
      setOrganizerName(profile.user_name);
      setOrganizerNameAutoFilled(true);
    }
    if (!organizerEmailAutoFilled && !organizerEmail && user?.email) {
      setOrganizerEmail(user.email);
      setOrganizerEmailAutoFilled(true);
    }
  }, [
    organizerEmail,
    organizerEmailAutoFilled,
    organizerName,
    organizerNameAutoFilled,
    profile?.user_name,
    user?.email,
  ]);

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

  const applyPlaceCandidate = (candidate: EventPlaceCandidate) => {
    setSelectedPlace(candidate);
    setVenueName(candidate.placeName);
    setArea(candidate.areaLabel);
    setLatitude(String(candidate.latitude));
    setLongitude(String(candidate.longitude));
    const toastTitle =
      candidate.bindingSource === 'external'
        ? '已定位外部地点'
        : candidate.bindingSource === 'manual'
          ? '已选择地图位置'
          : '已绑定地图地点';
    toast.success(toastTitle, {
      description: candidate.placeName,
    });
  };

  useEffect(() => {
    if (initialPlaceApplied) return;
    const placeName = searchParams.get('place');
    if (!placeName) return;

    const matchedCandidate = findExactEventPlaceCandidate(placeCandidates, placeName);
    const candidate = matchedCandidate ?? manualPlaceCandidate;
    if (!candidate) return;

    applyPlaceCandidate(candidate);
    setInitialPlaceApplied(true);
  }, [initialPlaceApplied, manualPlaceCandidate, placeCandidates, searchParams]);

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

  const getMapInitialCenter = () => {
    const latitudeNumber = Number(latitude);
    const longitudeNumber = Number(longitude);
    if (Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber)) {
      return { lat: latitudeNumber, lng: longitudeNumber };
    }

    const exactCandidate = findExactEventPlaceCandidate(placeCandidates, venueName);
    const candidate = selectedPlace ?? exactCandidate ?? visibleInternalPlaceCandidates[0] ?? visibleExternalPlaceCandidates[0];
    return candidate
      ? { lat: candidate.latitude, lng: candidate.longitude }
      : CHIANG_MAI_MAP_CENTER;
  };

  const openMapPicker = () => {
    setMapPickerCenter(getMapInitialCenter());
    setMapPickerOpen(true);
  };

  const confirmMapPicker = () => {
    applyPlaceCandidate(createEventPlaceCandidateFromMapPick({
      placeName: venueName,
      latitude: mapPickerCenter.lat,
      longitude: mapPickerCenter.lng,
    }));
    setMapPickerOpen(false);
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
  };

  useEffect(() => () => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
  }, [posterPreviewUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const startAt = toBangkokIso(startDate, startTime);
    const endAt = endTime ? toBangkokIso(endDate || startDate, endTime) : null;

    if (!title.trim() || !startAt || !venueName.trim() || !summary.trim() || !organizerEmail.trim()) {
      toast.error('标题、时间、地点、简介和发起人邮箱必须填写');
      return;
    }

    setSubmitting(true);
    try {
      const coverImageUrl = posterFile ? await uploadCmiEventPoster(posterFile) : null;
      if (posterFile && !coverImageUrl) {
        toast.error('海报上传失败，请重试或先移除海报');
        return;
      }

      const createdEvent = await createCmiEvent({
        title,
        type,
        startAt,
        endAt,
        venueName,
        area,
        latitude: parseOptionalNumber(latitude),
        longitude: parseOptionalNumber(longitude),
        priceLabel,
        registrationLabel: 'CMI Map 一键报名',
        hostName: organizerName || profile?.user_name || user.email || 'CMI Map 用户',
        organizerName: organizerName || profile?.user_name || user.email || 'CMI Map 用户',
        organizerEmail,
        contactEmail: null,
        capacity: parseOptionalNumber(capacity),
        attendeeVisibility,
        summary,
        detailBody,
        coverImageUrl,
        tags: [],
        userId: user.id,
      });

      toast.success('活动已发布');
      navigate(getCmiEventPath(createdEvent.id), { replace: true });
    } catch (error) {
      toast.error('活动发布失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#fffdf8] text-[#242424]">
      <header className="sticky top-0 z-30 border-b border-[#2e2a23]/10 bg-[#fffdf8]/94 px-4 py-[calc(env(safe-area-inset-top)+10px)] pb-3 backdrop-blur">
        <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="min-h-11 rounded-full border border-[#2e2a23]/12 bg-white px-4 font-black"
            onClick={() => navigate(getSceneListPath('tomorrow-events'))}
          >
            <ArrowLeft className="h-4 w-4" />
            活动
          </Button>
          <span className="rounded-full bg-[#e8f2e7] px-3 py-1.5 text-[12px] font-black text-[#3f6e52]">
            发布活动
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] px-4 pb-24 pt-4">
        <section className="rounded-[1.4rem] border border-[#2e2a23]/10 bg-[#fff7df] p-4 shadow-[0_14px_34px_rgba(46,42,35,0.08)]">
          <div className="flex items-center gap-2 text-[#3f6e52]">
            <UsersRound className="h-5 w-5" strokeWidth={2.6} />
            <h1 className="text-2xl font-black leading-tight text-[#242424]">发起一场活动</h1>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">活动标题</span>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-base font-bold outline-none focus:border-[#3f6e52]"
                maxLength={72}
                placeholder="例如：周五晚一起听爵士"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">活动海报</span>
              <EventPosterField
                posterUrl={posterPreviewUrl}
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
                  onChange={event => setType(event.target.value as CmiEventType)}
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
                  onChange={event => setCapacity(event.target.value)}
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
                <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
                <input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
                <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" />
                <input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} className="min-h-11 rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" placeholder="结束时间" />
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
                    onChange={event => handleVenueNameChange(event.target.value)}
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

                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#2e2a23]/12 bg-white text-sm font-black text-[#6d6a62] active:scale-[0.99]"
                  onClick={openMapPicker}
                >
                  <Crosshair className="h-4 w-4" strokeWidth={2.4} />
                  地图选点
                </button>

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
                        : hasVenueQuery ? 'CMI 地点候选' : '从标题 / 简介里识别到'}
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

                <input value={area} onChange={event => setArea(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#2e2a23]/12 bg-white px-3 text-sm font-bold" placeholder="区域，例如 Nimman / 古城北门" />
              </div>
            </div>

            {mapPickerOpen && (
              <EventLocationMapPicker
                center={mapPickerCenter}
                onCenterChange={setMapPickerCenter}
                onConfirm={confirmMapPicker}
                onClose={() => setMapPickerOpen(false)}
              />
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">一句话简介</span>
              <textarea value={summary} onChange={event => setSummary(event.target.value)} maxLength={220} className="min-h-24 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 py-3 text-sm font-bold leading-relaxed outline-none focus:border-[#3f6e52]" placeholder="谁适合来、会发生什么、为什么值得去" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-black text-[#6d6a62]">详细说明</span>
              <textarea value={detailBody} onChange={event => setDetailBody(event.target.value)} className="min-h-28 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 py-3 text-sm font-bold leading-relaxed outline-none focus:border-[#3f6e52]" placeholder="补充流程、集合方式、注意事项" />
            </label>

            <div className="rounded-2xl border border-[#2e2a23]/8 bg-white/72 p-3">
              <div className="mb-3 text-xs font-black text-[#8b5f32]">
                发布设置
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black text-[#6d6a62]">费用</span>
                  <input
                    value={priceLabel}
                    onChange={event => setPriceLabel(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-bold"
                    placeholder="免费 / AA / 100 THB"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black text-[#6d6a62]">发起人</span>
                  <input
                    value={organizerName}
                    onChange={event => setOrganizerName(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-bold"
                    placeholder="你的名字"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-[11px] font-black text-[#6d6a62]">发起人邮箱</span>
                <input
                  value={organizerEmail}
                  onChange={event => setOrganizerEmail(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[#2e2a23]/12 bg-white px-4 text-sm font-bold"
                  placeholder="这个邮箱登录后可以管理活动"
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
              disabled={submitting}
              className="min-h-13 w-full rounded-full bg-[#3f6e52] text-base font-black text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              发布活动
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
