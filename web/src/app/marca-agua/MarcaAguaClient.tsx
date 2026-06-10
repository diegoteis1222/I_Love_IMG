'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

type Position =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'tile';

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'top-left', label: '↖' },
  { value: 'top-center', label: '↑' },
  { value: 'top-right', label: '↗' },
  { value: 'middle-left', label: '←' },
  { value: 'center', label: '●' },
  { value: 'middle-right', label: '→' },
  { value: 'bottom-left', label: '↙' },
  { value: 'bottom-center', label: '↓' },
  { value: 'bottom-right', label: '↘' }
];

const COLOR_PRESETS = [
  { value: '#ffffff', label: 'Blanco' },
  { value: '#000000', label: 'Negro' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#3b82f6', label: 'Azul' }
];

interface Props {
  maxSizeMB: number;
}

export function MarcaAguaClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('© Mi Empresa 2026');
  const [position, setPosition] = useState<Position>('bottom-right');
  const [fontSize, setFontSize] = useState(0); // 0 = auto
  const [opacity, setOpacity] = useState(30);
  const [color, setColor] = useState('#ffffff');
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When switching to tile, set a default rotation
  function handlePositionChange(pos: Position) {
    setPosition(pos);
    if (pos === 'tile' && rotation === 0) {
      setRotation(-30);
    } else if (pos !== 'tile' && rotation === -30) {
      setRotation(0);
    }
  }

  async function process() {
    if (files.length === 0 || !text.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('text', text.trim());
      fd.append('position', position);
      if (fontSize > 0) fd.append('fontSize', String(fontSize));
      fd.append('opacity', String(opacity));
      fd.append('color', color);
      fd.append('rotation', String(rotation));
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/watermark', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al añadir marca de agua');
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
        hint="Acepta JPG, PNG, WebP, AVIF, TIFF."
      />

      {files.length > 0 && (
        <FileList
          files={files}
          onRemove={(i) =>
            setFiles((prev) => prev.filter((_, idx) => idx !== i))
          }
        />
      )}

      {/* Watermark Text */}
      <div className="card p-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Texto de la marca de agua
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="© Mi Empresa 2026"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Position Grid */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Posición
          </label>
          <div className="flex items-start gap-4">
            <div className="grid grid-cols-3 gap-1 p-2 rounded-lg bg-slate-100 border border-slate-200">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => handlePositionChange(pos.value)}
                  className={
                    position === pos.value
                      ? 'w-9 h-9 rounded flex items-center justify-center text-sm bg-brand-600 text-white font-bold shadow-sm'
                      : 'w-9 h-9 rounded flex items-center justify-center text-sm bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700 border border-slate-200'
                  }
                  title={pos.value}
                >
                  {pos.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handlePositionChange('tile')}
              className={
                position === 'tile'
                  ? 'rounded-lg border border-brand-600 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700'
                  : 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
              }
            >
              🔲 Mosaico
            </button>
          </div>
        </div>

        {/* Color */}
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

        {/* Opacity */}
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Opacidad</span>
            <span className="text-slate-500 font-medium">{opacity}%</span>
          </label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Tamaño de fuente</span>
            <span className="text-slate-500 font-medium">
              {fontSize === 0 ? 'Auto' : `${fontSize}px`}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={200}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            0 = tamaño automático proporcional a la imagen.
          </p>
        </div>

        {/* Rotation */}
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>Rotación</span>
            <span className="text-slate-500 font-medium">{rotation}°</span>
          </label>
          <input
            type="range"
            min={-180}
            max={180}
            step={5}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
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
          disabled={busy || files.length === 0 || !text.trim()}
          className="btn-primary"
        >
          {busy ? 'Procesando…' : `Aplicar marca de agua ${files.length || ''}`}
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
