/**
 * Construye un header Content-Disposition seguro con filename Unicode.
 * Usa RFC 5987 (filename*) para nombres con acentos o caracteres no-ASCII,
 * y un filename ASCII como fallback.
 */
export function attachmentDisposition(filename: string): string {
  // ASCII fallback: reemplaza caracteres no-ASCII por '_'
  const asciiSafe = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  const utf8Encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`;
}
