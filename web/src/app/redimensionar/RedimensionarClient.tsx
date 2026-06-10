'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

const PIXEL_PRESETS = [
  { label: 'HD', value: 1280 },
  { label: 'Full HD', value: 1920 },
  { label: '2K', value: 2560 },
  { label: '4K', value: 3840 }
];

const PERCENT_PRESETS = [25, 50, 75, 100, 150, 200];

const FIT_OPTIONS = [
  { value: 'inside', label: 'Encajar dentro', description: 'Ajusta dentro de las dimensiones sin recortar' },
  { value: 'cover', label: 'Cubrir', description: 'Rellena las dimensiones recortando si es necesario' },
  { value: 'fill', label: 'Estirar', description: 'Fuerza las dimensiones exactas (puede deformar)' },
  { value: 'contain', label: 'Contener', description: 'Encaja dentro añadiendo bordes si es necesario' }
] as const;

type ResizeMode = 'pixels' | 'percent' | 'preset';

interface Props {
  maxSizeMB: number;
}

export function RedimensionarClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('pixels');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [lockAspect, setLockAspect] = useState(true);
  const [scalePercent, setScalePercent] = useState(50);
  const [presetValue, setPresetValue] = useState(1920);
  const [fit, setFit] = useState<(typeof FIT_OPTIONS)[number]['value']>('inside');
  const [withoutEnlargement, setWithoutEnlargement] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function process() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();

      if (resizeMode === 'percent') {
        fd.append('scalePercent', String(scalePercent));
      } else if (resizeMode === 'preset') {
        fd.append('width', String(presetValue));
        fd.append('height', String(presetValue));
        fd.append('fit', 'inside');
      } else {
        if (width) fd.append('width', String(width));
        if (height && !lockAspect) fd.append('height', String(height));
        fd.append('fit', fit);
      }

      fd.append('withoutEnlargement', String(withoutEnlargement));
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/resize', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al redimensionar');
      }

      const blob = await res.blob();
      const filename = getFilenameFromContentDisposition(
        res.headers.get('content-disposition'),
        'descarga'
      );
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <DropZone
        multiple
        maxSizeMB={maxSizeMB}
        onFiles={(f) => setFiles((prev) => [...prev, ...f])}
        hint="Acepta JPG, PNG, WebP, AVIF, TIFF, GIF."
      />

      {files.length > 0 && (
        <FileList
          files={files}
          onRemove={(i) =>
            setFiles((prev) => prev.filter((_, idx) => idx !== i))
          }
        />
      )}

      <div className="card p-5 space-y-5">
        {/* Mode selector */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Modo de redimensionado
          </p>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            {([
              { key: 'pixels', label: 'Por píxeles' },
              { key: 'percent', label: 'Por porcentaje' },
              { key: 'preset', label: 'Presets' }
            ] as const).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setResizeMode(m.key)}
                className={
                  resizeMode === m.key
                    ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm'
                    : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pixels mode */}
        {resizeMode === 'pixels' && (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Ancho (px)
                </label>
                <input
                  type="number"
                  min={1}
                  max={16000}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setLockAspect(!lockAspect)}
                className={
                  lockAspect
                    ? 'mb-1 text-brand-600 hover:text-brand-700 transition'
                    : 'mb-1 text-slate-400 hover:text-slate-600 transition'
                }
                title={lockAspect ? 'Proporción bloqueada' : 'Proporción libre'}
              >
                {lockAspect ? '🔗' : '🔓'}
              </button>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Alto (px)
                </label>
                <input
                  type="number"
                  min={1}
                  max={16000}
                  value={height}
                  disabled={lockAspect}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {lockAspect && (
              <p className="text-xs text-slate-500">
                Con la proporción bloqueada, el alto se calcula automáticamente para mantener el aspecto original.
              </p>
            )}

            {/* Fit mode */}
            {!lockAspect && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Ajuste
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {FIT_OPTIONS.map((f) => (
                    <label
                      key={f.value}
                      className={
                        fit === f.value
                          ? 'flex items-start gap-2 p-2.5 rounded-lg border border-brand-600 bg-brand-50 cursor-pointer'
                          : 'flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer'
                      }
                    >
                      <input
                        type="radio"
                        name="fit"
                        value={f.value}
                        checked={fit === f.value}
                        onChange={() => setFit(f.value)}
                        className="mt-0.5 accent-brand-600"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{f.label}</p>
                        <p className="text-[10px] text-slate-500">{f.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Percent mode */}
        {resizeMode === 'percent' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={scalePercent}
                onChange={(e) => setScalePercent(Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="w-14 text-right text-sm font-semibold text-slate-700">
                {scalePercent}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERCENT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setScalePercent(p)}
                  className={
                    scalePercent === p
                      ? 'rounded-md border border-brand-600 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700'
                      : 'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
                  }
                >
                  {p}%
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Cada imagen se escala al {scalePercent}% de sus dimensiones originales.
              {scalePercent > 100 && ' ⚠️ Las imágenes se ampliarán.'}
            </p>
          </div>
        )}

        {/* Preset mode */}
        {resizeMode === 'preset' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Ajusta el lado largo a la dimensión seleccionada, manteniendo la proporción.
            </p>
            <div className="flex flex-wrap gap-2">
              {PIXEL_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPresetValue(p.value)}
                  className={
                    presetValue === p.value
                      ? 'rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700'
                      : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                  }
                >
                  {p.label} · {p.value}px
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Without enlargement toggle */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={withoutEnlargement}
            onChange={(e) => setWithoutEnlargement(e.target.checked)}
            className="mt-1 accent-brand-600 h-4 w-4"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              No ampliar imágenes pequeñas
            </p>
            <p className="text-xs text-slate-600">
              Si la imagen es menor que las dimensiones indicadas, se mantiene su tamaño original.
            </p>
          </div>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={process}
          disabled={busy || files.length === 0}
          className="btn-primary"
        >
          {busy ? 'Redimensionando…' : `Redimensionar ${files.length || ''}`}
        </button>
        {files.length > 0 && !busy && (
          <button onClick={() => setFiles([])} className="btn-secondary">
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
