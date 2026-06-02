# AI Service

Microservicio interno (FastAPI + rembg) para eliminación de fondo.

## Endpoints

- `GET /health` — comprobación de vida.
- `POST /remove-background` — recibe un archivo `multipart/form-data` con campo `file` y devuelve un PNG con fondo transparente.

> Este servicio **no se expone al exterior**. Solo lo consume el frontend Next.js dentro de la red interna de Docker.

## Desarrollo local

```bash
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

La primera petición descargará el modelo (~400 MB) en `~/.u2net/`. Las siguientes son inmediatas.

## Variables de entorno

- `REMBG_MODEL` — modelo a usar. Recomendado: `birefnet-general` (calidad alta).
  Alternativas: `u2net`, `isnet-general-use`.
