import { BookOpen, CalendarDays, Compass, Moon, Navigation, Sparkles, Users } from 'lucide-react';
import type { CmiScene, CmiSceneId } from '@/data/cmi-scenes';
import { getCategoryIconUrl } from '@/types/types';

const HOME_SCENE_ICON_URLS: Partial<Record<CmiSceneId, string>> = {
  'nearby-wander': '/map-icons/cmi-flat-v2/home-nearby-wander.png',
  'pick-for-me': '/map-icons/cmi-flat-v2/home-community-picks.png',
  'tomorrow-events': '/map-icons/cmi-flat-v2/home-events.png',
};

export const getHomeSceneToneClass = (sceneId: CmiSceneId) => {
  switch (sceneId) {
    case 'life-rescue':
      return 'border-[#4f6f82] bg-[#f5f9fb]';
    case 'massage-relax':
      return 'border-[#2f8b88] bg-[#f1fbfa]';
    case 'nearby':
    case 'nearby-wander':
      return 'border-[#4f7f5f] bg-[#f4faf3]';
    case 'community':
      return 'border-[#8b6a38] bg-[#fff8ed]';
    case 'pick-for-me':
      return 'border-[#5f6f8f] bg-[#f4f6fb]';
    case 'night':
      return 'border-[#463f7a] bg-[#f4f1ff]';
    case 'study':
      return 'border-[#5f6f8f] bg-[#f3f6ff]';
    case 'weekend':
      return 'border-[#b3652f] bg-[#fff5ed]';
    case 'tomorrow-events':
      return 'border-[#7b4d92] bg-[#fbf0ff]';
    case 'explore':
      return 'border-primary bg-primary text-primary-foreground';
    default:
      return 'border-border bg-card';
  }
};

export function HomeSceneIcon({ scene }: { scene: CmiScene }) {
  const homeSceneIconUrl = HOME_SCENE_ICON_URLS[scene.id];

  if (homeSceneIconUrl) {
    return (
      <img
        src={homeSceneIconUrl}
        alt=""
        className="h-10 w-10 object-contain drop-shadow-sm"
      />
    );
  }

  if (scene.homeIconCategory) {
    return (
      <img
        src={getCategoryIconUrl(scene.homeIconCategory)}
        alt=""
        className="h-10 w-10 object-contain drop-shadow-sm"
      />
    );
  }

  const iconClassName = scene.id === 'explore' ? 'h-8 w-8 text-primary-foreground' : 'h-8 w-8 text-primary';

  switch (scene.id) {
    case 'nearby':
    case 'nearby-wander':
      return <Navigation className={iconClassName} strokeWidth={2.6} />;
    case 'night':
      return <Moon className={iconClassName} strokeWidth={2.6} />;
    case 'study':
      return <BookOpen className={iconClassName} strokeWidth={2.6} />;
    case 'weekend':
      return <Sparkles className={iconClassName} strokeWidth={2.6} />;
    case 'tomorrow-events':
      return <CalendarDays className={iconClassName} strokeWidth={2.6} />;
    case 'community':
    case 'pick-for-me':
      return <Users className={iconClassName} strokeWidth={2.6} />;
    case 'explore':
      return <Compass className={iconClassName} strokeWidth={2.6} />;
    default:
      return <Sparkles className={iconClassName} strokeWidth={2.6} />;
  }
}
