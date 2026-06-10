import { NextRequest, NextResponse } from 'next/server';
import { rotateImage, replaceExtension } from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeRotate } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === '1' || value === 'on';
}

function parseHexColor(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const angleRaw = parseNumber(formData.get('angle'));
    // Normalizamos a [0, 360) para que -90 equivalga a 270
    const angle = angleRaw !== undefined
      ? ((Math.round(angleRaw) % 360) + 360) % 360
      : 0;
    const flipH = parseBool(formData.get('flipH'));
    const flipV = parseBool(formData.get('flipV'));
    const background = parseHexColor(formData.get('background'));
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
    if (angle === 0 && !flipH && !flipV) {
      return NextResponse.json(
        { error: 'Debes indicar una rotación o un reflejo' },
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

    const description = describeRotate({ angle, flipH, flipV });

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const { buffer: out, format } = await rotateImage(buf, {
          angle,
          flipH,
          flipV,
          background
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
        'Content-Disposition': attachmentDisposition(`rotadas (${description}).zip`)
      }
    });
  } catch (err) {
    console.error('[/api/rotate]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
