export interface CameraZoomRange {
  isHardwareSupported: boolean;
  min: number;
  max: number;
  step: number;
}

interface SquareCaptureRectInput {
  videoWidth: number;
  videoHeight: number;
  zoom?: number;
  maxOutputSize?: number;
}

export interface SquareCaptureRect {
  sx: number;
  sy: number;
  size: number;
  outputSize: number;
}

type CameraZoomCapabilities = MediaTrackCapabilities & {
  zoom?: {
    min?: number;
    max?: number;
    step?: number;
  };
};

export const DEFAULT_CAMERA_OUTPUT_SIZE = 1800;
export const DEFAULT_CAMERA_CAPTURE_QUALITY = 0.96;
export const DEFAULT_CAMERA_ZOOM_RANGE: CameraZoomRange = {
  isHardwareSupported: false,
  min: 1,
  max: 3,
  step: 0.1,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getStepPrecision = (step: number) => {
  const [, decimals = ''] = step.toString().split('.');
  return Math.min(decimals.length, 4);
};

export const normalizeCameraZoom = (
  value: number,
  range: CameraZoomRange = DEFAULT_CAMERA_ZOOM_RANGE
) => {
  const min = Number.isFinite(range.min) ? range.min : DEFAULT_CAMERA_ZOOM_RANGE.min;
  const max = Number.isFinite(range.max) && range.max > min ? range.max : DEFAULT_CAMERA_ZOOM_RANGE.max;
  const step = Number.isFinite(range.step) && range.step > 0 ? range.step : DEFAULT_CAMERA_ZOOM_RANGE.step;
  const clamped = clamp(Number.isFinite(value) ? value : min, min, max);
  const stepped = Math.round((clamped - min) / step) * step + min;
  const normalized = clamp(stepped, min, max);

  return Number(normalized.toFixed(getStepPrecision(step)));
};

export const getCameraZoomRange = (
  capabilities?: MediaTrackCapabilities | null
): CameraZoomRange => {
  const zoom = (capabilities as CameraZoomCapabilities | null | undefined)?.zoom;
  if (!zoom || typeof zoom !== 'object') return DEFAULT_CAMERA_ZOOM_RANGE;

  const min = Number.isFinite(zoom.min) ? Number(zoom.min) : DEFAULT_CAMERA_ZOOM_RANGE.min;
  const max = Number.isFinite(zoom.max) ? Number(zoom.max) : DEFAULT_CAMERA_ZOOM_RANGE.max;
  const step = Number.isFinite(zoom.step) && Number(zoom.step) > 0
    ? Number(zoom.step)
    : DEFAULT_CAMERA_ZOOM_RANGE.step;

  if (max <= min) return DEFAULT_CAMERA_ZOOM_RANGE;

  return {
    isHardwareSupported: true,
    min,
    max,
    step,
  };
};

export const getSquareCaptureRect = ({
  videoWidth,
  videoHeight,
  zoom = 1,
  maxOutputSize = DEFAULT_CAMERA_OUTPUT_SIZE,
}: SquareCaptureRectInput): SquareCaptureRect => {
  if (videoWidth <= 0 || videoHeight <= 0) {
    throw new Error('Video dimensions must be positive');
  }

  const baseSize = Math.min(videoWidth, videoHeight);
  const safeZoom = Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  const size = Math.max(1, Math.floor(baseSize / safeZoom));
  const sx = Math.max(0, Math.round((videoWidth - size) / 2));
  const sy = Math.max(0, Math.round((videoHeight - size) / 2));
  const outputLimit = Math.max(1, Math.round(maxOutputSize));

  return {
    sx,
    sy,
    size,
    outputSize: Math.min(size, outputLimit),
  };
};
