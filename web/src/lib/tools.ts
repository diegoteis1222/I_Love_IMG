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
    status: 'coming-soon',
    category: 'transform'
  },
  {
    slug: 'redimensionar',
    name: 'Redimensionar',
    description: 'Cambia las dimensiones por píxeles o ratio.',
    icon: '📐',
    status: 'coming-soon',
    category: 'transform'
  },
  {
    slug: 'marca-agua',
    name: 'Marca de agua',
    description: 'Añade texto o imagen como marca de agua.',
    icon: '💧',
    status: 'coming-soon',
    category: 'edit'
  },
  {
    slug: 'anadir-texto',
    name: 'Añadir texto',
    description: 'Inserta texto sobre la imagen.',
    icon: '🅰️',
    status: 'coming-soon',
    category: 'edit'
  },

  // --- Fase 3+ ---
  {
    slug: 'eliminar-marca-agua',
    name: 'Quitar marca de agua',
    description: 'Limpia marcas de agua u objetos con IA (inpainting).',
    icon: '🧹',
    status: 'coming-soon',
    category: 'enhance'
  },
  {
    slug: 'editar-texto',
    name: 'Editar texto en imagen',
    description: 'OCR + edición o eliminación de texto existente.',
    icon: '🔤',
    status: 'coming-soon',
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
