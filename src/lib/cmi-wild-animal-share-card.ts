import QRCode from 'qrcode';
import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getPublicCmiEventUrl } from '@/lib/paths';
import {
  type AnimalIdentificationCandidate,
  getAnimalChineseName,
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

const TEMPLATE_URL = '/cmi-home/share-card-templates/wild-chiang-mai-template-v1.png';
const CARD_WIDTH = 1024;
const CARD_HEIGHT = 1536;
const FONT_FAMILY = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const INTRO_FONT = `800 29px ${FONT_FAMILY}`;
const NUMBER_FONT = `900 30px ${FONT_FAMILY}`;
const TIMESTAMP_FONT = `900 28px ${FONT_FAMILY}`;
const SLOGAN_FONT = `900 27px ${FONT_FAMILY}`;
const DEEP_GREEN = '#0B3D24';
const QUIET_GREEN = 'rgba(11, 61, 36, 0.72)';
const CREAM = '#FFF4D8';
const WHITE = '#FFFFFF';
const BLACK = '#050505';
const PHOTO_BOX = { x: 58, y: 374, width: 908, height: 648, radius: 28 };
const PHOTO_DECORATION_PATCHES = [
  { x: 782, y: 300, width: 190, height: 120 },
  { x: 0, y: 840, width: 245, height: 220 },
  { x: 652, y: 914, width: 314, height: 152 },
  { x: 900, y: 828, width: 124, height: 158 },
] as const;
const NUMBER_BOX = { x: 724, y: 48, width: 226, height: 58 };
const SPECIES_NAME_BOX = { x: 82, y: 1098, width: 365, height: 54 };
const INTRO_BOX = { x: 92, y: 1180, width: 492, lineHeight: 38, maxLines: 4 };
const PAW_STAMP_COVER = { x: 616, y: 1092, width: 360, height: 292, radius: 30 };
const QR_BACKING_BOX = { x: 714, y: 1118, size: 238, radius: 26 };
const QR_BOX = { x: 734, y: 1138, size: 198 };
const BOTTOM_LEFT_COVER = { x: 104, y: 1400, width: 420, height: 62, radius: 18 };
const BOTTOM_CENTER_COVER = { x: 590, y: 1392, width: 228, height: 82, radius: 20 };
const BOTTOM_RIGHT_COVER = { x: 812, y: 1362, width: 166, height: 146, radius: 22 };
const QR_SLOGAN_BOX = { x: 708, y: 1404, width: 262, height: 44, radius: 18 };
const QR_SLOGAN_TEXT = '扫码探索万物';

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

const drawTemplateDecorationPatches = (
  context: CanvasRenderingContext2D,
  templateImage: HTMLImageElement
) => {
  for (const patch of PHOTO_DECORATION_PATCHES) {
    context.drawImage(
      templateImage,
      patch.x,
      patch.y,
      patch.width,
      patch.height,
      patch.x,
      patch.y,
      patch.width,
      patch.height
    );
  }
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
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x + width / 2, y + height / 2 + 1);
  context.restore();
};

const drawPanelCover = (context: CanvasRenderingContext2D) => {
  context.save();
  drawRoundRect(
    context,
    PAW_STAMP_COVER.x,
    PAW_STAMP_COVER.y,
    PAW_STAMP_COVER.width,
    PAW_STAMP_COVER.height,
    PAW_STAMP_COVER.radius
  );
  const gradient = context.createLinearGradient(
    PAW_STAMP_COVER.x,
    PAW_STAMP_COVER.y,
    PAW_STAMP_COVER.x + PAW_STAMP_COVER.width,
    PAW_STAMP_COVER.y + PAW_STAMP_COVER.height
  );
  gradient.addColorStop(0, '#004226');
  gradient.addColorStop(1, '#006139');
  context.fillStyle = gradient;
  context.fill();
  context.restore();
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

  while (fontSize > minFontSize) {
    context.font = `900 ${fontSize}px ${FONT_FAMILY}`;
    if (context.measureText(text).width <= width) break;
    fontSize -= 1;
  }

  context.font = `900 ${fontSize}px ${FONT_FAMILY}`;
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
    context.fillText(line, x, y + index * lineHeight);
  });
};

const getIntro = (candidate: AnimalIdentificationCandidate) =>
  speciesIntroById[candidate.id] ?? '这是一条来自本次图像识别的动物记录。可以结合照片、地点和观察描述继续补充。';

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

  context.drawImage(templateImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawImageCover(context, photoImage, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.width, PHOTO_BOX.height);
  drawTemplateDecorationPatches(context, templateImage);
  context.lineWidth = 5;
  context.strokeStyle = BLACK;
  drawRoundRect(context, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.width, PHOTO_BOX.height, PHOTO_BOX.radius);
  context.stroke();

  drawCenteredText(context, captureNumberLabel, NUMBER_BOX.x, NUMBER_BOX.y, NUMBER_BOX.width, NUMBER_BOX.height, NUMBER_FONT, BLACK);

  drawFittedText(
    context,
    chineseName,
    SPECIES_NAME_BOX.x,
    SPECIES_NAME_BOX.y + SPECIES_NAME_BOX.height / 2 + 1,
    SPECIES_NAME_BOX.width - 28,
    34,
    22,
    DEEP_GREEN
  );

  context.save();
  context.font = INTRO_FONT;
  context.fillStyle = CREAM;
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

  drawPanelCover(context);

  [
    BOTTOM_LEFT_COVER,
    BOTTOM_CENTER_COVER,
    BOTTOM_RIGHT_COVER,
  ].forEach(box => {
    context.save();
    drawRoundRect(context, box.x, box.y, box.width, box.height, box.radius);
    context.fillStyle = CREAM;
    context.fill();
    context.restore();
  });

  drawCenteredText(
    context,
    timestamp,
    BOTTOM_LEFT_COVER.x,
    BOTTOM_LEFT_COVER.y,
    BOTTOM_LEFT_COVER.width,
    BOTTOM_LEFT_COVER.height,
    TIMESTAMP_FONT,
    DEEP_GREEN
  );

  drawRoundRect(
    context,
    QR_BACKING_BOX.x,
    QR_BACKING_BOX.y,
    QR_BACKING_BOX.size,
    QR_BACKING_BOX.size,
    QR_BACKING_BOX.radius
  );
  context.fillStyle = WHITE;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = QUIET_GREEN;
  context.stroke();
  context.drawImage(qrImage, QR_BOX.x, QR_BOX.y, QR_BOX.size, QR_BOX.size);

  drawRoundRect(
    context,
    QR_SLOGAN_BOX.x,
    QR_SLOGAN_BOX.y,
    QR_SLOGAN_BOX.width,
    QR_SLOGAN_BOX.height,
    QR_SLOGAN_BOX.radius
  );
  context.fillStyle = CREAM;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = QUIET_GREEN;
  context.stroke();
  drawCenteredText(
    context,
    QR_SLOGAN_TEXT,
    QR_SLOGAN_BOX.x,
    QR_SLOGAN_BOX.y,
    QR_SLOGAN_BOX.width,
    QR_SLOGAN_BOX.height,
    SLOGAN_FONT,
    DEEP_GREEN
  );

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
