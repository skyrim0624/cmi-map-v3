import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePhotonPlaceSearchResponse } from './external-place-search';

test('parsePhotonPlaceSearchResponse 只返回清迈范围内的地点候选', () => {
  const candidates = parsePhotonPlaceSearchResponse({
    features: [
      {
        properties: {
          name: 'North Gate Jazz Co-Op',
          district: 'Si Phum',
          city: 'Chiang Mai',
          country: 'Thailand',
          osm_type: 'N',
          osm_id: 123,
        },
        geometry: {
          type: 'Point',
          coordinates: [98.9877, 18.7935],
        },
      },
      {
        properties: {
          name: 'Bangkok Jazz Club',
          city: 'Bangkok',
          country: 'Thailand',
          osm_type: 'N',
          osm_id: 456,
        },
        geometry: {
          type: 'Point',
          coordinates: [100.5018, 13.7563],
        },
      },
    ],
  });

  assert.deepEqual(candidates.map(candidate => candidate.placeName), ['North Gate Jazz Co-Op']);
  assert.equal(candidates[0].areaLabel, 'Si Phum · Chiang Mai');
  assert.equal(candidates[0].externalPlaceId, 'photon:N:123');
});
