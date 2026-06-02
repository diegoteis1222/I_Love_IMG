import { NextRequest, NextResponse } from 'next/server';
import {
  compressImage,
  replaceExtension,
  type CompressionMode
} from '@/lib/sharp-utils';
import { createZip } from '@/lib/zip';
import { applyDescriptionToFilename, describeCompress } from '@/lib/filename';
import { attachmentDisposition } from '@/lib/http-headers';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_MODES: CompressionMode[] = ['lossless-ish', 'balanced', 'aggressive'];

function parseMode(value: FormDataEntryValue | null): CompressionMode {
  if (typeof value === 'string' && VALID_MODES.includes(value as CompressionMode)) {
    return value as CompressionMode;
  }
  return 'balanced';
}

function parseBool(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === '1' || value === 'on';
}

function parseInteger(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mode = parseMode(formData.get('mode'));
    const toWebp = parseBool(formData.get('toWebp'));
    const stripMetadata =
      formData.get('stripMetadata') === null
        ? true
        : parseBool(formData.get('stripMetadata'));
    const maxDimension = parseInteger(formData.get('maxDimension'));
    const scalePercentRaw = parseInteger(formData.get('scalePercent'));
    const scalePercent =
      scalePercentRaw && scalePercentRaw > 0 && scalePercentRaw < 100
        ? scalePercentRaw
        : undefined;
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
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `"${f.name}" supera el tamaño máximo permitido` },
          { status: 400 }
        );
      }
    }

    const description = describeCompress({ mode, toWebp, scalePercent, maxDimension });

    const results = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const { buffer: out, format } = await compressImage(buf, {
          mode,
          toWebp,
          stripMetadata,
          maxDimension,
          scalePercent
        });

        // Si la "compresión" no redujo el tamaño, devolvemos el original tal cual.
        // Esto pasa típicamente al re-encodear JPGs ya comprimidos en modo
        // "casi sin pérdida" (calidad 92) cuando el original venía a calidad <92.
        if (out.length >= file.size) {
          return {
            name: file.name,
            data: buf,
            originalSize: file.size,
            newSize: file.size,
            alreadyOptimal: true as const
          };
        }

        const renamed = replaceExtension(file.name, format);
        return {
          name: applyDescriptionToFilename(renamed, format, description),
          data: out,
          originalSize: file.size,
          newSize: out.length,
          alreadyOptimal: false as const
        };
      })
    );

    if (results.length === 1) {
      const r = results[0];
      const reduction = Math.round((1 - r.newSize / r.originalSize) * 100);
      return new NextResponse(r.data, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': attachmentDisposition(r.name),
          'X-Original-Size': String(r.originalSize),
          'X-New-Size': String(r.newSize),
          'X-Reduction-Pct': String(Math.max(0, reduction)),
          'X-Already-Optimal': r.alreadyOptimal ? '1' : '0'
        }
      });
    }

    const zip = await createZip(results);
    const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
    const totalNew = results.reduce((s, r) => s + r.newSize, 0);
    const reduction = Math.round((1 - totalNew / totalOriginal) * 100);
    const allOptimal = results.every((r) => r.alreadyOptimal);
    const someOptimal = results.some((r) => r.alreadyOptimal);

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(`comprimidas (${description}).zip`),
        'X-Original-Size': String(totalOriginal),
        'X-New-Size': String(totalNew),
        'X-Reduction-Pct': String(Math.max(0, reduction)),
        'X-Already-Optimal': allOptimal ? '1' : someOptimal ? 'partial' : '0'
      }
    });
  } catch (err) {
    console.error('[/api/compress]', err);
    return NextResponse.json(
      { error: 'No se ha podido procesar la imagen' },
      { status: 500 }
    );
  }
}
