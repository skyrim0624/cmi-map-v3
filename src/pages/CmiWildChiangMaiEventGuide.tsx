import { Navigate, useParams } from 'react-router-dom';
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
  const eventId = decodeRouteParam(eventIdParam);
  const eventPath = getCmiEventPath(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID);

  if (eventId !== CMI_MAP_WILD_CHIANG_MAI_EVENT_ID) {
    return <Navigate to={eventPath} replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <main className="mx-auto min-h-[100dvh] max-w-[520px] overflow-hidden bg-[#063f27]">
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
