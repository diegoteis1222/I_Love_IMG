'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

const FORMATS = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'tiff', label: 'TIFF' }
] as const;

interface Props {
  maxSizeMB: number;
}

export function ConvertirClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<(typeof FORMATS)[number]['value']>('webp');
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function process() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('format', format);
      fd.append('quality', String(quality));
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/convert', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al convertir');
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
        hint="Acepta JPG, PNG, WebP, AVIF, TIFF, GIF, HEIC."
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
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Formato de salida
          </label>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={
                  format === f.value
                    ? 'rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700'
                    : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {format !== 'png' && (
          <div>
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
              <span>Calidad</span>
              <span className="text-slate-500 font-medium">{quality}</span>
            </label>
            <input
              type="range"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        )}
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
          {busy ? 'Convirtiendo…' : `Convertir ${files.length || ''}`}
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
