'use client';

import { useRef, useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { triggerDownload } from '@/lib/download';
import { applyDescriptionToFilename, describeRemoveWatermark } from '@/lib/filename';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  size: number; // en píxeles de la imagen original
  erase: boolean;
}

interface Props {
  maxSizeMB: number;
}

export function EliminarMarcaAguaClient({ maxSizeMB }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Stroke | null>(null);

  const hasMask = strokes.some((s) => !s.erase);

  // ── Canvas / dibujo ────────────────────────────────────────────────────────

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // El canvas trabaja a la resolución real de la imagen; el CSS lo escala
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  // Tamaño de pincel en píxeles de imagen, para que se vea igual en pantalla
  // independientemente de la resolución original
  function brushSizeInImagePixels(): number {
    const canvas = canvasRef.current;
    if (!canvas) return brushSize;
    const rect = canvas.getBoundingClientRect();
    return brushSize * (canvas.width / rect.width);
  }

  function drawSegment(from: Point, to: Point, size: number, erase: boolean) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    // Desplazamiento mínimo para que un clic suelto pinte un punto
    ctx.lineTo(to.x + 0.01, to.y + 0.01);
    ctx.stroke();
  }

  function replayStrokes(list: Stroke[]) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of list) {
      for (let i = 0; i < s.points.length; i++) {
        const from = s.points[Math.max(0, i - 1)];
        drawSegment(from, s.points[i], s.size, s.erase);
      }
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    const stroke: Stroke = {
      points: [pos],
      size: brushSizeInImagePixels(),
      erase: tool === 'eraser'
    };
    currentStroke.current = stroke;
    drawSegment(pos, pos, stroke.size, stroke.erase);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = currentStroke.current;
    if (!stroke) return;
    const pos = getPos(e);
    const prev = stroke.points[stroke.points.length - 1];
    drawSegment(prev, pos, stroke.size, stroke.erase);
    stroke.points.push(pos);
  }

  function handlePointerUp() {
    const stroke = currentStroke.current;
    if (!stroke) return;
    currentStroke.current = null;
    setStrokes((prev) => [...prev, stroke]);
  }

  function undo() {
    const next = strokes.slice(0, -1);
    setStrokes(next);
    replayStrokes(next);
  }

  function clearMask() {
    setStrokes([]);
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Máscara y procesado ────────────────────────────────────────────────────

  /** Convierte el canvas (trazos rojos) en máscara binaria blanco/negro. */
  function exportMask(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return Promise.resolve(null);

    const { width, height } = canvas;
    const src = ctx.getImageData(0, 0, width, height);
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const outCtx = out.getContext('2d')!;
    const outData = outCtx.createImageData(width, height);
    for (let i = 0; i < src.data.length; i += 4) {
      const v = src.data[i + 3] > 32 ? 255 : 0;
      outData.data[i] = v;
      outData.data[i + 1] = v;
      outData.data[i + 2] = v;
      outData.data[i + 3] = 255;
    }
    outCtx.putImageData(outData, 0, 0);
    return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  }

  async function process() {
    if (!file || !hasMask) return;
    setBusy(true);
    setError(null);

    try {
      const maskBlob = await exportMask();
      if (!maskBlob) throw new Error('No se ha podido generar la máscara');

      const fd = new FormData();
      fd.append('file', file);
      fd.append('mask', maskBlob, 'mask.png');

      const res = await fetch('/api/remove-watermark', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al eliminar la marca de agua');
      }

      const blob = await res.blob();
      const previewBlob = new Blob([blob], { type: 'image/png' });
      setResultUrl(URL.createObjectURL(previewBlob));
      setResultBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!resultBlob || !file) return;
    const filename = applyDescriptionToFilename(
      file.name,
      'png',
      describeRemoveWatermark()
    );
    triggerDownload(resultBlob, filename);
  }

  /** Usa el resultado como nueva imagen de partida para otra pasada. */
  function continueEditing() {
    if (!resultBlob || !file) return;
    const dot = file.name.lastIndexOf('.');
    const base = dot >= 0 ? file.name.slice(0, dot) : file.name;
    const newFile = new File([resultBlob], `${base}.png`, { type: 'image/png' });
    setFile(newFile);
    setImgUrl(URL.createObjectURL(newFile));
    setStrokes([]);
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
  }

  function reset() {
    setFile(null);
    setImgUrl(null);
    setStrokes([]);
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
          hint="Sube una imagen y pinta sobre la marca de agua u objeto a eliminar."
        />
      )}

      {/* Editor de máscara */}
      {file && imgUrl && !resultUrl && (
        <>
          <div className="card p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setTool('brush')}
                  className={
                    tool === 'brush'
                      ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm'
                      : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
                  }
                >
                  🖌 Pincel
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={
                    tool === 'eraser'
                      ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm'
                      : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
                  }
                >
                  ◻ Borrador
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                <span className="text-xs text-slate-500 whitespace-nowrap">Grosor</span>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 accent-brand-600"
                />
                <span className="w-8 text-right text-xs font-semibold text-slate-700">
                  {brushSize}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={undo}
                  disabled={strokes.length === 0}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ↩ Deshacer
                </button>
                <button
                  type="button"
                  onClick={clearMask}
                  disabled={strokes.length === 0}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Pinta en rojo sobre la marca de agua, texto u objeto que quieras
              eliminar. La IA rellenará la zona con el contenido de alrededor.
            </p>
          </div>

          <div className="card overflow-hidden w-fit max-w-full mx-auto relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Imagen a editar"
              draggable={false}
              onLoad={handleImageLoad}
              className="block max-w-full max-h-[70vh] select-none"
            />
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 w-full h-full opacity-60 cursor-crosshair touch-none"
            />
          </div>
        </>
      )}

      {/* Resultado */}
      {resultUrl && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Resultado</p>
          <div className="card overflow-hidden w-fit max-w-full mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="Resultado sin marca de agua"
              className="block max-w-full max-h-[70vh]"
            />
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
          <button
            onClick={process}
            disabled={busy || !hasMask}
            className="btn-primary"
          >
            {busy ? 'Eliminando…' : 'Eliminar zona marcada'}
          </button>
        )}
        {resultBlob && (
          <>
            <button onClick={download} className="btn-primary">
              Descargar PNG
            </button>
            <button onClick={continueEditing} className="btn-secondary">
              Seguir retocando
            </button>
          </>
        )}
        {file && (
          <button onClick={reset} className="btn-secondary" disabled={busy}>
            Cambiar imagen
          </button>
        )}
      </div>

      {file && !hasMask && !resultUrl && (
        <p className="text-xs text-slate-500">
          Pinta al menos una zona para poder procesar la imagen.
        </p>
      )}
    </div>
  );
}
