import {
  CMI_EVENTS,
  CMI_EVENT_VERIFICATION_LABELS,
  formatCmiEventTime,
  getCmiEventTypeLabel,
  type CmiEvent,
} from '@/data/cmi-events';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { CMI_INTENT_SCENE_RULES } from '@/data/cmi-scene-tags';
import { CMI_SCENES, type CmiSceneId } from '@/data/cmi-scenes';
import { Button } from '@/components/ui/button';
import { getAiRouteLabPath } from '@/lib/paths';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const INTENT_SCENE_IDS: CmiSceneId[] = ['nearby-wander', 'pick-for-me', 'weekend', 'tomorrow-events'];

export default function IntentOps() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CmiEvent[]>(CMI_EVENTS);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const scenes = INTENT_SCENE_IDS.map(sceneId =>
    CMI_SCENES.find(scene => scene.id === sceneId)
  ).filter(Boolean);

  useEffect(() => {
    let isMounted = true;

    getPublishedCmiEvents().then(data => {
      if (!isMounted) return;
      setEvents(data);
      setIsLoadingEvents(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-[calc(env(safe-area-inset-top)+20px)] pb-24">
      <header className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
            OPS MVP
          </p>
          <h1 className="text-2xl font-black text-foreground">
            模糊意图运营底座
          </h1>
        </div>
      </header>

      <section className="mb-5 rounded-lg border-2 border-foreground bg-card p-4 shadow-[3px_4px_0_rgba(0,0,0,0.14)]">
        <h2 className="text-lg font-black text-foreground">当前要维护的 4 个入口</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
          这里先作为内部查看页：看每个入口靠哪些关键词、标签、二级筛选和活动数据支撑。
        </p>
      </section>

      <div className="space-y-4">
        {scenes.map(scene => {
          if (!scene) return null;
          const rule = CMI_INTENT_SCENE_RULES[scene.id];

          return (
            <section
              key={scene.id}
              className="rounded-lg border-2 border-border bg-card p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-foreground">{scene.homeTitle}</h2>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
                    {scene.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                  {rule?.secondaryFilters.length ?? 0} 筛选
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-black text-foreground">二级筛选</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rule?.secondaryFilters.map(filter => (
                      <span key={filter.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-black">
                        {filter.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-black text-foreground">场景标签</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rule?.scenarioTags.map(tag => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-black text-foreground">兜底说明</p>
                  <p className="rounded-lg bg-muted/50 p-3 text-xs font-semibold leading-relaxed text-muted-foreground">
                    {rule?.fallbackTitle}：{rule?.fallbackDescription}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-5 rounded-lg border-2 border-[#7b4d92] bg-[#fbf0ff] p-4">
        <h2 className="text-lg font-black text-foreground">活动库</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          当前{isLoadingEvents ? '正在同步' : `可读 ${events.length} 条`}活动 / 稳定活动源。日常运营要维护来源、核实状态、下次复核时间和分类标签，后续再接 AI 候选搜集。
        </p>
        <div className="mt-3 space-y-2">
          {events.map(event => (
            <div key={event.id} className="rounded-lg bg-background/70 p-3">
              <p className="text-sm font-black text-foreground">{event.title}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {formatCmiEventTime(event)} · {event.venueName}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {getCmiEventTypeLabel(event.type)} · {event.sourceLabel} · {CMI_EVENT_VERIFICATION_LABELS[event.verificationStatus]} · 最后核实 {event.lastCheckedAt.slice(0, 10)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          LATER EXPERIMENT
        </p>
        <h2 className="mt-1 text-base font-black text-foreground">
          AI 动态路线生成器先后置
        </h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
          原型保留，当前阶段先把模糊意图入口、活动数据、地点标签和兜底推荐做好。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(getAiRouteLabPath())}
          className="mt-3 font-black"
        >
          <Sparkles className="h-4 w-4" />
          打开后置实验
        </Button>
      </section>
    </div>
  );
}
