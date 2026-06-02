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
