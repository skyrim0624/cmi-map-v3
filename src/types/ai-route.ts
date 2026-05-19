export type AiRouteTransport = 'walk' | 'grab' | 'motorbike' | 'mixed';

export interface AiRouteCandidatePlace {
  id: string;
  placeName: string;
  category: string;
  areaHint: string;
  summary: string;
  tags: string[];
  latitude: number;
  longitude: number;
}

export interface AiRouteCandidateEvent {
  id: string;
  title: string;
  venueName: string;
  area: string;
  timeLabel: string;
  summary: string;
  tags: string[];
}

export interface AiRouteDraftRequest {
  startArea: string;
  theme: string;
  preferenceText: string;
  durationHours: number;
  budget: string;
  transport: AiRouteTransport;
  mustVisit: string;
  avoidText: string;
  candidates: AiRouteCandidatePlace[];
  events: AiRouteCandidateEvent[];
}

export interface AiRouteStep {
  title: string;
  placeName?: string;
  eventTitle?: string;
  timeHint: string;
  transportHint: string;
  reason: string;
  caveat?: string;
}

export interface AiRouteDraft {
  title: string;
  summary: string;
  durationLabel: string;
  transportSummary: string;
  steps: AiRouteStep[];
  alternatives: string[];
  checks: string[];
  uncertainty: string[];
  provider: 'codex-local' | 'local-fallback';
}

export interface AiRouteBridgeResponse {
  route: AiRouteDraft;
  model?: string;
  fallbackReason?: string;
}
