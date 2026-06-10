/**
 * Catálogo central de herramientas.
 * Añade aquí cualquier herramienta nueva: aparecerá automáticamente en la home.
 */

export type ToolStatus = 'available' | 'coming-soon';

export interface Tool {
  slug: string;
  name: string;
  description: string;
  icon: string; // Emoji o nombre de icono
  status: ToolStatus;
  category: 'transform' | 'enhance' | 'edit' | 'pdf';
}

export const TOOLS: Tool[] = [
  // --- MVP ---
  {
    slug: 'convertir',
    name: 'Convertir formato',
    description: 'Cambia entre JPG, PNG, WebP, AVIF, TIFF y más.',
    icon: '🔄',
    status: 'available',
    category: 'transform'
  },
  {
    slug: 'comprimir',
    name: 'Comprimir',
    description: 'Reduce el tamaño manteniendo calidad visual.',
    icon: '📉',
    status: 'available',
    category: 'transform'
  },
  {
    slug: 'quitar-fondo',
    name: 'Quitar fondo',
    description: 'Elimina el fondo automáticamente con IA.',
    icon: '✂️',
    status: 'available',
    category: 'enhance'
  },

  // --- Fase 2 (placeholder) ---
  {
    slug: 'rotar',
    name: 'Rotar y reflejar',
    description: 'Gira o voltea imágenes en cualquier ángulo.',
    icon: '🔁',
    status: 'available',
    category: 'transform'
  },
  {
    slug: 'redimensionar',
    name: 'Redimensionar',
    description: 'Cambia las dimensiones por píxeles o ratio.',
    icon: '📐',
    status: 'available',
    category: 'transform'
  },
  {
    slug: 'marca-agua',
    name: 'Marca de agua',
    description: 'Añade texto o imagen como marca de agua.',
    icon: '💧',
    status: 'available',
    category: 'edit'
  },
  {
    slug: 'anadir-texto',
    name: 'Añadir texto',
    description: 'Inserta texto sobre la imagen.',
    icon: '🅰️',
    status: 'available',
    category: 'edit'
  },
  {
    slug: 'recortar',
    name: 'Recortar',
    description: 'Selecciona visualmente la zona a conservar.',
    icon: '🔲',
    status: 'available',
    category: 'transform'
  },
  {
    slug: 'ajustes',
    name: 'Ajustes de imagen',
    description: 'Brillo, contraste, saturación y tono.',
    icon: '🎚️',
    status: 'available',
    category: 'enhance'
  },
  {
    slug: 'filtros',
    name: 'Filtros',
    description: 'Grises, sepia, negativo, desenfoque y nitidez.',
    icon: '🎨',
    status: 'available',
    category: 'enhance'
  },
  {
    slug: 'bordes',
    name: 'Bordes y marcos',
    description: 'Añade un borde de color alrededor de la imagen.',
    icon: '🖼️',
    status: 'available',
    category: 'edit'
  },
  {
    slug: 'favicon-pack',
    name: 'Crear favicon',
    description: 'Genera el paquete completo de iconos para tu web.',
    icon: '🌐',
    status: 'available',
    category: 'transform'
  },
  {
    slug: 'eliminar-metadatos',
    name: 'Eliminar metadatos',
    description: 'Detecta y borra EXIF, GPS y datos de la cámara.',
    icon: '🔒',
    status: 'available',
    category: 'transform'
  },

  // --- Fase 3+ ---
  {
    slug: 'eliminar-marca-agua',
    name: 'Quitar marca de agua',
    description: 'Pinta sobre la marca de agua u objeto y la IA lo elimina.',
    icon: '🧹',
    status: 'available',
    category: 'enhance'
  },
  {
    slug: 'editar-texto',
    name: 'Editar texto en imagen',
    description: 'Detecta texto con OCR y edítalo o elimínalo.',
    icon: '🔤',
    status: 'available',
    category: 'edit'
  }
];

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export const CATEGORIES = {
  transform: 'Transformar',
  enhance: 'Mejorar',
  edit: 'Editar',
  pdf: 'PDF'
} as const;
