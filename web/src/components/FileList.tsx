'use client';

interface FileItem {
  name: string;
  size: number;
}

interface Props {
  files: FileItem[];
  onRemove?: (index: number) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileList({ files, onRemove }: Props) {
  if (files.length === 0) return null;
  return (
    <ul className="card divide-y divide-slate-100">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center justify-between px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
          </div>
          {onRemove && (
            <button
              onClick={() => onRemove(i)}
              className="text-xs text-slate-400 hover:text-red-600 transition ml-3"
              aria-label={`Quitar ${file.name}`}
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
