import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MarkPlace.tsx', import.meta.url), 'utf8');

test('相册旧照先写体验，不直接跳到手动拖地图', () => {
  assert.match(source, /相册旧照不再先逼用户拖地图/);
  assert.match(source, /const timer2 = setTimeout\(\(\) => \{\s+setStage\('voice'\);/);
  assert.doesNotMatch(source, /sourceType === 'exif' \? 'map_fallback' : 'voice'/);
});

test('手动选点页提供地点搜索和候选绑定', () => {
  assert.match(source, /buildEventPlaceCandidates/);
  assert.match(source, /searchEventPlaceCandidates/);
  assert.match(source, /searchExternalPlaceCandidates/);
  assert.match(source, /placeholder="搜清迈客栈 \/ 店名 \/ 区域"/);
  assert.match(source, /onClick=\{\(\) => applyPlaceCandidate\(candidate\)\}/);
});

test('手动选点地图不会把拖动后的中心继续作为 Leaflet 默认中心', () => {
  assert.match(source, /const \[mapDefaultCenter, setMapDefaultCenter\] = useState\(initialCenter\)/);
  assert.match(source, /defaultCenter=\{mapDefaultCenter\}/);
  assert.match(source, /onCenterChange=\{\(lat, lng\) => setCenter\(\{lat, lng\}\)\}/);
});

test('网页相机拍照输出正方形并提供焦距控制', () => {
  assert.match(source, /getSquareCaptureRect/);
  assert.match(source, /canvas\.width = crop\.outputSize/);
  assert.match(source, /canvas\.height = crop\.outputSize/);
  assert.match(source, /DEFAULT_CAMERA_CAPTURE_QUALITY/);
  assert.match(source, /type="range"/);
  assert.match(source, /handleCameraZoomChange/);
});
