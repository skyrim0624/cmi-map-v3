import {
  formatCmiEventTime,
  getCmiEventTypeLabel,
  type CmiEvent,
} from '@/data/cmi-events';

export interface CmiEventShareCardInput {
  event: CmiEvent;
  posterUrl: string;
  referenceDate: Date;
  officialQrUrl?: string;
}

export interface CmiEventShareCardResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

const CARD_WIDTH = 1200;
const CARD_PADDING = 64;
const POSTER_WIDTH = 1040;
const POSTER_RADIUS = 38;
const FONT_FAMILY = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const OFFICIAL_QR_URL = '/cmi-home/qr-cmi-official.jpg';
const TITLE_FONT = `1000 48px ${FONT_FAMILY}`;
const TITLE_LINE_HEIGHT = 58;
const SUMMARY_FONT = `850 30px ${FONT_FAMILY}`;
const SUMMARY_LINE_HEIGHT = 42;

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

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Cannot load image: ${src}`));
    image.src = getAbsoluteAssetUrl(src);
  });

const getAbsoluteAssetUrl = (url: string) => {
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url;
  return new URL(url, window.location.origin).toString();
};

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

const drawCardBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#9a72f2');
  gradient.addColorStop(0.52, '#8f66ee');
  gradient.addColorStop(1, '#8359e5');
  context.fillStyle = gradient;
  drawRoundRect(context, 26, 26, width - 52, height - 52, 56);
  context.fill();

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = '#050505';
  for (let x = 48; x < width - 48; x += 22) {
    for (let y = 48; y < height - 48; y += 22) {
      context.beginPath();
      context.arc(x, y, 1.4, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();

  context.lineWidth = 7;
  context.strokeStyle = '#050505';
  drawRoundRect(context, 26, 26, width - 52, height - 52, 56);
  context.stroke();
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

const drawInfoCell = (
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  options: {
    valueFontSize?: number;
    lineHeight?: number;
    maxLines?: number;
  } = {}
) => {
  const {
    valueFontSize = 32,
    lineHeight = 38,
    maxLines = 2,
  } = options;

  context.fillStyle = 'rgba(0, 0, 0, 0.48)';
  context.font = `900 23px ${FONT_FAMILY}`;
  context.fillText(label, x, y);

  context.fillStyle = '#050505';
  context.font = `900 ${valueFontSize}px ${FONT_FAMILY}`;
  drawWrappedText(context, value, x, y + 44, width, lineHeight, maxLines);
};

export const createCmiEventShareCard = async ({
  event,
  posterUrl,
  referenceDate,
  officialQrUrl = OFFICIAL_QR_URL,
}: CmiEventShareCardInput): Promise<CmiEventShareCardResult> => {
  const [posterImage, qrImage] = await Promise.all([
    loadImage(posterUrl),
    loadImage(officialQrUrl),
  ]);

  const contentX = 80;
  const contentWidth = CARD_WIDTH - contentX * 2;
  const textInset = 40;
  const textMaxWidth = contentWidth - textInset * 2;
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (!measureContext) throw new Error('当前浏览器不支持生成活动卡片');
  measureContext.font = TITLE_FONT;
  const titleLines = wrapText(measureContext, event.title, textMaxWidth, 2);
  measureContext.font = SUMMARY_FONT;
  const summaryLines = wrapText(measureContext, event.summary, textMaxWidth, 2);

  const posterHeight = Math.round(POSTER_WIDTH * (posterImage.naturalHeight / posterImage.naturalWidth));
  const headerHeight = 150;
  const copyHeight =
    44 +
    titleLines.length * TITLE_LINE_HEIGHT +
    22 +
    summaryLines.length * SUMMARY_LINE_HEIGHT +
    40;
  const footerHeight = 324;
  const posterY = CARD_PADDING + headerHeight + 24;
  const copyY = posterY + posterHeight + 28;
  const footerY = copyY + copyHeight + 26;
  const cardHeight = footerY + footerHeight + CARD_PADDING;

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

  context.fillStyle = '#050505';
  context.font = `1000 78px ${FONT_FAMILY}`;
  context.fillText('CMI Map', contentX, 130);

  context.fillStyle = 'rgba(0, 0, 0, 0.56)';
  context.font = `900 28px ${FONT_FAMILY}`;
  context.fillText('清迈活动和好去处，都在这里', contentX, 172);

  drawRoundRect(context, 832, 76, 250, 72, 36);
  context.fillStyle = '#050505';
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `900 30px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(getCmiEventTypeLabel(event.type), 957, 112);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  drawPoster(context, posterImage, contentX, posterY, POSTER_WIDTH, posterHeight);

  drawRoundRect(context, contentX, copyY, contentWidth, copyHeight, 34);
  context.fillStyle = 'rgba(5, 5, 5, 0.86)';
  context.fill();

  const titleStartY = copyY + 66;
  context.fillStyle = '#ffffff';
  context.font = TITLE_FONT;
  titleLines.forEach((line, index) => {
    context.fillText(line, contentX + textInset, titleStartY + index * TITLE_LINE_HEIGHT);
  });

  const summaryStartY = titleStartY + titleLines.length * TITLE_LINE_HEIGHT + 22;
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.font = SUMMARY_FONT;
  summaryLines.forEach((line, index) => {
    context.fillText(line, contentX + textInset, summaryStartY + index * SUMMARY_LINE_HEIGHT);
  });

  drawRoundRect(context, contentX, footerY, contentWidth, footerHeight, 34);
  context.fillStyle = 'rgba(172, 131, 255, 0.52)';
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  context.stroke();

  context.save();
  context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();
  context.moveTo(contentX + 394, footerY + 36);
  context.lineTo(contentX + 394, footerY + footerHeight - 36);
  context.moveTo(contentX + 28, footerY + 160);
  context.lineTo(contentX + 750, footerY + 160);
  context.stroke();
  context.restore();

  drawInfoCell(context, '时间', formatCmiEventTime(event, referenceDate), contentX + 30, footerY + 56, 320);
  drawInfoCell(context, '地点', event.venueName, contentX + 430, footerY + 56, 290);
  drawInfoCell(context, '费用', event.priceLabel, contentX + 30, footerY + 198, 320, {
    maxLines: 3,
  });
  drawInfoCell(context, '参与', event.registrationLabel, contentX + 430, footerY + 198, 290, {
    valueFontSize: 29,
    lineHeight: 35,
    maxLines: 3,
  });

  const qrPanelX = contentX + 790;
  const qrPanelY = footerY + 24;
  const qrPanelWidth = 222;
  const qrPanelHeight = footerHeight - 48;
  drawRoundRect(context, qrPanelX, qrPanelY, qrPanelWidth, qrPanelHeight, 28);
  context.fillStyle = 'rgba(255, 255, 255, 0.22)';
  context.fill();
  context.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = '#050505';
  context.font = `900 26px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.fillText('扫码关注', qrPanelX + qrPanelWidth / 2, qrPanelY + 44);

  drawRoundRect(context, qrPanelX + 24, qrPanelY + 62, 174, 174, 18);
  context.fillStyle = '#ffffff';
  context.fill();
  context.drawImage(qrImage, qrPanelX + 34, qrPanelY + 72, 154, 154);

  context.fillStyle = 'rgba(0, 0, 0, 0.68)';
  context.font = `850 20px ${FONT_FAMILY}`;
  context.fillText('CMI 清迈客栈公众号', qrPanelX + qrPanelWidth / 2, qrPanelY + 256);
  context.textAlign = 'left';

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-map-event-${sanitizeFileName(event.title)}.png`,
  };
};
