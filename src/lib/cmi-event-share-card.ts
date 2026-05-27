import { formatCmiEventTime, type CmiEvent } from '@/data/cmi-events';
import QRCode from 'qrcode';

export interface CmiEventShareCardInput {
  event: CmiEvent;
  posterUrl: string;
  referenceDate: Date;
  mapQrUrl?: string;
  eventPageUrl?: string;
  registrationCount?: number;
}

export interface CmiEventShareCardResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

const CARD_WIDTH = 1200;
const OUTER_RADIUS = 56;
const CONTENT_X = 80;
const CONTENT_WIDTH = CARD_WIDTH - CONTENT_X * 2;
const CARD_PADDING_TOP = 64;
const CARD_PADDING_BOTTOM = 64;
const POSTER_WIDTH = CONTENT_WIDTH;
const POSTER_RADIUS = 38;
const MODULE_GAP = 28;
const FONT_FAMILY = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const MAP_QR_URL = '/cmi-home/qr-cmi-map-root.png';
const SLOGAN_ART_URL = '/cmi-home/cmi-map-slogan-handwritten.png';
const MAP_URL_LABEL = '扫码报名参加';
const INTRO_FONT = `1000 54px ${FONT_FAMILY}`;
const INTRO_LINE_HEIGHT = 68;
const FACT_LABEL_FONT = `950 32px ${FONT_FAMILY}`;
const FACT_VALUE_FONT = `1000 50px ${FONT_FAMILY}`;
const FACT_VALUE_LINE_HEIGHT = 56;
const FACT_ROW_START_Y = 110;
const FACT_ROW_STEP_Y = 84;
const QR_SIZE = 238;
const HEADER_HEIGHT = 270;

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 42) || 'cmi-event';

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

const getAbsoluteAssetUrl = (url: string) => {
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url;
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

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lines: string[] = [];
  let currentLine = '';

  for (const character of Array.from(cleanText)) {
    const nextLine = currentLine + character;
    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine.trim());
      currentLine = character.trimStart();
      if (lines.length >= maxLines) break;
      continue;
    }
    currentLine = nextLine;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine.trim());
  }

  if (lines.length === maxLines && cleanText.length > lines.join('').length) {
    let lastLine = lines[maxLines - 1];
    while (context.measureText(`${lastLine}…`).width > maxWidth && lastLine.length > 0) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[maxLines - 1] = `${lastLine}…`;
  }

  return lines;
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
  const lines = wrapText(context, text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return lines;
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('活动卡片生成失败'));
      }
    }, 'image/png');
  });

const getCompactPriceLabel = (priceLabel: string) => {
  const normalized = priceLabel.replace(/\s+/g, ' ').trim();
  if (!normalized) return '费用待定';
  if (normalized.includes('免费') && normalized.includes('随喜')) return '免费/随喜';
  if (normalized.includes('免费')) return '免费';
  if (normalized.includes('带一道菜') || normalized.includes('带菜')) return '带菜分享';
  return normalized.replace(/^场地费\s*/, '').replace(/^费用\s*/, '');
};

const formatRegistrationCount = (registrationCount: number | undefined) => {
  if (!Number.isFinite(registrationCount)) return '0 人已报名';
  const count = Math.max(Math.floor(registrationCount), 0);
  return `${count} 人已报名`;
};

const normalizeUrl = (url: string) => {
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
};

const createDynamicQrImage = async (url: string) => {
  const dataUrl = await QRCode.toDataURL(normalizeUrl(url), {
    type: 'image/png',
    margin: 1,
    width: 520,
    color: {
      dark: '#050505',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return loadImage(dataUrl);
};

const drawCardBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#9b74f4');
  gradient.addColorStop(0.5, '#8b61ee');
  gradient.addColorStop(1, '#8359e7');
  context.fillStyle = gradient;
  drawRoundRect(context, 26, 26, width - 52, height - 52, OUTER_RADIUS);
  context.fill();

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = '#050505';
  for (let x = 48; x < width - 48; x += 24) {
    for (let y = 48; y < height - 48; y += 24) {
      context.beginPath();
      context.arc(x, y, 1.4, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();

  context.lineWidth = 7;
  context.strokeStyle = '#050505';
  drawRoundRect(context, 26, 26, width - 52, height - 52, OUTER_RADIUS);
  context.stroke();
};

const drawHeader = (context: CanvasRenderingContext2D, sloganImage: HTMLImageElement) => {
  context.fillStyle = '#050505';
  context.font = `1000 86px ${FONT_FAMILY}`;
  context.fillText('CMI Map', CONTENT_X, 130);

  const sloganWidth = 880;
  const sloganHeight = Math.round(sloganWidth * (sloganImage.naturalHeight / sloganImage.naturalWidth));
  context.drawImage(sloganImage, CONTENT_X - 6, 172, sloganWidth, sloganHeight);
};

const drawPoster = (
  context: CanvasRenderingContext2D,
  poster: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  context.save();
  drawRoundRect(context, x, y, width, height, POSTER_RADIUS);
  context.clip();
  context.drawImage(poster, x, y, width, height);
  context.restore();

  context.lineWidth = 6;
  context.strokeStyle = '#050505';
  drawRoundRect(context, x, y, width, height, POSTER_RADIUS);
  context.stroke();
};

const drawIntroCard = (
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  width: number,
  height: number
) => {
  drawRoundRect(context, x, y, width, height, 34);
  context.fillStyle = '#160f25';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = '#050505';
  context.stroke();

  context.shadowColor = 'rgba(0, 0, 0, 0.26)';
  context.shadowOffsetY = 8;
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.font = INTRO_FONT;
  lines.forEach((line, index) => {
    context.fillText(line, x + 48, y + 88 + index * INTRO_LINE_HEIGHT);
  });
  context.shadowColor = 'transparent';
};

const drawFactRow = (
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
  maxWidth: number
) => {
  context.fillStyle = 'rgba(5, 5, 5, 0.5)';
  context.font = FACT_LABEL_FONT;
  context.fillText(label, CONTENT_X + 38, y);

  context.fillStyle = '#050505';
  context.font = FACT_VALUE_FONT;
  drawWrappedText(context, value, CONTENT_X + 190, y, maxWidth, FACT_VALUE_LINE_HEIGHT, 1);
};

const drawFooter = (
  context: CanvasRenderingContext2D,
  event: CmiEvent,
  qrImage: HTMLImageElement,
  y: number,
  height: number,
  referenceDate: Date,
  registrationCount?: number
) => {
  drawRoundRect(context, CONTENT_X, y, CONTENT_WIDTH, height, 34);
  context.fillStyle = 'rgba(255, 247, 223, 0.2)';
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  context.stroke();

  const dividerX = CONTENT_X + 704;
  context.save();
  context.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  context.lineWidth = 3;
  context.setLineDash([9, 12]);
  context.beginPath();
  context.moveTo(dividerX, y + 38);
  context.lineTo(dividerX, y + height - 38);
  context.stroke();
  context.restore();

  const factMaxWidth = dividerX - (CONTENT_X + 190) - 36;
  const factRows: Array<[string, string]> = [
    ['时间', formatCmiEventTime(event, referenceDate)],
    ['地点', event.venueName],
    ['费用', getCompactPriceLabel(event.priceLabel)],
  ];

  if (typeof registrationCount === 'number') {
    factRows.push(['报名', formatRegistrationCount(registrationCount)]);
  }

  factRows.forEach((row, index) => {
    drawFactRow(context, row[0], row[1], y + FACT_ROW_START_Y + index * FACT_ROW_STEP_Y, factMaxWidth);
  });

  const qrX = CONTENT_X + CONTENT_WIDTH - 72 - QR_SIZE;
  const qrY = y + 38;
  drawRoundRect(context, qrX, qrY, QR_SIZE, QR_SIZE, 18);
  context.fillStyle = '#ffffff';
  context.fill();
  context.drawImage(qrImage, qrX + 8, qrY + 8, QR_SIZE - 16, QR_SIZE - 16);

  context.fillStyle = 'rgba(5, 5, 5, 0.72)';
  context.font = `950 34px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.fillText(MAP_URL_LABEL, qrX + QR_SIZE / 2, y + height - 40);
  context.textAlign = 'left';
};

export const createCmiEventShareCard = async ({
  event,
  posterUrl,
  referenceDate,
  mapQrUrl = MAP_QR_URL,
  eventPageUrl,
  registrationCount,
}: CmiEventShareCardInput): Promise<CmiEventShareCardResult> => {
  const qrImagePromise = (async () => {
    if (!eventPageUrl) return loadImage(mapQrUrl);
    try {
      return await createDynamicQrImage(eventPageUrl);
    } catch (error) {
      console.error('活动分享二维码生成失败，使用默认二维码 fallback:', error);
      return loadImage(mapQrUrl);
    }
  })();

  const [posterImage, qrImage, sloganImage] = await Promise.all([
    loadImage(posterUrl),
    qrImagePromise,
    loadImage(SLOGAN_ART_URL),
  ]);

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (!measureContext) throw new Error('当前浏览器不支持生成活动卡片');

  const introMaxWidth = CONTENT_WIDTH - 96;
  measureContext.font = INTRO_FONT;
  const introLines = wrapText(measureContext, event.summary || event.title, introMaxWidth, 4);

  const posterHeight = Math.round(POSTER_WIDTH * (posterImage.naturalHeight / posterImage.naturalWidth));
  const posterY = CARD_PADDING_TOP + HEADER_HEIGHT;
  const introY = posterY + posterHeight + MODULE_GAP;
  const introHeight = 118 + introLines.length * INTRO_LINE_HEIGHT;
  const footerHeight = 352 + Math.max(factRowsCount(registrationCount) - 3, 0) * FACT_ROW_STEP_Y;
  const footerY = introY + introHeight + MODULE_GAP;
  const cardHeight = footerY + footerHeight + CARD_PADDING_BOTTOM;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成活动卡片');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  context.fillStyle = '#050505';
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);
  drawCardBackground(context, CARD_WIDTH, cardHeight);
  drawHeader(context, sloganImage);
  drawPoster(context, posterImage, CONTENT_X, posterY, POSTER_WIDTH, posterHeight);
  drawIntroCard(context, introLines, CONTENT_X, introY, CONTENT_WIDTH, introHeight);
  drawFooter(context, event, qrImage, footerY, footerHeight, referenceDate, registrationCount);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-map-event-${sanitizeFileName(event.title)}.png`,
  };
};

const factRowsCount = (registrationCount?: number) => {
  const baseRows = 3;
  if (typeof registrationCount !== 'number') return baseRows;

  return baseRows + 1;
};
