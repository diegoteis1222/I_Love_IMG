import sharp from 'sharp';

export type SupportedFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'tiff'
  | 'gif';

export const FORMAT_EXTENSIONS: Record<SupportedFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  tiff: 'tiff',
  gif: 'gif'
};

export const FORMAT_MIMES: Record<SupportedFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  gif: 'image/gif'
};

export function isSupportedFormat(value: string): value is SupportedFormat {
  return value in FORMAT_EXTENSIONS;
}

export async function convertImage(
  buffer: Buffer,
  format: SupportedFormat,
  quality = 90
): Promise<Buffer> {
  let pipeline = sharp(buffer, { failOn: 'error' }).rotate();

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'tiff':
      pipeline = pipeline.tiff({ quality });
      break;
    case 'gif':
      pipeline = pipeline.gif();
      break;
  }

  return pipeline.toBuffer();
}

export type CompressionMode = 'lossless-ish' | 'balanced' | 'aggressive';

export interface CompressionOptions {
  mode: CompressionMode;
  toWebp?: boolean;
  stripMetadata?: boolean;
  maxDimension?: number;
  scalePercent?: number;
}

export async function compressImage(
  buffer: Buffer,
  options: CompressionOptions
): Promise<{ buffer: Buffer; format: string; mime: string }> {
  const {
    mode,
    toWebp = false,
    stripMetadata = true,
    maxDimension,
    scalePercent
  } = options;

  const QUALITY: Record<
    CompressionMode,
    { jpeg: number; webp: number; avif: number; png: number }
  > = {
    'lossless-ish': { jpeg: 92, webp: 88, avif: 70, png: 100 },
    'balanced':     { jpeg: 82, webp: 78, avif: 60, png: 85 },
    'aggressive':   { jpeg: 70, webp: 65, avif: 50, png: 70 }
  };
  const q = QUALITY[mode];

  const meta = await sharp(buffer).metadata();
  const inputFormat = meta.format ?? 'jpeg';
  const hasAlpha = !!meta.hasAlpha;

  void stripMetadata;

  let pipeline = sharp(buffer, { failOn: 'error' }).rotate();

  if (
    scalePercent &&
    scalePercent > 0 &&
    scalePercent < 100 &&
    meta.width &&
    meta.height
  ) {
    const newWidth = Math.max(1, Math.round(meta.width * (scalePercent / 100)));
    const newHeight = Math.max(1, Math.round(meta.height * (scalePercent / 100)));
    pipeline = pipeline.resize({
      width: newWidth,
      height: newHeight,
      fit: 'fill',
      withoutEnlargement: true
    });
  } else if (maxDimension && (meta.width || meta.height)) {
    const long = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (long > maxDimension) {
      pipeline = pipeline.resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  let outFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';
  if (toWebp && inputFormat !== 'gif' && inputFormat !== 'avif') {
    outFormat = 'webp';
  } else if (inputFormat === 'png' && !hasAlpha && !toWebp) {
    outFormat = 'jpeg';
  } else {
    switch (inputFormat) {
      case 'jpeg':
      case 'jpg':
        outFormat = 'jpeg';
        break;
      case 'png':
        outFormat = 'png';
        break;
      case 'webp':
        outFormat = 'webp';
        break;
      case 'avif':
        outFormat = 'avif';
        break;
      case 'gif':
        outFormat = 'gif';
        break;
      case 'tiff':
        outFormat = 'tiff';
        break;
      default:
        outFormat = 'jpeg';
    }
  }

  let mime: string;
  let ext: string;

  switch (outFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality: q.jpeg,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: '4:2:0'
      });
      mime = 'image/jpeg';
      ext = 'jpg';
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: q.webp, effort: 5 });
      mime = 'image/webp';
      ext = 'webp';
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: q.avif, effort: 5 });
      mime = 'image/avif';
      ext = 'avif';
      break;
    case 'png':
      pipeline = pipeline.png({
        compressionLevel: 9,
        ...(q.png < 100 ? { palette: true, quality: q.png } : {})
      });
      mime = 'image/png';
      ext = 'png';
      break;
    case 'gif':
      pipeline = pipeline.gif();
      mime = 'image/gif';
      ext = 'gif';
      break;
    case 'tiff':
      pipeline = pipeline.tiff({ quality: q.jpeg });
      mime = 'image/tiff';
      ext = 'tiff';
      break;
  }

  const out = await pipeline.toBuffer();
  return { buffer: out, format: ext, mime };
}

export function replaceExtension(filename: string, newExt: string): string {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  return `${base}.${newExt}`;
}
