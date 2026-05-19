import type { CmiScene } from '@/data/cmi-scenes';
import type { ResolvedCmiHomeSection } from '@/data/cmi-home-sections';
import { HomeSceneIcon, getHomeSceneToneClass } from '@/components/home/home-scene-icon';
import { DirectIntentCommandPanel } from '@/features/home/direct-intent/direct-intent-command-panel';
import { HomeSurvivalKitCommandPanel } from '@/features/home/survival-kit/survival-kit-command-panel';
import { useState } from 'react';
import {
  BedDouble,
  CalendarDays,
  Images,
  LifeBuoy,
  MessageSquareText,
  Shuffle,
} from 'lucide-react';

interface HomeSceneSectionProps {
  section: ResolvedCmiHomeSection;
  onSceneSelect: (scene: CmiScene) => void;
  onFeatureSelect: (path: string) => void;
}

function HomeSceneCard({
  scene,
  onSelect,
}: {
  scene: CmiScene;
  onSelect: (scene: CmiScene) => void;
}) {
  return (
    <button
      type="button"
      className={`min-h-[124px] rounded-lg border-2 p-3 text-left shadow-[3px_4px_0_rgba(0,0,0,0.16)] transition-transform active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(0,0,0,0.14)] ${getHomeSceneToneClass(scene.id)}`}
      onClick={() => onSelect(scene)}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/80">
          <HomeSceneIcon scene={scene} />
        </div>
      </div>
      <p className="text-base font-black leading-tight">{scene.homeTitle}</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug opacity-75">
        {scene.homeDescription}
      </p>
    </button>
  );
}

function HomeFeatureCard({
  section,
  onFeatureSelect,
}: {
  section: ResolvedCmiHomeSection;
  onFeatureSelect: (path: string) => void;
}) {
  if (!section.feature) return null;

  const isCmiInn = section.id === 'cmi-inn';
  const tone = isCmiInn
    ? {
      border: 'border-[#8b6a38]',
      background: 'bg-[#fff8ed]',
      text: 'text-[#8b6a38]',
      softBorder: 'border-[#8b6a38]/25',
      eyebrow: 'CMI HOME',
      Icon: BedDouble,
      highlightIcons: [CalendarDays, Images, MessageSquareText, BedDouble],
    }
    : {
      border: 'border-[#4f6f82]',
      background: 'bg-[#f5f9fb]',
      text: 'text-[#4f6f82]',
      softBorder: 'border-[#4f6f82]/25',
      eyebrow: 'SURVIVAL KIT',
      Icon: LifeBuoy,
      highlightIcons: [LifeBuoy, MessageSquareText, CalendarDays, BedDouble],
    };
  const FeatureIcon = tone.Icon;

  return (
    <button
      type="button"
      className={`w-full rounded-lg border-2 ${tone.border} ${tone.background} p-4 text-left shadow-[4px_5px_0_rgba(0,0,0,0.16)] transition-transform active:translate-y-0.5`}
      onClick={() => onFeatureSelect(section.feature!.path)}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${tone.text}`}>
            {tone.eyebrow}
          </p>
          <h3 className="mt-1 text-2xl font-black leading-tight text-foreground">
            {section.feature.title}
          </h3>
        </div>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 ${tone.border} bg-background`}>
          <FeatureIcon className={`h-7 w-7 ${tone.text}`} strokeWidth={2.5} />
        </div>
      </div>

      <p className="text-sm font-semibold leading-relaxed text-foreground/80">
        {section.feature.description}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {section.feature.highlights.map((item, index) => {
          const Icon = tone.highlightIcons[index] ?? MessageSquareText;

          return (
            <span
              key={item}
              className={`flex min-h-10 items-center gap-2 rounded-lg border ${tone.softBorder} bg-background/70 px-2.5 py-2 text-xs font-black text-foreground`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${tone.text}`} strokeWidth={2.5} />
              {item}
            </span>
          );
        })}
      </div>
    </button>
  );
}

export function HomeSceneSection({
  section,
  onSceneSelect,
  onFeatureSelect,
}: HomeSceneSectionProps) {
  const [ideaIndex, setIdeaIndex] = useState(0);
  const rotatingIdea = section.showRotatingIdeas === false
    ? null
    : section.rotatingIdeas?.[ideaIndex % section.rotatingIdeas.length];
  const isDirectIntentSection = section.id === 'direct-intent';
  const isLifeServiceSection = section.id === 'life-service';

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-black text-foreground">{section.title}</h3>
        {section.description && (
          <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">
            {section.description}
          </p>
        )}
      </div>

      {section.feature && !isLifeServiceSection && (
        <HomeFeatureCard section={section} onFeatureSelect={onFeatureSelect} />
      )}

      {isDirectIntentSection && (
        <DirectIntentCommandPanel onFeatureSelect={onFeatureSelect} />
      )}

      {isLifeServiceSection && (
        <HomeSurvivalKitCommandPanel onFeatureSelect={onFeatureSelect} />
      )}

      {!isDirectIntentSection && !isLifeServiceSection && section.scenes.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {section.scenes.map(scene => (
            <HomeSceneCard key={scene.id} scene={scene} onSelect={onSceneSelect} />
          ))}
        </div>
      )}

      {rotatingIdea && (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed border-primary/45 bg-primary/5 px-3 py-3 text-left transition-transform active:translate-y-0.5"
          onClick={() => {
            const nextIndex = (ideaIndex + 1) % section.rotatingIdeas!.length;
            setIdeaIndex(nextIndex);
          }}
          onDoubleClick={() => {
            const scene = section.scenes.find(item => item.id === rotatingIdea.sceneId);
            if (scene) onSceneSelect(scene);
          }}
        >
          <div className="min-w-0">
            <p className="text-xs font-black text-primary">换一批灵感</p>
            <p className="mt-0.5 truncate text-sm font-black text-foreground">
              {rotatingIdea.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted-foreground">
              {rotatingIdea.description}
            </p>
          </div>
          <Shuffle className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
        </button>
      )}

      {section.supportingIntents && !isLifeServiceSection && (
        <div className="flex flex-wrap gap-2">
          {section.supportingIntents.map(intent => (
            <span
              key={intent}
              className="rounded-full border border-[#4f6f82]/25 bg-[#f5f9fb] px-3 py-1 text-xs font-black text-[#314f60]"
            >
              {intent}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
