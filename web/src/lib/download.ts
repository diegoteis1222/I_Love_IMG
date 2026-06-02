/**
 * Utilidad de descarga compartida.
 *
 * Envuelve el blob en un nuevo Blob de tipo "application/octet-stream"
 * para forzar al navegador a guardar el archivo sin previsualizarlo
 * ni abrirlo automáticamente.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  // Re-empaquetamos como octet-stream para que el navegador lo trate
  // siempre como descarga, no como recurso visualizable.
  const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(downloadBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Pequeño retraso antes de liberar la URL para evitar carreras en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getFilenameFromContentDisposition(
  contentDisposition: string | null,
  fallback = 'descarga'
): string {
  if (!contentDisposition) return fallback;
  // Soporta filename="..." y filename*=UTF-8''...
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      /* fallthrough */
    }
  }
  const match = /filename="([^"]+)"/.exec(contentDisposition);
  return match?.[1] ?? fallback;
}
