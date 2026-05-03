import base64
import binascii
from io import BytesIO
from typing import Optional

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError


MAX_IMAGE_DIMENSION = 600
JPEG_QUALITY = 82


def compress_image_base64(image_base64: Optional[str]) -> Optional[str]:
    if not image_base64:
        return image_base64

    if image_base64.startswith("data:"):
        try:
            _, encoded = image_base64.split(",", 1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de imagem invalido")
    else:
        encoded = image_base64

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Imagem base64 invalida")

    try:
        with Image.open(BytesIO(image_bytes)) as img:
            img.load()
            if img.mode not in ("RGB", "L"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode in ("RGBA", "LA"):
                    background.paste(img, mask=img.getchannel("A"))
                else:
                    background.paste(img.convert("RGB"))
                img = background
            else:
                img = img.convert("RGB")

            img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

            output = BytesIO()
            img.save(
                output,
                format="JPEG",
                quality=JPEG_QUALITY,
                optimize=True,
                progressive=True,
            )
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Arquivo de imagem invalido")

    compressed = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{compressed}"
