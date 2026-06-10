import { NextRequest, NextResponse } from 'next/server';
import {
  applyFilter,
  isFilterType,
  replaceExtension,
  FILTER_LABELS
} from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeFilter } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const filter = formData.get('filter');
    const intensity = parseNumber(formData.get('intensity'));
    const files = formData.getAll('files') as File[];

    if (typeof filter !== 'string' || !isFilterType(filter)) {
      return NextResponse.json(
        { error: 'Filtro no válido' },
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

    const description = describeFilter(FILTER_LABELS[filter]);

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const { buffer: out, format } = await applyFilter(buf, {
          filter,
          intensity
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
        'Content-Disposition': attachmentDisposition(`${description}.zip`)
      }
    });
  } catch (err) {
    console.error('[/api/filter]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
