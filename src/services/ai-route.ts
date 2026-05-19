import type {
  AiRouteBridgeResponse,
  AiRouteCandidateEvent,
  AiRouteCandidatePlace,
  AiRouteDraft,
  AiRouteDraftRequest,
} from '@/types/ai-route';

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const scoreCandidate = (candidate: AiRouteCandidatePlace, request: AiRouteDraftRequest) => {
  const text = normalize([
    candidate.placeName,
    candidate.category,
    candidate.areaHint,
    candidate.summary,
    ...candidate.tags,
  ].join(' '));
  const queryTokens = normalize([
    request.startArea,
    request.theme,
    request.preferenceText,
    request.budget,
    request.mustVisit,
    request.avoidText,
  ].join(' '))
    .split(/[\s,，、]+/)
    .filter(Boolean);

  return queryTokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
};

export const buildLocalRouteDraft = (request: AiRouteDraftRequest): AiRouteDraft => {
  const rankedCandidates = [...request.candidates]
    .sort((left, right) => scoreCandidate(right, request) - scoreCandidate(left, request))
    .slice(0, 4);
  const topEvent = request.events[0];
  const fallbackPlaces = rankedCandidates.length > 0 ? rankedCandidates : request.candidates.slice(0, 3);

  const steps = [
    ...(topEvent
      ? [{
          title: '先看今天有没有值得插进去的活动',
          eventTitle: topEvent.title,
          timeHint: topEvent.timeLabel,
          transportHint: `${topEvent.area} · ${request.transport === 'walk' ? '优先步行或短途移动' : '按距离决定交通'}`,
          reason: topEvent.summary,
          caveat: '活动时间和报名方式需要出发前再确认。',
        }]
      : []),
    ...fallbackPlaces.slice(0, topEvent ? 2 : 3).map((candidate, index) => ({
      title: index === 0 ? '第一站先选低风险点' : index === 1 ? '第二站顺路换个状态' : '最后用轻一点的地方收尾',
      placeName: candidate.placeName,
      timeHint: index === 0 ? '45-75 分钟' : '30-60 分钟',
      transportHint: request.transport === 'walk' ? '能步行就步行，太远再叫车' : '按实际距离用 Grab / 摩托衔接',
      reason: candidate.summary,
      caveat: candidate.tags.includes('待确认') ? '这个点还需要补更多现场信息。' : undefined,
    })),
  ];

  return {
    title: request.theme ? `${request.theme}路线草案` : '清迈临时路线草案',
    summary: '这是本地兜底路线：先根据你的偏好从 CMI Map 候选点里挑几站，后续由 Codex 桥生成更自然的版本。',
    durationLabel: `${request.durationHours} 小时左右`,
    transportSummary: request.transport === 'mixed' ? '步行 + Grab / 摩托混合' : request.transport,
    steps,
    alternatives: fallbackPlaces.slice(3, 5).map(candidate => candidate.placeName),
    checks: ['只使用 CMI Map 候选点和活动库', '活动过期由活动库先过滤', '路线长度控制在用户给定时长附近'],
    uncertainty: ['当前是兜底算法，没有真实路况和营业时间判断', '还没有接 Google / 外部评价摘要'],
    provider: 'local-fallback',
  };
};

export const generateAiRouteDraft = async (
  request: AiRouteDraftRequest
): Promise<AiRouteBridgeResponse> => {
  try {
    const response = await fetch('/api/ai-route-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(errorData?.error ?? `bridge returned ${response.status}`);
    }

    const data = await response.json() as AiRouteBridgeResponse;
    if (!data.route?.steps?.length) {
      throw new Error('bridge returned empty route');
    }

    return data;
  } catch (error) {
    return {
      route: buildLocalRouteDraft(request),
      fallbackReason: error instanceof Error ? error.message : 'bridge failed',
    };
  }
};

export const toCandidateEventTimeLabel = (event: AiRouteCandidateEvent) => event.timeLabel;
