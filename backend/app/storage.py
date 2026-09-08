"""File storage seam.

All upload writes/deletes go through `storage` so the backend can later move to
object storage (S3/R2) by adding a class with the same two methods and picking
it via env — no router changes. Only the local-disk backend exists today.
"""

import os
import io
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageOps

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")


@lru_cache(maxsize=128)
def _thumbnail(path: str, modified: int) -> bytes:
    # The modification time invalidates a cached thumbnail after file replacement.
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGBA")
        image.thumbnail((320, 320))
        buf = io.BytesIO()
        image.save(buf, format="WEBP", quality=82)
        return buf.getvalue()


class LocalStorage:
    """Stores files under backend/uploads/, served at /uploads/*."""

    def save(self, subdir: str, filename: str, data: bytes) -> str:
        """Write bytes and return the public path (e.g. /uploads/garments/x.png)."""
        dir_path = os.path.join(UPLOADS_DIR, subdir)
        os.makedirs(dir_path, exist_ok=True)
        with open(os.path.join(dir_path, filename), "wb") as f:
            f.write(data)
        return f"/uploads/{subdir}/{filename}"

    def thumbnail(self, public_path: str) -> bytes:
        root = Path(UPLOADS_DIR).resolve()
        path = (Path(BACKEND_DIR) / public_path.lstrip("/")).resolve()
        if not path.is_relative_to(root):
            raise FileNotFoundError(public_path)
        return _thumbnail(str(path), path.stat().st_mtime_ns)

    def delete(self, public_path: str | None) -> None:
        """Best-effort delete by public path; missing files are ignored."""
        if not public_path:
            return
        fs_path = os.path.join(BACKEND_DIR, public_path.lstrip("/"))
        try:
            os.remove(fs_path)
        except OSError:
            pass


storage = LocalStorage()
