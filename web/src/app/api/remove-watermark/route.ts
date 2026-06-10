import { NextRequest, NextResponse } from 'next/server';
import { applyDescriptionToFilename, describeRemoveWatermark } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { AI_SERVICE_URL, MAX_FILE_SIZE_BYTES } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Proxy hacia el microservicio Python (LaMa inpainting). Recibe la imagen
 * y una máscara PNG (blanco = zona a eliminar) pintada por el usuario.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const mask = formData.get('mask');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }
    if (!(mask instanceof File)) {
      return NextResponse.json(
        { error: 'Falta la máscara: pinta la zona que quieres eliminar' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" supera el tamaño máximo permitido` },
        { status: 400 }
      );
    }

    const upstream = new FormData();
    upstream.append('file', file);
    upstream.append('mask', mask, 'mask.png');

    const res = await fetch(`${AI_SERVICE_URL}/inpaint`, {
      method: 'POST',
      body: upstream
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[/api/remove-watermark] AI service error:', res.status, text);
      return NextResponse.json(
        { error: 'El servicio de IA no ha podido procesar la imagen' },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const description = describeRemoveWatermark();
    const filename = applyDescriptionToFilename(file.name, 'png', description);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(filename)
      }
    });
  } catch (err) {
    console.error('[/api/remove-watermark]', err);
    return NextResponse.json(
      { error: 'Error de conexión con el servicio de IA. ¿Está arrancado?' },
      { status: 503 }
    );
  }
}
