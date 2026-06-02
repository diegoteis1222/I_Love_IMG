# I Love IMG

Plataforma interna de utilidades de imagen (estilo iLoveIMG) para uso del equipo.
Autohospedada, sin envío de datos a servicios externos.

## Stack

- **Frontend / API**: Next.js 14 (App Router) + TypeScript + Tailwind + Sharp
- **Servicio IA**: Python 3.11 + FastAPI + rembg (eliminación de fondo)
- **Orquestación**: Docker Compose

## Estructura

```
ImgEdit/
├── web/               # Aplicación Next.js (frontend + API)
├── ai-service/        # Microservicio Python (rembg)
├── docker-compose.yml
└── .env.example
```

## Desarrollo local (sin Docker)

Requisitos: Node.js 20+, pnpm, Python 3.11+.

### 1. Frontend
```bash
cd web
pnpm install
pnpm dev
```
Disponible en http://localhost:3000

### 2. Microservicio IA (opcional, solo para Quitar fondo)
```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Despliegue con Docker

```bash
cp .env.example .env
docker compose up -d
```

Disponible en http://localhost:3000

## Herramientas (MVP)

| Herramienta       | Estado | Motor       |
|-------------------|--------|-------------|
| Convertir formato | ✅     | Sharp       |
| Comprimir         | ✅     | Sharp       |
| Quitar fondo      | ✅     | rembg (IA)  |

## Roadmap

- **Fase 1 (MVP)**: Convertir, Comprimir, Quitar fondo.
- **Fase 2**: Rotar, Redimensionar, Marcas de agua, Añadir texto.
- **Fase 3**: Eliminar marca de agua / objetos (inpainting).
- **Fase 4**: OCR + edición de texto.
- **Fase 5**: Módulo PDF (unir, dividir, comprimir, convertir).

Ver `docs/Propuesta_Tecnica_Plataforma_Imagenes.docx` para la propuesta completa.

## Licencia

Uso interno I Love IMG.
