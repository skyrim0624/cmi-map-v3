import { ArrowLeft, Loader2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createCmiCompanionInvite } from '@/db/cmi-companions';

type StartsAtMode = 'now' | 'tonight' | 'tomorrow' | 'custom';

const STARTS_AT_OPTIONS: Array<{ value: StartsAtMode; label: string }> = [
  { value: 'now', label: '现在' },
  { value: 'tonight', label: '今晚' },
  { value: 'tomorrow', label: '明天' },
  { value: 'custom', label: '自定义' },
];

const getBangkokDateParts = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
    return parts;
  }, {});

const getBangkokDateTimeLocal = (date: Date) => {
  const parts = getBangkokDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const getBangkokDate = (date: Date) => {
  const parts = getBangkokDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getStartsAtValue = (mode: StartsAtMode, customValue: string) => {
  const now = new Date();
  if (mode === 'now') return getBangkokDateTimeLocal(now);
  if (mode === 'tonight') return `${getBangkokDate(now)}T19:00`;
  if (mode === 'tomorrow') {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return `${getBangkokDate(tomorrow)}T19:00`;
  }

  return customValue;
};

const toBangkokIso = (value: string) => value ? `${value}:00+07:00` : '';

const parseOptionalNumber = (value: string | null) => {
  if (!value) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export default function CmiCompanionCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const companionContext = useMemo(
    () => ({
      placeId: searchParams.get('placeId'),
      placeName: searchParams.get('place'),
      eventId: searchParams.get('event'),
      latitude: parseOptionalNumber(searchParams.get('lat')),
      longitude: parseOptionalNumber(searchParams.get('lng')),
    }),
    [searchParams]
  );
  const [title, setTitle] = useState('');
  const [startsAtMode, setStartsAtMode] = useState<StartsAtMode>('now');
  const [customStartsAt, setCustomStartsAt] = useState(() => getBangkokDateTimeLocal(new Date()));
  const [capacity, setCapacity] = useState('');
  const [costNote, setCostNote] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [vibe, setVibe] = useState('轻松');
  const [hostNote, setHostNote] = useState('');
  const [contactLabel, setContactLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const contextLabel = companionContext.placeName ?? companionContext.eventId ?? '约搭子';
  const canSubmit = Boolean(
    user &&
    title.trim() &&
    contactLabel.trim() &&
    (companionContext.placeId || companionContext.eventId)
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: `/companions/new?${searchParams.toString()}` }, replace: true });
    }
  }, [authLoading, navigate, searchParams, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !canSubmit || submitting) return;

    setSubmitting(true);
    try {
      await createCmiCompanionInvite({
        creatorId: user.id,
        placeId: companionContext.placeId,
        placeName: companionContext.placeName,
        latitude: companionContext.latitude,
        longitude: companionContext.longitude,
        eventId: companionContext.eventId,
        title,
        startsAt: toBangkokIso(getStartsAtValue(startsAtMode, customStartsAt)),
        capacity: capacity ? Number(capacity) : null,
        costNote,
        conditionNote,
        vibe,
        hostNote,
        contactLabel,
      });
      navigate('/?screen=map');
    } catch (error) {
      console.error('发送约搭子失败:', error);
      toast.error('发送失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return <main className="min-h-screen bg-[#fff9e8]" />;
  }

  return (
    <main className="min-h-screen bg-[#fff9e8] text-[#161616]">
      <section className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <header className="mb-5 grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-black/15 bg-white"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.6} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-black/55">{contextLabel}</p>
            <h1 className="text-2xl font-black leading-none">约搭子</h1>
          </div>
        </header>

        <form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-black">一句话标题</span>
            <input
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black">时间</span>
            <select
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              value={startsAtMode}
              onChange={(event) => setStartsAtMode(event.target.value as StartsAtMode)}
            >
              {STARTS_AT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {startsAtMode === 'custom' && (
            <label className="grid gap-2">
              <span className="text-sm font-black">时间</span>
              <input
                className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
                type="datetime-local"
                value={customStartsAt}
                onChange={(event) => setCustomStartsAt(event.target.value)}
                required
              />
            </label>
          )}

          <label className="grid gap-2">
            <span className="text-sm font-black">人数</span>
            <input
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              min="1"
              inputMode="numeric"
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black">费用</span>
            <input
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              value={costNote}
              onChange={(event) => setCostNote(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black">条件</span>
            <input
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              value={conditionNote}
              onChange={(event) => setConditionNote(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black">氛围</span>
            <select
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              value={vibe}
              onChange={(event) => setVibe(event.target.value)}
            >
              {['轻松', '深聊', '音乐', '运动', '拼车', 'AA'].map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black">Host note</span>
            <textarea
              className="min-h-24 resize-none rounded-2xl border border-black/15 bg-white px-4 py-3 text-base font-bold outline-none focus:border-black"
              value={hostNote}
              onChange={(event) => setHostNote(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black">联系方式</span>
            <input
              className="h-12 rounded-2xl border border-black/15 bg-white px-4 text-base font-bold outline-none focus:border-black"
              value={contactLabel}
              onChange={(event) => setContactLabel(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="mt-auto inline-flex h-[52px] min-h-[52px] items-center justify-center rounded-full bg-[#161616] px-5 text-base font-black text-white disabled:opacity-45"
            disabled={!canSubmit || submitting}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : '发送'}
          </button>
        </form>
      </section>
    </main>
  );
}
