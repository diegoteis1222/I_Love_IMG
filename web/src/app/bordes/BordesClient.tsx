'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

const COLOR_PRESETS = [
  { value: '#ffffff', label: 'Blanco' },
  { value: '#000000', label: 'Negro' },
  { value: '#f1f5f9', label: 'Gris claro' },
  { value: '#7c3aed', label: 'Violeta' }
];

interface Props {
  maxSizeMB: number;
}

export function BordesClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thickness, setThickness] = useState(20);
  const [color, setColor] = useState('#ffffff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function process() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('thickness', String(thickness));
      fd.append('color', color);
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/border', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al añadir el borde');
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
          <div className="card overflow-hidden w-fit max-w-full mx-auto p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Previsualización"
              style={{ border: `${Math.min(thickness, 60)}px solid ${color}` }}
              className="block max-w-full max-h-[50vh]"
            />
          </div>
        </div>
      )}

      <div className="card p-5 space-y-5">
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Grosor del borde</span>
            <span className="text-slate-500 font-medium">{thickness}px</span>
          </label>
          <input
            type="range"
            min={1}
            max={200}
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Color
          </label>
          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={
                  color === c.value
                    ? 'w-8 h-8 rounded-full border-2 border-brand-600 shadow-sm ring-2 ring-brand-200'
                    : 'w-8 h-8 rounded-full border-2 border-slate-300 hover:border-slate-400'
                }
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-slate-300"
              title="Color personalizado"
            />
          </div>
        </div>
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
          {busy ? 'Procesando…' : `Añadir borde ${files.length || ''}`}
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
