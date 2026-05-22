import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  CMI_SURVIVAL_GUIDES,
  CMI_SURVIVAL_GUIDES_LAST_REVIEWED,
  type CmiSurvivalGuide,
} from '@/data/cmi-survival-guides';
import { cn } from '@/lib/utils';

const urgencyTone: Record<CmiSurvivalGuide['urgency'], string> = {
  必须先做: 'border-[#9f4f4f]/30 bg-[#fff2f0] text-[#824040]',
  落地当天: 'border-[#4f6f82]/30 bg-[#edf7fb] text-[#314f60]',
  第一周: 'border-[#8b6a38]/30 bg-[#fff8ed] text-[#6b4f26]',
  按季节: 'border-[#52765f]/30 bg-[#f0f8f2] text-[#3d6449]',
};

function GuideTopicButton({
  guide,
}: {
  guide: CmiSurvivalGuide;
}) {
  return (
    <a
      href={`#${guide.id}`}
      className="w-full rounded-lg border border-[#4f6f82]/20 bg-background/82 px-3 py-2.5 text-left text-foreground shadow-sm transition-transform active:translate-y-0.5"
    >
      <span className="block text-[11px] font-black leading-none opacity-75">
        {String(guide.order).padStart(2, '0')}
      </span>
      <span className="mt-1 block text-sm font-black leading-tight">
        {guide.shortTitle}
      </span>
      <span className="mt-1 block truncate text-[11px] font-bold opacity-75">
        {guide.timing}
      </span>
    </a>
  );
}

function GuideSourceLinks({ guide }: { guide: CmiSurvivalGuide }) {
  return (
    <div className="border-t border-[#4f6f82]/15 pt-3">
      <p className="mb-2 text-[11px] font-black text-muted-foreground">
        参考来源
      </p>
      <div className="flex flex-wrap gap-2">
        {guide.sourceLinks.map(source => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#4f6f82]/25 bg-background px-2.5 py-1 text-[11px] font-black text-[#314f60] underline-offset-2 hover:underline"
          >
            <span className="truncate">{source.label}</span>
            <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2.6} />
          </a>
        ))}
      </div>
    </div>
  );
}

export function SurvivalGuideArticle({ guide }: { guide: CmiSurvivalGuide }) {
  return (
    <article
      id={guide.id}
      className="scroll-mt-24 rounded-lg border border-[#4f6f82]/20 bg-background/88 p-4 shadow-sm"
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-black', urgencyTone[guide.urgency])}>
            {guide.urgency}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 py-1 text-[11px] font-black text-muted-foreground">
            <Clock3 className="h-3 w-3" strokeWidth={2.6} />
            {guide.timing}
          </span>
        </div>

        <div>
          <h4 className="text-2xl font-black leading-tight text-foreground">
            {guide.title}
          </h4>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground/78">
            {guide.summary}
          </p>
        </div>

        <div className="rounded-lg border border-[#4f6f82]/20 bg-[#f5f9fb] p-3">
          <p className="flex items-start gap-2 text-sm font-black leading-relaxed text-[#314f60]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.6} />
            {guide.primaryAction}
          </p>
        </div>

        <ul className="space-y-2">
          {guide.keyPoints.map(point => (
            <li
              key={point}
              className="flex gap-2 text-sm font-semibold leading-relaxed text-foreground/82"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4f6f82]" strokeWidth={2.6} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-4 space-y-4">
        {guide.sections.map(section => (
          <section key={section.heading} className="space-y-2">
            <h5 className="text-base font-black leading-tight text-foreground">
              {section.heading}
            </h5>
            {section.paragraphs?.map(paragraph => (
              <p
                key={paragraph}
                className="text-sm font-semibold leading-relaxed text-foreground/78"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="space-y-1.5">
                {section.bullets.map(bullet => (
                  <li
                    key={bullet}
                    className="flex gap-2 text-sm font-semibold leading-relaxed text-foreground/78"
                  >
                    <span className="mt-[0.62rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f6f82]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-4">
        <GuideSourceLinks guide={guide} />
      </div>
    </article>
  );
}

export function SurvivalGuideEntryCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="w-full rounded-lg border-2 border-[#4f6f82]/55 bg-[#f5f9fb]/96 p-4 text-left shadow-[3px_4px_0_rgba(0,0,0,0.12)] transition-transform active:translate-y-0.5"
      onClick={onOpen}
    >
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black tracking-[0.14em] text-[#4f6f82]">
              攻略大全
            </p>
            <h3 className="mt-1 text-2xl font-black leading-tight text-foreground">
              清迈落地攻略大全
            </h3>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#4f6f82] bg-background">
            <BookOpenText className="h-6 w-6 text-[#4f6f82]" strokeWidth={2.6} />
          </div>
        </div>
        <p className="text-sm font-semibold leading-relaxed text-foreground/76">
          从入境、住宿登记、电话卡到交通、医疗和安全事项，集中查看 8 篇落地攻略。
        </p>
      </header>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#4f6f82]/20 bg-background/75 px-3 py-2.5">
        <span className="text-sm font-black text-[#314f60]">
          打开攻略入口
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#4f6f82]" strokeWidth={3} />
      </div>
    </button>
  );
}

export function SurvivalGuideLibrary() {
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border-2 border-[#4f6f82]/55 bg-[#f5f9fb]/96 p-4 shadow-[3px_4px_0_rgba(0,0,0,0.12)]">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black tracking-[0.14em] text-[#4f6f82]">
                攻略大全
              </p>
              <h2 className="mt-1 text-3xl font-black leading-tight text-foreground">
                清迈落地攻略大全
              </h2>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#4f6f82] bg-background">
              <BookOpenText className="h-6 w-6 text-[#4f6f82]" strokeWidth={2.6} />
            </div>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-foreground/76">
            从入境、住宿登记、电话卡到交通、医疗和安全事项，按最容易卡住的顺序整理。规则会变化，关键事项出发前再核验一次官方来源。
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[#9f4f4f]/20 bg-[#fff2f0] px-2.5 py-1 text-[11px] font-black text-[#824040]">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.6} />
            最后核验：{CMI_SURVIVAL_GUIDES_LAST_REVIEWED}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2" aria-label="清迈落地攻略主题">
          {CMI_SURVIVAL_GUIDES.map(guide => (
            <GuideTopicButton key={guide.id} guide={guide} />
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {CMI_SURVIVAL_GUIDES.map(guide => (
          <SurvivalGuideArticle key={guide.id} guide={guide} />
        ))}
      </div>
    </div>
  );
}
