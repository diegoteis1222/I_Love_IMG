'use client';

import { useMemo, useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

interface Props {
  maxSizeMB: number;
}

export function AjustesClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100); // 100 = sin cambio
  const [contrast, setContrast] = useState(0);       // 0 = sin cambio
  const [saturation, setSaturation] = useState(100); // 100 = sin cambio
  const [hue, setHue] = useState(0);                 // 0 = sin cambio
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noChanges =
    brightness === 100 && contrast === 0 && saturation === 100 && hue === 0;

  // Previsualización aproximada con filtros CSS (el resultado real lo genera Sharp)
  const cssFilter = useMemo(
    () =>
      [
        `brightness(${brightness / 100})`,
        `contrast(${1 + contrast / 100})`,
        `saturate(${saturation / 100})`,
        `hue-rotate(${hue}deg)`
      ].join(' '),
    [brightness, contrast, saturation, hue]
  );

  function addFiles(f: File[]) {
    setFiles((prev) => {
      const next = [...prev, ...f];
      if (!previewUrl && next.length > 0) {
        setPreviewUrl(URL.createObjectURL(next[0]));
      }
      return next;
    });
  }

  function removeFile(i: number) {
    setFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (i === 0) {
        setPreviewUrl(next.length > 0 ? URL.createObjectURL(next[0]) : null);
      }
      return next;
    });
  }

  function resetSliders() {
    setBrightness(100);
    setContrast(0);
    setSaturation(100);
    setHue(0);
  }

  async function process() {
    if (files.length === 0 || noChanges) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('brightness', String(brightness / 100));
      fd.append('contrast', String(contrast));
      fd.append('saturation', String(saturation / 100));
      fd.append('hue', String(hue));
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/adjust', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al ajustar');
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

  const sliders = [
    {
      label: 'Brillo', value: brightness, set: setBrightness,
      min: 50, max: 150, unit: '%', def: 100
    },
    {
      label: 'Contraste', value: contrast, set: setContrast,
      min: -50, max: 50, unit: '', def: 0
    },
    {
      label: 'Saturación', value: saturation, set: setSaturation,
      min: 0, max: 200, unit: '%', def: 100
    },
    {
      label: 'Tono', value: hue, set: setHue,
      min: -180, max: 180, unit: '°', def: 0
    }
  ];

  return (
    <div className="space-y-6">
      <DropZone
        multiple
        maxSizeMB={maxSizeMB}
        onFiles={addFiles}
        hint="Acepta JPG, PNG, WebP, AVIF, TIFF."
      />

      {files.length > 0 && (
        <FileList files={files} onRemove={removeFile} />
      )}

      {previewUrl && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Previsualización aproximada
          </p>
          <div className="card overflow-hidden w-fit max-w-full mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Previsualización"
              style={{ filter: cssFilter }}
              className="block max-w-full max-h-[50vh]"
            />
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        {sliders.map((s) => (
          <div key={s.label}>
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
              <span>{s.label}</span>
              <span className="text-slate-500 font-medium">
                {s.value}{s.unit}
              </span>
            </label>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={resetSliders}
          disabled={noChanges}
          className="text-xs text-slate-500 hover:text-brand-600 transition disabled:opacity-50"
        >
          ↺ Restablecer valores
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={process}
          disabled={busy || files.length === 0 || noChanges}
          className="btn-primary"
        >
          {busy ? 'Ajustando…' : `Aplicar ajustes ${files.length || ''}`}
        </button>
        {files.length > 0 && !busy && (
          <button
            onClick={() => {
              setFiles([]);
              setPreviewUrl(null);
            }}
            className="btn-secondary"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
