import { NextRequest, NextResponse } from 'next/server';
import { AI_SERVICE_URL, MAX_FILE_SIZE_BYTES } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Proxy hacia el OCR del microservicio Python (EasyOCR).
 * Devuelve las zonas de texto detectadas con sus coordenadas.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" supera el tamaño máximo permitido` },
        { status: 400 }
      );
    }

    const upstream = new FormData();
    upstream.append('file', file);

    const res = await fetch(`${AI_SERVICE_URL}/detect-text`, {
      method: 'POST',
      body: upstream
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[/api/detect-text] AI service error:', res.status, text);
      return NextResponse.json(
        { error: 'El servicio de IA no ha podido analizar la imagen' },
        { status: 502 }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[/api/detect-text]', err);
    return NextResponse.json(
      { error: 'Error de conexión con el servicio de IA. ¿Está arrancado?' },
      { status: 503 }
    );
  }
}
