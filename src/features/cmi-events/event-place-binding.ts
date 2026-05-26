import type { Category, Recommendation } from '@/types/types';
import type { ExternalPlaceCandidate } from '@/features/places/external-place-search';
import {
  CMI_INN_CATEGORY,
  CMI_INN_COORDINATES,
  CMI_INN_PLACE_NAME,
} from '@/types/types';

export type EventPlaceBindingSource = 'selected' | 'auto' | 'prefill' | 'manual' | 'external';

export interface EventPlaceCandidate {
  placeName: string;
  areaLabel: string;
  category: Category;
  latitude: number;
  longitude: number;
  recommendationCount: number;
  aliases: string[];
  bindingSource: EventPlaceBindingSource;
  externalPlaceId?: string;
  externalProvider?: string;
  sourceLabel?: string;
  isPinned?: boolean;
}

const CMI_INN_ALIASES = [
  CMI_INN_PLACE_NAME,
  'CMI',
  'CMI Inn',
  'Chiang Mai Inn',
  '清迈客栈 CMI',
  '清迈客栈CMI',
];

export const CMI_INN_EVENT_PLACE_CANDIDATE: EventPlaceCandidate = {
  placeName: CMI_INN_PLACE_NAME,
  areaLabel: 'CMI / 清迈客栈',
  category: CMI_INN_CATEGORY,
  latitude: CMI_INN_COORDINATES.latitude,
  longitude: CMI_INN_COORDINATES.longitude,
  recommendationCount: 1,
  aliases: CMI_INN_ALIASES,
  bindingSource: 'selected',
  isPinned: true,
};

const CURATED_PLACE_CANDIDATES: EventPlaceCandidate[] = [
  CMI_INN_EVENT_PLACE_CANDIDATE,
  {
    placeName: 'North Gate Jazz Co-Op',
    areaLabel: '古城北门 / Si Phum',
    category: '酒吧',
    latitude: 18.7935,
    longitude: 98.9877,
    recommendationCount: 0,
    aliases: ['North Gate Jazz Co-Op', 'North Gate Jazz Bar', 'North Gate Jazz', '北门', '北门爵士', '北门音乐厅'],
    bindingSource: 'selected',
  },
];

const normalizePlaceText = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[·・、，,。.!！?？'"“”‘’()（）\[\]【】]/g, ' ')
    .replace(/\s+/g, ' ');

const compactPlaceText = (value: string) => normalizePlaceText(value).replace(/\s+/g, '');

const isValidCoordinate = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value);

const getAreaLabel = (category: Category, placeName: string) => {
  if (category === CMI_INN_CATEGORY || placeName === CMI_INN_PLACE_NAME) return 'CMI / 清迈客栈';
  return category;
};

const candidateKey = (placeName: string) => compactPlaceText(placeName);

const cloneCandidateWithSource = (
  candidate: EventPlaceCandidate,
  bindingSource: EventPlaceBindingSource
): EventPlaceCandidate => ({
  ...candidate,
  bindingSource,
});

export const buildEventPlaceCandidates = (
  recommendations: Pick<Recommendation, 'place_name' | 'category' | 'latitude' | 'longitude'>[]
): EventPlaceCandidate[] => {
  const candidatesByPlace = new Map<string, EventPlaceCandidate>();

  for (const candidate of CURATED_PLACE_CANDIDATES) {
    candidatesByPlace.set(candidateKey(candidate.placeName), candidate);
  }

  for (const recommendation of recommendations) {
    if (!recommendation.place_name.trim()) continue;
    if (!isValidCoordinate(recommendation.latitude) || !isValidCoordinate(recommendation.longitude)) continue;

    const key = candidateKey(recommendation.place_name);
    const existingCandidate = candidatesByPlace.get(key);

    if (existingCandidate) {
      candidatesByPlace.set(key, {
        ...existingCandidate,
        recommendationCount: existingCandidate.recommendationCount + 1,
      });
      continue;
    }

    candidatesByPlace.set(key, {
      placeName: recommendation.place_name,
      areaLabel: getAreaLabel(recommendation.category, recommendation.place_name),
      category: recommendation.category,
      latitude: recommendation.latitude,
      longitude: recommendation.longitude,
      recommendationCount: 1,
      aliases: [recommendation.place_name],
      bindingSource: 'selected',
    });
  }

  return Array.from(candidatesByPlace.values()).sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    if (right.recommendationCount !== left.recommendationCount) {
      return right.recommendationCount - left.recommendationCount;
    }
    return left.placeName.localeCompare(right.placeName, 'zh-CN');
  });
};

const getCandidateScore = (candidate: EventPlaceCandidate, query: string) => {
  const normalizedQuery = normalizePlaceText(query);
  const compactQuery = compactPlaceText(query);
  if (!normalizedQuery && !compactQuery) return candidate.isPinned ? 80 : 0;

  let bestScore = 0;
  for (const alias of candidate.aliases) {
    const normalizedAlias = normalizePlaceText(alias);
    const compactAlias = compactPlaceText(alias);

    if (normalizedAlias === normalizedQuery || compactAlias === compactQuery) {
      bestScore = Math.max(bestScore, 120);
    } else if (normalizedAlias.startsWith(normalizedQuery) || compactAlias.startsWith(compactQuery)) {
      bestScore = Math.max(bestScore, 95);
    } else if (normalizedAlias.includes(normalizedQuery) || compactAlias.includes(compactQuery)) {
      bestScore = Math.max(bestScore, 78);
    } else if (normalizedQuery.includes(normalizedAlias) || compactQuery.includes(compactAlias)) {
      bestScore = Math.max(bestScore, 70);
    }
  }

  if (candidate.isPinned && bestScore > 0) return bestScore + 8;
  return bestScore;
};

export const searchEventPlaceCandidates = (
  candidates: EventPlaceCandidate[],
  query: string,
  limit = 5
) => {
  const normalizedQuery = normalizePlaceText(query);
  const scoredCandidates = candidates
    .map(candidate => ({
      candidate,
      score: getCandidateScore(candidate, normalizedQuery),
    }))
    .filter(result => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.candidate.isPinned !== right.candidate.isPinned) {
        return left.candidate.isPinned ? -1 : 1;
      }
      return right.candidate.recommendationCount - left.candidate.recommendationCount;
    });

  return scoredCandidates.slice(0, limit).map(result => result.candidate);
};

export const inferEventPlaceCandidatesFromText = (
  candidates: EventPlaceCandidate[],
  text: string,
  limit = 3
) => {
  const normalizedText = normalizePlaceText(text);
  const compactText = compactPlaceText(text);
  if (!normalizedText && !compactText) return [];

  const directMatches = candidates
    .map(candidate => {
      const matchedAlias = candidate.aliases
        .map(alias => ({
          alias,
          normalizedAlias: normalizePlaceText(alias),
          compactAlias: compactPlaceText(alias),
        }))
        .filter(({ normalizedAlias, compactAlias }) =>
          normalizedAlias.length >= 2 &&
          compactAlias.length >= 2 &&
          (normalizedText.includes(normalizedAlias) || compactText.includes(compactAlias))
        )
        .sort((left, right) => right.compactAlias.length - left.compactAlias.length)[0];

      return {
        candidate,
        matchedAlias,
      };
    })
    .filter(result => result.matchedAlias)
    .sort((left, right) => {
      const leftLength = left.matchedAlias?.compactAlias.length ?? 0;
      const rightLength = right.matchedAlias?.compactAlias.length ?? 0;
      if (rightLength !== leftLength) return rightLength - leftLength;
      if (left.candidate.isPinned !== right.candidate.isPinned) return left.candidate.isPinned ? -1 : 1;
      return right.candidate.recommendationCount - left.candidate.recommendationCount;
    })
    .slice(0, limit)
    .map(result => cloneCandidateWithSource(result.candidate, 'auto'));

  if (directMatches.length > 0) return directMatches;

  return searchEventPlaceCandidates(candidates, text, limit).map(candidate =>
    cloneCandidateWithSource(candidate, 'auto')
  );
};

export const findExactEventPlaceCandidate = (
  candidates: EventPlaceCandidate[],
  value: string | null | undefined
) => {
  if (!value) return null;
  const compactValue = compactPlaceText(value);
  if (!compactValue) return null;

  return candidates.find(candidate =>
    candidate.aliases.some(alias => compactPlaceText(alias) === compactValue)
  ) ?? null;
};

export const createEventPlaceCandidateFromQuery = ({
  placeName,
  area,
  category,
  latitude,
  longitude,
}: {
  placeName: string | null | undefined;
  area?: string | null;
  category?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}) => {
  const normalizedPlaceName = placeName?.trim();
  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);

  if (!normalizedPlaceName || !Number.isFinite(latitudeNumber) || !Number.isFinite(longitudeNumber)) {
    return null;
  }

  const normalizedCategory =
    category === CMI_INN_CATEGORY ? CMI_INN_CATEGORY : (category as Category | null) ?? '景点';

  return {
    placeName: normalizedPlaceName,
    areaLabel: area?.trim() || getAreaLabel(normalizedCategory, normalizedPlaceName),
    category: normalizedCategory,
    latitude: latitudeNumber,
    longitude: longitudeNumber,
    recommendationCount: 1,
    aliases: normalizedPlaceName === CMI_INN_PLACE_NAME
      ? CMI_INN_ALIASES
      : [normalizedPlaceName],
    bindingSource: 'prefill',
    isPinned: normalizedPlaceName === CMI_INN_PLACE_NAME,
  } satisfies EventPlaceCandidate;
};

export const createEventPlaceCandidateFromExternalPlace = (
  place: ExternalPlaceCandidate
): EventPlaceCandidate => ({
  placeName: place.placeName,
  areaLabel: place.areaLabel,
  category: '景点',
  latitude: place.latitude,
  longitude: place.longitude,
  recommendationCount: 0,
  aliases: [place.placeName],
  bindingSource: 'external',
  externalPlaceId: place.externalPlaceId,
  externalProvider: place.provider,
  sourceLabel: place.providerLabel,
});

export const createEventPlaceCandidateFromMapPick = ({
  placeName,
  latitude,
  longitude,
}: {
  placeName?: string | null;
  latitude: number;
  longitude: number;
}): EventPlaceCandidate => {
  const normalizedPlaceName = placeName?.trim() || '地图选点';
  const coordinateLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return {
    placeName: normalizedPlaceName,
    areaLabel: `地图选点 · ${coordinateLabel}`,
    category: '景点',
    latitude,
    longitude,
    recommendationCount: 0,
    aliases: [normalizedPlaceName],
    bindingSource: 'manual',
  };
};
