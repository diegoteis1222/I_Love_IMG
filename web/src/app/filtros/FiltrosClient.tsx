'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

type FilterType = 'grayscale' | 'sepia' | 'negative' | 'blur' | 'sharpen';

const FILTERS: {
  value: FilterType;
  label: string;
  description: string;
  cssFilter: ((intensity: number) => string) | null;
}[] = [
  {
    value: 'grayscale',
    label: 'Escala de grises',
    description: 'Convierte la imagen a blanco y negro.',
    cssFilter: () => 'grayscale(1)'
  },
  {
    value: 'sepia',
    label: 'Sepia',
    description: 'Tono cálido envejecido, estilo fotografía antigua.',
    cssFilter: () => 'sepia(1)'
  },
  {
    value: 'negative',
    label: 'Negativo',
    description: 'Invierte los colores de la imagen.',
    cssFilter: () => 'invert(1)'
  },
  {
    value: 'blur',
    label: 'Desenfoque',
    description: 'Difumina la imagen con intensidad ajustable.',
    cssFilter: (i) => `blur(${i / 2}px)`
  },
  {
    value: 'sharpen',
    label: 'Nitidez',
    description: 'Realza los bordes y detalles.',
    cssFilter: null // sin equivalente CSS
  }
];

interface Props {
  maxSizeMB: number;
}

export function FiltrosClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('grayscale');
  const [blurIntensity, setBlurIntensity] = useState(8);
  const [sharpenIntensity, setSharpenIntensity] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = FILTERS.find((f) => f.value === filter)!;
  const intensity = filter === 'blur' ? blurIntensity : sharpenIntensity;

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
      fd.append('filter', filter);
      if (filter === 'blur' || filter === 'sharpen') {
        fd.append('intensity', String(intensity));
      }
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/filter', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al aplicar el filtro');
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
            {current.cssFilter
              ? 'Previsualización aproximada'
              : 'Previsualización no disponible para este filtro'}
          </p>
          <div className="card overflow-hidden w-fit max-w-full mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Previsualización"
              style={
                current.cssFilter
                  ? { filter: current.cssFilter(intensity) }
                  : undefined
              }
              className="block max-w-full max-h-[50vh]"
            />
          </div>
        </div>
      )}

      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700 mb-1">Filtro</p>
        {FILTERS.map((f) => (
          <label
            key={f.value}
            className={
              filter === f.value
                ? 'flex items-start gap-3 p-3 rounded-lg border border-brand-600 bg-brand-50 cursor-pointer'
                : 'flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer'
            }
          >
            <input
              type="radio"
              name="filter"
              value={f.value}
              checked={filter === f.value}
              onChange={() => setFilter(f.value)}
              className="mt-1 accent-brand-600"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">{f.label}</p>
              <p className="text-xs text-slate-600">{f.description}</p>
            </div>
          </label>
        ))}

        {filter === 'blur' && (
          <div className="pt-2">
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
              <span>Intensidad del desenfoque</span>
              <span className="text-slate-500 font-medium">{blurIntensity}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        )}

        {filter === 'sharpen' && (
          <div className="pt-2">
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
              <span>Intensidad de la nitidez</span>
              <span className="text-slate-500 font-medium">{sharpenIntensity}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={sharpenIntensity}
              onChange={(e) => setSharpenIntensity(Number(e.target.value))}
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
          {busy ? 'Aplicando…' : `Aplicar filtro ${files.length || ''}`}
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
