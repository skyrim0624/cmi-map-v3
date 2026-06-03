import QRCode from 'qrcode';
import type { CmiMapTheme } from '@/features/themes/cmi-themes';
import type { Recommendation } from '@/types/types';

export interface CmiThemeShareCardInput {
  theme: CmiMapTheme;
  recommendation: Recommendation;
  authorName: string;
  themeUrl: string;
}

export interface CmiThemeShareCardResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 1500;
const FONT_FAMILY = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const PHOTO_FALLBACK_URL = '/map-icons/cmi-flat-v2/place-nature.png';

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 42) || 'cmi-theme';

const getThemeColor = (theme: CmiMapTheme, key: 'primaryColor' | 'accentColor', fallback: string) => {
  const value = theme.theme_config?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
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

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('主题分享卡生成失败'));
      }
    }, 'image/png');
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

  if (currentLine && lines.length < maxLines) lines.push(currentLine.trim());
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
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

export const createCmiThemeShareCard = async ({
  theme,
  recommendation,
  authorName,
  themeUrl,
}: CmiThemeShareCardInput): Promise<CmiThemeShareCardResult> => {
  const primaryColor = getThemeColor(theme, 'primaryColor', '#4f8f5b');
  const accentColor = getThemeColor(theme, 'accentColor', '#f1c64c');
  const photoUrl = recommendation.images[0] || theme.cover_image_url || PHOTO_FALLBACK_URL;
  const qrDataUrl = await QRCode.toDataURL(themeUrl, {
    margin: 1,
    width: 230,
    color: {
      dark: '#222222',
      light: '#ffffff',
    },
  });
  const [photoImage, qrImage] = await Promise.all([
    loadImage(photoUrl),
    loadImage(qrDataUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成主题分享卡');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  context.fillStyle = '#fffaf0';
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.fillStyle = primaryColor;
  context.fillRect(0, 0, CARD_WIDTH, 118);
  context.fillStyle = accentColor;
  context.fillRect(0, 118, CARD_WIDTH, 18);

  drawRoundRect(context, 72, 190, 1056, 790, 42);
  context.save();
  context.clip();
  drawImageCover(context, photoImage, 72, 190, 1056, 790);
  context.restore();

  context.lineWidth = 8;
  context.strokeStyle = primaryColor;
  drawRoundRect(context, 72, 190, 1056, 790, 42);
  context.stroke();

  context.fillStyle = '#222222';
  context.font = `950 62px ${FONT_FAMILY}`;
  drawWrappedText(context, theme.title, 84, 1058, 760, 76, 2);

  context.font = `900 42px ${FONT_FAMILY}`;
  drawWrappedText(context, recommendation.place_name, 84, 1216, 680, 52, 2);

  context.fillStyle = '#6d6a62';
  context.font = `800 30px ${FONT_FAMILY}`;
  drawWrappedText(context, authorName, 84, 1344, 540, 38, 1);

  drawRoundRect(context, 848, 1062, 238, 238, 26);
  context.fillStyle = '#ffffff';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = '#e0ddd3';
  context.stroke();
  context.drawImage(qrImage, 862, 1076, 210, 210);

  context.fillStyle = '#222222';
  context.font = `950 38px ${FONT_FAMILY}`;
  context.fillText('CMI Map', 84, 84);

  context.fillStyle = primaryColor;
  drawRoundRect(context, 84, 1404, 252, 54, 27);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `900 25px ${FONT_FAMILY}`;
  context.fillText('主题地图', 112, 1439);

  context.fillStyle = '#777169';
  context.font = `700 22px ${FONT_FAMILY}`;
  drawWrappedText(context, themeUrl, 382, 1438, 704, 30, 1);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-theme-${sanitizeFileName(theme.title)}-${sanitizeFileName(recommendation.place_name)}.png`,
  };
};
