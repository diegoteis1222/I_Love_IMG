'use client';

import { clsx } from 'clsx';
import { useCallback, useRef, useState } from 'react';

interface Props {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onFiles: (files: File[]) => void;
  hint?: string;
}

export function DropZone({
  accept = 'image/*',
  multiple = true,
  maxSizeMB = 25,
  onFiles,
  hint
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback(
    (files: File[]) => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      const tooLarge = files.find((f) => f.size > maxBytes);
      if (tooLarge) {
        setError(
          `"${tooLarge.name}" supera el tamaño máximo de ${maxSizeMB} MB.`
        );
        return false;
      }
      setError(null);
      return true;
    },
    [maxSizeMB]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      if (!validate(files)) return;
      onFiles(files);
    },
    [onFiles, validate]
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'card border-2 border-dashed flex flex-col items-center justify-center text-center px-6 py-14 cursor-pointer transition',
          dragOver
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
        )}
      >
        <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-2xl mb-3">
          📎
        </div>
        <p className="font-medium text-slate-900">
          Arrastra y suelta {multiple ? 'imágenes' : 'una imagen'} o haz clic
        </p>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
        <p className="mt-2 text-xs text-slate-400">
          Tamaño máximo {maxSizeMB} MB por archivo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
