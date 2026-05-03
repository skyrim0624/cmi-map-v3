export const getPlacePath = (placeName: string) =>
  `/place/${encodeURIComponent(placeName)}`;

export const getPersonMapPath = (userName: string) =>
  `/people/${encodeURIComponent(userName)}`;
