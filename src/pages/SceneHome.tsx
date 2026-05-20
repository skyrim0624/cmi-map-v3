import { LogIn, Plus } from 'lucide-react';
import { Fragment, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { HomeSceneSection } from '@/components/home/home-scene-section';
import { PageCurlMapEntry } from '@/components/home/page-curl-map-entry';
import { LeafletMap } from '@/components/map/LeafletMap';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getCmiHomeSections } from '@/data/cmi-home-sections';
import { CmiBlackboardEntry } from '@/features/home/blackboard/cmi-blackboard';
import { preloadImages, warmupImages } from '@/lib/image-warmup';
import { getSceneEntryPath } from '@/lib/paths';

const CRITICAL_HOME_IMAGE_URLS = [
  '/brand/page-curl-corner.png',
  '/brand/cmi-inn-entry.png',
];

const HOME_WARMUP_IMAGE_URLS = [
  '/map-icons/cmi-flat-v2/direct-eat.png',
  '/map-icons/cmi-flat-v2/direct-work.png',
  '/map-icons/cmi-flat-v2/direct-study.png',
  '/map-icons/cmi-flat-v2/direct-shopping.png',
  '/map-icons/cmi-flat-v2/direct-play.png',
  '/map-icons/cmi-flat-v2/direct-relax.png',
  '/map-icons/cmi-flat-v2/direct-sport.png',
  '/map-icons/cmi-flat-v2/direct-errands.png',
  '/map-icons/cmi-flat-v2/home-nearby-wander.png',
  '/map-icons/cmi-flat-v2/home-community-picks.png',
  '/map-icons/cmi-flat-v2/place-market.png',
  '/map-icons/cmi-flat-v2/home-events.png',
  '/cmi-home/qr-andreas.jpg',
  '/cmi-home/qr-community-group-5.jpg',
  '/cmi-home/qr-linke.jpg',
];

preloadImages(CRITICAL_HOME_IMAGE_URLS);

export default function SceneHome() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';
  const homeSections = getCmiHomeSections();
  const cmiInnSection = homeSections.find(section => section.id === 'cmi-inn');
  const visibleHomeSections = homeSections.filter(section => section.id !== 'cmi-inn');

  useEffect(() => {
    warmupImages(HOME_WARMUP_IMAGE_URLS, { batchSize: 4, delayMs: 120 });
  }, []);

  const handleMarkPlace = () => {
    if (!user) {
      toast('登录后才能标记地点哦', { description: '注册只需要一个邮箱 ✉️' });
      navigate('/login', { state: { from: '/mark' } });
      return;
    }
    navigate('/mark');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 opacity-60 saturate-[0.55]">
        <LeafletMap
          markers={[]}
          mode="view"
          interactive={false}
          showUserLocation={false}
          className="h-full w-full scale-[1.08]"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-background/90 via-background/55 to-background/85" />
      <div className="pointer-events-none absolute inset-0 z-[11] bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0)_0,rgba(255,255,255,0.28)_8rem,rgba(255,255,255,0)_13rem),linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,250,242,0.1)_42%,rgba(255,255,255,0.28))]" />
      <PageCurlMapEntry onClick={() => navigate('/map')} />

      <header className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+14px)] z-30 flex items-center justify-start">
        <h1 className="rounded-full border border-border/70 bg-background/90 px-5 py-2.5 text-2xl font-black text-foreground shadow-lg backdrop-blur-md">
          CMI Map
        </h1>
      </header>

      <main className="relative z-20 h-full overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+168px)] pt-[calc(env(safe-area-inset-top)+116px)]">
        <section className="relative mb-5">
          <h2 className="max-w-[300px] text-[2.2rem] font-black leading-[1.1] text-foreground">
            <span className="block">清迈，</span>
            <span className="block whitespace-nowrap">今天怎么过？</span>
          </h2>
          <p className="mt-2 max-w-[220px] text-sm font-black leading-snug text-muted-foreground/85">
            给来清迈的人用的中文生活地图。
          </p>

          {cmiInnSection?.feature && (
            <button
              type="button"
              className="group absolute -right-1 -top-4 flex h-[118px] w-[118px] items-center justify-center touch-manipulation transition-transform duration-200 ease-out active:scale-95"
              onClick={() => navigate(cmiInnSection.feature!.path)}
              aria-label="打开清迈客栈"
            >
              <img
                src="/brand/cmi-inn-entry.png"
                alt=""
                loading="eager"
                decoding="async"
                className="h-[96px] w-[96px] rotate-[4deg] object-contain drop-shadow-[4px_6px_0_rgba(0,0,0,0.16)] transition-transform duration-200 ease-out group-active:rotate-0 group-active:drop-shadow-[2px_3px_0_rgba(0,0,0,0.18)]"
                draggable={false}
              />
              <span className="absolute bottom-1 right-1 rotate-[-4deg] rounded-full border-2 border-[#8b6a38] bg-[#fff8ed]/95 px-2 py-1 text-[11px] font-black leading-none text-[#5f4523] shadow-[2px_3px_0_rgba(0,0,0,0.12)]">
                清迈客栈
              </span>
            </button>
          )}
        </section>

        <div className="space-y-6">
          {visibleHomeSections.map(section => (
            <Fragment key={section.id}>
              {section.id === 'life-service' && <CmiBlackboardEntry onOpen={() => navigate('/blackboard')} />}
              <HomeSceneSection
                section={section}
                onSceneSelect={scene => navigate(scene.id === 'pick-for-me' ? '/list' : getSceneEntryPath(scene))}
                onFeatureSelect={path => navigate(path)}
              />
            </Fragment>
          ))}
        </div>
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] h-36 bg-gradient-to-t from-background via-background/95 to-transparent" />

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-4 z-30">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full border-2 border-foreground bg-background p-0 shadow-[3px_4px_0_rgba(0,0,0,0.24)]"
            onClick={() => navigate('/profile')}
            aria-label="打开个人页面"
          >
            <Avatar className="h-full w-full">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
              <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-full border-2 border-foreground font-bold shadow-lg"
            onClick={() => navigate('/login')}
          >
            <LogIn className="mr-2 h-4 w-4" />
            登录
          </Button>
        )}
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 z-30 -translate-x-1/2">
        <button
          className="app-fab flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-6 py-4 font-bold text-primary-foreground"
          onClick={handleMarkPlace}
          aria-label="标记新地点"
        >
          <Plus className="h-6 w-6" strokeWidth={3} />
          <span>标记新地点</span>
        </button>
      </div>
    </div>
  );
}
