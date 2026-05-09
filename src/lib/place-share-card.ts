import QRCode from 'qrcode';
import type { Category, Recommendation } from '@/types/types';
import { getCategoryIconUrl } from '@/types/types';

export interface PlaceShareCardInput {
  recommendation: Recommendation;
  title: string;
  kind: string;
  summary: string;
  tags: string[];
  sourceLabel: string;
  placeUrl: string;
}

export interface PlaceShareCardResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 1500;
const CARD_RADIUS = 46;
const FONT_FAMILY = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const DISPLAY_FONT = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';

const CATEGORY_ACCENTS: Record<Category, string> = {
  吃饭: '#f15a32',
  咖啡: '#8a5b37',
  户外: '#2f8654',
  拍照: '#1b9bd0',
  市集: '#d75d84',
  马杀鸡: '#8e6ac1',
  运动: '#e6503e',
  酒吧: '#d79a2b',
  身心: '#5aa99a',
  生存指南: '#6f7f8f',
  彩蛋: '#7b63b6',
};

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 42) || 'cmi-place';

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
    image.src = src;
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
  return y + lines.length * lineHeight;
};

const drawSpacedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) => {
  let cursorX = x;
  Array.from(text).forEach((character) => {
    context.fillText(character, cursorX, y);
    cursorX += context.measureText(character).width + spacing;
  });
};

const drawMapTexture = (context: CanvasRenderingContext2D) => {
  context.save();
  context.fillStyle = '#fbfaf5';
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.globalAlpha = 0.62;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.strokeStyle = '#dfe5e4';
  context.lineWidth = 12;
  context.beginPath();
  context.moveTo(802, -20);
  context.bezierCurveTo(730, 212, 882, 378, 784, 590);
  context.bezierCurveTo(690, 792, 742, 1048, 640, 1520);
  context.stroke();

  context.strokeStyle = '#e6e1d8';
  context.lineWidth = 5;
  const roads = [
    [[70, 248], [330, 230], [552, 308], [1090, 245]],
    [[-40, 610], [236, 578], [480, 650], [1260, 576]],
    [[112, 1200], [320, 1040], [520, 1048], [1080, 860]],
    [[168, -10], [282, 330], [256, 702], [430, 1510]],
    [[1048, 78], [960, 342], [1014, 690], [940, 1470]],
  ];

  roads.forEach(([start, controlA, controlB, end]) => {
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.bezierCurveTo(controlA[0], controlA[1], controlB[0], controlB[1], end[0], end[1]);
    context.stroke();
  });

  context.setLineDash([12, 18]);
  context.strokeStyle = '#e9b1a6';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(76, 82);
  context.bezierCurveTo(262, 128, 368, 78, 556, 130);
  context.stroke();
  context.setLineDash([]);

  context.globalAlpha = 0.5;
  context.fillStyle = '#b7bdc0';
  context.font = `500 28px ${FONT_FAMILY}`;
  context.rotate(-0.08);
  context.fillText('เชียงใหม่', 520, 548);
  context.restore();
};

const drawStickerIcon = async (
  context: CanvasRenderingContext2D,
  category: Category,
  x: number,
  y: number,
  size: number
) => {
  context.save();
  context.shadowColor = 'rgba(39, 38, 35, 0.18)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 12;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.strokeStyle = '#e8e4dc';
  context.lineWidth = 4;
  context.stroke();

  try {
    const icon = await loadImage(getAbsoluteAssetUrl(getCategoryIconUrl(category)));
    const iconSize = size * 0.62;
    context.drawImage(
      icon,
      x + (size - iconSize) / 2,
      y + (size - iconSize) / 2,
      iconSize,
      iconSize
    );
  } catch {
    context.fillStyle = CATEGORY_ACCENTS[category];
    context.font = `900 ${Math.floor(size * 0.22)}px ${FONT_FAMILY}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(category, x + size / 2, y + size / 2);
  }
  context.restore();
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('分享卡片生成失败'));
      }
    }, 'image/png');
  });

export const createPlaceShareCard = async ({
  recommendation,
  title,
  kind,
  summary,
  tags,
  sourceLabel,
  placeUrl,
}: PlaceShareCardInput): Promise<PlaceShareCardResult> => {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成分享卡片');

  const accent = CATEGORY_ACCENTS[recommendation.category] ?? '#9a82c8';
  drawMapTexture(context);

  context.save();
  context.shadowColor = 'rgba(35, 34, 31, 0.2)';
  context.shadowBlur = 0;
  context.shadowOffsetX = 18;
  context.shadowOffsetY = 18;
  context.fillStyle = '#2c2b29';
  drawRoundRect(context, 76, 106, 1048, 1288, CARD_RADIUS);
  context.fill();
  context.restore();

  drawRoundRect(context, 64, 88, 1048, 1288, CARD_RADIUS);
  context.fillStyle = '#fffefa';
  context.fill();
  context.lineWidth = 7;
  context.strokeStyle = '#2c2b29';
  context.stroke();

  context.save();
  context.fillStyle = accent;
  context.globalAlpha = 0.1;
  drawRoundRect(context, 104, 640, 968, 392, 32);
  context.fill();
  context.restore();

  context.fillStyle = '#2c2b29';
  context.font = `900 60px ${DISPLAY_FONT}`;
  context.fillText('CMI Map', 128, 190);

  context.font = `900 25px ${FONT_FAMILY}`;
  context.fillStyle = '#9a82c8';
  drawSpacedText(context, 'PLACE CARD', 128, 234, 6);

  context.save();
  context.fillStyle = accent;
  drawRoundRect(context, 760, 158, 252, 58, 29);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `900 26px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(kind || recommendation.category, 886, 187);
  context.restore();

  await drawStickerIcon(context, recommendation.category, 128, 292, 218);

  context.fillStyle = '#2c2b29';
  context.font = `900 66px ${DISPLAY_FONT}`;
  const titleEndY = drawWrappedText(context, title, 396, 334, 604, 78, 3);

  if (title !== recommendation.place_name) {
    context.font = `700 26px ${FONT_FAMILY}`;
    context.fillStyle = '#8f8d88';
    drawWrappedText(context, recommendation.place_name, 398, titleEndY + 2, 590, 34, 2);
  }

  context.fillStyle = '#2c2b29';
  context.font = `900 30px ${FONT_FAMILY}`;
  context.fillText('为什么 CMI 会留下这里', 128, 630);

  drawRoundRect(context, 128, 666, 920, 316, 30);
  context.fillStyle = '#ffffff';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = '#e5e0d8';
  context.stroke();

  context.fillStyle = '#383633';
  context.font = `700 37px ${FONT_FAMILY}`;
  drawWrappedText(context, summary, 166, 730, 840, 56, 4);

  const visibleTags = tags.slice(0, 5);
  let tagX = 128;
  let tagY = 1058;
  context.font = `900 24px ${FONT_FAMILY}`;
  visibleTags.forEach((tag) => {
    const tagWidth = Math.min(context.measureText(tag).width + 46, 280);
    if (tagX + tagWidth > 1048) {
      tagX = 128;
      tagY += 58;
    }
    drawRoundRect(context, tagX, tagY, tagWidth, 42, 21);
    context.fillStyle = '#f0ecdf';
    context.fill();
    context.fillStyle = '#575247';
    context.fillText(tag, tagX + 23, tagY + 29);
    tagX += tagWidth + 14;
  });

  const qrDataUrl = await QRCode.toDataURL(placeUrl, {
    margin: 1,
    width: 228,
    color: {
      dark: '#2c2b29',
      light: '#ffffff',
    },
  });
  const qrImage = await loadImage(qrDataUrl);

  drawRoundRect(context, 792, 1168, 252, 252, 28);
  context.fillStyle = '#ffffff';
  context.fill();
  context.strokeStyle = '#e1ddd4';
  context.lineWidth = 4;
  context.stroke();
  context.drawImage(qrImage, 804, 1180, 228, 228);

  context.fillStyle = '#2c2b29';
  context.font = `900 38px ${DISPLAY_FONT}`;
  context.fillText('在清迈，少一点盲选', 128, 1218);
  context.fillStyle = '#706d66';
  context.font = `700 27px ${FONT_FAMILY}`;
  drawWrappedText(context, `来自 ${sourceLabel} 的地点推荐，扫码打开 CMI Map 查看位置和导航。`, 128, 1270, 594, 42, 3);

  context.fillStyle = accent;
  drawRoundRect(context, 128, 1356, 318, 50, 25);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `900 24px ${FONT_FAMILY}`;
  context.fillText('CMI 社区清迈地图', 154, 1389);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `cmi-map-${sanitizeFileName(title)}.png`,
  };
};
