import { NextRequest, NextResponse } from 'next/server';
import { addBorder, replaceExtension } from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeBorder } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const thicknessRaw = formData.get('thickness');
    const colorRaw = formData.get('color');
    const files = formData.getAll('files') as File[];

    const thickness = parseInt(String(thicknessRaw ?? ''), 10);
    const color =
      typeof colorRaw === 'string' && /^#[0-9a-fA-F]{6}$/.test(colorRaw)
        ? colorRaw
        : '#ffffff';

    if (!Number.isFinite(thickness) || thickness <= 0 || thickness > 500) {
      return NextResponse.json(
        { error: 'El grosor del borde debe estar entre 1 y 500 px' },
        { status: 400 }
      );
    }
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

    const description = describeBorder(thickness);

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const { buffer: out, format } = await addBorder(buf, { thickness, color });
        const renamed = replaceExtension(file.name, format);
        return {
          name: applyDescriptionToFilename(renamed, format, description),
          data: out
        };
      })
    );

    if (results.length === 1) {
      return new NextResponse(results[0].data, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': attachmentDisposition(results[0].name)
        }
      });
    }

    const zip = await createZip(results);
    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(`con borde.zip`)
      }
    });
  } catch (err) {
    console.error('[/api/border]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
