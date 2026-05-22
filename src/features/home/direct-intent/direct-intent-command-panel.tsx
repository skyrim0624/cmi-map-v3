import { ArrowRight, Search } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { getCmiPrimaryIntentTags, resolveCmiDirectIntentQuery } from '@/data/cmi-taxonomy';
import { getSceneMapPath } from '@/lib/paths';

interface DirectIntentCommandPanelProps {
  onFeatureSelect: (path: string) => void;
}

export function DirectIntentCommandPanel({
  onFeatureSelect,
}: DirectIntentCommandPanelProps) {
  const [query, setQuery] = useState('');
  const [searchStateLabel, setSearchStateLabel] = useState('直接说一句');
  const primaryIntentTags = useMemo(() => getCmiPrimaryIntentTags(), []);

  const openDirectIntent = (sceneId: string, placeTypeId?: string) => {
    onFeatureSelect(getSceneMapPath(sceneId, { placeTypeId }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const match = resolveCmiDirectIntentQuery(query);
    if (!match) {
      setSearchStateLabel('先给你一批 CMI 候选');
      onFeatureSelect(getSceneMapPath('pick-for-me'));
      return;
    }

    setSearchStateLabel(`已匹配：${match.label}`);
    openDirectIntent(match.sceneId, match.placeTypeId);
  };

  return (
    <div className="space-y-4">
      <form
        className="rounded-lg border border-border bg-background/78 p-2 shadow-sm"
        onSubmit={handleSubmit}
      >
        <p className="mb-1 px-1 text-[11px] font-black text-muted-foreground">
          {searchStateLabel}
        </p>
        <label className="flex min-h-12 items-center gap-2 rounded-md bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="我很饿 / 想办公 / 想买药"
            aria-label="输入你现在想做什么"
          />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary transition-transform active:scale-[0.94]"
            aria-label="匹配分类"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
        </label>
      </form>

      <div className="grid grid-cols-4 gap-2" aria-label="直接事项">
        {primaryIntentTags.map(tag => (
          <button
            key={tag.id}
            type="button"
            title={tag.description}
            className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-border bg-card/95 px-1.5 text-center shadow-[2px_3px_0_rgba(0,0,0,0.08)] transition-transform active:translate-y-0.5"
            onClick={() => openDirectIntent(tag.sceneId)}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background p-1">
              <img
                src={tag.iconUrl}
                alt=""
                className="h-full w-full object-contain drop-shadow-sm"
              />
            </span>
            <span className="w-full truncate text-[12px] font-black leading-tight text-foreground">
              {tag.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
