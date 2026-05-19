import type { CmiInspirationCard as CmiInspirationCardData } from '@/data/cmi-inspirations';
import { Route } from 'lucide-react';

export function CmiInspirationCard({ card }: { card: CmiInspirationCardData }) {
  return (
    <article className="rounded-lg border-2 border-primary bg-primary/5 p-4 shadow-[3px_4px_0_rgba(0,0,0,0.12)]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Route className="h-5 w-5" strokeWidth={2.6} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
            INSPIRATION
          </p>
          <h2 className="mt-0.5 text-lg font-black leading-tight text-foreground">
            {card.title}
          </h2>
        </div>
      </div>

      <p className="text-sm font-semibold leading-relaxed text-foreground/80">
        {card.summary}
      </p>

      <ol className="mt-3 space-y-1.5">
        {card.steps.slice(0, 3).map((step, index) => (
          <li key={`${step}-${index}`} className="flex gap-2 text-sm font-bold text-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-black text-primary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-black text-primary">
          {card.durationLabel}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-black text-primary">
          {card.bestTimeLabel}
        </span>
        {card.tags.slice(0, 2).map(tag => (
          <span key={tag} className="rounded-full bg-background px-2 py-0.5 text-[11px] font-black text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
