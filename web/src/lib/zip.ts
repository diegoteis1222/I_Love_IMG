import archiver from 'archiver';
import { PassThrough } from 'stream';

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Genera un ZIP en memoria con las entradas dadas.
 */
export async function createZip(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.pipe(stream);

    for (const entry of entries) {
      archive.append(entry.data, { name: entry.name });
    }
    archive.finalize();
  });
}
