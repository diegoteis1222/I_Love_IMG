# AI Service

Microservicio interno (FastAPI + rembg + LaMa) para eliminación de fondo e inpainting.

## Endpoints

- `GET /health` — comprobación de vida.
- `POST /remove-background` — recibe un archivo `multipart/form-data` con campo `file` y devuelve un PNG con fondo transparente.
- `POST /inpaint` — recibe `file` (imagen) y `mask` (PNG, blanco = zona a eliminar) y devuelve un PNG con la zona rellenada mediante inpainting (LaMa).

> Este servicio **no se expone al exterior**. Solo lo consume el frontend Next.js dentro de la red interna de Docker.

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

La primera petición de cada herramienta descarga su modelo: rembg (~400 MB) en `~/.u2net/`
y LaMa (~200 MB) en la cache de torch hub. Las siguientes son inmediatas.

## Variables de entorno

- `REMBG_MODEL` — modelo a usar. Recomendado: `birefnet-general` (calidad alta).
  Alternativas: `u2net`, `isnet-general-use`.
- `INPAINT_MAX_SIDE` — lado máximo al que se procesa el inpainting (por defecto 1600).
  Las imágenes mayores se reducen para el modelo y el resultado se recompone
  sobre el original a resolución completa.
