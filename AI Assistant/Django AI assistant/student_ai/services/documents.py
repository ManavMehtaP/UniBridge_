from __future__ import annotations

import hashlib
from pathlib import Path

TEXT_EXTENSIONS = {".txt", ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".md", ".json", ".html", ".css"}


def file_hash(path: str | Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def extract_text(path: str | Path) -> str:
    path = Path(path)
    suffix = path.suffix.lower()
    if suffix in TEXT_EXTENSIONS:
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        from PyPDF2 import PdfReader

        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        from docx import Document

        doc = Document(str(path))
        return "\n".join(item.text for item in doc.paragraphs)
    if suffix == ".pptx":
        from pptx import Presentation

        prs = Presentation(str(path))
        lines: list[str] = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    lines.append(shape.text)
        return "\n".join(lines)
    return path.read_text(encoding="utf-8", errors="ignore")
