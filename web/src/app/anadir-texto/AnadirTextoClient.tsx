'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { FileList } from '@/components/FileList';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

type Position =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

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

const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' }
];

const COLOR_PRESETS = [
  { value: '#ffffff', label: 'Blanco' },
  { value: '#000000', label: 'Negro' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' }
];

interface Props {
  maxSizeMB: number;
}

export function AnadirTextoClient({ maxSizeMB }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [position, setPosition] = useState<Position>('bottom-center');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [fontSize, setFontSize] = useState(0); // 0 = auto
  const [color, setColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('');
  const [bgEnabled, setBgEnabled] = useState(false);
  const [shadow, setShadow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function process() {
    if (files.length === 0 || !text.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('text', text.trim());
      fd.append('position', position);
      fd.append('fontFamily', fontFamily);
      if (fontSize > 0) fd.append('fontSize', String(fontSize));
      fd.append('color', color);
      if (bgEnabled && bgColor) fd.append('bgColor', bgColor);
      fd.append('shadow', String(shadow));
      files.forEach((f) => fd.append('files', f));

      const res = await fetch('/api/add-text', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al añadir texto');
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

      <div className="card p-5 space-y-5">
        {/* Text input */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Texto
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe aquí el texto que quieres añadir…"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
          />
          <p className="mt-1 text-xs text-slate-500">
            Puedes usar saltos de línea para texto multilínea.
          </p>
        </div>

        {/* Position Grid */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Posición
          </label>
          <div className="grid grid-cols-3 gap-1 p-2 rounded-lg bg-slate-100 border border-slate-200 w-fit">
            {POSITIONS.map((pos) => (
              <button
                key={pos.value}
                type="button"
                onClick={() => setPosition(pos.value)}
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
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Fuente
          </label>
          <div className="flex flex-wrap gap-2">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFontFamily(f.value)}
                className={
                  fontFamily === f.value
                    ? 'rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700'
                    : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                }
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
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

        {/* Text Color */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Color del texto
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

        {/* Background Color */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bgEnabled}
              onChange={(e) => {
                setBgEnabled(e.target.checked);
                if (e.target.checked && !bgColor) setBgColor('#000000');
              }}
              className="mt-1 accent-brand-600 h-4 w-4"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Fondo de texto
              </p>
              <p className="text-xs text-slate-600">
                Añade un rectángulo de fondo detrás del texto para mejorar la legibilidad.
              </p>
            </div>
          </label>
          {bgEnabled && (
            <div className="mt-3 ml-7 flex items-center gap-2">
              <input
                type="color"
                value={bgColor || '#000000'}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-300"
              />
              <span className="text-xs text-slate-500">Color del fondo</span>
            </div>
          )}
        </div>

        {/* Shadow */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={shadow}
            onChange={(e) => setShadow(e.target.checked)}
            className="mt-1 accent-brand-600 h-4 w-4"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Sombra del texto
            </p>
            <p className="text-xs text-slate-600">
              Añade una sombra suave para mejorar la visibilidad sobre fondos claros.
            </p>
          </div>
        </label>
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
          {busy ? 'Procesando…' : `Añadir texto ${files.length || ''}`}
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
