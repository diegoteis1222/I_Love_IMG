"""
Microservicio interno de IA para I Love IMG.

Solo se expone hacia la red interna de Docker. El frontend Next.js
es el único cliente legítimo.
"""

import io
import logging
import os
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from rembg import new_session, remove

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("ai-service")

# Modelos disponibles en rembg. birefnet-general da la mejor calidad
# pero es más pesado. u2net es el clásico, más ligero.
MODEL_NAME = os.getenv("REMBG_MODEL", "birefnet-general")

# Cache de la sesión rembg para no recargar el modelo en cada petición.
_session: Optional[object] = None


def get_session():
    global _session
    if _session is None:
        log.info("Cargando modelo rembg: %s", MODEL_NAME)
        _session = new_session(MODEL_NAME)
        log.info("Modelo cargado.")
    return _session


app = FastAPI(
    title="I Love IMG - AI Service",
    description="Microservicio interno para tareas con IA (eliminación de fondo).",
    version="0.1.0",
    docs_url=None,        # API no documentada públicamente
    redoc_url=None,
    openapi_url=None,
)


@app.on_event("startup")
async def startup() -> None:
    # Precargamos el modelo en el arranque para que la primera
    # petición no tarde varios segundos descargándolo.
    try:
        get_session()
    except Exception:
        log.exception("Error al precargar el modelo")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/remove-background")
async def remove_background(file: UploadFile = File(...)) -> Response:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        session = get_session()
        out = remove(data, session=session)
        if isinstance(out, bytes):
            output_bytes = out
        else:
            # Por si remove() devolviera un PIL.Image en alguna versión
            buf = io.BytesIO()
            out.save(buf, format="PNG")
            output_bytes = buf.getvalue()

        log.info(
            "remove-background OK: %s (%.1f KB -> %.1f KB)",
            file.filename,
            len(data) / 1024,
            len(output_bytes) / 1024,
        )
        return Response(content=output_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception:
        log.exception("Error procesando %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail="No se ha podido procesar la imagen",
        )
