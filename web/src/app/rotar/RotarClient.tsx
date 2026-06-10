'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

const ANGLE_PRESETS = [
  { value: 0, label: 'Sin rotación' },
  { value: 90, label: '90° derecha ↻' },
  { value: 180, label: '180°' },
  { value: 270, label: '90° izquierda ↺' }
] as const;

type AngleMode = 'preset' | 'free';

interface Props {
  maxSizeMB: number;
}

export function RotarClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [angleMode, setAngleMode] = useState<AngleMode>('preset');
  const [presetAngle, setPresetAngle] = useState(90);
  const [freeAngle, setFreeAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const angle = angleMode === 'preset' ? presetAngle : freeAngle;
  const isFreeAngle = angle % 90 !== 0;
  const nothingToDo = angle % 360 === 0 && !flipH && !flipV;

  async function process() {
    if (files.length === 0 || nothingToDo) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('angle', String(angle));
      fd.append('flipH', String(flipH));
      fd.append('flipV', String(flipV));
      if (isFreeAngle && bgEnabled) {
        fd.append('background', bgColor);
      }
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/rotate', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al rotar');
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
          <p className="text-sm font-semibold text-slate-700 mb-2">Rotación</p>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            {([
              { key: 'preset', label: 'Giros de 90°' },
              { key: 'free', label: 'Ángulo libre' }
            ] as const).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setAngleMode(m.key)}
                className={
                  angleMode === m.key
                    ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm'
                    : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset mode */}
        {angleMode === 'preset' && (
          <div className="flex flex-wrap gap-2">
            {ANGLE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPresetAngle(p.value)}
                className={
                  presetAngle === p.value
                    ? 'rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700'
                    : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Free angle mode */}
        {angleMode === 'free' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={freeAngle}
                onChange={(e) => setFreeAngle(Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="w-14 text-right text-sm font-semibold text-slate-700">
                {freeAngle}°
              </span>
            </div>

            {isFreeAngle && (
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bgEnabled}
                    onChange={(e) => setBgEnabled(e.target.checked)}
                    className="mt-1 accent-brand-600 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Rellenar esquinas con color
                    </p>
                    <p className="text-xs text-slate-600">
                      Los ángulos que no son múltiplos de 90° dejan esquinas
                      vacías: transparentes en PNG/WebP, blancas en JPG.
                    </p>
                  </div>
                </label>
                {bgEnabled && (
                  <div className="mt-3 ml-7 flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                    />
                    <span className="text-xs text-slate-500">
                      Color de las esquinas
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flip */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Reflejar</p>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={flipH}
                onChange={(e) => setFlipH(e.target.checked)}
                className="mt-1 accent-brand-600 h-4 w-4"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Reflejar horizontalmente ↔
                </p>
                <p className="text-xs text-slate-600">
                  Efecto espejo: lo que estaba a la izquierda pasa a la derecha.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={flipV}
                onChange={(e) => setFlipV(e.target.checked)}
                className="mt-1 accent-brand-600 h-4 w-4"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Reflejar verticalmente ↕
                </p>
                <p className="text-xs text-slate-600">
                  Voltea la imagen de arriba abajo.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {nothingToDo && files.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Selecciona una rotación o un reflejo para poder procesar.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={process}
          disabled={busy || files.length === 0 || nothingToDo}
          className="btn-primary"
        >
          {busy ? 'Rotando…' : `Rotar ${files.length || ''}`}
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
