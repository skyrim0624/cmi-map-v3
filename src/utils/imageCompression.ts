// 图片压缩工具

interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  force?: boolean;
  outputType?: 'image/jpeg' | 'image/webp';
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  orientation: number;
  close?: () => void;
}

const getOutputFileName = (fileName: string, outputType: 'image/jpeg' | 'image/webp') => {
  const extension = outputType === 'image/webp' ? '.webp' : '.jpg';
  return fileName.replace(/\.[^.]+$/, extension);
};

const canvasToFile = (
  canvas: HTMLCanvasElement,
  fileName: string,
  outputType: 'image/jpeg' | 'image/webp',
  quality: number
) =>
  new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片压缩失败'));
          return;
        }

        resolve(new File([blob], getOutputFileName(fileName, outputType), { type: outputType }));
      },
      outputType,
      quality
    );
  });

const loadHtmlImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    image.src = url;
  });

const getJpegOrientation = async (file: File) => {
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) return 1;

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return 1;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xffe1) {
      const exifLength = view.getUint16(offset, false);
      offset += 2;

      if (offset + exifLength - 2 > view.byteLength || view.getUint32(offset, false) !== 0x45786966) {
        return 1;
      }

      const tiffOffset = offset + 6;
      const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
      const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
      const ifdOffset = tiffOffset + firstIfdOffset;
      const entryCount = view.getUint16(ifdOffset, littleEndian);

      for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = ifdOffset + 2 + index * 12;
        if (entryOffset + 12 > view.byteLength) return 1;

        const tag = view.getUint16(entryOffset, littleEndian);
        if (tag === 0x0112) {
          const orientation = view.getUint16(entryOffset + 8, littleEndian);
          return orientation >= 1 && orientation <= 8 ? orientation : 1;
        }
      }

      return 1;
    }

    const segmentLength = view.getUint16(offset, false);
    if (segmentLength < 2) return 1;
    offset += segmentLength;
  }

  return 1;
};

const applyOrientationTransform = (
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
) => {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
  }
};

const decodeImage = async (file: File): Promise<DecodedImage> => {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        orientation: 1,
        close: () => bitmap.close(),
      };
    } catch (error) {
      console.warn('createImageBitmap 方向修正失败，改用普通图片解码', error);
    }
  }

  const image = await loadHtmlImage(file);
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    orientation: await getJpegOrientation(file),
  };
};

const renderImageToFile = async (
  file: File,
  options: Required<Pick<CompressOptions, 'maxWidthOrHeight' | 'quality' | 'outputType'>>
) => {
  const decoded = await decodeImage(file);
  const isRotated = decoded.orientation >= 5 && decoded.orientation <= 8;
  const orientedWidth = isRotated ? decoded.height : decoded.width;
  const orientedHeight = isRotated ? decoded.width : decoded.height;
  let width = orientedWidth;
  let height = orientedHeight;

  if (width > height && width > options.maxWidthOrHeight) {
    height = (height * options.maxWidthOrHeight) / width;
    width = options.maxWidthOrHeight;
  } else if (height >= width && height > options.maxWidthOrHeight) {
    width = (width * options.maxWidthOrHeight) / height;
    height = options.maxWidthOrHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.close?.();
    throw new Error('无法获取 canvas context');
  }

  // NOTE: 优先用 createImageBitmap({ imageOrientation: 'from-image' })，不支持时手读 EXIF orientation。
  // 这样会把手机方向烘焙进像素，转成 webp/jpeg 后不会再依赖 EXIF，避免微信/安卓拍照图横过来。
  if (decoded.orientation === 1) {
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  } else {
    const scale = Math.min(canvas.width / orientedWidth, canvas.height / orientedHeight);
    const drawWidth = Math.round(decoded.width * scale);
    const drawHeight = Math.round(decoded.height * scale);
    applyOrientationTransform(ctx, decoded.orientation, canvas.width, canvas.height);
    ctx.drawImage(decoded.source, 0, 0, drawWidth, drawHeight);
  }
  decoded.close?.();

  return canvasToFile(canvas, file.name, options.outputType, options.quality);
};

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的文件
 */
export const compressImage = async (
  file: File,
  options: CompressOptions = {}
): Promise<File> => {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1080,
    quality = 0.8,
    force = false,
    outputType = 'image/webp',
  } = options;

  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  // 如果文件已经小于限制，直接返回
  if (!force && file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  const compressedFile = await renderImageToFile(file, {
    maxWidthOrHeight,
    quality,
    outputType,
  });

  // 如果压缩后仍然超过限制，降低质量重试
  if (compressedFile.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
    return compressImage(file, { ...options, force: true, quality: quality - 0.1 });
  }

  return compressedFile;
};

export const normalizeImageFile = (
  file: File,
  options: Pick<CompressOptions, 'maxWidthOrHeight' | 'quality' | 'outputType'> = {}
): Promise<File> =>
  compressImage(file, {
    maxSizeMB: Number.POSITIVE_INFINITY,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 2560,
    quality: options.quality ?? 0.95,
    force: true,
    outputType: options.outputType ?? 'image/jpeg',
  });

/**
 * 批量压缩图片
 * @param files 图片文件数组
 * @param options 压缩选项
 * @returns 压缩后的文件数组
 */
export const compressImages = async (
  files: File[],
  options?: CompressOptions
): Promise<File[]> => {
  return Promise.all(files.map(file => compressImage(file, options)));
};

/**
 * 验证文件是否为图片
 * @param file 文件
 * @returns 是否为图片
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
