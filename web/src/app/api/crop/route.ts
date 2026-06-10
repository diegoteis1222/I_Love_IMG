import { NextRequest, NextResponse } from 'next/server';
import { cropImage, replaceExtension } from '@/lib/sharp-utils';
import { applyDescriptionToFilename, describeCrop } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseInteger(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const left = parseInteger(formData.get('left'));
    const top = parseInteger(formData.get('top'));
    const width = parseInteger(formData.get('width'));
    const height = parseInteger(formData.get('height'));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" supera el tamaño máximo permitido` },
        { status: 400 }
      );
    }
    if (
      left === undefined || top === undefined ||
      !width || !height || width <= 0 || height <= 0
    ) {
      return NextResponse.json(
        { error: 'Selecciona la zona a recortar' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await cropImage(buf, { left, top, width, height });

    const description = describeCrop(result.width, result.height);
    const renamed = replaceExtension(file.name, result.format);
    const filename = applyDescriptionToFilename(renamed, result.format, description);

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(filename)
      }
    });
  } catch (err) {
    console.error('[/api/crop]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
