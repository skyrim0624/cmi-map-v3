import type { CmiEvent } from '@/data/cmi-events';

export interface CmiEventShareCardInput {
  event: CmiEvent;
  posterUrl: string;
  referenceDate: Date;
  mapQrUrl?: string;
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
const SLOGAN_FONT_FAMILY =
  '"HanziPenSC-W5", "HanziPen SC", "翩翩体-简", "HanziPen TC", "Hannotate SC", "Kaiti SC", "STKaiti", "KaiTi", "Marker Felt", cursive';
const MAP_QR_URL = '/cmi-home/qr-cmi-map-root.png';
const MAP_URL_LABEL = 'cmti.uk';
const INTRO_FONT = `1000 54px ${FONT_FAMILY}`;
const INTRO_LINE_HEIGHT = 68;
const FACT_LABEL_FONT = `950 32px ${FONT_FAMILY}`;
const FACT_VALUE_FONT = `1000 50px ${FONT_FAMILY}`;
const FACT_VALUE_LINE_HEIGHT = 56;

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

const formatShareEventTime = (event: CmiEvent) => {
  const match = event.startAt?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, , month, day, hour, minute] = match;
    return `${Number(month)}/${Number(day)} ${hour}:${minute}`;
  }

  return event.stableSchedule || event.recurrence?.label || '时间待定';
};

const getCompactPriceLabel = (priceLabel: string) => {
  const normalized = priceLabel.replace(/\s+/g, ' ').trim();
  if (!normalized) return '费用待定';
  if (normalized.includes('免费') && normalized.includes('随喜')) return '免费/随喜';
  if (normalized.includes('免费')) return '免费';
  if (normalized.includes('带一道菜') || normalized.includes('带菜')) return '带菜分享';
  return normalized.replace(/^场地费\s*/, '').replace(/^费用\s*/, '');
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

const drawHandwrittenSlogan = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) => {
  context.save();
  context.translate(x, y);
  context.rotate(-0.014);
  context.fillStyle = 'rgba(30, 24, 56, 0.88)';
  context.font = `400 58px ${SLOGAN_FONT_FAMILY}`;
  context.textBaseline = 'alphabetic';
  context.shadowColor = 'rgba(255, 227, 91, 0.22)';
  context.shadowOffsetY = 2;
  context.shadowBlur = 0;

  let cursorX = 0;
  Array.from(text).forEach((character, index) => {
    const yOffset = Math.sin(index * 0.9) * 3;
    const rotation = ((index % 5) - 2) * 0.003;
    context.save();
    context.translate(cursorX, yOffset);
    context.rotate(rotation);
    context.fillText(character, 0, 0);
    context.restore();
    cursorX += context.measureText(character).width + (character === '，' ? 2 : 1);
  });
  context.restore();
};

const drawHeader = (context: CanvasRenderingContext2D) => {
  context.fillStyle = '#050505';
  context.font = `1000 86px ${FONT_FAMILY}`;
  context.fillText('CMI Map', CONTENT_X, 130);

  drawHandwrittenSlogan(context, '清迈活动和好去处，都在这里', CONTENT_X, 202);

  context.save();
  context.strokeStyle = 'rgba(5, 5, 5, 0.58)';
  context.lineWidth = 4;
  context.setLineDash([18, 14]);
  context.beginPath();
  context.moveTo(CONTENT_X + 4, 236);
  context.bezierCurveTo(CONTENT_X + 226, 218, CONTENT_X + 512, 242, CONTENT_X + 738, 230);
  context.stroke();

  context.setLineDash([]);
  context.strokeStyle = '#ffe35b';
  context.lineWidth = 12;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(CONTENT_X, 232);
  context.bezierCurveTo(CONTENT_X + 228, 214, CONTENT_X + 512, 238, CONTENT_X + 740, 226);
  context.stroke();
  context.restore();
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
  height: number
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
  drawFactRow(context, '时间', formatShareEventTime(event), y + 110, factMaxWidth);
  drawFactRow(context, '地点', event.venueName, y + 194, factMaxWidth);
  drawFactRow(context, '费用', getCompactPriceLabel(event.priceLabel), y + 278, factMaxWidth);

  const qrSize = 238;
  const qrX = CONTENT_X + CONTENT_WIDTH - 72 - qrSize;
  const qrY = y + 38;
  drawRoundRect(context, qrX, qrY, qrSize, qrSize, 18);
  context.fillStyle = '#ffffff';
  context.fill();
  context.drawImage(qrImage, qrX + 8, qrY + 8, qrSize - 16, qrSize - 16);

  context.fillStyle = 'rgba(5, 5, 5, 0.72)';
  context.font = `950 34px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.fillText(MAP_URL_LABEL, qrX + qrSize / 2, y + height - 40);
  context.textAlign = 'left';
};

export const createCmiEventShareCard = async ({
  event,
  posterUrl,
  mapQrUrl = MAP_QR_URL,
}: CmiEventShareCardInput): Promise<CmiEventShareCardResult> => {
  const [posterImage, qrImage] = await Promise.all([
    loadImage(posterUrl),
    loadImage(mapQrUrl),
  ]);

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (!measureContext) throw new Error('当前浏览器不支持生成活动卡片');

  const introMaxWidth = CONTENT_WIDTH - 96;
  measureContext.font = INTRO_FONT;
  const introLines = wrapText(measureContext, event.summary || event.title, introMaxWidth, 4);

  const posterHeight = Math.round(POSTER_WIDTH * (posterImage.naturalHeight / posterImage.naturalWidth));
  const headerHeight = 260;
  const posterY = CARD_PADDING_TOP + headerHeight;
  const introY = posterY + posterHeight + MODULE_GAP;
  const introHeight = 118 + introLines.length * INTRO_LINE_HEIGHT;
  const footerHeight = 352;
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
  drawHeader(context);
  drawPoster(context, posterImage, CONTENT_X, posterY, POSTER_WIDTH, posterHeight);
  drawIntroCard(context, introLines, CONTENT_X, introY, CONTENT_WIDTH, introHeight);
  drawFooter(context, event, qrImage, footerY, footerHeight);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-map-event-${sanitizeFileName(event.title)}.png`,
  };
};
