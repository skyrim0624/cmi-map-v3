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
  wrapText(context, text, maxWidth, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
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
  width: number
) => {
  context.fillStyle = 'rgba(0, 0, 0, 0.48)';
  context.font = `900 24px ${FONT_FAMILY}`;
  context.fillText(label, x, y);

  context.fillStyle = '#050505';
  context.font = `900 34px ${FONT_FAMILY}`;
  drawWrappedText(context, value, x, y + 46, width, 40, 2);
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

  const posterHeight = Math.round(POSTER_WIDTH * (posterImage.naturalHeight / posterImage.naturalWidth));
  const headerHeight = 150;
  const copyHeight = 178;
  const footerHeight = 196;
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

  const contentX = 80;
  const contentWidth = CARD_WIDTH - contentX * 2;

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
  context.fillStyle = '#ffffff';
  context.font = `1000 52px ${FONT_FAMILY}`;
  drawWrappedText(context, event.title, contentX + 38, copyY + 66, contentWidth - 76, 58, 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.font = `850 30px ${FONT_FAMILY}`;
  drawWrappedText(context, event.summary, contentX + 38, copyY + 132, contentWidth - 76, 40, 2);

  drawRoundRect(context, contentX, footerY, 730, footerHeight, 28);
  context.fillStyle = 'rgba(172, 131, 255, 0.52)';
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  context.stroke();

  drawInfoCell(context, '时间', formatCmiEventTime(event, referenceDate), contentX + 28, footerY + 46, 314);
  drawInfoCell(context, '地点', event.venueName, contentX + 394, footerY + 46, 270);
  drawInfoCell(context, '费用', event.priceLabel, contentX + 28, footerY + 128, 314);
  drawInfoCell(context, '参与', event.registrationLabel, contentX + 394, footerY + 128, 270);

  drawRoundRect(context, 842, footerY, 238, footerHeight, 28);
  context.fillStyle = 'rgba(172, 131, 255, 0.52)';
  context.fill();
  context.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  context.lineWidth = 3;
  context.stroke();

  drawRoundRect(context, 874, footerY + 18, 174, 174, 18);
  context.fillStyle = '#ffffff';
  context.fill();
  context.drawImage(qrImage, 884, footerY + 28, 154, 154);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-map-event-${sanitizeFileName(event.title)}.png`,
  };
};
