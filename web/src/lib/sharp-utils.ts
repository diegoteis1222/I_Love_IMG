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

// ─── Resize ────────────────────────────────────────────────────────────────────

export type ResizeFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export interface ResizeOptions {
  width?: number;
  height?: number;
  scalePercent?: number;
  fit?: ResizeFit;
  withoutEnlargement?: boolean;
}

export async function resizeImage(
  buffer: Buffer,
  options: ResizeOptions
): Promise<{ buffer: Buffer; format: string; mime: string; width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  const inputFormat = meta.format ?? 'jpeg';

  let targetWidth = options.width;
  let targetHeight = options.height;

  if (
    options.scalePercent &&
    options.scalePercent > 0 &&
    meta.width &&
    meta.height
  ) {
    targetWidth = Math.max(1, Math.round(meta.width * (options.scalePercent / 100)));
    targetHeight = Math.max(1, Math.round(meta.height * (options.scalePercent / 100)));
  }

  const fit = options.fit ?? 'inside';
  const withoutEnlargement = options.withoutEnlargement ?? false;

  let pipeline = sharp(buffer, { failOn: 'error' }).rotate();

  if (targetWidth || targetHeight) {
    pipeline = pipeline.resize({
      width: targetWidth,
      height: targetHeight,
      fit,
      withoutEnlargement
    });
  }

  // Keep original format
  const formatMap: Record<string, () => void> = {
    jpeg: () => { pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true }); },
    jpg: () => { pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true }); },
    png: () => { pipeline = pipeline.png({ compressionLevel: 9 }); },
    webp: () => { pipeline = pipeline.webp({ quality: 95 }); },
    avif: () => { pipeline = pipeline.avif({ quality: 80 }); },
    tiff: () => { pipeline = pipeline.tiff({ quality: 95 }); },
    gif: () => { pipeline = pipeline.gif(); }
  };

  (formatMap[inputFormat] ?? formatMap['jpeg'])();

  const ext =
    inputFormat === 'jpg' ? 'jpg' : FORMAT_EXTENSIONS[inputFormat as SupportedFormat] ?? 'jpg';
  const mime = FORMAT_MIMES[inputFormat as SupportedFormat] ?? 'image/jpeg';

  const out = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    buffer: out.data,
    format: ext,
    mime,
    width: out.info.width,
    height: out.info.height
  };
}

// ─── Rotate / Flip ─────────────────────────────────────────────────────────────

export interface RotateOptions {
  angle?: number;       // grados en sentido horario; admite cualquier valor
  flipH?: boolean;      // reflejar horizontalmente (espejo)
  flipV?: boolean;      // reflejar verticalmente
  background?: string;  // relleno de esquinas en ángulos no múltiplos de 90
}

export async function rotateImage(
  buffer: Buffer,
  options: RotateOptions
): Promise<{ buffer: Buffer; format: string; mime: string }> {
  const meta = await sharp(buffer).metadata();
  const inputFormat = meta.format ?? 'jpeg';

  const angle = (((options.angle ?? 0) % 360) + 360) % 360;

  let pipeline: sharp.Sharp;

  // Sharp solo permite una rotación por pipeline, así que si la imagen trae
  // orientación EXIF la normalizamos primero en un paso intermedio sin pérdida.
  if ((meta.orientation ?? 1) > 1) {
    const { data, info } = await sharp(buffer, { failOn: 'error' })
      .rotate()
      .raw()
      .toBuffer({ resolveWithObject: true });
    pipeline = sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels }
    });
  } else {
    pipeline = sharp(buffer, { failOn: 'error' });
  }

  // En Sharp el reflejo se aplica siempre antes de la rotación
  if (options.flipH) pipeline = pipeline.flop();
  if (options.flipV) pipeline = pipeline.flip();

  if (angle !== 0) {
    if (angle % 90 === 0) {
      pipeline = pipeline.rotate(angle);
    } else {
      // Los ángulos libres dejan esquinas vacías: transparentes si el formato
      // soporta alfa, blancas en JPG, salvo que se indique un color.
      const supportsAlpha = inputFormat !== 'jpeg' && inputFormat !== 'jpg';
      const background =
        options.background ??
        (supportsAlpha ? { r: 0, g: 0, b: 0, alpha: 0 } : '#ffffff');
      pipeline = pipeline.rotate(angle, { background });
    }
  }

  // Keep original format
  const formatMap: Record<string, () => void> = {
    jpeg: () => { pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true }); },
    jpg: () => { pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true }); },
    png: () => { pipeline = pipeline.png({ compressionLevel: 9 }); },
    webp: () => { pipeline = pipeline.webp({ quality: 95 }); },
    avif: () => { pipeline = pipeline.avif({ quality: 80 }); },
    tiff: () => { pipeline = pipeline.tiff({ quality: 95 }); },
    gif: () => { pipeline = pipeline.gif(); }
  };

  (formatMap[inputFormat] ?? formatMap['jpeg'])();

  const ext =
    inputFormat === 'jpg' ? 'jpg' : FORMAT_EXTENSIONS[inputFormat as SupportedFormat] ?? 'jpg';
  const mime = FORMAT_MIMES[inputFormat as SupportedFormat] ?? 'image/jpeg';

  const out = await pipeline.toBuffer();
  return { buffer: out, format: ext, mime };
}

// ─── Watermark ─────────────────────────────────────────────────────────────────

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'tile';

export interface WatermarkOptions {
  text: string;
  position: WatermarkPosition;
  fontSize?: number;       // 0 = auto
  opacity?: number;        // 0–100, default 30
  color?: string;          // hex, default '#ffffff'
  rotation?: number;       // degrees, default 0 (tile default: -30)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity / 100})`;
}

function calcGravity(position: WatermarkPosition): sharp.Gravity {
  const map: Record<string, sharp.Gravity> = {
    'top-left': 'northwest',
    'top-center': 'north',
    'top-right': 'northeast',
    'middle-left': 'west',
    'center': 'centre',
    'middle-right': 'east',
    'bottom-left': 'southwest',
    'bottom-center': 'south',
    'bottom-right': 'southeast'
  };
  return (map[position] ?? 'centre') as sharp.Gravity;
}

export async function addWatermark(
  buffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 800;
  const imgH = meta.height ?? 600;

  const opacity = options.opacity ?? 30;
  const color = options.color ?? '#ffffff';
  const fillColor = hexToRgba(color, opacity);
  const rotation = options.rotation ?? (options.position === 'tile' ? -30 : 0);

  // Auto font size: ~3% of the longest dimension
  const fontSize = options.fontSize && options.fontSize > 0
    ? options.fontSize
    : Math.max(16, Math.round(Math.max(imgW, imgH) * 0.03));

  const escapedText = escapeXml(options.text);

  if (options.position === 'tile') {
    // Tile mode: generate a repeating pattern
    const tileSpacingX = fontSize * 12;
    const tileSpacingY = fontSize * 6;

    // Create a larger canvas to account for rotation
    const diagonal = Math.ceil(Math.sqrt(imgW * imgW + imgH * imgH));
    const canvasW = diagonal * 2;
    const canvasH = diagonal * 2;

    const rows = Math.ceil(canvasH / tileSpacingY) + 2;
    const cols = Math.ceil(canvasW / tileSpacingX) + 2;

    let textElements = '';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSpacingX;
        const y = row * tileSpacingY;
        textElements += `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" fill="${fillColor}" font-weight="bold">${escapedText}</text>`;
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
      <g transform="rotate(${rotation}, ${canvasW / 2}, ${canvasH / 2})">
        ${textElements}
      </g>
    </svg>`;

    // Create watermark overlay, crop to image size
    const watermarkBuffer = await sharp(Buffer.from(svg))
      .resize(imgW, imgH, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();

    return sharp(buffer, { failOn: 'error' })
      .rotate()
      .composite([{ input: watermarkBuffer, blend: 'over' }])
      .toBuffer();
  } else {
    // Single position mode
    // Estimate text width roughly
    const estimatedWidth = Math.ceil(escapedText.length * fontSize * 0.6) + fontSize * 2;
    const svgH = Math.ceil(fontSize * 2);
    const svgW = Math.max(estimatedWidth, fontSize * 3);

    const transform = rotation !== 0
      ? `transform="rotate(${rotation}, ${svgW / 2}, ${svgH / 2})"`
      : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
            font-family="sans-serif" font-size="${fontSize}" fill="${fillColor}"
            font-weight="bold" ${transform}>${escapedText}</text>
    </svg>`;

    const gravity = calcGravity(options.position);

    return sharp(buffer, { failOn: 'error' })
      .rotate()
      .composite([{
        input: Buffer.from(svg),
        gravity
      }])
      .toBuffer();
  }
}

// ─── Add Text ──────────────────────────────────────────────────────────────────

export type TextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface AddTextOptions {
  text: string;
  position: TextPosition;
  fontFamily?: string;     // 'sans-serif' | 'serif' | 'monospace'
  fontSize?: number;       // 0 = auto
  color?: string;          // hex, default '#ffffff'
  bgColor?: string;        // hex or empty for no background
  shadow?: boolean;
}

export async function addText(
  buffer: Buffer,
  options: AddTextOptions
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 800;
  const imgH = meta.height ?? 600;

  const fontFamily = options.fontFamily ?? 'sans-serif';
  const color = options.color ?? '#ffffff';
  const shadow = options.shadow ?? false;

  // Auto font size: ~5% of shortest dimension
  const fontSize = options.fontSize && options.fontSize > 0
    ? options.fontSize
    : Math.max(20, Math.round(Math.min(imgW, imgH) * 0.05));

  const escapedText = escapeXml(options.text);
  const lines = escapedText.split('\n');
  const lineHeight = fontSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;

  // Estimate width from longest line
  const charWidth = fontFamily === 'monospace' ? fontSize * 0.62 : fontSize * 0.55;
  const maxLineLength = Math.max(...lines.map(l => l.length));
  const estimatedWidth = Math.ceil(maxLineLength * charWidth);

  const paddingX = fontSize;
  const paddingY = Math.ceil(fontSize * 0.6);
  const svgW = estimatedWidth + paddingX * 2;
  const svgH = Math.ceil(totalTextHeight) + paddingY * 2;

  // Build text elements
  const shadowFilter = shadow
    ? `<defs><filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.7)"/>
      </filter></defs>`
    : '';

  const filterAttr = shadow ? 'filter="url(#shadow)"' : '';

  // Background rect
  const bgRect = options.bgColor
    ? `<rect x="0" y="0" width="${svgW}" height="${svgH}" rx="${Math.round(fontSize * 0.3)}" fill="${options.bgColor}" opacity="0.85"/>`
    : '';

  const textLines = lines
    .map((line, i) => {
      const y = paddingY + fontSize + i * lineHeight;
      return `<text x="${svgW / 2}" y="${y}" text-anchor="middle"
              font-family="${fontFamily}" font-size="${fontSize}" fill="${color}"
              font-weight="600" ${filterAttr}>${line}</text>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
    ${shadowFilter}
    ${bgRect}
    ${textLines}
  </svg>`;

  const gravity = calcGravity(options.position as WatermarkPosition);

  return sharp(buffer, { failOn: 'error' })
    .rotate()
    .composite([{
      input: Buffer.from(svg),
      gravity
    }])
    .toBuffer();
}

// ─── Edit text (OCR + inpainting) ──────────────────────────────────────────────

export interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  newText?: string;
}

/**
 * Construye la máscara de inpainting (blanco = eliminar) a partir de las
 * cajas detectadas por el OCR, con un pequeño margen alrededor.
 */
export async function buildRegionsMask(
  width: number,
  height: number,
  regions: TextRegion[]
): Promise<Buffer> {
  const rects = regions
    .map((r) => {
      const pad = Math.max(4, Math.round(r.height * 0.25));
      const x = Math.max(0, r.x - pad);
      const y = Math.max(0, r.y - pad);
      const w = Math.min(width - x, r.width + pad * 2);
      const h = Math.min(height - y, r.height + pad * 2);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="black"/>
    ${rects}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Dibuja los textos de reemplazo centrados en sus cajas originales.
 * El tamaño de fuente se deriva de la altura de cada caja.
 */
export async function renderTextRegions(
  buffer: Buffer,
  regions: TextRegion[],
  options: { fontFamily?: string; color?: string } = {}
): Promise<Buffer> {
  const withText = regions.filter((r) => r.newText && r.newText.trim() !== '');
  if (withText.length === 0) return buffer;

  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 800;
  const imgH = meta.height ?? 600;

  const fontFamily = options.fontFamily ?? 'sans-serif';
  const color = options.color ?? '#000000';

  const texts = withText
    .map((r) => {
      const text = escapeXml(r.newText!.trim());
      const fontSize = Math.max(8, Math.round(r.height * 0.8));
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      // Si el texto nuevo es más largo que la caja, lo comprimimos para que quepa
      const estimatedWidth = r.newText!.trim().length * fontSize * 0.55;
      const fit = estimatedWidth > r.width
        ? `textLength="${r.width}" lengthAdjust="spacingAndGlyphs"`
        : '';
      return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
              font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" ${fit}>${text}</text>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">
    ${texts}
  </svg>`;

  return sharp(buffer, { failOn: 'error' })
    .composite([{ input: Buffer.from(svg) }])
    .toBuffer();
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export function replaceExtension(filename: string, newExt: string): string {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  return `${base}.${newExt}`;
}
