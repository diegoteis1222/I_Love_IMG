'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { triggerDownload, getFilenameFromContentDisposition } from '@/lib/download';

interface DetectedRegion {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  newText: string;
}

const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' }
];

const COLOR_PRESETS = [
  { value: '#000000', label: 'Negro' },
  { value: '#ffffff', label: 'Blanco' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#3b82f6', label: 'Azul' }
];

interface Props {
  maxSizeMB: number;
}

export function EditarTextoClient({ maxSizeMB }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [regions, setRegions] = useState<DetectedRegion[] | null>(null);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [color, setColor] = useState('#000000');
  const [detecting, setDetecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState<string>('descarga.png');

  const selectedRegions = regions?.filter((r) => r.selected) ?? [];

  async function detect() {
    if (!file) return;
    setDetecting(true);
    setError(null);
    setInfo(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/detect-text', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al detectar texto');
      }
      const data = await res.json();
      setImgDims({ w: data.width, h: data.height });
      const items: DetectedRegion[] = (data.items ?? []).map((it: Omit<DetectedRegion, 'selected' | 'newText'>) => ({
        ...it,
        selected: false,
        newText: ''
      }));
      setRegions(items);
      if (items.length === 0) {
        setInfo('No se ha detectado texto en la imagen.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setDetecting(false);
    }
  }

  function toggleRegion(index: number) {
    setRegions((prev) =>
      prev
        ? prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
        : prev
    );
  }

  function setRegionText(index: number, value: string) {
    setRegions((prev) =>
      prev
        ? prev.map((r, i) => (i === index ? { ...r, newText: value } : r))
        : prev
    );
  }

  async function process() {
    if (!file || !imgDims || selectedRegions.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('imgWidth', String(imgDims.w));
      fd.append('imgHeight', String(imgDims.h));
      fd.append('fontFamily', fontFamily);
      fd.append('color', color);
      fd.append(
        'regions',
        JSON.stringify(
          selectedRegions.map((r) => ({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            newText: r.newText.trim() || undefined
          }))
        )
      );

      const res = await fetch('/api/edit-text', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al editar el texto');
      }

      const blob = await res.blob();
      const previewBlob = new Blob([blob], { type: 'image/png' });
      setResultUrl(URL.createObjectURL(previewBlob));
      setResultBlob(blob);
      setResultName(
        getFilenameFromContentDisposition(
          res.headers.get('content-disposition'),
          'descarga.png'
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!resultBlob) return;
    triggerDownload(resultBlob, resultName);
  }

  /** Usa el resultado como nueva imagen de partida para otra pasada. */
  function continueEditing() {
    if (!resultBlob || !file) return;
    const dot = file.name.lastIndexOf('.');
    const base = dot >= 0 ? file.name.slice(0, dot) : file.name;
    const newFile = new File([resultBlob], `${base}.png`, { type: 'image/png' });
    setFile(newFile);
    setImgUrl(URL.createObjectURL(newFile));
    setRegions(null);
    setImgDims(null);
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
    setInfo(null);
  }

  function reset() {
    setFile(null);
    setImgUrl(null);
    setRegions(null);
    setImgDims(null);
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
    setInfo(null);
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
          hint="Sube una imagen: el OCR detectará el texto y podrás editarlo o eliminarlo."
        />
      )}

      {/* Imagen con zonas detectadas */}
      {file && imgUrl && !resultUrl && (
        <>
          <div className="relative w-fit max-w-full mx-auto card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Imagen a editar"
              draggable={false}
              className="block max-w-full max-h-[70vh] select-none"
            />
            {regions && imgDims &&
              regions.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleRegion(i)}
                  title={`"${r.text}" (confianza ${Math.round(r.confidence * 100)}%)`}
                  style={{
                    left: `${(r.x / imgDims.w) * 100}%`,
                    top: `${(r.y / imgDims.h) * 100}%`,
                    width: `${(r.width / imgDims.w) * 100}%`,
                    height: `${(r.height / imgDims.h) * 100}%`
                  }}
                  className={
                    r.selected
                      ? 'absolute border-2 border-brand-600 bg-brand-500/25 rounded-sm'
                      : 'absolute border-2 border-amber-400 bg-amber-300/10 hover:bg-amber-300/25 rounded-sm'
                  }
                />
              ))}
          </div>

          {!regions && (
            <button
              onClick={detect}
              disabled={detecting}
              className="btn-primary"
            >
              {detecting ? 'Detectando texto…' : '🔍 Detectar texto'}
            </button>
          )}

          {regions && regions.length > 0 && (
            <p className="text-xs text-slate-500">
              {regions.length} zona{regions.length === 1 ? '' : 's'} de texto
              detectada{regions.length === 1 ? '' : 's'}. Haz clic en las que
              quieras editar o eliminar.
            </p>
          )}

          {/* Zonas seleccionadas */}
          {selectedRegions.length > 0 && (
            <div className="card p-5 space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                Zonas seleccionadas
              </p>
              {regions!.map((r, i) =>
                r.selected ? (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="text-xs text-slate-500 truncate w-36 shrink-0"
                      title={r.text}
                    >
                      &ldquo;{r.text}&rdquo;
                    </span>
                    <input
                      type="text"
                      value={r.newText}
                      onChange={(e) => setRegionText(i, e.target.value)}
                      placeholder="Vacío = eliminar el texto"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setRegionText(i, r.text)}
                      className="text-xs text-slate-400 hover:text-brand-600 transition whitespace-nowrap"
                      title="Copiar el texto detectado para editarlo"
                    >
                      usar original
                    </button>
                  </div>
                ) : null
              )}

              {/* Opciones del texto nuevo */}
              {selectedRegions.some((r) => r.newText.trim() !== '') && (
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Fuente del texto nuevo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {FONT_OPTIONS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFontFamily(f.value)}
                          className={
                            fontFamily === f.value
                              ? 'rounded-lg border border-brand-600 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700'
                              : 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
                          }
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Color del texto nuevo
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
              )}
            </div>
          )}
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
              alt="Resultado con texto editado"
              className="block max-w-full max-h-[70vh]"
            />
          </div>
        </div>
      )}

      {info && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {info}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {file && regions && !resultBlob && (
          <button
            onClick={process}
            disabled={busy || selectedRegions.length === 0}
            className="btn-primary"
          >
            {busy
              ? 'Procesando…'
              : `Aplicar cambios ${selectedRegions.length || ''}`}
          </button>
        )}
        {resultBlob && (
          <>
            <button onClick={download} className="btn-primary">
              Descargar PNG
            </button>
            <button onClick={continueEditing} className="btn-secondary">
              Seguir editando
            </button>
          </>
        )}
        {file && (
          <button
            onClick={reset}
            className="btn-secondary"
            disabled={busy || detecting}
          >
            Cambiar imagen
          </button>
        )}
      </div>
    </div>
  );
}
