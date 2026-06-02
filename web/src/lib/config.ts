/**
 * Configuración centralizada del frontend.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'I Love IMG';

export const MAX_FILE_SIZE_MB = parseInt(
  process.env.MAX_FILE_SIZE_MB ?? '25',
  10
);

export const MAX_FILES_PER_REQUEST = parseInt(
  process.env.MAX_FILES_PER_REQUEST ?? '20',
  10
);

export const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ?? 'http://localhost:8001';

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
