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
from PIL import Image, ImageFilter, ImageOps
from rembg import new_session, remove

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("ai-service")

# Modelos disponibles en rembg. birefnet-general da la mejor calidad
# pero es más pesado. u2net es el clásico, más ligero.
MODEL_NAME = os.getenv("REMBG_MODEL", "birefnet-general")

# Lado máximo al que se procesa el inpainting. Las imágenes mayores se
# reducen para el modelo y el resultado se recompone sobre el original
# a resolución completa (solo cambia la zona enmascarada).
INPAINT_MAX_SIDE = int(os.getenv("INPAINT_MAX_SIDE", "1600"))

# Idiomas del OCR (códigos de EasyOCR separados por comas).
OCR_LANGS = [s.strip() for s in os.getenv("OCR_LANGS", "es,en").split(",") if s.strip()]

# Cache de la sesión rembg para no recargar el modelo en cada petición.
_session: Optional[object] = None

# Cache del modelo LaMa de inpainting (carga perezosa: es pesado y solo
# hace falta si se usa la herramienta de quitar marca de agua).
_lama: Optional[object] = None

# Cache del lector OCR (carga perezosa, solo para editar texto).
_ocr: Optional[object] = None


def get_session():
    global _session
    if _session is None:
        log.info("Cargando modelo rembg: %s", MODEL_NAME)
        _session = new_session(MODEL_NAME)
        log.info("Modelo cargado.")
    return _session


def get_lama():
    global _lama
    if _lama is None:
        from simple_lama_inpainting import SimpleLama

        log.info("Cargando modelo LaMa (inpainting)...")
        _lama = SimpleLama()
        log.info("Modelo LaMa cargado.")
    return _lama


def get_ocr():
    global _ocr
    if _ocr is None:
        import easyocr

        log.info("Cargando OCR EasyOCR: %s", OCR_LANGS)
        _ocr = easyocr.Reader(OCR_LANGS, gpu=False, verbose=False)
        log.info("OCR cargado.")
    return _ocr


def run_inpaint(image: Image.Image, mask: Image.Image) -> Image.Image:
    """Inpainting con LaMa. Máscara en modo L: blanco = zona a eliminar."""
    width, height = image.size

    # En imágenes grandes procesamos a resolución reducida y después
    # recomponemos solo la zona enmascarada sobre el original a tamaño
    # completo, para no perder detalle fuera de la máscara.
    scale = min(1.0, INPAINT_MAX_SIDE / max(width, height))
    if scale < 1.0:
        small = image.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.LANCZOS,
        )
        small_mask = mask.resize(small.size, Image.NEAREST)
        result = get_lama()(small, small_mask)
        # LaMa rellena la imagen hasta múltiplos de 8; recortamos
        if result.size != small.size:
            result = result.crop((0, 0, small.width, small.height))
        result = result.resize((width, height), Image.LANCZOS)
    else:
        result = get_lama()(image, mask)
        if result.size != image.size:
            result = result.crop((0, 0, width, height))

    # Componemos: píxeles originales fuera de la máscara, inpainting dentro.
    # Dilatamos y difuminamos el borde para una transición suave.
    paste_mask = mask.filter(ImageFilter.MaxFilter(9)).filter(
        ImageFilter.GaussianBlur(3)
    )
    output = image.copy()
    output.paste(result, (0, 0), paste_mask)
    return output


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


@app.post("/inpaint")
async def inpaint(
    file: UploadFile = File(...),
    mask: UploadFile = File(...),
) -> Response:
    """Elimina la zona marcada en la máscara rellenándola con inpainting.

    `mask` es un PNG del mismo tamaño que la imagen donde blanco = eliminar.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    try:
        data = await file.read()
        mask_data = await mask.read()
        if not data or not mask_data:
            raise HTTPException(status_code=400, detail="Falta la imagen o la máscara")

        # exif_transpose para que la imagen coincida con lo que el usuario
        # vio en el navegador al pintar la máscara.
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        mask_img = Image.open(io.BytesIO(mask_data)).convert("L")
        if mask_img.size != image.size:
            mask_img = mask_img.resize(image.size, Image.NEAREST)
        mask_img = mask_img.point(lambda p: 255 if p > 127 else 0)

        if mask_img.getbbox() is None:
            raise HTTPException(
                status_code=400,
                detail="La máscara está vacía: pinta la zona que quieres eliminar",
            )

        result = run_inpaint(image, mask_img)

        buf = io.BytesIO()
        result.save(buf, format="PNG")
        output_bytes = buf.getvalue()

        log.info(
            "inpaint OK: %s (%dx%d, %.1f KB -> %.1f KB)",
            file.filename,
            image.width,
            image.height,
            len(data) / 1024,
            len(output_bytes) / 1024,
        )
        return Response(content=output_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception:
        log.exception("Error en inpaint %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail="No se ha podido procesar la imagen",
        )


@app.post("/detect-text")
async def detect_text(file: UploadFile = File(...)) -> dict:
    """Detecta texto en la imagen con OCR.

    Devuelve las cajas delimitadoras (rectángulos alineados a ejes) en
    coordenadas de la imagen ya corregida de orientación EXIF.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        import numpy as np

        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        results = get_ocr().readtext(np.asarray(image))

        items = []
        for box, text, confidence in results:
            xs = [float(p[0]) for p in box]
            ys = [float(p[1]) for p in box]
            x0, y0 = max(0, min(xs)), max(0, min(ys))
            x1, y1 = min(image.width, max(xs)), min(image.height, max(ys))
            items.append(
                {
                    "text": text,
                    "confidence": round(float(confidence), 3),
                    "x": int(x0),
                    "y": int(y0),
                    "width": int(x1 - x0),
                    "height": int(y1 - y0),
                }
            )

        log.info("detect-text OK: %s (%d zonas)", file.filename, len(items))
        return {"width": image.width, "height": image.height, "items": items}
    except HTTPException:
        raise
    except Exception:
        log.exception("Error en detect-text %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail="No se ha podido analizar la imagen",
        )
