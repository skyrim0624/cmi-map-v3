import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCmiEventCardImageUrl } from '@/components/intent/event-card-presentation';
import { type CmiEvent, formatCmiEventTime, getCmiEventById } from '@/data/cmi-events';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { type BlackboardDraft, CmiBlackboard } from '@/features/home/blackboard/cmi-blackboard';

const BLACKBOARD_TITLE_LIMIT = 48;
const BLACKBOARD_BODY_LIMIT = 600;

const trimForBlackboard = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value;

export default function CmiBlackboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event');
  const placeName = searchParams.get('place');
  const locationLabel = searchParams.get('location');
  const shouldOpenComposer = searchParams.get('compose') === '1';
  const [publishedEvents, setPublishedEvents] = useState<CmiEvent[]>([]);
  const localEvent = useMemo(() => getCmiEventById(eventId), [eventId]);
  const linkedEvent = useMemo(() => {
    if (!eventId) return null;
    return publishedEvents.find(event => event.id === eventId) ?? localEvent;
  }, [eventId, localEvent, publishedEvents]);

  useEffect(() => {
    let isMounted = true;

    if (!eventId || !shouldOpenComposer || localEvent) {
      setPublishedEvents([]);
      return () => {
        isMounted = false;
      };
    }

    getPublishedCmiEvents()
      .then(events => {
        if (isMounted) setPublishedEvents(events);
      })
      .catch(() => {
        if (isMounted) setPublishedEvents([]);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, localEvent, shouldOpenComposer]);

  const eventDraft = useMemo<Partial<BlackboardDraft> | undefined>(() => {
    if (!linkedEvent) return undefined;

    return {
      category: 'share',
      body: trimForBlackboard('想把这个活动转给大家，感兴趣的可以点引用进去看详情。', BLACKBOARD_BODY_LIMIT),
      timeLabel: formatCmiEventTime(linkedEvent),
      locationLabel: `${linkedEvent.venueName}${linkedEvent.area ? ` · ${linkedEvent.area}` : ''}`,
      imageUrls: [getCmiEventCardImageUrl(linkedEvent)],
      linkedEventId: linkedEvent.id,
      linkedEventTitle: linkedEvent.title,
      linkedPlaceName: linkedEvent.venueName,
    };
  }, [linkedEvent]);
  const placeDraft = useMemo<Partial<BlackboardDraft> | undefined>(() => {
    const normalizedPlaceName = placeName?.trim();
    if (!normalizedPlaceName) return undefined;

    return {
      category: 'companion',
      title: trimForBlackboard(`一起去：${normalizedPlaceName}`, BLACKBOARD_TITLE_LIMIT),
      body: trimForBlackboard(`想在 ${normalizedPlaceName} 约一局，看看有没有同路的人。`, BLACKBOARD_BODY_LIMIT),
      locationLabel: locationLabel?.trim() || normalizedPlaceName,
      linkedPlaceName: normalizedPlaceName,
    };
  }, [locationLabel, placeName]);
  const initialDraft = eventDraft ?? placeDraft;

  return (
    <div className="min-h-[100dvh] bg-[#f1edfa]">
      <header className="sticky top-0 z-30 border-b border-[#ded4f1] bg-[#f7f3ff] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#262626] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[1.8rem] font-black leading-tight text-[#262626]">
              清迈生活板
            </h1>
            <p className="truncate text-[0.92rem] font-black text-[#8a7aa6]">
              找搭子、求助、分享，先放在这里。
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-0">
        <CmiBlackboard autoOpenComposer={shouldOpenComposer} initialDraft={initialDraft} />
      </main>
    </div>
  );
}
