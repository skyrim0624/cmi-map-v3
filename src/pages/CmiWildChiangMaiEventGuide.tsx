import { MapPinned } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getCmiEventPath } from '@/lib/paths';

const GUIDE_IMAGE_URL = '/cmi-home/event-guides/cmi-wild-chiang-mai-2026-06-guide.png';

const decodeRouteParam = (value: string | undefined) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function CmiWildChiangMaiEventGuide() {
  const { eventId: eventIdParam } = useParams();
  const navigate = useNavigate();
  const eventId = decodeRouteParam(eventIdParam);
  const eventPath = getCmiEventPath(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID);

  if (eventId !== CMI_MAP_WILD_CHIANG_MAI_EVENT_ID) {
    return <Navigate to={eventPath} replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <main className="relative mx-auto min-h-[100dvh] max-w-[520px] overflow-hidden bg-[#063f27]">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="返回主地图"
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 grid h-12 w-12 place-items-center rounded-full border-2 border-[#063f27] bg-[#fff7dc] text-[#063f27] shadow-[4px_5px_0_rgba(6,63,39,0.26)] active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(6,63,39,0.22)]"
        >
          <MapPinned className="h-6 w-6" strokeWidth={3} />
        </button>
        <img
          src={GUIDE_IMAGE_URL}
          alt="神奇动物在哪里活动说明"
          className="block h-auto w-full"
          loading="eager"
        />
      </main>
    </div>
  );
}
