import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCmiEventTime, getCmiEventById } from '@/data/cmi-events';
import { type BlackboardDraft, CmiBlackboard } from '@/features/home/blackboard/cmi-blackboard';

const BLACKBOARD_TITLE_LIMIT = 48;
const BLACKBOARD_BODY_LIMIT = 600;

const trimForBlackboard = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value;

export default function CmiBlackboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event');
  const shouldOpenComposer = searchParams.get('compose') === '1';
  const eventDraft = useMemo<Partial<BlackboardDraft> | undefined>(() => {
    const event = getCmiEventById(eventId);
    if (!event) return undefined;

    return {
      category: 'companion',
      title: trimForBlackboard(`一起去：${event.title}`, BLACKBOARD_TITLE_LIMIT),
      body: trimForBlackboard(`@${event.title} 想一起去这个活动，看看有没有同路的人。`, BLACKBOARD_BODY_LIMIT),
      timeLabel: formatCmiEventTime(event),
      locationLabel: `${event.venueName}${event.area ? ` · ${event.area}` : ''}`,
      peopleLabel: '2-4',
      linkedEventId: event.id,
      linkedEventTitle: event.title,
      linkedPlaceName: event.venueName,
    };
  }, [eventId]);

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfaff_0%,#f8f7fb_55%,#ffffff_100%)]">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-white text-foreground shadow-sm"
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black leading-tight text-foreground">
              清迈生活板
            </h1>
            <p className="truncate text-xs font-black text-muted-foreground">
              找搭子、求助、分享，先放在这里。
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
        <CmiBlackboard autoOpenComposer={shouldOpenComposer} initialDraft={eventDraft} />
      </main>
    </div>
  );
}
