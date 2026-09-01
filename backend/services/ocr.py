"""OCR abstraction. Tesseract/PyMuPDF for the MVP; replaceable without touching routers or the frontend."""
import io
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List

import fitz  # PyMuPDF
import pytesseract
from PIL import Image


@dataclass
class OcrResult:
    text: str
    page_count: int
    engine: str
    engine_version: str
    warnings: List[str] = field(default_factory=list)


class OcrEngine(ABC):
    name: str

    @abstractmethod
    def run(self, data: bytes, mime_type: str) -> OcrResult: ...


class TesseractEngine(OcrEngine):
    name = "pymupdf+tesseract"

    def __init__(self):
        self.dpi = int(os.environ.get("OCR_RASTER_DPI", "200"))
        self.max_pages = int(os.environ.get("OCR_MAX_PAGES", "15"))

    def version(self) -> str:
        try:
            tess = str(pytesseract.get_tesseract_version())
        except Exception:
            tess = "unknown"
        return f"pymupdf-{fitz.VersionBind}/tesseract-{tess}"

    def _ocr_image(self, image: Image.Image) -> str:
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")
        return pytesseract.image_to_string(image)

    def run(self, data: bytes, mime_type: str) -> OcrResult:
        warnings: List[str] = []
        if mime_type == "application/pdf":
            with fitz.open(stream=data, filetype="pdf") as doc:
                total = doc.page_count
                pages = min(total, self.max_pages)
                if total > pages:
                    warnings.append(f"Only the first {pages} of {total} pages were processed.")
                parts = []
                for i in range(pages):
                    page = doc.load_page(i)
                    text = (page.get_text() or "").strip()
                    if len(text) < 20:  # no usable text layer -> rasterise and OCR
                        pix = page.get_pixmap(dpi=self.dpi)
                        img = Image.open(io.BytesIO(pix.tobytes("png")))
                        text = self._ocr_image(img).strip()
                    parts.append(text)
                return OcrResult("\n\n".join(parts).strip(), pages, self.name, self.version(), warnings)

        img = Image.open(io.BytesIO(data))
        return OcrResult(self._ocr_image(img).strip(), 1, self.name, self.version(), warnings)


def get_engine() -> OcrEngine:
    return TesseractEngine()
