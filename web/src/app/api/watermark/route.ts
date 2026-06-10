import { NextRequest, NextResponse } from 'next/server';
import {
  addWatermark,
  type WatermarkPosition
} from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeWatermark } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_POSITIONS: WatermarkPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
  'tile'
];

function parsePosition(value: FormDataEntryValue | null): WatermarkPosition {
  if (typeof value === 'string' && VALID_POSITIONS.includes(value as WatermarkPosition)) {
    return value as WatermarkPosition;
  }
  return 'bottom-right';
}

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const text = formData.get('text');
    const position = parsePosition(formData.get('position'));
    const fontSize = parseNumber(formData.get('fontSize'));
    const opacity = parseNumber(formData.get('opacity'));
    const color = (formData.get('color') as string) || '#ffffff';
    const rotation = parseNumber(formData.get('rotation'));
    const files = formData.getAll('files') as File[];

    if (typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        { error: 'El texto de la marca de agua no puede estar vacío' },
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

    const description = describeWatermark();

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const out = await addWatermark(buf, {
          text: text.trim(),
          position,
          fontSize,
          opacity,
          color,
          rotation
        });

        // Detect extension from original file
        const dot = file.name.lastIndexOf('.');
        const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : 'jpg';

        return {
          name: applyDescriptionToFilename(file.name, ext, description),
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
        'Content-Disposition': attachmentDisposition(`con marca de agua.zip`)
      }
    });
  } catch (err) {
    console.error('[/api/watermark]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
