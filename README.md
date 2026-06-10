# I Love IMG

Plataforma interna de utilidades de imagen (estilo iLoveIMG) para uso del equipo.
Autohospedada, sin envío de datos a servicios externos.

## Stack

- **Frontend / API**: Next.js 14 (App Router) + TypeScript + Tailwind + Sharp
- **Servicio IA**: Python 3.11 + FastAPI + rembg (eliminación de fondo) + LaMa (inpainting)
- **Orquestación**: Docker Compose

## Estructura

```
I_Love_IMG/
├── web/               # Aplicación Next.js (frontend + API)
├── ai-service/        # Microservicio Python (rembg + LaMa)
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

### 2. Microservicio IA

Un único servicio atiende las dos herramientas con IA: **Quitar fondo**
(rembg) y **Quitar marca de agua** (LaMa, inpainting). No hay que arrancar
nada más: el mismo `uvicorn` expone ambos endpoints. Si solo usas las
herramientas de Sharp (convertir, comprimir, etc.), puedes saltarte este paso.

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

La primera vez se descargan los modelos automáticamente: rembg (~970 MB, al
arrancar el servicio) y LaMa (~200 MB, al hacer la primera petición de Quitar
marca de agua — esa primera petición tarda más por la descarga y la carga del
modelo; las siguientes son normales, entre 5 y 30 s por imagen en CPU).

Si el servicio corre en otro puerto o máquina, indícalo al frontend en
`web/.env.local`:

```
AI_SERVICE_URL=http://127.0.0.1:8101
```

(reinicia `pnpm dev` después de cambiarlo).

#### ⚠️ Windows: error 10048 al arrancar en el puerto 8001

Si uvicorn falla con `[Errno 10048] error while attempting to bind` y no hay
ningún proceso escuchando en ese puerto, lo más probable es que el 8001 caiga
dentro de un rango de puertos reservado por Hyper-V/WSL. Compruébalo con:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

Soluciones:

1. **Usar otro puerto** fuera de los rangos reservados (p. ej. 8101) y
   ajustar `AI_SERVICE_URL` en `web/.env.local` como se indica arriba.
2. **Liberar las reservas** (como administrador): `net stop winnat` y
   `net start winnat`. Windows puede volver a reservar rangos tras reiniciar.

## Despliegue con Docker

```bash
cp .env.example .env
docker compose up -d
```

Disponible en http://localhost:3000

## Herramientas

| Herramienta       | Estado | Motor       |
|-------------------|--------|-------------|
| Convertir formato | ✅     | Sharp       |
| Comprimir         | ✅     | Sharp       |
| Quitar fondo      | ✅     | rembg (IA)  |
| Redimensionar     | ✅     | Sharp       |
| Rotar y reflejar  | ✅     | Sharp       |
| Marca de agua     | ✅     | Sharp (SVG) |
| Añadir texto      | ✅     | Sharp (SVG) |
| Quitar marca de agua | ✅  | LaMa (IA)   |

## Roadmap

- **Fase 1 (MVP)**: Convertir, Comprimir, Quitar fondo. ✅
- **Fase 2**: ~~Redimensionar~~, ~~Rotar~~, ~~Marcas de agua~~, ~~Añadir texto~~. ✅
- **Fase 3**: ~~Eliminar marca de agua / objetos (inpainting)~~. ✅
- **Fase 4**: OCR + edición de texto.
- **Fase 5**: Módulo PDF (unir, dividir, comprimir, convertir).

Ver `docs/Propuesta_Tecnica_Plataforma_Imagenes.docx` para la propuesta completa.

## Licencia

Uso interno I Love IMG.
