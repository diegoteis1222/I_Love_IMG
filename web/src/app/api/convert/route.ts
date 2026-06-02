import { NextRequest, NextResponse } from 'next/server';
import {
  convertImage,
  isSupportedFormat,
  FORMAT_EXTENSIONS,
  replaceExtension
} from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeConvert } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_REQUEST
} from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const format = formData.get('format');
    const qualityRaw = formData.get('quality');
    const files = formData.getAll('files') as File[];

    if (typeof format !== 'string' || !isSupportedFormat(format)) {
      return NextResponse.json(
        { error: 'Formato de salida no válido' },
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

    const quality = qualityRaw ? parseInt(String(qualityRaw), 10) : 90;
    const ext = FORMAT_EXTENSIONS[format];
    const description = describeConvert(format, quality);

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const out = await convertImage(buf, format, quality);
        const renamed = replaceExtension(file.name, ext);
        return {
          name: applyDescriptionToFilename(renamed, ext, description),
          data: out
        };
      })
    );

    if (results.length === 1) {
      return new NextResponse(results[0].data, {
        status: 200,
        headers: {
          // Forzamos descarga: el navegador no puede previsualizar octet-stream
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
        'Content-Disposition': attachmentDisposition(`convertidas (${description}).zip`)
      }
    });
  } catch (err) {
    console.error('[/api/convert]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
