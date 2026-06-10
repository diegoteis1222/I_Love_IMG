'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

interface Props {
  maxSizeMB: number;
}

export function FaviconClient({ maxSizeMB }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function process() {
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fit', fit);

      const res = await fetch('/api/favicon', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al generar los iconos');
      }

      const blob = await res.blob();
      const filename = getFilenameFromContentDisposition(
        res.headers.get('content-disposition'),
        'favicons.zip'
      );
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {!file && (
        <DropZone
          multiple={false}
          maxSizeMB={maxSizeMB}
          onFiles={(files) => {
            const f = files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
          }}
          hint="Idealmente una imagen cuadrada de al menos 512×512 px."
        />
      )}

      {file && previewUrl && (
        <div className="flex items-start gap-6 flex-wrap">
          <div className="card overflow-hidden checkered">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Imagen base"
              className="block w-40 h-40 object-contain"
            />
          </div>
          <div className="flex-1 min-w-[220px] space-y-1 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{file.name}</p>
            <p>El paquete incluye:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>favicon.ico (16, 32 y 48 px)</li>
              <li>favicon-16x16.png · favicon-32x32.png · favicon-48x48.png</li>
              <li>apple-touch-icon.png (180 px)</li>
              <li>android-chrome 192 y 512 px</li>
              <li>codigo-html.txt con las etiquetas para el &lt;head&gt;</li>
            </ul>
          </div>
        </div>
      )}

      {file && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Si la imagen no es cuadrada
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              className={
                fit === 'cover'
                  ? 'flex items-start gap-3 p-3 rounded-lg border border-brand-600 bg-brand-50 cursor-pointer'
                  : 'flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer'
              }
            >
              <input
                type="radio"
                name="fit"
                checked={fit === 'cover'}
                onChange={() => setFit('cover')}
                className="mt-1 accent-brand-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Recortar al centro
                </p>
                <p className="text-xs text-slate-600">
                  Llena todo el icono recortando los bordes sobrantes.
                </p>
              </div>
            </label>
            <label
              className={
                fit === 'contain'
                  ? 'flex items-start gap-3 p-3 rounded-lg border border-brand-600 bg-brand-50 cursor-pointer'
                  : 'flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer'
              }
            >
              <input
                type="radio"
                name="fit"
                checked={fit === 'contain'}
                onChange={() => setFit('contain')}
                className="mt-1 accent-brand-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Encajar completa
                </p>
                <p className="text-xs text-slate-600">
                  Mantiene la imagen entera con fondo transparente.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {file && (
          <button onClick={process} disabled={busy} className="btn-primary">
            {busy ? 'Generando…' : 'Generar paquete de iconos'}
          </button>
        )}
        {file && (
          <button onClick={reset} className="btn-secondary" disabled={busy}>
            Cambiar imagen
          </button>
        )}
      </div>
    </div>
  );
}
