import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSquareCaptureRect,
  normalizeCameraZoom,
  type CameraZoomRange,
} from './camera-capture.ts';

test('getSquareCaptureRect 从横向视频中居中裁出正方形', () => {
  assert.deepEqual(
    getSquareCaptureRect({
      videoWidth: 1920,
      videoHeight: 1080,
      zoom: 1,
      maxOutputSize: 1800,
    }),
    {
      sx: 420,
      sy: 0,
      size: 1080,
      outputSize: 1080,
    }
  );
});

test('getSquareCaptureRect 从竖向视频中居中裁出正方形', () => {
  assert.deepEqual(
    getSquareCaptureRect({
      videoWidth: 1080,
      videoHeight: 1920,
      zoom: 1,
      maxOutputSize: 1800,
    }),
    {
      sx: 0,
      sy: 420,
      size: 1080,
      outputSize: 1080,
    }
  );
});

test('getSquareCaptureRect 用数字缩放收窄裁切区域且不放大输出', () => {
  assert.deepEqual(
    getSquareCaptureRect({
      videoWidth: 1920,
      videoHeight: 1080,
      zoom: 2,
      maxOutputSize: 1800,
    }),
    {
      sx: 690,
      sy: 270,
      size: 540,
      outputSize: 540,
    }
  );
});

test('normalizeCameraZoom 按相机支持范围限制并贴合步进', () => {
  const range: CameraZoomRange = {
    isHardwareSupported: true,
    min: 1,
    max: 5,
    step: 0.1,
  };

  assert.equal(normalizeCameraZoom(0.6, range), 1);
  assert.equal(normalizeCameraZoom(5.6, range), 5);
  assert.equal(normalizeCameraZoom(1.26, range), 1.3);
});
