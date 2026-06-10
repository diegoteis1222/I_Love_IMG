'use client';

import { useRef, useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

interface Sel {
  x: number;
  y: number;
  width: number;
  height: number;
}

const RATIOS = [
  { value: 0, label: 'Libre' },
  { value: 1, label: '1:1' },
  { value: 4 / 3, label: '4:3' },
  { value: 16 / 9, label: '16:9' },
  { value: 9 / 16, label: '9:16' }
] as const;

interface Props {
  maxSizeMB: number;
}

export function RecortarClient({ maxSizeMB }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [ratio, setRatio] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    setSel(null);
  }

  /** Posición del puntero en píxeles de la imagen original. */
  function getPos(e: React.PointerEvent): { x: number; y: number } {
    const el = overlayRef.current!;
    const rect = el.getBoundingClientRect();
    const scaleX = (imgDims?.w ?? rect.width) / rect.width;
    const scaleY = (imgDims?.h ?? rect.height) / rect.height;
    return {
      x: Math.min(Math.max(0, (e.clientX - rect.left) * scaleX), imgDims?.w ?? 0),
      y: Math.min(Math.max(0, (e.clientY - rect.top) * scaleY), imgDims?.h ?? 0)
    };
  }

  function makeSel(start: { x: number; y: number }, current: { x: number; y: number }): Sel {
    let x = Math.min(start.x, current.x);
    let y = Math.min(start.y, current.y);
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);

    if (ratio > 0 && width > 0) {
      // Forzamos la proporción ajustando la altura a partir del ancho
      height = width / ratio;
      if (current.y < start.y) {
        y = start.y - height;
      }
      // Si se sale de la imagen, reducimos manteniendo la proporción
      if (imgDims) {
        if (y < 0) {
          height += y;
          width = height * ratio;
          y = 0;
          if (current.x < start.x) x = start.x - width;
        }
        if (y + height > imgDims.h) {
          height = imgDims.h - y;
          width = height * ratio;
          if (current.x < start.x) x = start.x - width;
        }
      }
    }

    return { x, y, width, height };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!imgDims) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = getPos(e);
    setSel(null);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    setSel(makeSel(dragStart.current, getPos(e)));
  }

  function handlePointerUp() {
    if (!dragStart.current) return;
    dragStart.current = null;
    setSel((s) => (s && s.width >= 5 && s.height >= 5 ? s : null));
  }

  async function process() {
    if (!file || !sel) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('left', String(Math.round(sel.x)));
      fd.append('top', String(Math.round(sel.y)));
      fd.append('width', String(Math.round(sel.width)));
      fd.append('height', String(Math.round(sel.height)));

      const res = await fetch('/api/crop', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al recortar');
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

  function reset() {
    setFile(null);
    setImgUrl(null);
    setImgDims(null);
    setSel(null);
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
            setImgUrl(URL.createObjectURL(f));
          }}
          hint="Sube una imagen y arrastra sobre ella para seleccionar el recorte."
        />
      )}

      {file && imgUrl && (
        <>
          <div className="card p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Proporción</span>
            <div className="flex flex-wrap gap-1.5">
              {RATIOS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => {
                    setRatio(r.value);
                    setSel(null);
                  }}
                  className={
                    ratio === r.value
                      ? 'rounded-md border border-brand-600 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700'
                      : 'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
            {sel && (
              <span className="ml-auto text-xs font-medium text-slate-500">
                {Math.round(sel.width)} × {Math.round(sel.height)} px
              </span>
            )}
          </div>

          <div className="card overflow-hidden w-fit max-w-full mx-auto relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Imagen a recortar"
              draggable={false}
              onLoad={handleImageLoad}
              className="block max-w-full max-h-[70vh] select-none"
            />
            <div
              ref={overlayRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 cursor-crosshair touch-none"
            >
              {sel && imgDims && (
                <div
                  className="absolute border-2 border-brand-500 bg-transparent pointer-events-none"
                  style={{
                    left: `${(sel.x / imgDims.w) * 100}%`,
                    top: `${(sel.y / imgDims.h) * 100}%`,
                    width: `${(sel.width / imgDims.w) * 100}%`,
                    height: `${(sel.height / imgDims.h) * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)'
                  }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Arrastra sobre la imagen para dibujar la zona a conservar. Vuelve a
            arrastrar para corregirla.
          </p>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {file && (
          <button
            onClick={process}
            disabled={busy || !sel}
            className="btn-primary"
          >
            {busy ? 'Recortando…' : 'Recortar'}
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
