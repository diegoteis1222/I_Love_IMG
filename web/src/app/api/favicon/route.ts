import { NextRequest, NextResponse } from 'next/server';
import { generateFavicons } from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const fitRaw = formData.get('fit');
    const fit = fitRaw === 'contain' ? 'contain' : 'cover';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" supera el tamaño máximo permitido` },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const entries = await generateFavicons(buf, { fit });

    const zip = await createZip(entries);
    const dot = file.name.lastIndexOf('.');
    const base = dot >= 0 ? file.name.slice(0, dot) : file.name;

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(`${base} (favicons).zip`)
      }
    });
  } catch (err) {
    console.error('[/api/favicon]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
