import { NextRequest, NextResponse } from 'next/server';
import { inspectImageMetadata } from '@/lib/sharp-utils';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Devuelve un resumen de los metadatos de cada imagen (EXIF, GPS, cámara…). */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No se ha subido ninguna imagen' },
        { status: 400 }
      );
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES_PER_REQUEST} archivos por petición` },
        { status: 400 }
      );
    }
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `"${f.name}" supera el tamaño máximo permitido` },
          { status: 400 }
        );
      }
    }

    const items = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const summary = await inspectImageMetadata(buf);
        return { name: file.name, ...summary };
      })
    );

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[/api/inspect-metadata]', err);
    return NextResponse.json(
      { error: 'No se ha podido analizar la imagen' },
      { status: 500 }
    );
  }
}
