import QRCode from 'qrcode';
import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getPublicCmiEventUrl } from '@/lib/paths';
import {
  type AnimalIdentificationCandidate,
  getAnimalChineseName,
  getAnimalIntro,
} from '@/services/animal-identification';
import type { Recommendation } from '@/types/types';

export interface CmiWildAnimalShareCardInput {
  photoFile: File;
  candidate: AnimalIdentificationCandidate;
  recommendation: Recommendation;
  captureNumber: number | null;
  userName: string;
  collectedIndex?: number;
  collectedTotal?: number;
}

export interface CmiWildAnimalShareCardResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

const TEMPLATE_URL = '/cmi-home/share-card-templates/wild-chiang-mai-template-v4.png';
const CARD_WIDTH = 1024;
const CARD_HEIGHT = 1536;
const FONT_FAMILY =
  '"Hannotate SC", "HanziPen SC", "Wawati SC", "Yuanti SC", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const INTRO_FONT = `900 29px ${FONT_FAMILY}`;
const NUMBER_FONT = `900 38px ${FONT_FAMILY}`;
const TIMESTAMP_FONT = `900 30px ${FONT_FAMILY}`;
const DEEP_GREEN = '#0B3D24';
const YELLOW = '#F6BE19';
const WHITE = '#FFFFFF';
const BLACK = '#050505';
const TEXT_STROKE_WIDTH = 1;
const PHOTO_BOX = { x: 50, y: 470, width: 924, height: 618, radius: 30 };
const NUMBER_BOX = { x: 735, y: 51, width: 232, height: 78, radius: 39 };
const SPECIES_NAME_BOX = { x: 250, y: 1116, width: 340, height: 54 };
const INTRO_BOX = { x: 145, y: 1210, width: 480, lineHeight: 52, maxLines: 3 };
const QR_BOX = { x: 736, y: 1179, size: 196 };
const QR_BACKGROUND_BOX = { x: 724, y: 1167, size: 220, radius: 8 };
const TIMESTAMP_BOX = { x: 162, y: 1418, width: 345, height: 78 };

const speciesIntroById: Record<string, string> = {
  dog: '家犬与人类共同生活时间很长，常在院子、街角和店门口活动，是城市日常里最容易遇见的伙伴。',
  cat: '家猫常在街区、寺庙和咖啡店附近活动，行动安静，也很会选择安全的栖身角落。',
  'tokay-gecko': '大壁虎多见于东南亚夜间环境，常在墙面和屋檐附近捕食昆虫。',
  bird: '鸟类会用鸣叫、飞行和觅食路线标记城市空间，是最容易被观察到的野外邻居之一。',
  butterfly: '蝴蝶常出现在花丛和湿润绿地附近，翅膀颜色和飞行路径都能帮助识别种类。',
  fish: '鱼类生活在水体环境中，体色、体型和游动方式常能提供识别线索。',
  snake: '蛇类多在草丛、墙边或湿润阴影处活动，遇到时保持距离观察更安全。',
  frog: '蛙类通常和潮湿环境相关，雨后或夜间更容易通过叫声和体型被发现。',
  insect: '昆虫是城市生态里数量最多的成员之一，常能反映周边植物和微环境状态。',
  squirrel: '松鼠常在树冠、屋檐和电线附近移动，观察时可以留意它的跳跃路线和取食行为。',
};

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 42) || 'wild-animal';

const getAbsoluteAssetUrl = (url: string) => {
  if (/^https?:\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return new URL(url, window.location.origin).toString();
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Cannot load image: ${src}`));
    image.src = getAbsoluteAssetUrl(src);
  });

const loadImageFromFile = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const drawRoundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sourceHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.save();
  drawRoundRect(context, x, y, width, height, 30);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('动物分享卡生成失败'));
    }, 'image/png');
  });

const formatDateTime = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: string) => parts.find(part => part.type === type)?.value ?? '';

  return `${getPart('year')}.${getPart('month')}.${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
};

const drawCenteredText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  font: string,
  fillStyle: string
) => {
  context.save();
  context.font = font;
  context.fillStyle = fillStyle;
  context.strokeStyle = fillStyle;
  context.lineJoin = 'round';
  context.lineWidth = TEXT_STROKE_WIDTH;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(text, x + width / 2, y + height / 2 + 1);
  context.fillText(text, x + width / 2, y + height / 2 + 1);
  context.restore();
};

const drawNumberPill = (
  context: CanvasRenderingContext2D,
  text: string
) => {
  context.save();
  drawRoundRect(
    context,
    NUMBER_BOX.x,
    NUMBER_BOX.y,
    NUMBER_BOX.width,
    NUMBER_BOX.height,
    NUMBER_BOX.radius
  );
  context.fillStyle = YELLOW;
  context.fill();
  context.lineWidth = 7;
  context.strokeStyle = DEEP_GREEN;
  context.stroke();
  context.restore();

  drawCenteredText(
    context,
    text,
    NUMBER_BOX.x,
    NUMBER_BOX.y,
    NUMBER_BOX.width,
    NUMBER_BOX.height,
    NUMBER_FONT,
    BLACK
  );
};

const drawFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  maxFontSize: number,
  minFontSize: number,
  color: string
) => {
  let fontSize = maxFontSize;
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineJoin = 'round';
  context.lineWidth = TEXT_STROKE_WIDTH;

  while (fontSize > minFontSize) {
    context.font = `900 ${fontSize}px ${FONT_FAMILY}`;
    if (context.measureText(text).width <= width) break;
    fontSize -= 1;
  }

  context.font = `900 ${fontSize}px ${FONT_FAMILY}`;
  context.strokeText(text, x + width / 2, y);
  context.fillText(text, x + width / 2, y);
  context.restore();
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) => {
  const chars = [...text.trim()];
  const lines: string[] = [];
  let currentLine = '';

  for (const char of chars) {
    const nextLine = `${currentLine}${char}`;
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = char;
    if (lines.length === maxLines) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  if (lines.length === maxLines && chars.join('').length > lines.join('').length) {
    let lastLine = lines[maxLines - 1];
    while (lastLine.length > 0 && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[maxLines - 1] = `${lastLine}…`;
  }

  lines.forEach((line, index) => {
    context.strokeText(line, x, y + index * lineHeight);
    context.fillText(line, x, y + index * lineHeight);
  });
};

const getIntro = (candidate: AnimalIdentificationCandidate) =>
  candidate.introZh?.trim() ||
  speciesIntroById[candidate.id] ||
  getAnimalIntro(candidate) ||
  '这是一条来自本次图像识别的动物记录。可以结合照片、地点和观察描述继续补充。';

export const createCmiWildAnimalShareCard = async ({
  photoFile,
  candidate,
  recommendation,
  captureNumber,
}: CmiWildAnimalShareCardInput): Promise<CmiWildAnimalShareCardResult> => {
  const [templateImage, photoImage, qrImage] = await Promise.all([
    loadImage(TEMPLATE_URL),
    loadImageFromFile(photoFile),
    QRCode.toDataURL(getPublicCmiEventUrl(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID), {
      margin: 1,
      width: 360,
      color: {
        dark: BLACK,
        light: WHITE,
      },
    }).then(loadImage),
  ]);
  const chineseName = getAnimalChineseName(candidate);
  const captureNumberLabel = captureNumber ? `NO. ${String(captureNumber).padStart(3, '0')}` : 'NO. --';
  const timestamp = formatDateTime(recommendation.created_at);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成动物分享卡');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  drawImageCover(context, photoImage, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.width, PHOTO_BOX.height);
  context.drawImage(templateImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawNumberPill(context, captureNumberLabel);

  drawFittedText(
    context,
    chineseName,
    SPECIES_NAME_BOX.x,
    SPECIES_NAME_BOX.y + SPECIES_NAME_BOX.height / 2 + 1,
    SPECIES_NAME_BOX.width - 28,
    42,
    22,
    DEEP_GREEN
  );

  context.save();
  context.font = INTRO_FONT;
  context.fillStyle = DEEP_GREEN;
  context.strokeStyle = DEEP_GREEN;
  context.lineJoin = 'round';
  context.lineWidth = TEXT_STROKE_WIDTH;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  drawWrappedText(
    context,
    getIntro(candidate),
    INTRO_BOX.x,
    INTRO_BOX.y,
    INTRO_BOX.width,
    INTRO_BOX.lineHeight,
    INTRO_BOX.maxLines
  );
  context.restore();

  drawCenteredText(
    context,
    timestamp,
    TIMESTAMP_BOX.x,
    TIMESTAMP_BOX.y,
    TIMESTAMP_BOX.width,
    TIMESTAMP_BOX.height,
    TIMESTAMP_FONT,
    DEEP_GREEN
  );

  context.fillStyle = WHITE;
  drawRoundRect(
    context,
    QR_BACKGROUND_BOX.x,
    QR_BACKGROUND_BOX.y,
    QR_BACKGROUND_BOX.size,
    QR_BACKGROUND_BOX.size,
    QR_BACKGROUND_BOX.radius
  );
  context.fill();
  context.drawImage(qrImage, QR_BOX.x, QR_BOX.y, QR_BOX.size, QR_BOX.size);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-map-${sanitizeFileName(chineseName)}-${captureNumber || Date.now()}.png`,
  };
};

export const downloadCmiWildAnimalShareCard = (card: CmiWildAnimalShareCardResult) => {
  const downloadUrl = URL.createObjectURL(card.blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = card.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
};
