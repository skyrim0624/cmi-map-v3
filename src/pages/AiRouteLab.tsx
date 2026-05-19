import { ArrowLeft, CheckCircle2, Loader2, MapPin, Route, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  CMI_EVENTS,
  type CmiEvent,
  getCmiEventsForSceneFromList,
} from '@/data/cmi-events';
import { getRecommendationScenarioTags } from '@/data/cmi-scene-tags';
import {
  getCmiDetailTagsForRecommendation,
  getCmiPlaceTypeTagsForRecommendation,
} from '@/data/cmi-taxonomy';
import { getPlaceGuide } from '@/data/place-guides';
import { getAllRecommendations } from '@/db/api';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { cn } from '@/lib/utils';
import { generateAiRouteDraft } from '@/services/ai-route';
import type {
  AiRouteBridgeResponse,
  AiRouteCandidateEvent,
  AiRouteCandidatePlace,
  AiRouteDraftRequest,
  AiRouteTransport,
} from '@/types/ai-route';
import type { Recommendation } from '@/types/types';

interface RouteFormState {
  startArea: string;
  theme: string;
  preferenceText: string;
  durationHours: number;
  budget: string;
  transport: AiRouteTransport;
  mustVisit: string;
  avoidText: string;
}

interface AreaAnchor {
  label: string;
  aliases: string[];
  latitude: number;
  longitude: number;
}

const DEFAULT_FORM: RouteFormState = {
  startArea: '宁曼',
  theme: '今晚人少一点的爵士酒吧',
  preferenceText: '人少、价格不要太贵、可以坐着听音乐',
  durationHours: 3,
  budget: '平价 / 正常',
  transport: 'mixed',
  mustVisit: '',
  avoidText: '太游客、太吵、太远',
};

const AREA_ANCHORS: AreaAnchor[] = [
  { label: '宁曼', aliases: ['宁曼', 'nimman', 'one nimman'], latitude: 18.8002, longitude: 98.9677 },
  { label: '古城', aliases: ['古城', 'old city', 'tha phae'], latitude: 18.7883, longitude: 98.9853 },
  { label: '清迈客栈', aliases: ['清迈客栈', 'cmi', 'chiang mai inn'], latitude: 18.7932, longitude: 98.9874 },
  { label: '河边', aliases: ['河边', 'ping river', 'warorot'], latitude: 18.787, longitude: 99.0008 },
  { label: '山脚', aliases: ['素贴', 'doi suthep', '山脚'], latitude: 18.7967, longitude: 98.9422 },
];

const TRANSPORT_OPTIONS: Array<{ id: AiRouteTransport; label: string }> = [
  { id: 'mixed', label: '混合' },
  { id: 'walk', label: '步行优先' },
  { id: 'grab', label: 'Grab' },
  { id: 'motorbike', label: '摩托' },
];

const QUERY_HINTS = [
  '爵士',
  '酒吧',
  'bar',
  'live',
  '音乐',
  '人少',
  '便宜',
  '平价',
  '手作',
  '银匠',
  '寺庙',
  '禅修',
  '景点',
  '地标',
  '咖啡',
  '拍照',
  '出片',
  '市集',
  '夜市',
  '安静',
  '自然',
  '户外',
  '散步',
];

const MAX_ROUTE_CANDIDATES = 2;
const MAX_ROUTE_EVENTS = 1;
const MAX_CANDIDATE_SUMMARY_LENGTH = 140;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const trimForPrompt = (value: string, maxLength = MAX_CANDIDATE_SUMMARY_LENGTH) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const getDistanceKm = (
  from: Pick<AreaAnchor, 'latitude' | 'longitude'>,
  to: Pick<Recommendation, 'latitude' | 'longitude'>
) => {
  const radiusKm = 6371;
  const latDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const lonDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const getAreaAnchor = (startArea: string) => {
  const normalizedStartArea = normalize(startArea);
  return AREA_ANCHORS.find(anchor =>
    anchor.aliases.some(alias => normalizedStartArea.includes(normalize(alias)))
  ) ?? AREA_ANCHORS[0];
};

const getNearestAreaLabel = (recommendation: Recommendation) => {
  const nearest = [...AREA_ANCHORS].sort(
    (left, right) => getDistanceKm(left, recommendation) - getDistanceKm(right, recommendation)
  )[0];

  return `${nearest.label}附近`;
};

const getQueryTokens = (form: RouteFormState) => {
  const source = normalize([
    form.startArea,
    form.theme,
    form.preferenceText,
    form.budget,
    form.mustVisit,
  ].join(' '));
  const directTokens = source.split(/[\s,，、/]+/).filter(token => token.length >= 2);
  const hintedTokens = QUERY_HINTS.filter(token => source.includes(normalize(token)));

  return Array.from(new Set([...directTokens, ...hintedTokens]));
};

const getAvoidTokens = (avoidText: string) =>
  normalize(avoidText).split(/[\s,，、/]+/).filter(token => token.length >= 2);

const shouldIncludeEventsForRoute = (form: RouteFormState) => {
  const source = normalize([form.theme, form.preferenceText, form.mustVisit].join(' '));
  return /活动|明天|周末|展览|工作坊|workshop|市集|演出/.test(source);
};

const getRecommendationContent = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const scenarioTags = getRecommendationScenarioTags(recommendation);
  const placeTypeTags = getCmiPlaceTypeTagsForRecommendation(recommendation).map(tag => tag.label);
  const detailTags = getCmiDetailTagsForRecommendation(recommendation).map(tag => tag.label);

  return normalize([
    recommendation.place_name,
    recommendation.category,
    recommendation.reason,
    guide.title,
    guide.kind,
    guide.summary,
    ...guide.tags,
    ...scenarioTags,
    ...placeTypeTags,
    ...detailTags,
  ].join(' '));
};

const scoreRecommendation = (recommendation: Recommendation, form: RouteFormState) => {
  const content = getRecommendationContent(recommendation);
  const source = normalize([form.theme, form.preferenceText, form.mustVisit].join(' '));
  const startAnchor = getAreaAnchor(form.startArea);
  const queryTokens = getQueryTokens(form);
  const avoidTokens = getAvoidTokens(form.avoidText);
  const keywordScore = queryTokens.reduce(
    (score, token) => score + (content.includes(normalize(token)) ? 18 : 0),
    0
  );
  const avoidPenalty = avoidTokens.reduce(
    (score, token) => score + (content.includes(normalize(token)) ? 12 : 0),
    0
  );
  const mustVisitBoost = form.mustVisit && content.includes(normalize(form.mustVisit)) ? 80 : 0;
  const distanceKm = getDistanceKm(startAnchor, recommendation);
  const distanceScore = Math.max(0, 24 - distanceKm * 3);
  const cmiTraceScore = recommendation.reason.trim().length >= 18 ? 6 : 0;
  const barIntentBoost =
    /酒吧|bar|爵士/.test(source) && /酒吧|bar|livehouse|live|音乐|小酌|演出/.test(content) ? 60 : 0;
  const barIntentPenalty =
    /酒吧|bar|爵士/.test(source) && !/酒吧|bar|livehouse|live|音乐|小酌|演出/.test(content) ? 30 : 0;
  const jazzIntentBoost = /爵士|音乐/.test(source) && /livehouse|live|音乐|演出|独立/.test(content) ? 36 : 0;
  const crowdPenalty = /人少|安静/.test(source) && /夜市|市集|市场/.test(content) ? 24 : 0;
  const budgetBoost = /平价|便宜|不贵/.test(source) && /平价|便宜|小吃/.test(content) ? 18 : 0;

  return (
    keywordScore +
    mustVisitBoost +
    distanceScore +
    cmiTraceScore +
    barIntentBoost +
    jazzIntentBoost +
    budgetBoost -
    avoidPenalty -
    barIntentPenalty -
    crowdPenalty
  );
};

const toCandidatePlace = (recommendation: Recommendation, form: RouteFormState): AiRouteCandidatePlace => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const scenarioTags = getRecommendationScenarioTags(recommendation);
  const placeTypeTags = getCmiPlaceTypeTagsForRecommendation(recommendation).map(tag => tag.label);
  const detailTags = getCmiDetailTagsForRecommendation(recommendation).map(tag => tag.label);
  const startAnchor = getAreaAnchor(form.startArea);
  const distanceFromStart = getDistanceKm(startAnchor, recommendation);

  return {
    id: recommendation.id,
    placeName: recommendation.place_name,
    category: recommendation.category,
    areaHint: `${getNearestAreaLabel(recommendation)} · 距${form.startArea || startAnchor.label}约 ${distanceFromStart.toFixed(1)}km`,
    summary: trimForPrompt(`${guide.summary} 推荐语：${recommendation.reason}`),
    tags: Array.from(new Set([guide.kind, ...guide.tags, ...scenarioTags, ...placeTypeTags, ...detailTags])).slice(0, 10),
    latitude: recommendation.latitude,
    longitude: recommendation.longitude,
  };
};

const getCandidateEvents = (events: CmiEvent[]): AiRouteCandidateEvent[] =>
  getCmiEventsForSceneFromList(events, 'tomorrow-events')
    .slice(0, MAX_ROUTE_EVENTS)
    .map(event => ({
      id: event.id,
      title: event.title,
      venueName: event.venueName,
      area: event.area,
      timeLabel: event.startAt
        ? new Intl.DateTimeFormat('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Bangkok',
          }).format(new Date(event.startAt))
        : event.stableSchedule ?? '时间待确认',
      summary: trimForPrompt(`${event.summary} 费用：${event.priceLabel}。报名：${event.registrationLabel}。`),
      tags: [...event.tags, event.type, event.sourceLabel].slice(0, 8),
    }));

export default function AiRouteLab() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RouteFormState>(DEFAULT_FORM);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [events, setEvents] = useState<CmiEvent[]>(CMI_EVENTS);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bridgeResponse, setBridgeResponse] = useState<AiRouteBridgeResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    getAllRecommendations().then(data => {
      if (!isMounted) return;
      setRecommendations(data);
      setIsLoadingPlaces(false);
    });

    getPublishedCmiEvents().then(data => {
      if (!isMounted) return;
      setEvents(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const candidatePlaces = useMemo(() => {
    const byPlaceName = new Map<string, Recommendation>();

    recommendations.forEach(recommendation => {
      const key = normalize(recommendation.place_name);
      if (!byPlaceName.has(key)) byPlaceName.set(key, recommendation);
    });

    return Array.from(byPlaceName.values())
      .sort((left, right) => scoreRecommendation(right, form) - scoreRecommendation(left, form))
      .slice(0, MAX_ROUTE_CANDIDATES)
      .map(recommendation => toCandidatePlace(recommendation, form));
  }, [form, recommendations]);

  const candidateEvents = useMemo(() => getCandidateEvents(events), [events]);
  const routeDraft = bridgeResponse?.route ?? null;
  const modelLabel = routeDraft
    ? routeDraft.provider === 'codex-local'
      ? bridgeResponse?.model ?? 'Codex 本地桥'
      : '本地兜底'
    : '等待生成';

  const updateForm = <Key extends keyof RouteFormState>(key: Key, value: RouteFormState[Key]) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    const request: AiRouteDraftRequest = {
      ...form,
      durationHours: Number.isFinite(form.durationHours) ? form.durationHours : 3,
      candidates: candidatePlaces,
      events: shouldIncludeEventsForRoute(form) ? candidateEvents : [],
    };

    const response = await generateAiRouteDraft(request);
    setBridgeResponse(response);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-[calc(env(safe-area-inset-top)+20px)] pb-24">
      <header className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ops/intent')} aria-label="返回运营底座">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
            AI ROUTE LAB
          </p>
          <h1 className="text-2xl font-black text-foreground">
            AI 动态路线实验页
          </h1>
        </div>
      </header>

      <section className="mb-5 rounded-lg border-2 border-foreground bg-card p-4 shadow-[3px_4px_0_rgba(0,0,0,0.14)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">
              先验证路线能力，不做最终 UI
            </h2>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
              页面会从 CMI Map 候选地点和活动库里挑材料，优先走 Codex 本地桥；桥失败时用本地规则兜底。
            </p>
          </div>
        </div>
      </section>

      <main className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-lg border-2 border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground">用户条件</h2>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                模拟“我现在想去哪”的真实输入。
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
              {candidatePlaces.length} 个候选点
            </span>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-foreground">出发区域</span>
              <input
                value={form.startArea}
                onChange={event => updateForm('startArea', event.target.value)}
                className="h-11 w-full rounded-md border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-foreground">主题 / 模糊意图</span>
              <input
                value={form.theme}
                onChange={event => updateForm('theme', event.target.value)}
                className="h-11 w-full rounded-md border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-foreground">偏好</span>
              <textarea
                value={form.preferenceText}
                onChange={event => updateForm('preferenceText', event.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border-2 border-border bg-background px-3 py-2 text-sm font-semibold leading-relaxed outline-none focus:border-primary"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-foreground">时长</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={form.durationHours}
                  onChange={event => updateForm('durationHours', Number(event.target.value))}
                  className="h-11 w-full rounded-md border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-foreground">预算</span>
                <input
                  value={form.budget}
                  onChange={event => updateForm('budget', event.target.value)}
                  className="h-11 w-full rounded-md border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
                />
              </label>
            </div>

            <div>
              <p className="mb-1 text-xs font-black text-foreground">交通</p>
              <div className="grid grid-cols-2 gap-2">
                {TRANSPORT_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateForm('transport', option.id)}
                    className={cn(
                      'h-10 rounded-md border-2 px-3 text-sm font-black transition-colors',
                      form.transport === option.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-foreground">必去点</span>
              <input
                value={form.mustVisit}
                onChange={event => updateForm('mustVisit', event.target.value)}
                placeholder="可不填"
                className="h-11 w-full rounded-md border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-foreground">避免</span>
              <input
                value={form.avoidText}
                onChange={event => updateForm('avoidText', event.target.value)}
                className="h-11 w-full rounded-md border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
              />
            </label>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingPlaces || candidatePlaces.length === 0}
              className="h-11 w-full font-black"
              data-testid="generate-ai-route"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              生成路线草案
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border-2 border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">路线结果</h2>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  当前模型：{modelLabel}
                </p>
              </div>
              {routeDraft && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                  {routeDraft.provider === 'codex-local' ? 'Codex 桥' : '本地兜底'}
                </span>
              )}
            </div>

            {bridgeResponse?.fallbackReason && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-900">
                桥失败，已用本地兜底：{bridgeResponse.fallbackReason}
              </div>
            )}

            {!routeDraft ? (
              <div className="rounded-lg bg-muted/50 p-5 text-sm font-semibold leading-relaxed text-muted-foreground">
                填好左侧条件后点击生成。第一次调用 Codex 本地桥可能会慢；超时会直接回到本地兜底结果。
              </div>
            ) : (
              <div data-testid="ai-route-result">
                <h3 className="text-2xl font-black text-foreground">{routeDraft.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">
                  {routeDraft.summary}
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] font-black text-muted-foreground">时长</p>
                    <p className="mt-1 text-sm font-black text-foreground">{routeDraft.durationLabel}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] font-black text-muted-foreground">交通</p>
                    <p className="mt-1 text-sm font-black text-foreground">{routeDraft.transportSummary}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {routeDraft.steps.map((step, index) => (
                    <article key={`${step.title}-${index}`} className="rounded-lg border-2 border-border bg-background p-3">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-black text-foreground">{step.title}</h4>
                          <p className="mt-1 text-xs font-black text-primary">
                            {step.placeName ?? step.eventTitle}
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">
                            {step.reason}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black">
                            <span className="rounded-full bg-muted px-2 py-0.5">{step.timeHint}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5">{step.transportHint}</span>
                          </div>
                          {step.caveat && (
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-amber-800">
                              {step.caveat}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <RouteInfoBlock title="替代选项" items={routeDraft.alternatives} />
                  <RouteInfoBlock title="已检查" items={routeDraft.checks} icon="check" />
                  <RouteInfoBlock title="不确定" items={routeDraft.uncertainty} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border-2 border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">这次喂给 AI 的材料</h2>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  先证明路线不是凭空编出来的。
                </p>
              </div>
              {isLoadingPlaces && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <div className="space-y-2">
              {candidatePlaces.slice(0, 6).map(candidate => (
                <div key={candidate.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-black text-foreground">{candidate.placeName}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {candidate.category === '拍照' ? '景点' : candidate.category} · {candidate.areaHint}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {candidate.tags.slice(0, 5).map(tag => (
                      <span key={tag} className="rounded-full bg-background px-2 py-0.5 text-[11px] font-black text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function RouteInfoBlock({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon?: 'check';
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="mb-2 text-xs font-black text-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">暂无</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(item => (
            <li key={item} className="flex gap-1.5 text-xs font-semibold leading-relaxed text-muted-foreground">
              {icon === 'check' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
