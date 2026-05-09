import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CMI_HOME_SCENE_GROUPS,
  getCmiHomeScenesByGroup,
  type CmiScene,
  type CmiSceneId,
} from '@/data/cmi-scenes';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIconUrl } from '@/types/types';
import { Compass, LogIn, MapPinned, Navigation, Plus, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSceneEntryPath } from '@/lib/paths';

const getSceneToneClass = (sceneId: CmiSceneId) => {
  switch (sceneId) {
    case 'life-rescue':
      return 'border-[#4f6f82] bg-[#f5f9fb]';
    case 'massage-relax':
      return 'border-[#2f8b88] bg-[#f1fbfa]';
    case 'nearby':
      return 'border-[#4f7f5f] bg-[#f4faf3]';
    case 'community':
      return 'border-[#8b6a38] bg-[#fff8ed]';
    case 'explore':
      return 'border-primary bg-primary text-primary-foreground';
    default:
      return 'border-border bg-card';
  }
};

const renderSceneIcon = (scene: CmiScene) => {
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
      return <Navigation className={iconClassName} strokeWidth={2.6} />;
    case 'community':
      return <Users className={iconClassName} strokeWidth={2.6} />;
    case 'explore':
      return <Compass className={iconClassName} strokeWidth={2.6} />;
    default:
      return <Sparkles className={iconClassName} strokeWidth={2.6} />;
  }
};

export default function SceneHome() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

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

      <header className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+14px)] z-30 flex items-center justify-between">
        <h1 className="rounded-full border border-border/70 bg-background/90 px-5 py-2.5 text-2xl font-black text-foreground shadow-lg backdrop-blur-md">
          CMI Map
        </h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/map')}
          className="h-12 w-12 rounded-2xl border-border/70 bg-background/90 shadow-lg backdrop-blur-md"
          aria-label="打开完整地图"
        >
          <MapPinned className="h-5 w-5" strokeWidth={2.6} />
        </Button>
      </header>

      <main className="relative z-20 h-full overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+126px)] pt-[calc(env(safe-area-inset-top)+98px)]">
        <section className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            CMI INTENT
          </p>
          <h2 className="mt-1 text-3xl font-black leading-tight text-foreground">
            你现在想在清迈解决什么？
          </h2>
          <p className="mt-2 max-w-[360px] text-sm font-semibold leading-relaxed text-muted-foreground">
            先选一个意图，再看社区留下来的判断和位置。
          </p>
        </section>

        <div className="space-y-6">
          {CMI_HOME_SCENE_GROUPS.map(group => {
            const scenes = getCmiHomeScenesByGroup(group.id);
            if (scenes.length === 0) return null;

            return (
              <section key={group.id} className="space-y-3">
                <div>
                  <h3 className="text-base font-black text-foreground">{group.title}</h3>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">
                    {group.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {scenes.map(scene => (
                    <button
                      key={scene.id}
                      type="button"
                      className={`min-h-[124px] rounded-lg border-2 p-3 text-left shadow-[3px_4px_0_rgba(0,0,0,0.16)] transition-transform active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(0,0,0,0.14)] ${getSceneToneClass(scene.id)}`}
                      onClick={() => navigate(getSceneEntryPath(scene))}
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/80">
                          {renderSceneIcon(scene)}
                        </div>
                      </div>
                      <p className="text-base font-black leading-tight">{scene.homeTitle}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug opacity-75">
                        {scene.homeDescription}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
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
        >
          <Plus className="h-6 w-6" strokeWidth={3} />
          <span>标记新地点</span>
        </button>
      </div>
    </div>
  );
}
