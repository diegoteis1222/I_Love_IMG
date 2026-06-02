'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

const MODES = [
  {
    value: 'lossless-ish',
    label: 'Casi sin pérdida',
    description: 'Calidad ~92. Resultado prácticamente indistinguible del original.'
  },
  {
    value: 'balanced',
    label: 'Equilibrada',
    description: 'Calidad ~82. Recomendada. Mejor relación calidad/peso para uso general.'
  },
  {
    value: 'aggressive',
    label: 'Máxima reducción',
    description: 'Calidad ~70. Para web, email o cuando el peso pesa más que el detalle.'
  }
] as const;

const PIXEL_PRESETS = [
  { label: 'HD', value: 1280 },
  { label: 'Full HD', value: 1920 },
  { label: '2K', value: 2560 },
  { label: '4K', value: 3840 }
];

const PERCENT_PRESETS = [25, 50, 75, 90];

interface Props {
  maxSizeMB: number;
}

type AlreadyOptimal = '0' | '1' | 'partial';

interface Stats {
  original: number;
  nuevo: number;
  pct: number;
  alreadyOptimal: AlreadyOptimal;
}

export function ComprimirClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('balanced');
  const [toWebp, setToWebp] = useState(false);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeMode, setResizeMode] = useState<'pixels' | 'percent'>('pixels');
  const [maxDimension, setMaxDimension] = useState(2560);
  const [scalePercent, setScalePercent] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  async function process() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setStats(null);

    try {
      const fd = new FormData();
      fd.append('mode', mode);
      fd.append('toWebp', String(toWebp));
      fd.append('stripMetadata', String(stripMetadata));
      if (resizeEnabled) {
        if (resizeMode === 'pixels') {
          fd.append('maxDimension', String(maxDimension));
        } else {
          fd.append('scalePercent', String(scalePercent));
        }
      }
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/compress', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al comprimir');
      }

      const original = Number(res.headers.get('X-Original-Size') ?? '0');
      const nuevo = Number(res.headers.get('X-New-Size') ?? '0');
      const pct = Number(res.headers.get('X-Reduction-Pct') ?? '0');
      const alreadyOptimal = (res.headers.get('X-Already-Optimal') ?? '0') as AlreadyOptimal;
      setStats({ original, nuevo, pct, alreadyOptimal });

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
        hint="Acepta JPG, PNG, WebP, AVIF."
      />

      {files.length > 0 && (
        <FileList
          files={files}
          onRemove={(i) =>
            setFiles((prev) => prev.filter((_, idx) => idx !== i))
          }
        />
      )}

      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700 mb-1">
          Nivel de compresión
        </p>
        {MODES.map((m) => (
          <label
            key={m.value}
            className={
              mode === m.value
                ? 'flex items-start gap-3 p-3 rounded-lg border border-brand-600 bg-brand-50 cursor-pointer'
                : 'flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer'
            }
          >
            <input
              type="radio"
              name="mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="mt-1 accent-brand-600"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">{m.label}</p>
              <p className="text-xs text-slate-600">{m.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">
          Optimizaciones adicionales
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={toWebp}
            onChange={(e) => setToWebp(e.target.checked)}
            className="mt-1 accent-brand-600 h-4 w-4"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Convertir a WebP
            </p>
            <p className="text-xs text-slate-600">
              Suele ahorrar un 25-40% adicional sobre JPG con la misma calidad
              visual percibida.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={stripMetadata}
            onChange={(e) => setStripMetadata(e.target.checked)}
            className="mt-1 accent-brand-600 h-4 w-4"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Eliminar metadatos (EXIF, ICC, GPS)
            </p>
            <p className="text-xs text-slate-600">
              Ahorra entre 5 y 50 KB sin tocar la imagen. Importante por
              privacidad.
            </p>
          </div>
        </label>

        <div className="flex items-start gap-3">
          <input
            id="resize-toggle"
            type="checkbox"
            checked={resizeEnabled}
            onChange={(e) => setResizeEnabled(e.target.checked)}
            className="mt-1 accent-brand-600 h-4 w-4"
          />
          <div className="flex-1">
            <label htmlFor="resize-toggle" className="cursor-pointer">
              <p className="text-sm font-semibold text-slate-900">
                Reducir dimensiones
              </p>
              <p className="text-xs text-slate-600">
                Bajar el tamaño en píxeles ahorra mucho peso sin tocar la
                calidad.
              </p>
            </label>

            {resizeEnabled && (
              <div className="mt-3 space-y-3">
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setResizeMode('pixels')}
                    className={
                      resizeMode === 'pixels'
                        ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm'
                        : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
                    }
                  >
                    Por píxeles
                  </button>
                  <button
                    type="button"
                    onClick={() => setResizeMode('percent')}
                    className={
                      resizeMode === 'percent'
                        ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm'
                        : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
                    }
                  >
                    Por porcentaje
                  </button>
                </div>

                {resizeMode === 'pixels' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={200}
                        max={8000}
                        step={100}
                        value={maxDimension}
                        onChange={(e) => setMaxDimension(Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-xs text-slate-500">
                        px de lado largo
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PIXEL_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setMaxDimension(p.value)}
                          className={
                            maxDimension === p.value
                              ? 'rounded-md border border-brand-600 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700'
                              : 'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
                          }
                        >
                          {p.label} · {p.value}px
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={95}
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
                      Cada imagen se escala al {scalePercent}% de sus
                      dimensiones originales.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <ResultBanner stats={stats} />
      )}

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
          {busy ? 'Comprimiendo…' : 'Comprimir'}
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

function ResultBanner({ stats }: { stats: Stats }) {
  if (stats.alreadyOptimal === '1') {
    return (
      <div className="card p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>La imagen ya estaba óptimamente comprimida.</strong>
          {' '}Se ha descargado el original sin cambios — re-encodearlo solo añadiría peso.
          Prueba un nivel más agresivo, marca <em>Convertir a WebP</em> o reduce dimensiones.
        </p>
      </div>
    );
  }
  if (stats.alreadyOptimal === 'partial') {
    return (
      <div className="card p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Reducción global del {stats.pct}%</strong>
          {' '}— {formatSize(stats.original)} → {formatSize(stats.nuevo)}.
          Algunos archivos ya estaban óptimamente comprimidos y se han descargado sin cambios.
        </p>
      </div>
    );
  }
  return (
    <div className="card p-4 bg-emerald-50 border-emerald-200">
      <p className="text-sm text-emerald-800">
        <strong>Reducción del {stats.pct}%</strong>
        {' '}— {formatSize(stats.original)} → {formatSize(stats.nuevo)}
      </p>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
