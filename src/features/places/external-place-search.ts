export type ExternalPlaceProvider = 'photon';

export interface ExternalPlaceCandidate {
  placeName: string;
  areaLabel: string;
  latitude: number;
  longitude: number;
  externalPlaceId: string;
  provider: ExternalPlaceProvider;
  providerLabel: string;
  attributionLabel: string;
}

interface PhotonFeature {
  properties?: {
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_type?: string;
    osm_id?: number | string;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

const PHOTON_SEARCH_ENDPOINT = 'https://photon.komoot.io/api/';
const PHOTON_PROVIDER_LABEL = 'OpenStreetMap';
const PHOTON_ATTRIBUTION_LABEL = 'OpenStreetMap / Photon';
const CHIANG_MAI_CENTER = { latitude: 18.7883, longitude: 98.9853 } as const;
const CHIANG_MAI_SEARCH_BOUNDS = {
  minLatitude: 18.65,
  maxLatitude: 18.95,
  minLongitude: 98.84,
  maxLongitude: 99.1,
} as const;

export const isWithinChiangMaiSearchBounds = (latitude: number, longitude: number) =>
  latitude >= CHIANG_MAI_SEARCH_BOUNDS.minLatitude &&
  latitude <= CHIANG_MAI_SEARCH_BOUNDS.maxLatitude &&
  longitude >= CHIANG_MAI_SEARCH_BOUNDS.minLongitude &&
  longitude <= CHIANG_MAI_SEARCH_BOUNDS.maxLongitude;

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const compactParts = (parts: Array<string | undefined>) =>
  Array.from(new Set(parts.map(part => part?.trim()).filter((part): part is string => Boolean(part)))).join(' · ');

const getPhotonFeatureCoordinates = (feature: PhotonFeature) => {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const longitude = toNumber(coordinates[0]);
  const latitude = toNumber(coordinates[1]);
  if (latitude === null || longitude === null) return null;

  return { latitude, longitude };
};

const getPhotonFeaturePlaceName = (feature: PhotonFeature) => {
  const properties = feature.properties;
  return properties?.name?.trim() || properties?.street?.trim() || '';
};

const getPhotonFeatureAreaLabel = (feature: PhotonFeature) => {
  const properties = feature.properties;
  return compactParts([
    properties?.district,
    properties?.city,
    properties?.county,
    properties?.state,
  ]) || PHOTON_PROVIDER_LABEL;
};

const getPhotonFeatureId = (feature: PhotonFeature, fallbackIndex: number) => {
  const osmType = feature.properties?.osm_type;
  const osmId = feature.properties?.osm_id;
  if (osmType && osmId) return `photon:${osmType}:${osmId}`;
  const coordinates = getPhotonFeatureCoordinates(feature);
  return coordinates
    ? `photon:${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`
    : `photon:fallback:${fallbackIndex}`;
};

export const parsePhotonPlaceSearchResponse = (payload: unknown): ExternalPlaceCandidate[] => {
  const response = payload as PhotonResponse;
  if (!Array.isArray(response.features)) return [];

  return response.features.flatMap((feature, index) => {
    const coordinates = getPhotonFeatureCoordinates(feature);
    if (!coordinates) return [];
    if (!isWithinChiangMaiSearchBounds(coordinates.latitude, coordinates.longitude)) return [];

    const placeName = getPhotonFeaturePlaceName(feature);
    if (!placeName) return [];

    return [{
      placeName,
      areaLabel: getPhotonFeatureAreaLabel(feature),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      externalPlaceId: getPhotonFeatureId(feature, index),
      provider: 'photon' as const,
      providerLabel: PHOTON_PROVIDER_LABEL,
      attributionLabel: PHOTON_ATTRIBUTION_LABEL,
    }];
  });
};

export const searchExternalPlaceCandidates = async (
  query: string,
  options?: { signal?: AbortSignal; limit?: number }
): Promise<ExternalPlaceCandidate[]> => {
  const normalizedQuery = query.normalize('NFKC').trim();
  if (normalizedQuery.length < 2) return [];

  const url = new URL(PHOTON_SEARCH_ENDPOINT);
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('lat', String(CHIANG_MAI_CENTER.latitude));
  url.searchParams.set('lon', String(CHIANG_MAI_CENTER.longitude));
  url.searchParams.set('zoom', '13');
  url.searchParams.set('location_bias_scale', '0.15');
  url.searchParams.set('bbox', [
    CHIANG_MAI_SEARCH_BOUNDS.minLongitude,
    CHIANG_MAI_SEARCH_BOUNDS.minLatitude,
    CHIANG_MAI_SEARCH_BOUNDS.maxLongitude,
    CHIANG_MAI_SEARCH_BOUNDS.maxLatitude,
  ].join(','));
  url.searchParams.set('countrycode', 'TH');
  url.searchParams.set('limit', String(options?.limit ?? 5));
  url.searchParams.set('lang', 'en');

  const response = await fetch(url, {
    signal: options?.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`external place search failed: ${response.status}`);
  }

  return parsePhotonPlaceSearchResponse(await response.json());
};
