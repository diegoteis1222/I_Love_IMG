import { NextRequest, NextResponse } from 'next/server';
import {
  buildRegionsMask,
  renderTextRegions,
  type TextRegion
} from '@/lib/sharp-utils';
import { applyDescriptionToFilename, describeEditText } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { AI_SERVICE_URL, MAX_FILE_SIZE_BYTES } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_REGIONS = 50;
const MAX_TEXT_LENGTH = 200;
const VALID_FONTS = ['sans-serif', 'serif', 'monospace'];

/**
 * Edita o elimina texto detectado por OCR: construye una máscara con las
 * cajas seleccionadas, borra su contenido con inpainting (LaMa) y dibuja
 * los textos de reemplazo en su lugar.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const regionsRaw = formData.get('regions');
    const imgWidth = parseInt(String(formData.get('imgWidth') ?? ''), 10);
    const imgHeight = parseInt(String(formData.get('imgHeight') ?? ''), 10);
    const fontFamilyRaw = formData.get('fontFamily');
    const colorRaw = formData.get('color');

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
      !Number.isFinite(imgWidth) || !Number.isFinite(imgHeight) ||
      imgWidth <= 0 || imgHeight <= 0 || imgWidth > 20000 || imgHeight > 20000
    ) {
      return NextResponse.json(
        { error: 'Dimensiones de imagen no válidas' },
        { status: 400 }
      );
    }

    let regions: TextRegion[];
    try {
      const parsed = JSON.parse(String(regionsRaw));
      if (!Array.isArray(parsed)) throw new Error();
      regions = parsed
        .filter(
          (r) =>
            r &&
            Number.isFinite(r.x) && Number.isFinite(r.y) &&
            Number.isFinite(r.width) && Number.isFinite(r.height) &&
            r.width > 0 && r.height > 0
        )
        .map((r) => ({
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          newText:
            typeof r.newText === 'string'
              ? r.newText.slice(0, MAX_TEXT_LENGTH)
              : undefined
        }));
    } catch {
      return NextResponse.json(
        { error: 'Las zonas de texto no son válidas' },
        { status: 400 }
      );
    }

    if (regions.length === 0) {
      return NextResponse.json(
        { error: 'Selecciona al menos una zona de texto' },
        { status: 400 }
      );
    }
    if (regions.length > MAX_REGIONS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_REGIONS} zonas por petición` },
        { status: 400 }
      );
    }

    const fontFamily =
      typeof fontFamilyRaw === 'string' && VALID_FONTS.includes(fontFamilyRaw)
        ? fontFamilyRaw
        : 'sans-serif';
    const color =
      typeof colorRaw === 'string' && /^#[0-9a-fA-F]{6}$/.test(colorRaw)
        ? colorRaw
        : '#000000';

    // 1. Máscara con las zonas a borrar
    const mask = await buildRegionsMask(imgWidth, imgHeight, regions);

    // 2. Inpainting en el servicio de IA
    const upstream = new FormData();
    upstream.append('file', file);
    upstream.append('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'mask.png');

    const res = await fetch(`${AI_SERVICE_URL}/inpaint`, {
      method: 'POST',
      body: upstream
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[/api/edit-text] AI service error:', res.status, text);
      return NextResponse.json(
        { error: 'El servicio de IA no ha podido procesar la imagen' },
        { status: 502 }
      );
    }

    // 3. Dibujamos los textos de reemplazo sobre el resultado
    let out = Buffer.from(await res.arrayBuffer());
    out = await renderTextRegions(out, regions, { fontFamily, color });

    const filename = applyDescriptionToFilename(
      file.name,
      'png',
      describeEditText()
    );

    return new NextResponse(out, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(filename)
      }
    });
  } catch (err) {
    console.error('[/api/edit-text]', err);
    return NextResponse.json(
      { error: 'Error de conexión con el servicio de IA. ¿Está arrancado?' },
      { status: 503 }
    );
  }
}
