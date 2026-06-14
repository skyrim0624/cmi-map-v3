import { ArrowLeft, Check, Image as ImageIcon, Loader2, MapPin, Mic, MicOff, PawPrint, PencilLine, Search, Send, Share2, ThumbsUp, X } from 'lucide-react';
import { type TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getCmiEventCardImageUrl } from '@/components/intent/event-card-presentation';
import { LeafletMap } from '@/components/map/LeafletMap';
import { useAuth } from '@/contexts/AuthContext';
import {
  CMI_EVENTS,
  type CmiEvent,
  CMI_MAP_WILD_CHIANG_MAI_EVENT_ID,
  formatCmiEventTime,
  getCmiEventById,
  getCmiEventSortTime,
  isCmiMapCheckinActivityEvent,
  isCmiInnEvent,
} from '@/data/cmi-events';
import { getCmiInputCategoryOptionById, getCmiInputCategoryOptions } from '@/data/cmi-taxonomy';
import { assignCmiEventCaptureNumber, createRecommendation, getAllRecommendations, uploadAnimalSticker, uploadImages } from '@/db/api';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import {
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  DEFAULT_CAMERA_OUTPUT_SIZE,
  DEFAULT_CAMERA_ZOOM_RANGE,
  getCameraZoomRange,
  getSquareCaptureRect,
  normalizeCameraZoom,
} from '@/features/check-ins/camera-capture';
import {
  buildEventPlaceCandidates,
  createEventPlaceCandidateFromExternalPlace,
  type EventPlaceCandidate,
  searchEventPlaceCandidates,
} from '@/features/cmi-events/event-place-binding';
import { searchExternalPlaceCandidates } from '@/features/places/external-place-search';
import { useDebounce } from '@/hooks/use-debounce';
import {
  type CmiWildAnimalShareCardResult,
  createCmiWildAnimalShareCard,
} from '@/lib/cmi-wild-animal-share-card';
import { createAnimalStickerFromPhoto } from '@/lib/cmi-wild-animal-stickers';
import {
  DEFAULT_CMI_EASTER_ICON_ID,
} from '@/lib/easter-icons';
import { getCmiFeedPath, getPlacePath } from '@/lib/paths';
import {
  type AnimalIdentificationCandidate,
  type AnimalIdentificationResult,
  buildAnimalCandidateDescription,
  formatAnimalCandidateLabel,
  identifyAnimalPhoto,
} from '@/services/animal-identification';
import type { Category } from '@/types/types';
import {
  CMI_INN_CATEGORY,
  CMI_INN_COORDINATES,
  CMI_INN_PLACE_NAME,
  isPublicMapRecommendation,
} from '@/types/types';
import { normalizeImageFile } from '@/utils/imageCompression';

type Stage = 'camera' | 'analyzing' | 'voice' | 'done' | 'map_fallback';
type SpeechRecognitionConstructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results?: {
    length: number;
    [index: number]: {
      isFinal?: boolean;
      [index: number]: {
        transcript?: string;
      } | undefined;
    } | undefined;
  };
};
type SpeechRecognitionErrorEventLike = {
  error?: string;
};
type SpeechPermissionStatus = 'unknown' | 'prompt' | 'granted' | 'denied' | 'checking';
type CameraStatus = 'starting' | 'ready' | 'blocked' | 'unsupported' | 'error';
type AnimalIdentificationStatus = 'idle' | 'running' | 'done' | 'no-match' | 'unavailable' | 'error';
type LocationCaptureStatus = 'pending' | 'ready' | 'failed';
type MediaTrackConstraintSetWithZoom = MediaTrackConstraintSet & { zoom?: number };
type CameraPinchState = {
  distance: number;
  zoom: number;
};
type CameraTouchList = TouchEvent<HTMLDivElement>['touches'];
type FileShareData = {
  files?: File[];
  title?: string;
  text?: string;
};
type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};
type WildAnimalShareTarget = 'album' | 'wechat' | 'xiaohongshu';
type WildAnimalShareResult = 'shared' | 'unsupported' | 'cancelled' | 'failed';

const MARK_PLACE_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 2560 },
  height: { ideal: 1440 },
  frameRate: { ideal: 30, max: 30 },
};
const DEFAULT_MARK_PLACE_CENTER = { lat: 18.7883, lng: 98.9853 } as const;
const DEFAULT_MARK_PLACE_CATEGORY: Category = '景点';
const MARK_PLACE_EVENT_PAST_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const MARK_PLACE_EVENT_FUTURE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const CAMERA_ZOOM_FEEDBACK_TIMEOUT_MS = 900;

const getTouchDistance = (touches: CameraTouchList) => {
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);
  if (!firstTouch || !secondTouch) return 0;

  return Math.hypot(
    firstTouch.clientX - secondTouch.clientX,
    firstTouch.clientY - secondTouch.clientY
  );
};

const getMarkPlaceEventOptions = (
  events: CmiEvent[],
  referenceDate: Date = new Date()
) => {
  const referenceTime = referenceDate.getTime();

  const sortedEvents = events
    .filter(event => {
      if (!isCmiInnEvent(event) && !isCmiMapCheckinActivityEvent(event)) return false;

      const eventTime = getCmiEventSortTime(event, referenceDate);
      if (eventTime === Number.MAX_SAFE_INTEGER) return true;

      return (
        eventTime >= referenceTime - MARK_PLACE_EVENT_PAST_WINDOW_MS &&
        eventTime <= referenceTime + MARK_PLACE_EVENT_FUTURE_WINDOW_MS
      );
    })
    .sort((left, right) => {
      const leftTime = getCmiEventSortTime(left, referenceDate);
      const rightTime = getCmiEventSortTime(right, referenceDate);

      return Math.abs(leftTime - referenceTime) - Math.abs(rightTime - referenceTime);
    });

  return prioritizeCheckinActivityEvent(sortedEvents).slice(0, 8);
};

const prioritizeCheckinActivityEvent = (events: CmiEvent[]) => {
  return [...events].sort((left, right) => {
    const leftIsCheckinActivity = isCmiMapCheckinActivityEvent(left);
    const rightIsCheckinActivity = isCmiMapCheckinActivityEvent(right);

    if (leftIsCheckinActivity === rightIsCheckinActivity) return 0;
    return leftIsCheckinActivity ? -1 : 1;
  });
};

const mergeInitialEventIntoOptions = (
  options: CmiEvent[],
  initialEvent: CmiEvent | null
) => {
  const mergedOptions =
    !initialEvent || options.some(event => event.id === initialEvent.id)
      ? options
      : [initialEvent, ...options];

  return prioritizeCheckinActivityEvent(mergedOptions).slice(0, 8);
};

const appendTranscript = (currentText: string, nextText: string) => {
  const current = currentText.trim();
  const next = nextText.trim();

  if (!next) return currentText;
  if (!current) return next;
  if (current.endsWith(next)) return current;

  return `${current} ${next}`;
};

type CapturedCoordinates = {
  latitude: number;
  longitude: number;
};

const formatCoordinatePlaceName = (coordinates: CapturedCoordinates) => (
  `地图坐标 · ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
);

const readExifAscii = (
  view: DataView,
  tiffStart: number,
  entryOffset: number,
  byteCount: number,
  littleEndian: boolean
) => {
  const valueOffset = byteCount <= 4
    ? entryOffset + 8
    : tiffStart + view.getUint32(entryOffset + 8, littleEndian);
  if (valueOffset < 0 || valueOffset + byteCount > view.byteLength) return '';

  let value = '';
  for (let index = 0; index < byteCount; index += 1) {
    const charCode = view.getUint8(valueOffset + index);
    if (charCode === 0) break;
    value += String.fromCharCode(charCode);
  }

  return value;
};

const readExifRational = (view: DataView, offset: number, littleEndian: boolean) => {
  if (offset < 0 || offset + 8 > view.byteLength) return null;

  const numerator = view.getUint32(offset, littleEndian);
  const denominator = view.getUint32(offset + 4, littleEndian);
  if (denominator === 0) return null;

  return numerator / denominator;
};

const readGpsCoordinate = (
  view: DataView,
  tiffStart: number,
  entryOffset: number,
  littleEndian: boolean
) => {
  const rationalOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
  const degrees = readExifRational(view, rationalOffset, littleEndian);
  const minutes = readExifRational(view, rationalOffset + 8, littleEndian);
  const seconds = readExifRational(view, rationalOffset + 16, littleEndian);

  if (degrees === null || minutes === null || seconds === null) return null;

  return degrees + minutes / 60 + seconds / 3600;
};

const findExifEntryOffset = (
  view: DataView,
  ifdOffset: number,
  targetTag: number,
  littleEndian: boolean
) => {
  if (ifdOffset < 0 || ifdOffset + 2 > view.byteLength) return null;

  const entryCount = view.getUint16(ifdOffset, littleEndian);
  const entriesStart = ifdOffset + 2;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesStart + index * 12;
    if (entryOffset + 12 > view.byteLength) return null;

    if (view.getUint16(entryOffset, littleEndian) === targetTag) {
      return entryOffset;
    }
  }

  return null;
};

const extractGpsCoordinatesFromExifView = (view: DataView, tiffStart: number): CapturedCoordinates | null => {
  const byteOrder = String.fromCharCode(view.getUint8(tiffStart), view.getUint8(tiffStart + 1));
  const littleEndian = byteOrder === 'II';
  if (!littleEndian && byteOrder !== 'MM') return null;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;

  const firstIfdOffset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
  const gpsIfdEntryOffset = findExifEntryOffset(view, firstIfdOffset, 0x8825, littleEndian);
  if (gpsIfdEntryOffset === null) return null;

  const gpsIfdOffset = tiffStart + view.getUint32(gpsIfdEntryOffset + 8, littleEndian);
  const latitudeRefEntry = findExifEntryOffset(view, gpsIfdOffset, 0x0001, littleEndian);
  const latitudeEntry = findExifEntryOffset(view, gpsIfdOffset, 0x0002, littleEndian);
  const longitudeRefEntry = findExifEntryOffset(view, gpsIfdOffset, 0x0003, littleEndian);
  const longitudeEntry = findExifEntryOffset(view, gpsIfdOffset, 0x0004, littleEndian);

  if (
    latitudeRefEntry === null ||
    latitudeEntry === null ||
    longitudeRefEntry === null ||
    longitudeEntry === null
  ) {
    return null;
  }

  const latitudeRef = readExifAscii(view, tiffStart, latitudeRefEntry, 2, littleEndian);
  const longitudeRef = readExifAscii(view, tiffStart, longitudeRefEntry, 2, littleEndian);
  const latitude = readGpsCoordinate(view, tiffStart, latitudeEntry, littleEndian);
  const longitude = readGpsCoordinate(view, tiffStart, longitudeEntry, littleEndian);

  if (latitude === null || longitude === null) return null;

  return {
    latitude: latitudeRef === 'S' ? -latitude : latitude,
    longitude: longitudeRef === 'W' ? -longitude : longitude,
  };
};

const extractGpsCoordinatesFromImageFile = async (file: File): Promise<CapturedCoordinates | null> => {
  if (!file.type.includes('jpeg') && !file.name.toLowerCase().match(/\.(jpe?g)$/)) return null;

  const view = new DataView(await file.arrayBuffer());
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;

    const marker = view.getUint8(offset + 1);
    const segmentLength = view.getUint16(offset + 2);
    const segmentStart = offset + 4;
    const segmentEnd = offset + 2 + segmentLength;
    if (segmentEnd > view.byteLength) return null;

    const isExifSegment =
      marker === 0xe1 &&
      segmentLength >= 8 &&
      String.fromCharCode(
        view.getUint8(segmentStart),
        view.getUint8(segmentStart + 1),
        view.getUint8(segmentStart + 2),
        view.getUint8(segmentStart + 3)
      ) === 'Exif';

    if (isExifSegment) {
      return extractGpsCoordinatesFromExifView(view, segmentStart + 6);
    }

    offset = segmentEnd;
  }

  return null;
};

const getWildAnimalShareCopy = (target: WildAnimalShareTarget) => {
  if (target === 'wechat') {
    return {
      title: 'CMI Map 清迈奇妙生物图鉴',
      text: '把这张图鉴卡发到微信。',
    };
  }
  if (target === 'xiaohongshu') {
    return {
      title: 'CMI Map 清迈奇妙生物图鉴',
      text: '把这张图鉴卡发到小红书。',
    };
  }

  return {
    title: 'CMI Map 清迈奇妙生物图鉴',
    text: '把这张图鉴卡保存到相册。',
  };
};

const shareWildAnimalCardWithSystem = async (
  card: CmiWildAnimalShareCardResult,
  target: WildAnimalShareTarget
): Promise<WildAnimalShareResult> => {
  const navigatorWithFileShare = navigator as NavigatorWithFileShare;
  if (!navigatorWithFileShare.share) return 'unsupported';

  const file = new File([card.blob], card.fileName, { type: 'image/png' });
  const copy = getWildAnimalShareCopy(target);
  const shareDataOptions: FileShareData[] = [
    { files: [file], title: copy.title, text: copy.text },
    { files: [file], title: copy.title },
    { files: [file] },
  ];
  const shareData = shareDataOptions.find(data =>
    !navigatorWithFileShare.canShare || navigatorWithFileShare.canShare(data)
  );

  if (!shareData) return 'unsupported';

  try {
    await navigatorWithFileShare.share(shareData);
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    console.error('Failed to share CMI wild animal card:', error);
    return 'failed';
  }
};

const queryMicrophonePermission = async (): Promise<SpeechPermissionStatus> => {
  if (!navigator.permissions?.query) return 'unknown';

  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return permission.state as SpeechPermissionStatus;
  } catch {
    return 'unknown';
  }
};

const getVoiceErrorHint = (error?: string) => {
  if (error === 'not-allowed') {
    return '浏览器没有给 cmimap.com 麦克风权限。打开地址栏权限设置，允许麦克风后再试；也可以先打字。';
  }

  if (error === 'audio-capture') {
    return '没有找到可用麦克风。可以换个浏览器，或直接打字。';
  }

  if (error === 'no-speech') {
    return '刚才没听到声音，靠近一点再说一次也可以。';
  }

  if (error === 'network') {
    return '语音识别服务暂时连不上，先直接打字更稳。';
  }

  if (error === 'aborted') {
    return '已停止收音，可以直接编辑文字。';
  }

  return '这个浏览器的语音识别不稳定，直接打字更稳。';
};

const requestMicrophoneForSpeech = async () => {
  if (!window.isSecureContext) {
    return {
      ok: false,
      permission: 'denied' as SpeechPermissionStatus,
      hint: '当前页面不是安全连接，浏览器不会开放麦克风。请用 https://cmimap.com 再试。',
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      permission: 'unknown' as SpeechPermissionStatus,
      hint: '当前浏览器拿不到麦克风权限，直接打字更稳。',
    };
  }

  const permission = await queryMicrophonePermission();
  if (permission === 'denied') {
    return {
      ok: false,
      permission,
      hint: getVoiceErrorHint('not-allowed'),
    };
  }

  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStream.getTracks().forEach(track => track.stop());
    return {
      ok: true,
      permission: 'granted' as SpeechPermissionStatus,
      hint: '麦克风已打开，开始说吧。',
    };
  } catch (error) {
    const errorName = error instanceof DOMException ? error.name : '';
    const denied = errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError';

    return {
      ok: false,
      permission: denied ? 'denied' as SpeechPermissionStatus : 'unknown' as SpeechPermissionStatus,
      hint: denied ? getVoiceErrorHint('not-allowed') : '麦克风暂时打不开，直接打字更稳。',
    };
  }
};

const ScribbleSparks = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const sparks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 40 + Math.random() * 20; 
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const delay = Math.random() * 0.2;
    return (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
        className="absolute top-1/2 left-1/2 -mt-2 -ml-2 text-primary pointer-events-none drop-shadow-md"
        style={{
          '--tx': `${tx}px`, '--ty': `${ty}px`,
          animation: `star-burst 0.6s ease-out ${delay}s infinite`
        } as any}
      >
        <path d="M12 2c0 4 3 7 7 8-4 .7-7 4-7 8-1-4-4-7-8-8 4-1 6-4 8-8z" />
      </svg>
    );
  });
  return <div className="absolute inset-0 pointer-events-none z-10">{sparks}</div>;
};

const MarkPlaceSuccessBadge = ({ className = '' }: { className?: string }) => (
  <div
    role="status"
    aria-label="已记录，功德加一"
    className={`pointer-events-none z-50 flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-[1.35rem] border border-white/80 bg-[#fff7dd]/95 px-3.5 py-2.5 text-[#2f3a1f] shadow-[0_16px_34px_rgba(69,88,36,0.22)] backdrop-blur-md animate-[checkin-badge-pop_0.55s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] ${className}`}
  >
    <span className="flex h-11 w-11 shrink-0 rotate-[-7deg] items-center justify-center rounded-full bg-[#f5c451] text-[#304118] shadow-inner ring-2 ring-white/80">
      <ThumbsUp className="h-6 w-6" strokeWidth={3} />
    </span>
    <span className="min-w-0 text-left">
      <span className="block text-[11px] font-black tracking-[0.14em] text-[#6f7435]">已记录</span>
      <strong className="block text-lg font-black leading-none text-[#2f3a1f]">功德 +1</strong>
      <span className="block text-[11px] font-bold text-[#7a6b38]">大拇哥收到了</span>
    </span>
  </div>
);

export default function MarkPlace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const initialPlaceName = searchParams.get('place')?.trim() || '';
  const initialEventId = searchParams.get('event')?.trim() || '';
  const initialLatitude = Number(searchParams.get('lat'));
  const initialLongitude = Number(searchParams.get('lng'));
  const hasInitialPickedPlace =
    Boolean(initialPlaceName) &&
    Number.isFinite(initialLatitude) &&
    Number.isFinite(initialLongitude);
  const initialCenter = hasInitialPickedPlace
    ? { lat: initialLatitude, lng: initialLongitude }
    : DEFAULT_MARK_PLACE_CENTER;
  
  const [stage, setStage] = useState<Stage>(() => hasInitialPickedPlace ? 'map_fallback' : 'camera');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [locationName, setLocationName] = useState<string>(() =>
    hasInitialPickedPlace ? `已选：${initialPlaceName}` : ''
  );
  const [locationCaptureStatus, setLocationCaptureStatus] = useState<LocationCaptureStatus>(() =>
    hasInitialPickedPlace ? 'ready' : 'pending'
  );
  const [center, setCenter] = useState(initialCenter);
  const [mapDefaultCenter, setMapDefaultCenter] = useState(initialCenter);
  const [pickedPlaceName, setPickedPlaceName] = useState(initialPlaceName);
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  const [flash, setFlash] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechPermission, setSpeechPermission] = useState<SpeechPermissionStatus>('unknown');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [scanned, setScanned] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('starting');
  const [cameraHint, setCameraHint] = useState('正在打开网页相机...');
  const [cameraZoomRange, setCameraZoomRange] = useState(DEFAULT_CAMERA_ZOOM_RANGE);
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_CAMERA_ZOOM_RANGE.min);
  const [isCameraZoomFeedbackVisible, setIsCameraZoomFeedbackVisible] = useState(false);
  const [animalIdentification, setAnimalIdentification] = useState<AnimalIdentificationResult | null>(null);
  const [animalIdentificationStatus, setAnimalIdentificationStatus] = useState<AnimalIdentificationStatus>('idle');
  const [selectedAnimalCandidateId, setSelectedAnimalCandidateId] = useState<string>('');
  const [wildAnimalShareCard, setWildAnimalShareCard] = useState<CmiWildAnimalShareCardResult | null>(null);
  const [isWildAnimalSharePanelOpen, setIsWildAnimalSharePanelOpen] = useState(false);
  const [animalStickerFile, setAnimalStickerFile] = useState<File | null>(null);
  const [animalStickerPreviewUrl, setAnimalStickerPreviewUrl] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<'live' | 'exif' | null>(null);

  const [selectedCat, setSelectedCat] = useState<Category | ''>('');
  const [selectedInputCategoryId, setSelectedInputCategoryId] = useState<string>('');
  const [selectedEasterIconId, setSelectedEasterIconId] = useState(DEFAULT_CMI_EASTER_ICON_ID);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [eventOptions, setEventOptions] = useState<CmiEvent[]>(() => {
    const initialEvent = getCmiEventById(initialEventId);
    return initialEvent ? [initialEvent] : [];
  });
  const [isLoadingEventOptions, setIsLoadingEventOptions] = useState(false);
  const [placeCandidates, setPlaceCandidates] = useState<EventPlaceCandidate[]>(() => buildEventPlaceCandidates([]));
  const [isLoadingPlaceCandidates, setIsLoadingPlaceCandidates] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState(initialPlaceName);
  const [externalPlaceCandidates, setExternalPlaceCandidates] = useState<EventPlaceCandidate[]>([]);
  const [isLoadingExternalPlaces, setIsLoadingExternalPlaces] = useState(false);
  const [externalPlaceSearchError, setExternalPlaceSearchError] = useState<string | null>(null);
  const inputCategoryOptions = getCmiInputCategoryOptions();
  const selectedEvent = selectedEventId
    ? eventOptions.find(event => event.id === selectedEventId) ?? getCmiEventById(selectedEventId)
    : null;
  const isWildAnimalCheckin = selectedEventId === CMI_MAP_WILD_CHIANG_MAI_EVENT_ID || isCmiMapCheckinActivityEvent(selectedEvent);
  const selectedPlaceLabel = pickedPlaceName;
  const animalCandidates = animalIdentification?.candidates ?? [];
  const selectedAnimalCandidate = animalCandidates.find(candidate => candidate.id === selectedAnimalCandidateId) ?? animalCandidates[0];
  const debouncedPlaceSearchQuery = useDebounce(placeSearchQuery, 480);
  const cameraDateLabel = `${new Date().getMonth() + 1} / ${new Date().getDate()}`;
  const trimmedPlaceSearchQuery = placeSearchQuery.trim();
  const searchedPlaceCandidates = useMemo(
    () => searchEventPlaceCandidates(placeCandidates, placeSearchQuery, trimmedPlaceSearchQuery ? 5 : 3),
    [placeCandidates, placeSearchQuery, trimmedPlaceSearchQuery]
  );
  const visibleInternalPlaceCandidates = trimmedPlaceSearchQuery
    ? searchedPlaceCandidates
    : placeCandidates.slice(0, 3);
  const shouldSearchExternalPlaces =
    debouncedPlaceSearchQuery.trim().length >= 2 &&
    searchedPlaceCandidates.length === 0 &&
    !isLoadingPlaceCandidates;
  const visibleExternalPlaceCandidates = shouldSearchExternalPlaces ? externalPlaceCandidates : [];
  const visiblePlaceCandidates = [
    ...visibleInternalPlaceCandidates,
    ...visibleExternalPlaceCandidates,
  ];

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const routeRootRef = useRef<HTMLDivElement>(null);
  const animalStickerPreviewUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const animalIdentificationRequestRef = useRef(0);
  const speechStartingRef = useRef(false);
  const speechHadResultRef = useRef(false);
  const interimTranscriptRef = useRef('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraPinchRef = useRef<CameraPinchState | null>(null);
  const cameraZoomFeedbackTimeoutRef = useRef<number | null>(null);
  const isPhotoDoneStage = stage === 'done' && Boolean(photoURL);
  const isMapFallbackStage = stage === 'map_fallback';
  const photoAreaHeight = isPhotoDoneStage
    ? 'min(100vw, calc(100dvh - 13.5rem))'
    : 'min(100vw, 55dvh)';
  const voiceButtonDisabled = !speechSupported || speechPermission === 'checking';
  const cameraButtonDisabled = cameraStatus !== 'ready';
  const cameraDigitalZoom = cameraZoomRange.isHardwareSupported ? 1 : cameraZoom;
  const cameraZoomLabel = `${cameraZoom.toFixed(cameraZoom % 1 === 0 ? 0 : 1)}x`;

  useEffect(() => {
    if (stage === 'camera') return;

    const scrollContainer = routeRootRef.current?.closest('main');
    if (!(scrollContainer instanceof HTMLElement)) return;

    const previousOverflowY = scrollContainer.style.overflowY;
    const previousOverscrollBehavior = scrollContainer.style.overscrollBehavior;

    // NOTE: /mark 外层 main 默认可滚动。发布面板自己滚动时，iOS Safari 容易把滚动传给外层，导致底部发布按钮被顶走。
    scrollContainer.style.overflowY = 'hidden';
    scrollContainer.style.overscrollBehavior = 'none';

    return () => {
      scrollContainer.style.overflowY = previousOverflowY;
      scrollContainer.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [stage]);

  useEffect(() => () => {
    if (animalStickerPreviewUrlRef.current) URL.revokeObjectURL(animalStickerPreviewUrlRef.current);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingEventOptions(true);

    getPublishedCmiEvents()
      .then((events) => {
        if (!isMounted) return;

        const initialEvent = initialEventId
          ? events.find(event => event.id === initialEventId) ?? getCmiEventById(initialEventId)
          : null;

        setEventOptions(mergeInitialEventIntoOptions(getMarkPlaceEventOptions(events), initialEvent));
      })
      .catch((error) => {
        console.error('活动列表加载失败，使用本地活动:', error);
        if (!isMounted) return;

        const initialEvent = getCmiEventById(initialEventId);
        setEventOptions(mergeInitialEventIntoOptions(getMarkPlaceEventOptions(CMI_EVENTS), initialEvent));
      })
      .finally(() => {
        if (isMounted) setIsLoadingEventOptions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialEventId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPlaceCandidates(true);

    getAllRecommendations()
      .then(recommendations => {
        if (!isMounted) return;
        setPlaceCandidates(buildEventPlaceCandidates(recommendations.filter(isPublicMapRecommendation)));
      })
      .catch(error => {
        console.error('地点候选加载失败，使用基础候选:', error);
        if (isMounted) setPlaceCandidates(buildEventPlaceCandidates([]));
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlaceCandidates(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldSearchExternalPlaces) {
      setExternalPlaceCandidates([]);
      setIsLoadingExternalPlaces(false);
      setExternalPlaceSearchError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingExternalPlaces(true);
    setExternalPlaceSearchError(null);

    searchExternalPlaceCandidates(debouncedPlaceSearchQuery, {
      signal: controller.signal,
      limit: 5,
    })
      .then(places => {
        setExternalPlaceCandidates(places.map(createEventPlaceCandidateFromExternalPlace));
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setExternalPlaceCandidates([]);
        setExternalPlaceSearchError('外部地点暂时搜不到，可以拖动地图手动定位。');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingExternalPlaces(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedPlaceSearchQuery, shouldSearchExternalPlaces]);

  const stopCameraStream = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const markCameraReady = () => {
    if (!streamRef.current || !videoRef.current || videoRef.current.videoWidth === 0) return;
    setCameraStatus('ready');
    setCameraHint('网页相机已打开，可以缩放后拍下正方形画面。');
  };

  const applyCameraTrackZoom = async (nextZoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !cameraZoomRange.isHardwareSupported || !track.applyConstraints) return false;

    try {
      await track.applyConstraints({
        advanced: [{ zoom: nextZoom } as MediaTrackConstraintSetWithZoom],
      });
      return true;
    } catch (error) {
      console.warn('相机原生缩放不可用，改用网页裁切缩放:', error);
      return false;
    }
  };

  const switchToDigitalZoom = (nextZoom: number) => {
    setCameraZoomRange(DEFAULT_CAMERA_ZOOM_RANGE);
    setCameraZoom(normalizeCameraZoom(nextZoom, DEFAULT_CAMERA_ZOOM_RANGE));
  };

  const showCameraZoomFeedback = () => {
    setIsCameraZoomFeedbackVisible(true);
    if (cameraZoomFeedbackTimeoutRef.current) {
      window.clearTimeout(cameraZoomFeedbackTimeoutRef.current);
    }
    cameraZoomFeedbackTimeoutRef.current = window.setTimeout(() => {
      setIsCameraZoomFeedbackVisible(false);
      cameraZoomFeedbackTimeoutRef.current = null;
    }, CAMERA_ZOOM_FEEDBACK_TIMEOUT_MS);
  };

  const setCameraZoomValue = (value: number) => {
    const nextZoom = normalizeCameraZoom(value, cameraZoomRange);
    setCameraZoom(nextZoom);
    showCameraZoomFeedback();

    if (!cameraZoomRange.isHardwareSupported) return;

    void applyCameraTrackZoom(nextZoom).then((didApply) => {
      if (!didApply) switchToDigitalZoom(nextZoom);
    });
  };

  const handleCameraTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      cameraPinchRef.current = null;
      return;
    }

    const distance = getTouchDistance(event.touches);
    if (distance <= 0) return;

    event.preventDefault();
    cameraPinchRef.current = {
      distance,
      zoom: cameraZoom,
    };
    showCameraZoomFeedback();
  };

  const handleCameraTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const pinchState = cameraPinchRef.current;
    if (event.touches.length < 2 || !pinchState) return;

    const distance = getTouchDistance(event.touches);
    if (distance <= 0 || pinchState.distance <= 0) return;

    event.preventDefault();
    setCameraZoomValue(pinchState.zoom * (distance / pinchState.distance));
  };

  const handleCameraTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      cameraPinchRef.current = null;
    }
  };

  const updateInterimTranscript = (nextTranscript: string) => {
    interimTranscriptRef.current = nextTranscript;
    setInterimTranscript(nextTranscript);
  };

  useEffect(() => () => {
    if (photoURL) URL.revokeObjectURL(photoURL);
  }, [photoURL]);

  useEffect(() => () => {
    if (cameraZoomFeedbackTimeoutRef.current) {
      window.clearTimeout(cameraZoomFeedbackTimeoutRef.current);
    }
  }, []);

  // 初始化 Web Speech API。麦克风权限在用户点击按钮时再请求，避免页面加载时打扰用户。
  useEffect(() => {
    let alive = true;
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => {
        speechStartingRef.current = false;
        speechHadResultRef.current = false;
        updateInterimTranscript('');
        setIsListening(true);
        setSpeechPermission('granted');
      };

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        const resultIndex = event.resultIndex ?? 0;
        const results = event.results;

        if (!results) {
          return;
        }

        for (let index = resultIndex; index < results.length; index += 1) {
          const result = results[index];
          const transcript = result?.[0]?.transcript?.trim();
          if (!transcript) continue;

          if (result?.isFinal) {
            finalText = appendTranscript(finalText, transcript);
          } else {
            interimText = appendTranscript(interimText, transcript);
          }
        }

        if (finalText) {
          speechHadResultRef.current = true;
          setDescription(prev => appendTranscript(prev, finalText));
          updateInterimTranscript('');
          return;
        }

        if (interimText) {
          updateInterimTranscript(interimText);
        }
      };

      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        const nextHint = getVoiceErrorHint(event.error);
        if (event.error === 'not-allowed') {
          setSpeechPermission('denied');
        }
        speechStartingRef.current = false;
        updateInterimTranscript('');
        toast(nextHint);
        setIsListening(false);
      };

      recognition.onend = () => {
        const pendingInterim = interimTranscriptRef.current.trim();
        if (pendingInterim && !speechHadResultRef.current) {
          speechHadResultRef.current = true;
          setDescription(prev => appendTranscript(prev, pendingInterim));
          updateInterimTranscript('');
          setIsListening(false);
          return;
        }

        speechStartingRef.current = false;
        setIsListening(false);
      };

      setSpeechSupported(true);
      recognitionRef.current = recognition;
      queryMicrophonePermission().then(permission => {
        if (!alive) return;
        setSpeechPermission(permission);
      });
    } else {
      setSpeechSupported(false);
    }

    return () => {
      alive = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // NOTE: 部分浏览器在未开始识别时调用 stop 会抛错，卸载时忽略即可。
        }
      }
    };
  }, []);

  // 初始化 WebRTC 相机
  useEffect(() => {
    if (stage === 'camera') {
      let alive = true;
      const startCamera = async () => {
        setCameraStatus('starting');
        setCameraHint('正在打开网页相机...');
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            if (!alive) return;
            setCameraStatus('unsupported');
            setCameraHint('当前浏览器不支持网页相机，可以从相册选择，或直接文字推荐。');
            return;
          }

          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: MARK_PLACE_VIDEO_CONSTRAINTS,
          });
          if (!alive) {
            mediaStream.getTracks().forEach(track => track.stop());
            return;
          }
          streamRef.current = mediaStream;
          const videoTrack = mediaStream.getVideoTracks()[0];
          const nextZoomRange = getCameraZoomRange(videoTrack?.getCapabilities?.());
          const initialZoom = normalizeCameraZoom(1, nextZoomRange);
          setCameraZoomRange(nextZoomRange);
          setCameraZoom(initialZoom);

          if (nextZoomRange.isHardwareSupported && videoTrack?.applyConstraints) {
            try {
              await videoTrack.applyConstraints({
                advanced: [{ zoom: initialZoom } as MediaTrackConstraintSetWithZoom],
              });
            } catch (error) {
              console.warn('相机原生缩放初始化失败，改用网页裁切缩放:', error);
              switchToDigitalZoom(initialZoom);
            }
          }

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            await videoRef.current.play().catch(() => {
              // NOTE: 少数移动浏览器需要等 loadedmetadata/canplay 事件后才能自动播放预览。
            });
            markCameraReady();
          }
        } catch (err) {
          console.warn("相机权限获取失败:", err);
          if (!alive) return;
          const errorName = err instanceof DOMException ? err.name : '';
          const blocked = errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError';
          setCameraStatus(blocked ? 'blocked' : 'error');
          setCameraHint(blocked
            ? '浏览器没有给相机权限。可以在地址栏权限里允许相机，或直接文字推荐。'
            : '网页相机暂时打不开，可以从相册选择，或直接文字推荐。');
        }
      };
      startCamera();
      return () => {
        alive = false;
        stopCameraStream();
      };
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [stage]);

  const captureFromPreview = () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      streamRef.current &&
      videoRef.current.videoWidth > 0 &&
      videoRef.current.videoHeight > 0
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const crop = getSquareCaptureRect({
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        zoom: cameraDigitalZoom,
        maxOutputSize: DEFAULT_CAMERA_OUTPUT_SIZE,
      });

      canvas.width = crop.outputSize;
      canvas.height = crop.outputSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          video,
          crop.sx,
          crop.sy,
          crop.size,
          crop.size,
          0,
          0,
          crop.outputSize,
          crop.outputSize
        );
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = URL.createObjectURL(file);
            resetAnimalIdentification();
            resetWildAnimalShareCard();
            setScanned(false);
            setImages([file]);
            setFlash(true);
            fetchCurrentLocation();
            setTimeout(() => {
              setSourceType('live');
              setPhotoURL(url);
              setStage('analyzing');
              setFlash(false);
            }, 300);
          }
        }, 'image/jpeg', DEFAULT_CAMERA_CAPTURE_QUALITY);
      } else {
        toast('取景器没有拍下来，稍后再试一次');
      }
    } else {
      toast(cameraHint);
    }
  };

  const capturePhoto = () => {
    captureFromPreview();
  };

  const enableWildAnimalIdentification = () => {
    const wildAnimalEvent = getCmiEventById(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID);

    setSelectedEventId(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID);
    if (wildAnimalEvent) {
      setEventOptions(current =>
        current.some(event => event.id === wildAnimalEvent.id)
          ? current
          : [wildAnimalEvent, ...current]
      );
    }
  };

  // 未登录保护
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error('只有社区成员可以留下痕迹，请先登录');
      navigate('/login', { state: { from: '/mark' }, replace: true });
    }
  }, [authLoading, user, navigate]);

  const applyCapturedCoordinates = (coordinates: CapturedCoordinates, label: string) => {
    const nextCenter = {
      lat: coordinates.latitude,
      lng: coordinates.longitude,
    };
    setCenter(nextCenter);
    setMapDefaultCenter(nextCenter);
    setLocationName(label);
    setLocationCaptureStatus('ready');
  };

  const markLocationCaptureFailed = (label: string) => {
    setLocationName(label);
    setLocationCaptureStatus('failed');
  };

  const continueWithCurrentCoordinate = (label: string) => {
    setLocationName(label);
    setLocationCaptureStatus('ready');
  };

  // 获取地理位置
  const fetchCurrentLocation = (fallbackLabel = '定位暂时失败，已用当前地图坐标') => {
    setLocationCaptureStatus('pending');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyCapturedCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }, '拍摄坐标 (GPS)');
        },
        (error) => {
          console.error("GPS 获取失败", error);
          continueWithCurrentCoordinate(fallbackLabel);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      continueWithCurrentCoordinate(fallbackLabel);
    }
  };

  // 1. 照片拦截
  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>, source: 'live' | 'exif') => {
    const sourceFile = e.target.files?.[0];
    if (sourceFile) {
      e.target.value = '';
      setLocationCaptureStatus('pending');
      const exifCoordinates = source === 'exif'
        ? await extractGpsCoordinatesFromImageFile(sourceFile).catch((error) => {
          console.warn('照片 EXIF 坐标读取失败:', error);
          return null;
        })
        : null;
      const file = await normalizeImageFile(sourceFile).catch((error) => {
        console.error('照片方向修正失败，使用原图继续:', error);
        return sourceFile;
      });
      const url = URL.createObjectURL(file);
      resetAnimalIdentification();
      resetWildAnimalShareCard();
      setScanned(false);
      setImages([file]);
      setFlash(true);
      
      if (source === 'live') {
        fetchCurrentLocation();
      } else if (exifCoordinates) {
        applyCapturedCoordinates(exifCoordinates, '照片坐标 (EXIF)');
      } else {
        fetchCurrentLocation('照片没有定位，已用当前地图坐标');
      }

      setTimeout(() => {
        setSourceType(source);
        setPhotoURL(url);
        setStage('analyzing');
        setFlash(false);
      }, 300);
    }
  };

  const startQuickTextFlow = () => {
    setImages([]);
    setPhotoURL(null);
    setSourceType(null);
    setDescription('');
    resetAnimalIdentification();
    resetWildAnimalShareCard();
    setScanned(false);
    updateInterimTranscript('');
    setIsListening(false);
    speechStartingRef.current = false;
    setLocationName('手动选点');
    setLocationCaptureStatus('failed');
    setPickedPlaceName('');
    setPlaceSearchQuery('');
    setStage('map_fallback');
  };

  const applyPlaceCandidate = (candidate: EventPlaceCandidate) => {
    const nextCenter = {
      lat: candidate.latitude,
      lng: candidate.longitude,
    };

    setPickedPlaceName(candidate.placeName);
    setPlaceSearchQuery(candidate.placeName);
    setLocationName(`已选：${candidate.placeName}`);
    setLocationCaptureStatus('ready');
    setCenter(nextCenter);
    setMapDefaultCenter(nextCenter);

    toast.success('已关联地点', {
      description: candidate.placeName,
    });
  };

  const handlePlaceSearchChange = (value: string) => {
    setPlaceSearchQuery(value);
    if (pickedPlaceName && pickedPlaceName !== value.trim()) {
      setPickedPlaceName('');
      setLocationName('手动选点');
      setLocationCaptureStatus('failed');
    }
  };

  const resetAnimalIdentification = () => {
    animalIdentificationRequestRef.current += 1;
    setAnimalIdentification(null);
    setAnimalIdentificationStatus('idle');
    setSelectedAnimalCandidateId('');
    setAnimalStickerFile(null);
    if (animalStickerPreviewUrlRef.current) URL.revokeObjectURL(animalStickerPreviewUrlRef.current);
    animalStickerPreviewUrlRef.current = null;
    setAnimalStickerPreviewUrl(null);
  };

  const resetWildAnimalShareCard = () => {
    setWildAnimalShareCard(null);
    setIsWildAnimalSharePanelOpen(false);
  };

  const applyAnimalCandidate = (candidate: AnimalIdentificationCandidate) => {
    const easterOption = inputCategoryOptions.find(option => option.id === 'easter');

    setSelectedAnimalCandidateId(candidate.id);
    if (easterOption) {
      setSelectedInputCategoryId(easterOption.id);
      setSelectedCat(easterOption.storedCategory);
    }
    if (candidate.iconId) setSelectedEasterIconId(candidate.iconId);
    setDescription(current => current.trim() || buildAnimalCandidateDescription(candidate));
  };

  const applyAnimalStickerFile = (stickerFile: File | null) => {
    setAnimalStickerFile(stickerFile);
    if (animalStickerPreviewUrlRef.current) URL.revokeObjectURL(animalStickerPreviewUrlRef.current);
    const nextPreviewUrl = stickerFile ? URL.createObjectURL(stickerFile) : null;
    animalStickerPreviewUrlRef.current = nextPreviewUrl;
    setAnimalStickerPreviewUrl(nextPreviewUrl);
  };

  const createAnimalStickerPreview = async (
    photoFile: File,
    candidate: AnimalIdentificationCandidate,
    sourceImageUrl?: string
  ) => {
    try {
      const stickerFile = await createAnimalStickerFromPhoto(photoFile, {
        ...candidate,
        sourceImageUrl,
      });
      applyAnimalStickerFile(stickerFile);
      return stickerFile;
    } catch (error) {
      console.error('动物贴纸生成失败:', error);
      return null;
    }
  };

  const getAutomaticPublishCategory = (): Category => {
    if (selectedCat) return selectedCat;
    if (isWildAnimalCheckin) return '彩蛋';
    if (pickedPlaceName.trim() === CMI_INN_PLACE_NAME || (selectedEvent && isCmiInnEvent(selectedEvent))) {
      return CMI_INN_CATEGORY;
    }

    return DEFAULT_MARK_PLACE_CATEGORY;
  };

  const handleVoiceConfirm = () => {
    if (!description.trim() || isListening || uploading) return;

    if (locationCaptureStatus === 'pending' && photoURL) {
      toast('正在获取定位，稍等一下');
      return;
    }

    if (locationCaptureStatus === 'failed') {
      if (photoURL) {
        setLocationCaptureStatus('ready');
        void handleSubmitFinal(getAutomaticPublishCategory());
        return;
      }

      setStage('map_fallback');
      return;
    }

    void handleSubmitFinal(getAutomaticPublishCategory());
  };

  // 2. 定位分析动画
  useEffect(() => {
    if (stage === 'analyzing') {
      const timer1 = setTimeout(() => setScanned(true), isWildAnimalCheckin ? 700 : 1500);

      if (isWildAnimalCheckin && images[0]) {
        const requestId = animalIdentificationRequestRef.current + 1;
        animalIdentificationRequestRef.current = requestId;
        setAnimalIdentificationStatus('running');

        void identifyAnimalPhoto(images[0])
          .then(result => {
            if (animalIdentificationRequestRef.current !== requestId) return;

            setAnimalIdentification(result);
            setAnimalIdentificationStatus(
              result.status === 'ready'
                ? 'done'
                : result.status === 'no-match'
                  ? 'no-match'
                  : result.status === 'unavailable'
                    ? 'unavailable'
                    : 'error'
            );
            if (result.candidates[0]) {
              applyAnimalCandidate(result.candidates[0]);
              void createAnimalStickerPreview(images[0], result.candidates[0]);
            }
            setStage('voice');
          })
          .catch(error => {
            if (animalIdentificationRequestRef.current !== requestId) return;

            console.error('生物识别失败:', error);
            setAnimalIdentificationStatus('error');
            setStage('voice');
          });

        const fallbackTimer = setTimeout(() => {
          setStage('voice');
        }, 2200);

        return () => {
          clearTimeout(timer1);
          clearTimeout(fallbackTimer);
        };
      }

      // NOTE: 相册旧照不再先逼用户拖地图，先写体验，再关联地点或活动。
      const timer2 = setTimeout(() => {
        setStage('voice');
      }, 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [stage, isWildAnimalCheckin, images]);

  // 3. 语音对话控制
  const handleVoiceInput = async () => {
    if (!speechSupported || !recognitionRef.current) {
      toast('当前浏览器不支持语音识别，直接打字就行');
      return;
    }

    if (speechStartingRef.current) return;

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        speechStartingRef.current = false;
      } else {
        speechStartingRef.current = true;
        setSpeechPermission('checking');
        updateInterimTranscript('');

        const microphoneAccess = await requestMicrophoneForSpeech();
        setSpeechPermission(microphoneAccess.permission);

        if (!microphoneAccess.ok) {
          speechStartingRef.current = false;
          setIsListening(false);
          toast(microphoneAccess.hint);
          return;
        }

        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('语音识别启动失败:', error);
      speechStartingRef.current = false;
      setIsListening(false);
      toast('语音启动失败，直接打字更稳');
    }
  };

  const handleWildAnimalShareAction = async (target: WildAnimalShareTarget) => {
    if (!wildAnimalShareCard) return;

    const result = await shareWildAnimalCardWithSystem(wildAnimalShareCard, target);
    if (result === 'cancelled') return;
    if (result === 'shared') {
      toast.success(target === 'album' ? '已打开系统保存菜单' : '已打开系统分享菜单');
      return;
    }

    if (result === 'unsupported') {
      toast.error('这个浏览器不能直接存相册，换 Safari/微信内打开再试');
      return;
    }

    toast.error('系统分享没有打开，请再试一次');
  };

  // 4. 用户提交逻辑
  const handleSubmitFinal = async (selectedCategory: Category) => {
    if (!description.trim()) {
      toast.error('还是随意写/说一点具体体验吧！');
      return;
    }
    setStage('done');
    setUploading(true);
    resetWildAnimalShareCard();

    try {
      let generatedWildAnimalShareCard: CmiWildAnimalShareCardResult | null = null;
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(images);
        if (imageUrls.length === 0) {
          toast.error('相片冲洗失败，请重写！');
          setUploading(false);
          setStage('voice');
          return;
        }
      }

      const text = description.trim();
      const isCmiInnCheckIn = selectedCategory === CMI_INN_CATEGORY;
      const targetCoordinates = isCmiInnCheckIn
        ? CMI_INN_COORDINATES
        : { latitude: center.lat, longitude: center.lng };
      let placeName = CMI_INN_PLACE_NAME;
      let reason = text;

      if (!isCmiInnCheckIn) {
        const normalizedPickedPlaceName = pickedPlaceName.trim();

        if (normalizedPickedPlaceName) {
          placeName = normalizedPickedPlaceName;
        } else {
          placeName = formatCoordinatePlaceName(targetCoordinates);
        }
      }

      const userName = profile?.user_name || user?.email?.split('@')[0] || '匿名用户';
      const selectedInputCategoryOption = getCmiInputCategoryOptionById(selectedInputCategoryId)
        ?? inputCategoryOptions.find(option => option.storedCategory === selectedCategory)
        ?? null;
      const linkedEvent = selectedEventId
        ? eventOptions.find(event => event.id === selectedEventId) ?? getCmiEventById(selectedEventId)
        : null;
      let animalStickerUrl: string | null = null;

      if (isWildAnimalCheckin && images[0] && selectedAnimalCandidate) {
        const stickerFile = imageUrls[0]
          ? await createAnimalStickerPreview(images[0], selectedAnimalCandidate, imageUrls[0])
          : animalStickerFile ?? await createAnimalStickerPreview(images[0], selectedAnimalCandidate);
        if (stickerFile) animalStickerUrl = await uploadAnimalSticker(stickerFile);
      }

      const recommendationInput = {
        place_name: placeName,
        category: selectedCategory,
        input_category_id: selectedInputCategoryOption?.id ?? null,
        primary_intent_id: selectedInputCategoryOption?.primaryIntentId ?? null,
        reason: reason,
        user_name: userName,
        user_id: user!.id,
        latitude: targetCoordinates.latitude,
        longitude: targetCoordinates.longitude,
        images: imageUrls,
        ...(selectedCategory === '彩蛋' ? { easter_icon_id: selectedEasterIconId } : {}),
        ...(linkedEvent ? {
          linked_event_id: linkedEvent.id,
          linked_event_title: linkedEvent.title,
        } : {}),
        ...(selectedAnimalCandidate && animalStickerUrl ? {
          animal_sticker_url: animalStickerUrl,
          animal_common_name: formatAnimalCandidateLabel(selectedAnimalCandidate),
          animal_scientific_name: selectedAnimalCandidate.scientificName ?? null,
          animal_subject_box: selectedAnimalCandidate.subjectBox,
        } : {}),
      };

      const recommendation = await createRecommendation(recommendationInput);

      if (recommendation) {
        if (linkedEvent && isCmiMapCheckinActivityEvent(linkedEvent)) {
          const captureNumber = await assignCmiEventCaptureNumber(recommendation.id);

          if (images[0] && selectedAnimalCandidate) {
            try {
              const shareCard = await createCmiWildAnimalShareCard({
                photoFile: images[0],
                candidate: selectedAnimalCandidate,
                recommendation,
                captureNumber,
                userName,
              });
              generatedWildAnimalShareCard = shareCard;
              setWildAnimalShareCard(shareCard);
            } catch (error) {
              console.error('动物分享卡生成失败:', error);
              toast.error('分享卡片暂时没生成，动态已经发布');
            }
          }
        }

        setTimeout(() => {
          toast.success(
            isCmiInnCheckIn
              ? '这张客栈现场已经放到动态里了'
              : '你的这一笔清迈痕迹已经留下了 🎉'
          );
          const defaultDestinationPath = isCmiInnCheckIn ? getCmiFeedPath() : getPlacePath(recommendation.place_name);
          if (generatedWildAnimalShareCard) return;

          navigate(defaultDestinationPath, {
            replace: true,
            state: { newTraceId: recommendation.id },
          });
        }, 1200); // 让印章飞一下再走
      } else {
        throw new Error('提交失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('这条痕迹没有留下来，请再试一次');
      setStage('voice');
    } finally {
      setUploading(false);
    }
  };

  const handleMapConfirm = () => {
    if (!pickedPlaceName.trim()) {
      setLocationName(`地图坐标 · ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    }

    setLocationCaptureStatus('ready');
    if (description.trim()) {
      void handleSubmitFinal(getAutomaticPublishCategory());
      return;
    }

    setStage('voice');
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div ref={routeRootRef} className="relative flex h-[100dvh] min-h-0 w-full flex-col items-center justify-start overflow-hidden bg-stone-100 font-sans overscroll-none">
      
      {/* 顶部简易导航回退 */}
      <div className="w-full absolute top-0 z-50 p-6 flex justify-between items-center mix-blend-difference text-white">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* 噪点特效 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[90] mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className={`absolute inset-0 bg-white z-[100] transition-opacity duration-400 pointer-events-none ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {/* STAGE 1: 取景框 */}
      {stage === 'camera' && (
        <div className="relative flex h-[100dvh] w-full flex-col bg-[#063d27] text-stone-700">
          <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-3 pt-[calc(env(safe-area-inset-top)+4.5rem)]">
            <div
              className="relative"
              style={{ width: 'min(calc(100vw - 1.25rem), calc(100dvh - 14.25rem), 560px)' }}
            >
              <div className="absolute -inset-x-2 -top-9 -bottom-3 rounded-[2.25rem] bg-gradient-to-br from-[#fffaf0] via-[#ece3d6] to-[#cfc2ae] shadow-[0_22px_55px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.95)]" />
              <div className="absolute -top-6 left-5 z-10 flex items-center gap-2 rounded-full border border-black/10 bg-[#0b3d24] px-3 py-1 text-[10px] font-black tracking-[0.24em] text-[#f6eee4] shadow-inner">
                CMI MAP
              </div>
              <div className="absolute -top-6 right-5 z-10 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c76f] shadow-[0_0_12px_rgba(40,199,111,0.78)]" />
                <span className="h-4 w-10 rounded-full border border-black/10 bg-[#075233] shadow-inner" />
              </div>
              <div
                className="touch-none relative aspect-square overflow-hidden rounded-[1.9rem] border-[7px] border-[#07351f] bg-[#061f16] shadow-[0_16px_38px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(255,255,255,0.16),inset_0_18px_28px_rgba(255,255,255,0.08)] ring-[5px] ring-[#f7efe5] sm:rounded-[2.2rem] sm:border-[8px] sm:ring-[6px]"
                onTouchStart={handleCameraTouchStart}
                onTouchMove={handleCameraTouchMove}
                onTouchEnd={handleCameraTouchEnd}
                onTouchCancel={handleCameraTouchEnd}
                style={{ touchAction: 'none' }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={markCameraReady}
                  onCanPlay={markCameraReady}
                  className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-150 ease-out"
                  style={{
                    filter: 'contrast(1.08) saturate(1.08) brightness(1.02)',
                    transform: `scale(${cameraDigitalZoom})`,
                    transformOrigin: 'center center',
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />
                {cameraStatus !== 'ready' && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06251a]/92 px-8 text-center text-white">
                    {cameraStatus === 'starting' ? (
                      <Loader2 className="mb-3 h-7 w-7 animate-spin text-white/90" />
                    ) : (
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10">
                        <PencilLine className="h-6 w-6 text-white/85" />
                      </div>
                    )}
                    <p className="max-w-xs text-sm font-bold leading-relaxed text-white/90">{cameraHint}</p>
                  </div>
                )}
                <div className="absolute top-5 left-5 right-5 flex items-start justify-between pointer-events-none">
                  <span className="text-white/90 text-2xl drop-shadow-md" style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>Smile! :)</span>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-white/90 text-2xl drop-shadow-md" style={{ fontFamily: "'Nanum Pen Script', 'Caveat', cursive" }}>{cameraDateLabel}</span>
                    <span
                      className={`rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-xs font-black tabular-nums text-white shadow-[0_4px_12px_rgba(0,0,0,0.28)] transition-opacity duration-150 ${
                        cameraStatus === 'ready' && (isCameraZoomFeedbackVisible || cameraZoom > cameraZoomRange.min)
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      {cameraZoomLabel}
                    </span>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 pointer-events-none sm:h-60 sm:w-60">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white/80 rounded-tl-lg shadow-[0_0_12px_rgba(255,255,255,0.2)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white/80 rounded-tr-lg shadow-[0_0_12px_rgba(255,255,255,0.2)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white/80 rounded-bl-lg shadow-[0_0_12px_rgba(255,255,255,0.2)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white/80 rounded-br-lg shadow-[0_0_12px_rgba(255,255,255,0.2)]" />
                  <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/65" />
                </div>
                <div className="absolute top-1/3 left-0 right-0 h-[1px] border-t border-dashed border-white/15 pointer-events-none" />
                <div className="absolute top-2/3 left-0 right-0 h-[1px] border-t border-dashed border-white/15 pointer-events-none" />
                <div className="absolute left-1/3 top-0 bottom-0 w-[1px] border-l border-dashed border-white/15 pointer-events-none" />
                <div className="absolute left-2/3 top-0 bottom-0 w-[1px] border-l border-dashed border-white/15 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="relative z-10 h-52 bg-gradient-to-b from-[#fffaf2] to-[#efe6d7] flex flex-col items-center justify-center shadow-[0_-18px_42px_-14px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.95)] pb-safe rounded-t-[2.35rem] border-t border-white/80 sm:h-56">
            <div className="absolute top-5 w-28 h-1.5 bg-stone-300/80 rounded-full shadow-inner" />
            <div className="absolute left-7 top-7 flex items-center gap-2 text-[10px] font-black tracking-[0.22em] text-stone-500">
              <span className="h-2 w-2 rounded-full bg-[#28c76f]" />
              LIVE
            </div>
            <div className="absolute right-7 top-7 rounded-full border border-stone-300/70 bg-white/55 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-stone-500 shadow-inner">
              SQ
            </div>
            <div className="flex items-center gap-7 mt-7 z-10 w-full justify-center px-8">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCapture(e, 'exif')} ref={uploadInputRef} />
              <button
                type="button"
                onClick={startQuickTextFlow}
                className="w-14 h-14 rounded-full border border-white/80 bg-[#f7f1e8] flex items-center justify-center text-stone-600 shadow-[inset_0_2px_8px_rgba(255,255,255,0.85),0_6px_16px_rgba(0,0,0,0.08)] hover:bg-white transition-colors active:scale-95"
                aria-label="快速文字推荐"
              >
                <PencilLine className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={cameraButtonDisabled}
                className={`relative w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-full flex flex-col items-center justify-center group transition-transform duration-200 outline-none shrink-0 ${
                  cameraButtonDisabled ? 'cursor-not-allowed opacity-55' : 'active:scale-[0.92]'
                }`}
                aria-label={cameraButtonDisabled ? cameraHint : '拍下当前画面'}
              >
                <div className="absolute inset-0 rounded-full border-[5px] border-[#f9f4eb] shadow-[0_10px_24px_rgba(0,0,0,0.12),inset_0_4px_8px_rgba(255,255,255,0.86)] transition-shadow bg-[#fdfdfc]"></div>
                <div className={`w-[76%] h-[76%] rounded-full transition-all flex items-center justify-center ${
                  cameraButtonDisabled
                    ? 'bg-stone-200 shadow-inner'
                    : 'bg-gradient-to-br from-[#41d97b] via-[#0f8f4d] to-[#075f36] shadow-[inset_0_-5px_10px_rgba(0,0,0,0.16),0_5px_14px_rgba(15,143,77,0.34)] group-active:shadow-[inset_0_4px_10px_rgba(0,0,0,0.22),0_2px_4px_rgba(15,143,77,0.2)]'
                }`}>
                  <div className="absolute top-4 left-6 w-5 h-5 bg-white/40 rounded-full blur-[2px]"></div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="w-14 h-14 rounded-full border border-white/80 bg-[#f7f1e8] flex items-center justify-center text-stone-600 shadow-[inset_0_2px_8px_rgba(255,255,255,0.85),0_6px_16px_rgba(0,0,0,0.08)] hover:bg-white transition-colors active:scale-95"
                aria-label="从相册选择照片"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={enableWildAnimalIdentification}
              aria-pressed={isWildAnimalCheckin}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black shadow-sm active:scale-95 ${
                isWildAnimalCheckin
                  ? 'border-[#0b8d45]/45 bg-[#eaf8ef] text-[#0b5f37]'
                  : 'border-stone-300/75 bg-white/70 text-stone-700 hover:bg-white'
              }`}
            >
              <PawPrint className="h-4 w-4" />
              {isWildAnimalCheckin ? '生物识别已开启' : '识别生物'}
            </button>
            <button
              onClick={startQuickTextFlow}
              className="mt-2 text-xs font-bold text-stone-600 underline underline-offset-4 active:scale-95"
            >
              不拍照，直接文字推荐
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2 - 5: Content Flow */}
      {stage !== 'camera' && (
        <div className="relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden">
          
          {/* 上半部分：照片区域 */}
          {photoURL && !isMapFallbackStage && <div className="relative flex-shrink-0 transition-all duration-500" style={{ height: photoAreaHeight }}>
            <div className={`w-full h-full relative overflow-hidden transition-all duration-1000 ease-soft-out ${stage === 'analyzing' ? 'scale-[0.97]' : 'scale-100'}`}>
              <img src={photoURL} className="w-full h-full object-cover" alt="Captured" />
              
              {stage === 'analyzing' && !scanned && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-[150%] h-4 bg-primary/40 blur-md rotate-12 absolute top-0 -left-1/4 animate-[scan_1.5s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center text-white/90 drop-shadow-md">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="font-medium tracking-wide">
                        {isWildAnimalCheckin
                          ? '正在识别这只小生命...'
                          : sourceType === 'live' ? '获取当前实时坐标...' : '解析旧照空间记忆...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 定位条 — 照片底部暗色玻璃条 */}
              <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-between transition-all duration-700 delay-300 bg-black/50 backdrop-blur-md px-4 py-2.5 ${locationName ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="p-1 bg-white/20 rounded-full text-white shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm leading-tight truncate text-white/90">
                    {locationName || '...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStage('map_fallback')}
                  aria-label="修改位置"
                  className="shrink-0 rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-black text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                >
                  位置不对？修改
                </button>
              </div>

              {/* NOTE: 用户反馈红色大章像罚单，完成反馈改成轻量鼓励徽章，减少对照片主体的遮挡。 */}
              {stage === 'done' && (
                <MarkPlaceSuccessBadge className="absolute bottom-16 right-4" />
              )}
            </div>
          </div>}

          {/* 下半部分：控件区域 */}
          <div className={
            isMapFallbackStage
              ? 'relative flex-1 overflow-hidden bg-stone-50'
              : `min-h-0 flex-1 flex flex-col items-center px-6 pb-safe bg-stone-50 relative overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] ${isPhotoDoneStage ? 'justify-start pt-4' : 'justify-center'}`
          }>
            {!photoURL && stage === 'done' && (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <MarkPlaceSuccessBadge />
                <p className="text-sm font-semibold text-stone-500">正在把你的清迈痕迹收进手账...</p>
              </div>
            )}

            {photoURL && stage === 'done' && (
              <div className="flex w-full max-w-[22rem] flex-col items-center gap-3 text-center">
                {uploading ? (
                  <p className="text-sm font-semibold text-stone-500">正在把你的清迈痕迹收进手账...</p>
                ) : wildAnimalShareCard ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsWildAnimalSharePanelOpen(current => !current)}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border-2 border-[#082617] bg-[#0b3d24] px-5 py-3 text-sm font-black text-[#fff4d8] shadow-[0_10px_0_#082617,0_18px_26px_rgba(11,61,36,0.22)] active:translate-y-1 active:shadow-[0_6px_0_#082617,0_12px_18px_rgba(11,61,36,0.2)]"
                    >
                      <span className="absolute -left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-[#f6c445]" />
                      <PawPrint className="relative h-4 w-4 text-[#f6c445]" strokeWidth={3} />
                      分享图鉴卡
                      <Share2 className="relative h-4 w-4 text-[#fff4d8]/85" strokeWidth={3} />
                    </button>
                    {isWildAnimalSharePanelOpen && (
                      <div className="relative grid w-full grid-cols-3 gap-2 rounded-[1.4rem] border-2 border-[#0b1724] bg-[#fff4d8] p-2 shadow-[7px_7px_0_rgba(11,23,36,0.18)]">
                        <img
                          src="/map-icons/cmi-flat-v2/wild-magnifier-checkin.png"
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-3 -top-4 h-12 w-12 rotate-[8deg] object-contain drop-shadow-[0_5px_0_rgba(11,23,36,0.16)]"
                        />
                        <button
                          type="button"
                          onClick={() => void handleWildAnimalShareAction('album')}
                          className="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 border-[#0b1724] bg-[#dff5e7] px-2 py-2 text-[11px] font-black leading-tight text-[#0b3d24] shadow-[3px_3px_0_rgba(11,23,36,0.22)] active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(11,23,36,0.2)]"
                        >
                          <ImageIcon className="h-4 w-4" strokeWidth={3} />
                          保存到相册
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleWildAnimalShareAction('wechat')}
                          className="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 border-[#0b1724] bg-[#7bd36a] px-2 py-2 text-[11px] font-black leading-tight text-[#0b3d24] shadow-[3px_3px_0_rgba(11,23,36,0.22)] active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(11,23,36,0.2)]"
                        >
                          <Share2 className="h-4 w-4" strokeWidth={3} />
                          微信
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleWildAnimalShareAction('xiaohongshu')}
                          className="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.1rem] border-2 border-[#0b1724] bg-[#2ea85f] px-2 py-2 text-[11px] font-black leading-tight text-[#fff4d8] shadow-[3px_3px_0_rgba(11,23,36,0.22)] active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(11,23,36,0.2)]"
                        >
                          <Send className="h-4 w-4" strokeWidth={3} />
                          小红书
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-stone-500">正在把你的清迈痕迹收进手账...</p>
                )}
              </div>
            )}
            
            {stage === 'map_fallback' && (
               <div className="absolute inset-0 animate-in fade-in duration-300">
	                 <LeafletMap
                       key={pickedPlaceName || `${mapDefaultCenter.lat}-${mapDefaultCenter.lng}`}
	                   mode="mark"
	                   defaultZoom={15}
	                   defaultCenter={mapDefaultCenter}
	                   markTargetYRatio={0.5}
	                   onCenterChange={(lat, lng) => setCenter({lat, lng})}
	                   className="h-full w-full border-none outline-none"
	                 />
                 <div className="pointer-events-none absolute inset-x-0 top-0 z-[1001] h-40 bg-gradient-to-b from-background/95 via-background/70 to-transparent" />
                 <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[1002] rounded-3xl border border-foreground/10 bg-background/92 px-4 py-3 shadow-lg backdrop-blur-md">
                   <div className="text-center">
                       <p className="text-base font-black text-foreground">
                         {selectedPlaceLabel || '搜索地点，或手动定点'}
                       </p>
                       <p className="mt-1 text-xs font-bold leading-relaxed text-muted-foreground">
                         {selectedPlaceLabel
                           ? '这条动态会带上这个地点标签，也可以继续微调准星。'
                           : '先搜清迈客栈、店名或区域；搜不到再拖地图兜底。'}
                       </p>
                   </div>
                   <label className="mt-3 flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-3 shadow-sm">
                     <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={3} />
                     <input
                       value={placeSearchQuery}
                       onChange={(event) => handlePlaceSearchChange(event.target.value)}
                       placeholder="搜清迈客栈 / 店名 / 区域"
                       className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/65"
                       autoComplete="off"
                     />
                     {placeSearchQuery && (
                       <button
                         type="button"
                         onClick={() => handlePlaceSearchChange('')}
                         className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95"
                         aria-label="清空地点搜索"
                       >
                         <X className="h-3.5 w-3.5" strokeWidth={3} />
                       </button>
                     )}
                   </label>
                   <div className="mt-2 max-h-44 overflow-y-auto pr-1">
                     {visiblePlaceCandidates.length > 0 ? (
                       <div className="space-y-2">
                         {visiblePlaceCandidates.map(candidate => {
                           const isSelectedCandidate = selectedPlaceLabel === candidate.placeName;

                           return (
                             <button
                               key={`${candidate.bindingSource}:${candidate.placeName}:${candidate.latitude}:${candidate.longitude}`}
                               type="button"
                               onClick={() => applyPlaceCandidate(candidate)}
                               className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.99] ${
                                 isSelectedCandidate
                                   ? 'border-primary bg-primary/10 ring-2 ring-primary/15'
                                   : 'border-border bg-background/92'
                               }`}
                             >
                               <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                 <MapPin className="h-4 w-4" strokeWidth={3} />
                               </span>
                               <span className="min-w-0 flex-1">
                                 <strong className="block truncate text-sm font-black text-foreground">
                                   {candidate.placeName}
                                 </strong>
                                 <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                                   {candidate.areaLabel}
                                 </span>
                               </span>
                               {isSelectedCandidate && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} />}
                             </button>
                           );
                         })}
                       </div>
                     ) : (
                       <p className="rounded-2xl bg-muted/70 px-3 py-2 text-xs font-bold leading-relaxed text-muted-foreground">
                         {isLoadingPlaceCandidates || isLoadingExternalPlaces
                           ? '正在找地点...'
                           : externalPlaceSearchError || '没有搜到匹配地点，可以直接拖地图手动定位。'}
                       </p>
                     )}
                   </div>
                 </div>
                 <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1001] h-40 bg-gradient-to-t from-background via-background/88 to-transparent" />
                 <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[1002]">
                   <button onClick={handleMapConfirm} className="flex h-14 w-full items-center justify-center rounded-3xl bg-[#0b3d24] text-base font-black text-[#fff7dc] shadow-[0_14px_34px_rgba(11,61,36,0.24)] active:scale-[0.98]">
                     {description.trim() ? '确认地点，继续发布' : '确认地点，去写体验'}
                   </button>
                 </div>
               </div>
            )}

            {stage === 'voice' && (
              <div className="w-full flex flex-col items-center gap-4 py-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <div className="w-full max-w-sm">
                  {isWildAnimalCheckin && (
                    <div className="mb-3 rounded-3xl border border-stone-200 bg-white/90 p-3 text-left shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-stone-800">生物识别</p>
                        {animalIdentificationStatus === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      </div>
                      {animalCandidates.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {animalCandidates.map(candidate => {
                            const isSelectedCandidate = selectedAnimalCandidate?.id === candidate.id;

                            return (
                              <button
                                key={`${candidate.id}:${candidate.rawLabel}`}
                                type="button"
                                onClick={() => applyAnimalCandidate(candidate)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                                  isSelectedCandidate
                                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/15'
                                    : 'border-stone-200 bg-stone-50 text-stone-700'
                                }`}
                              >
                                {formatAnimalCandidateLabel(candidate)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-stone-500">
                          {animalIdentificationStatus === 'running'
                            ? '正在识别生物主体。'
                            : animalIdentificationStatus === 'idle'
                              ? '拍下动植物后会自动识别。'
                              : '这张没识别清楚，换张近一点的照片或直接写名称。'}
                        </p>
                      )}
                      {animalStickerPreviewUrl && (
                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#0b3d24]/15 bg-[#fff7dc] px-3 py-2">
                          <img
                            src={animalStickerPreviewUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_6px_0_rgba(11,61,36,0.12)]"
                          />
                          <p className="min-w-0 text-xs font-black text-[#0b3d24]">已剪成贴纸</p>
                        </div>
                      )}
                    </div>
                  )}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="写下地点名和具体体验，比如：Fern Forest，树很多很安静，适合上午写东西"
                    className="w-full min-h-28 resize-none rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-[15px] leading-relaxed text-stone-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    maxLength={240}
                  />
                  {interimTranscript && (
                    <p className="mt-2 rounded-2xl bg-primary/5 px-3 py-2 text-xs font-bold leading-relaxed text-primary/75">
                      正在听：{interimTranscript}
                    </p>
                  )}
                </div>
                <div className="flex gap-5 items-center">
                  <button
                    onClick={handleVoiceInput}
                    disabled={voiceButtonDisabled}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening
                        ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/30'
                        : speechPermission === 'checking'
                          ? 'bg-stone-100 text-stone-400 cursor-wait'
                          : speechPermission === 'denied'
                            ? 'border border-red-200 bg-red-50 text-red-600 shadow-sm active:scale-95'
                            : speechSupported
                          ? 'bg-white text-stone-800 shadow-lg hover:scale-105 active:scale-95'
                          : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                    }`}
                    aria-label={speechSupported ? '语音输入' : '当前浏览器不支持语音输入'}
                  >
                    <ScribbleSparks active={isListening} />
                    {speechPermission === 'checking' ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : isListening ? (
                      <MicOff className="w-7 h-7 animate-pulse" />
                    ) : (
                      <Mic className="w-7 h-7" />
                    )}
                  </button>
                  <button
                    onClick={handleVoiceConfirm}
                    disabled={!description.trim() || isListening}
                    className="w-16 h-16 rounded-full bg-white text-primary flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-300 disabled:shadow-sm disabled:hover:scale-100"
                    aria-label={locationCaptureStatus === 'failed' && !photoURL ? '去手动定点' : '发布动态'}
                  >
                    <Check className="w-7 h-7" strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
