/**
 * Helpers para construir nombres de archivo descriptivos al descargar.
 * Convención: "nombre_original (descripción).ext"
 */

export function applyDescriptionToFilename(
  originalName: string,
  ext: string,
  description: string
): string {
  const dot = originalName.lastIndexOf('.');
  const base = dot >= 0 ? originalName.slice(0, dot) : originalName;
  return `${base} (${description}).${ext}`;
}

// ----- Descripciones por herramienta -----

export function describeConvert(targetFormat: string, quality: number): string {
  const fmt = targetFormat.toUpperCase();
  if (quality !== 90) {
    return `convertida a ${fmt}, calidad ${quality}`;
  }
  return `convertida a ${fmt}`;
}

export type CompressDescOptions = {
  mode: 'lossless-ish' | 'balanced' | 'aggressive';
  toWebp?: boolean;
  scalePercent?: number;
  maxDimension?: number;
};

export function describeCompress(opts: CompressDescOptions): string {
  const parts: string[] = ['comprimida'];

  // Nivel de compresión
  const modeLabels: Record<CompressDescOptions['mode'], string> = {
    'lossless-ish': 'casi sin pérdida',
    'balanced': 'equilibrada',
    'aggressive': 'máx. reducción'
  };
  parts.push(modeLabels[opts.mode]);

  // Resize
  if (opts.scalePercent && opts.scalePercent > 0 && opts.scalePercent < 100) {
    parts.push(`redim. al ${opts.scalePercent}%`);
  } else if (opts.maxDimension) {
    parts.push(`máx. ${opts.maxDimension}px`);
  }

  // Conversión a WebP
  if (opts.toWebp) {
    parts.push('WebP');
  }

  // El primero ("comprimida") sin coma; el resto separados por comas
  return `${parts[0]} ${parts.slice(1).join(', ')}`;
}

export function describeRemoveBg(): string {
  return 'sin fondo';
}

export function describeResize(opts: {
  width?: number;
  height?: number;
  scalePercent?: number;
}): string {
  if (opts.scalePercent) {
    return `redimensionada al ${opts.scalePercent}%`;
  }
  if (opts.width && opts.height) {
    return `redimensionada ${opts.width}x${opts.height}`;
  }
  if (opts.width) {
    return `redimensionada ancho ${opts.width}px`;
  }
  if (opts.height) {
    return `redimensionada alto ${opts.height}px`;
  }
  return 'redimensionada';
}

export function describeRotate(opts: {
  angle?: number;
  flipH?: boolean;
  flipV?: boolean;
}): string {
  const parts: string[] = [];
  if (opts.angle) {
    parts.push(`rotada ${opts.angle}°`);
  }
  if (opts.flipH) {
    parts.push('espejo horizontal');
  }
  if (opts.flipV) {
    parts.push('espejo vertical');
  }
  return parts.length > 0 ? parts.join(', ') : 'rotada';
}

export function describeWatermark(): string {
  return 'con marca de agua';
}

export function describeRemoveWatermark(): string {
  return 'sin marca de agua';
}

export function describeAddText(): string {
  return 'con texto';
}

