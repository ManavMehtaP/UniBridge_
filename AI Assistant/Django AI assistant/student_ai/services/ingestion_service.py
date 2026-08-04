from __future__ import annotations

from collections import Counter
import logging
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import urlparse

from django.conf import settings
from django.utils import timezone
import requests

from student_ai.models import AIDocument, AIDocumentChunk, AIDocumentMetadata, Flashcard, Note, NoteInsight
from student_ai.services.ai_service import AIServiceError
from student_ai.services.chunk_service import build_semantic_chunks
from student_ai.services.documents import extract_text, file_hash
from student_ai.services.embedding_service import EmbeddingService
from student_ai.services.gemini_service import GeminiDocumentService, normalize_list

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
logger = logging.getLogger(__name__)


def resolve_local_path(file_url: str, file_key: str) -> str | Path:
    parsed = urlparse(file_url or "")
    if parsed.scheme in {"http", "https"}:
        return file_url
    candidate = Path(file_url)
    if candidate.exists():
        return candidate
    return Path(settings.MEDIA_ROOT) / file_key


def process_note_document(note: Note, *, source_url: str | None = None) -> dict:
    path = resolve_local_path(source_url or note.file_url, note.file_key)
    digest = file_hash(path)
    document, _created = AIDocument.objects.update_or_create(
        note=note,
        defaults={
            "subject": note.subject,
            "uploaded_by_id": note.faculty_id,
            "source_type": "note",
            "title": note.title,
            "original_file_url": note.file_url,
            "original_file_key": note.file_key,
            "mime_type": note.mime_type,
            "content_hash": digest,
            "processing_status": "processing",
            "error_message": "",
        },
    )
    try:
        extracted = extract_document_text(path, note.mime_type).strip()
        if not extracted:
            raise ValueError("Document has no extractable text.")
        structured = _extract_note_structure(note, extracted)
        chunks = build_semantic_chunks(extracted)
        AIDocumentChunk.objects.filter(document=document).delete()
        embedder = EmbeddingService()
        for chunk in chunks:
            AIDocumentChunk.objects.create(
                document=document,
                subject=note.subject,
                chunk_index=chunk.index,
                unit_name=chunk.unit_name,
                chapter_name=chunk.chapter_name,
                page_number=chunk.page_number,
                content=chunk.content,
                summary=_short_summary(chunk.content),
                keywords=_keywords(chunk.content, structured.get("keywords", [])),
                embedding=embedder.generate_embedding(chunk.content),
                token_count=chunk.token_count,
            )
        _store_metadata(document, note, structured)
        _store_legacy_note_outputs(note, digest, extracted, structured)
        document.processing_status = "completed"
        document.total_chunks = len(chunks)
        document.processed_at = timezone.now()
        document.error_message = ""
        document.save(update_fields=["processing_status", "total_chunks", "processed_at", "error_message", "updated_at"])
        return {"note_id": str(note.id), "document_id": str(document.id), "status": "completed", "chunks": len(chunks)}
    except Exception as exc:
        document.processing_status = "failed"
        document.error_message = str(exc)
        document.save(update_fields=["processing_status", "error_message", "updated_at"])
        NoteInsight.objects.update_or_create(
            note=note,
            defaults={"content_hash": digest, "status": "failed", "short_summary": "", "detailed_notes": "", "extracted_text": ""},
        )
        raise


def _extract_note_structure(note: Note, extracted: str) -> dict:
    fallback = {
        "short_summary": "",
        "detailed_notes": "",
        "bullet_notes": [],
        "important_definitions": [],
        "key_formulae": [],
        "flashcards": [],
        "important_questions": [],
        "units": [],
        "chapters": [],
        "keywords": [],
        "prerequisites": [],
        "tables": [],
        "formulas": [],
    }
    system = (
        "You are processing a faculty-uploaded study document once for retrieval. "
        "Return valid JSON only with keys: short_summary, detailed_notes, bullet_notes, "
        "important_definitions, key_formulae, flashcards, important_questions, units, "
        "chapters, keywords, prerequisites, tables, formulas. Preserve academic hierarchy. "
        "Write a useful student-facing short_summary and detailed_notes. Create 6 to 10 "
        "concise flashcards as objects with question and answer keys whenever the document "
        "contains enough study material; do not leave flashcards empty in that case."
    )
    user = (
        f"Subject: {note.subject.code} {note.subject.name}\n"
        f"Document title: {note.title}\n"
        "Extract the structure, hierarchy, formulas, keywords, summaries, and student-ready notes.\n\n"
        f"{extracted[:24000]}"
    )
    try:
        parsed = GeminiDocumentService().json_chat(system, user, fallback=fallback)
    except AIServiceError:
        # Keep faculty material accessible when the optional LLM router is offline.
        parsed = _extractive_note_structure(extracted)
    structured = {**fallback, **parsed}
    if _summary_needs_rewrite(note, str(structured.get("short_summary") or "")):
        extracted_summary = _extractive_note_structure(extracted)
        structured = {**structured, **extracted_summary}
    return structured


def _summary_needs_rewrite(note: Note, summary: str) -> bool:
    normalized = " ".join(summary.split())
    if len(normalized) > 900:
        return True
    calendar = "academic calendar" in note.title.lower() or "academic calendar" in normalized.lower()
    return calendar and ("regular teaching" in normalized.lower() or len(normalized) > 450)


def _extractive_note_structure(extracted: str) -> dict:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n+", extracted) if part.strip()]
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", " ".join(paragraphs)) if part.strip()]
    definitions: list[str] = []
    for line in extracted.splitlines():
        if ":" not in line:
            continue
        term, meaning = line.split(":", 1)
        if term.strip() and meaning.strip() and len(term.strip()) <= 100:
            definitions.append(f"{term.strip()}: {meaning.strip()}")
    flashcards = []
    for definition in definitions[:8]:
        term, meaning = definition.split(":", 1)
        flashcards.append({"question": f"What is {term.strip()}?", "answer": meaning.strip()})
    if not flashcards:
        for index, sentence in enumerate(sentences[:6], start=1):
            flashcards.append({"question": f"State the key point {index} from the note.", "answer": sentence})
    is_calendar = "academic calendar" in extracted.lower() and "regular teaching" in extracted.lower()
    calendar_summary = (
        "Academic calendar covering the listed semester period. It includes regular teaching days, "
        "holidays and breaks, reading holidays, and scheduled CCE/tests. Use the calendar view or original "
        "document for exact dates and subject-specific exam details."
    )
    return {
        "short_summary": calendar_summary if is_calendar else " ".join(sentences[:3])[:1200] or extracted[:1200],
        "detailed_notes": "\n\n".join(paragraphs)[:10000],
        "bullet_notes": (["Regular teaching days are listed by date.", "The document includes holidays, breaks, reading holidays, and CCE/tests.", "Refer to the original calendar for exact dates."] if is_calendar else sentences[:8]),
        "important_definitions": definitions[:12],
        "key_formulae": [],
        "flashcards": flashcards,
        "important_questions": [sentence for sentence in sentences if sentence.endswith("?")][:10],
        "units": [],
        "chapters": [],
        "keywords": [],
        "prerequisites": [],
        "tables": [],
        "formulas": [],
    }


def extract_document_text(path: str | Path, mime_type: str | None = None) -> str:
    suffix = Path(str(path)).suffix.lower()
    if (mime_type or "").lower().startswith("image/") or suffix in IMAGE_EXTENSIONS:
        return GeminiDocumentService().extract_image_text(path, mime_type=mime_type)
    if suffix != ".pdf":
        return extract_text(path)
    return _extract_pdf_pages(path)


def _extract_pdf_pages(path: str | Path) -> str:
    """Extract each PDF page with PyMuPDF, using OCR only for scanned pages."""
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required to process PDFs. Install requirements.txt and retry.") from exc

    local_path, cleanup_path = _local_pdf_path(path)
    try:
        pdf = fitz.open(str(local_path))
        try:
            if not pdf.page_count:
                return ""
            pages: list[str] = []
            for page_index, page in enumerate(pdf, start=1):
                text = page.get_text("text").strip()
                if not _is_scanned_page(text):
                    logger.info("Page %s -> Embedded text detected (PyMuPDF)", page_index)
                    pages.append(f"[Page {page_index}]\n{text}")
                    continue

                logger.info("Page %s -> No embedded text detected. Running OCR.", page_index)
                ocr_text = _ocr_pdf_page(page, page_index)
                if ocr_text:
                    logger.info("Page %s -> OCR completed successfully.", page_index)
                    pages.append(f"[Page {page_index}]\n{ocr_text}")
                else:
                    logger.warning("Page %s -> OCR produced no text; continuing with remaining pages.", page_index)
            logger.info("Document extraction completed.")
            return "\n\n".join(pages)
        finally:
            pdf.close()
    finally:
        if cleanup_path:
            os.unlink(cleanup_path)


def _is_scanned_page(text: str) -> bool:
    """Detect missing text layers and watermark-only pseudo text from photographed scans."""
    if len(text.strip()) < 100:
        return True
    lines = [" ".join(line.split()).lower() for line in text.splitlines() if line.strip()]
    if len(lines) >= 3 and max(Counter(lines).values(), default=0) / len(lines) >= 0.7:
        return True
    words = re.findall(r"[A-Za-z0-9]{2,}", text.lower())
    return len(words) >= 20 and len(set(words)) / len(words) < 0.12


def _ocr_pdf_page(page: object, page_number: int) -> str:
    """Render, improve, and OCR one scanned page without interrupting the document."""
    try:
        import cv2
        import numpy as np
        import pytesseract

        pix = page.get_pixmap(matrix=__import__("fitz").Matrix(3, 3), alpha=False)
        image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 1:
            gray = image
        else:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        prepared = _preprocess_ocr_image(gray, cv2, np)
        return pytesseract.image_to_string(prepared, config="--oem 3 --psm 6").strip()
    except Exception as exc:
        logger.warning("Page %s -> Local OCR failed: %s", page_number, exc)
        return _ocr_with_ai_fallback(page, page_number)


def _preprocess_ocr_image(gray: object, cv2: object, np: object) -> object:
    """Normalize scans before OCR: denoise, contrast, threshold, deskew, then crop if needed."""
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    contrast = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(denoised)
    thresholded = cv2.adaptiveThreshold(contrast, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11)
    corrected = _deskew_image(thresholded, cv2, np)
    return _perspective_correct(corrected, cv2, np)


def _deskew_image(image: object, cv2: object, np: object) -> object:
    points = np.column_stack(np.where(image < 255))
    if len(points) < 100:
        return image
    angle = cv2.minAreaRect(points[:, ::-1])[1]
    angle = -(90 + angle) if angle < -45 else -angle
    if abs(angle) < 0.3:
        return image
    height, width = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    return cv2.warpAffine(image, matrix, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _perspective_correct(image: object, cv2: object, np: object) -> object:
    """Correct only a clear page-shaped contour; normal flat scans pass through unchanged."""
    height, width = image.shape[:2]
    contours, _ = cv2.findContours(cv2.Canny(image, 50, 150), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        if cv2.contourArea(contour) < height * width * 0.55:
            break
        polygon = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        if len(polygon) != 4:
            continue
        points = polygon.reshape(4, 2).astype("float32")
        sums, differences = points.sum(axis=1), np.diff(points, axis=1).ravel()
        ordered = np.array([points[np.argmin(sums)], points[np.argmin(differences)], points[np.argmax(sums)], points[np.argmax(differences)]], dtype="float32")
        target = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype="float32")
        return cv2.warpPerspective(image, cv2.getPerspectiveTransform(ordered, target), (width, height))
    return image


def _ocr_with_ai_fallback(page: object, page_number: int) -> str:
    """Use the document model, then router `auto`, when local OCR is unavailable."""
    try:
        pix = page.get_pixmap(matrix=__import__("fitz").Matrix(3, 3), alpha=False)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
            image_path = Path(handle.name)
        pix.save(str(image_path))
        try:
            return GeminiDocumentService().extract_image_text(image_path, mime_type="image/png")
        finally:
            image_path.unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Page %s -> AI OCR fallback failed: %s", page_number, exc)
        return ""


def _local_pdf_path(path: str | Path) -> tuple[Path, str | None]:
    if not isinstance(path, str) or urlparse(path).scheme not in {"http", "https"}:
        return Path(path), None
    response = requests.get(path, timeout=60)
    response.raise_for_status()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as handle:
        handle.write(response.content)
        return Path(handle.name), handle.name


def _store_metadata(document: AIDocument, note: Note, structured: dict) -> None:
    units = structured.get("units") if isinstance(structured.get("units"), list) else []
    chapters = structured.get("chapters") if isinstance(structured.get("chapters"), list) else []
    AIDocumentMetadata.objects.update_or_create(
        document=document,
        defaults={
            "subject": note.subject,
            "units": units,
            "chapter_count": len(chapters),
            "keywords": normalize_list(structured.get("keywords"), limit=40),
            "generated_summary": str(structured.get("short_summary") or "")[:5000],
            "prerequisites": normalize_list(structured.get("prerequisites"), limit=25),
            "tables": structured.get("tables") if isinstance(structured.get("tables"), list) else [],
            "formulas": structured.get("formulas") if isinstance(structured.get("formulas"), list) else structured.get("key_formulae", []),
        },
    )


def _store_legacy_note_outputs(note: Note, digest: str, extracted: str, structured: dict) -> None:
    insight, _created = NoteInsight.objects.update_or_create(
        note=note,
        defaults={
            "content_hash": digest,
            "extracted_text": extracted[:50000],
            "short_summary": str(structured.get("short_summary") or "")[:5000],
            "detailed_notes": str(structured.get("detailed_notes") or "")[:50000],
            "bullet_notes": structured.get("bullet_notes") if isinstance(structured.get("bullet_notes"), list) else [],
            "important_definitions": structured.get("important_definitions") if isinstance(structured.get("important_definitions"), list) else [],
            "key_formulae": structured.get("key_formulae") if isinstance(structured.get("key_formulae"), list) else [],
            "important_questions": structured.get("important_questions") if isinstance(structured.get("important_questions"), list) else [],
            "status": "completed",
        },
    )
    note.ai_summary = insight.short_summary
    note.save(update_fields=["ai_summary", "updated_at"])
    Flashcard.objects.filter(note=note).delete()
    for index, item in enumerate(structured.get("flashcards") if isinstance(structured.get("flashcards"), list) else []):
        if not isinstance(item, dict):
            continue
        Flashcard.objects.create(note=note, question=str(item.get("question", ""))[:2000], answer=str(item.get("answer", ""))[:4000], order=index)


def _short_summary(content: str) -> str:
    first = content.replace("\n", " ").strip()
    return first[:500]


def _keywords(content: str, document_keywords: list[str]) -> list[str]:
    words = [word.lower() for word in __import__("re").findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", content)]
    common = [word for word, _count in Counter(words).most_common(10)]
    return normalize_list([*document_keywords[:10], *common], limit=15)
