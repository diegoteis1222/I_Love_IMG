'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { triggerDownload } from '@/lib/download';
import { applyDescriptionToFilename, describeRemoveBg } from '@/lib/filename';

interface Props {
  maxSizeMB: number;
}

export function QuitarFondoClient({ maxSizeMB }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
  }

  async function process() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResultUrl(null);
    setResultBlob(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/remove-bg', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al quitar el fondo');
      }
      const blob = await res.blob();
      // Para previsualizar en <img> necesitamos un blob con MIME image/png
      const previewBlob = new Blob([blob], { type: 'image/png' });
      const url = URL.createObjectURL(previewBlob);
      setResultUrl(url);
      setResultBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!resultBlob || !file) return;
    const filename = applyDescriptionToFilename(file.name, 'png', describeRemoveBg());
    triggerDownload(resultBlob, filename);
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
            setPreview(URL.createObjectURL(f));
          }}
          hint="Sube una imagen. La IA detectará el sujeto y eliminará el fondo."
        />
      )}

      {file && preview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Original</p>
            <div className="card overflow-hidden bg-slate-100 flex items-center justify-center aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Original"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Resultado</p>
            <div className="card overflow-hidden checkered flex items-center justify-center aspect-square">
              {resultUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={resultUrl}
                  alt="Sin fondo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-slate-500">
                  {busy ? 'Procesando…' : 'Aún sin procesar'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {file && !resultBlob && (
          <button onClick={process} disabled={busy} className="btn-primary">
            {busy ? 'Quitando fondo…' : 'Quitar fondo'}
          </button>
        )}
        {resultBlob && (
          <button onClick={download} className="btn-primary">
            Descargar PNG
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
