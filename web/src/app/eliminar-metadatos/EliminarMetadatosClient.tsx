'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

interface MetadataItem {
  name: string;
  format: string;
  width: number;
  height: number;
  hasExif: boolean;
  hasIcc: boolean;
  hasXmp: boolean;
  hasGps: boolean;
  camera?: string;
  software?: string;
  date?: string;
}

interface Props {
  maxSizeMB: number;
}

export function EliminarMetadatosClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<MetadataItem[] | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function inspect(allFiles: File[]) {
    setInspecting(true);
    setError(null);
    try {
      const fd = new FormData();
      allFiles.forEach((f) => fd.append('files', f));
      const res = await fetch('/api/inspect-metadata', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al analizar los metadatos');
      }
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setItems(null);
    } finally {
      setInspecting(false);
    }
  }

  function addFiles(f: File[]) {
    const next = [...files, ...f];
    setFiles(next);
    inspect(next);
  }

  function removeFile(i: number) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    if (next.length > 0) {
      inspect(next);
    } else {
      setItems(null);
    }
  }

  async function process() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/strip-metadata', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al eliminar los metadatos');
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

  const anyMetadata = items?.some((it) => it.hasExif || it.hasIcc || it.hasXmp);
  const anyGps = items?.some((it) => it.hasGps);

  return (
    <div className="space-y-6">
      <DropZone
        multiple
        maxSizeMB={maxSizeMB}
        onFiles={addFiles}
        hint="Analiza qué metadatos (EXIF, GPS, cámara…) contienen tus imágenes y elimínalos."
      />

      {inspecting && (
        <p className="text-sm text-slate-500">Analizando metadatos…</p>
      )}

      {items && items.length > 0 && (
        <div className="card divide-y divide-slate-100">
          {items.map((it, i) => (
            <div key={`${it.name}-${i}`} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {it.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {it.format.toUpperCase()} · {it.width}×{it.height}px
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {it.hasGps && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                      ⚠️ GPS
                    </span>
                  )}
                  {it.hasExif && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      EXIF
                    </span>
                  )}
                  {it.hasIcc && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      ICC
                    </span>
                  )}
                  {it.hasXmp && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      XMP
                    </span>
                  )}
                  {!it.hasExif && !it.hasIcc && !it.hasXmp && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Limpia
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="text-xs text-slate-400 hover:text-red-600 transition ml-1"
                    aria-label={`Quitar ${it.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {(it.camera || it.date || it.software) && (
                <p className="mt-1 text-xs text-slate-500">
                  {[
                    it.camera && `📷 ${it.camera}`,
                    it.date && `🗓 ${new Date(it.date).toLocaleString('es')}`,
                    it.software && `🖥 ${it.software}`
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {anyGps && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          <strong>Atención:</strong> alguna imagen contiene coordenadas GPS del
          lugar donde se tomó. Elimina los metadatos antes de compartirla.
        </p>
      )}

      {items && items.length > 0 && !anyMetadata && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          Las imágenes no contienen metadatos relevantes. Aun así puedes
          procesarlas para asegurarte.
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
          disabled={busy || files.length === 0}
          className="btn-primary"
        >
          {busy ? 'Limpiando…' : `Eliminar metadatos ${files.length || ''}`}
        </button>
        {files.length > 0 && !busy && (
          <button
            onClick={() => {
              setFiles([]);
              setItems(null);
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
