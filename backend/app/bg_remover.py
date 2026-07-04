"""Lazy singleton wrapper around the withoutbg open-source background removal model.

The model is heavy to load, so we do NOT load it at import/startup time.
It is instantiated on first call to `remove_background` and then cached
for the lifetime of the process.
"""

import os
import tempfile
import threading
from typing import Union

from PIL import Image

_model = None
_model_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from withoutbg import WithoutBG

                _model = WithoutBG.opensource()
    return _model


def remove_background(source: Union[str, bytes]) -> Image.Image:
    """Remove the background from an image and return a PIL RGBA Image.

    `source` may be a filesystem path (str) or raw image bytes. If bytes are
    given, they are written to a temporary file first since the underlying
    library expects a path (or PIL Image / Path).
    """
    model = _get_model()

    if isinstance(source, (bytes, bytearray)):
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".tmp")
        try:
            tmp.write(source)
            tmp.close()
            result = model.remove_background(tmp.name)
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
    else:
        result = model.remove_background(source)

    if result.mode != "RGBA":
        result = result.convert("RGBA")

    return result
