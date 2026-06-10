import { NextRequest, NextResponse } from 'next/server';
import {
  resizeImage,
  replaceExtension,
  type ResizeFit
} from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeResize } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_FITS: ResizeFit[] = ['cover', 'contain', 'fill', 'inside', 'outside'];

function parseFit(value: FormDataEntryValue | null): ResizeFit {
  if (typeof value === 'string' && VALID_FITS.includes(value as ResizeFit)) {
    return value as ResizeFit;
  }
  return 'inside';
}

function parseInteger(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseBool(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === '1' || value === 'on';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const width = parseInteger(formData.get('width'));
    const height = parseInteger(formData.get('height'));
    const scalePercent = parseInteger(formData.get('scalePercent'));
    const fit = parseFit(formData.get('fit'));
    const withoutEnlargement = parseBool(formData.get('withoutEnlargement'));
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
    if (!width && !height && !scalePercent) {
      return NextResponse.json(
        { error: 'Debes especificar ancho, alto o porcentaje de escala' },
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

    const description = describeResize({ width, height, scalePercent });

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const { buffer: out, format } = await resizeImage(buf, {
          width,
          height,
          scalePercent,
          fit,
          withoutEnlargement
        });
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
        'Content-Disposition': attachmentDisposition(`redimensionadas (${description}).zip`)
      }
    });
  } catch (err) {
    console.error('[/api/resize]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
