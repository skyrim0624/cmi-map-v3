const COORDINATE_ONLY_PLACE_PATTERN =
  /^地图坐标\s*·\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

export const getDisplayPlaceName = (placeName?: string | null) => {
  const normalizedPlaceName = placeName?.trim() ?? '';
  if (!normalizedPlaceName) return null;
  if (COORDINATE_ONLY_PLACE_PATTERN.test(normalizedPlaceName)) return null;
  return normalizedPlaceName;
};

export const getRecommendationMetaParts = (
  placeName?: string | null,
  userName?: string | null
) => {
  const displayPlaceName = getDisplayPlaceName(placeName);
  const displayUserName = userName?.trim() ?? '';
  return [displayPlaceName, displayUserName].filter((value): value is string => Boolean(value));
};
