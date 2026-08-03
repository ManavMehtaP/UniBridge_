from __future__ import annotations

from collections import Counter, defaultdict
import re

from django.utils import timezone

from student_ai.models import AIDocument, PYQAnalysis, PYQFile, PYQInsight, PYQQuestion, Semester
from student_ai.services.chunk_service import build_semantic_chunks
from student_ai.services.documents import file_hash
from student_ai.services.embedding_service import EmbeddingService
from student_ai.services.gemini_service import GeminiDocumentService, normalize_list
from student_ai.services.ingestion_service import extract_document_text, resolve_local_path
from student_ai.models import AIDocumentChunk, AIDocumentMetadata


def process_pyq_document(pyq_file: PYQFile, *, source_url: str | None = None) -> dict:
    path = resolve_local_path(source_url or pyq_file.file_url, pyq_file.file_key)
    digest = file_hash(path)
    document, _created = AIDocument.objects.update_or_create(
        pyq_file=pyq_file,
        defaults={
            "subject": pyq_file.subject,
            "uploaded_by_id": pyq_file.uploaded_by_id,
            "source_type": "pyq",
            "title": f"PYQ {pyq_file.year} - {pyq_file.subject.code}",
            "original_file_url": pyq_file.file_url,
            "original_file_key": pyq_file.file_key,
            "mime_type": "application/pdf",
            "content_hash": digest,
            "processing_status": "processing",
            "error_message": "",
        },
    )
    try:
        extracted = extract_document_text(path, "application/pdf").strip()
        if not extracted:
            raise ValueError("PYQ document has no extractable text.")
        parsed = _extract_questions(pyq_file, extracted)
        questions = _store_questions(pyq_file, document, parsed.get("questions", []))
        _store_pyq_chunks(pyq_file, document, extracted, parsed)
        semester = _matching_semester(pyq_file)
        analysis = _update_analysis(pyq_file, semester)
        _store_legacy_insight(pyq_file, semester, extracted, analysis, parsed)
        pyq_file.is_analyzed = True
        pyq_file.save(update_fields=["is_analyzed"])
        document.processing_status = "completed"
        document.processed_at = timezone.now()
        document.error_message = ""
        document.save(update_fields=["processing_status", "processed_at", "error_message", "updated_at"])
        return {"pyq_id": str(pyq_file.id), "document_id": str(document.id), "status": "completed", "questions": questions}
    except Exception as exc:
        document.processing_status = "failed"
        document.error_message = str(exc)
        document.save(update_fields=["processing_status", "error_message", "updated_at"])
        raise


def analyze_pyq_statistics(subject_id: str) -> dict:
    raw_questions = PYQQuestion.objects.filter(subject_id=subject_id).select_related("pyq_file")
    seen_papers: set[str] = set()
    questions = []
    for question in raw_questions:
        original_name = re.sub(r"^\d+-", "", (question.pyq_file.file_key or "").rsplit("/", 1)[-1])
        paper_key = f"{question.year}:{original_name or question.pyq_file_id}"
        if paper_key in seen_papers:
            continue
        seen_papers.add(paper_key)
        questions.extend(PYQQuestion.objects.filter(pyq_file_id=question.pyq_file_id))
    topic_counter: Counter[str] = Counter()
    unit_counter: Counter[str] = Counter()
    year_counter: dict[str, Counter[str]] = defaultdict(Counter)
    repeated: Counter[str] = Counter()
    marks_total = 0.0
    marks_count = 0
    for question in questions:
        topics = normalize_list(question.keywords, limit=10) or normalize_list(question.unit, limit=3)
        for topic in topics:
            topic_counter.update([topic])
            year_counter[question.year].update([topic])
        if question.unit:
            unit_counter.update([question.unit])
        normalized = " ".join(question.question.lower().split())[:180]
        if normalized:
            repeated.update([normalized])
        if question.marks is not None:
            marks_total += question.marks
            marks_count += 1

    total_topics = sum(topic_counter.values()) or 1
    ranking = topic_counter.most_common(10)
    return {
        "important_topics": [topic for topic, _count in ranking[:5]],
        "frequently_asked_topics": [topic for topic, _count in ranking[:5]],
        "weak_points": [unit for unit, _count in unit_counter.most_common(5)],
        "unit_frequency": dict(unit_counter.most_common(10)),
        "topic_ranking": [
            {"topic": topic, "rank": index + 1, "occurrences": count, "probability": round(count / total_topics, 4)}
            for index, (topic, count) in enumerate(ranking)
        ],
        "repeated_questions": [text for text, count in repeated.most_common(10) if count > 1],
        "average_marks": round(marks_total / marks_count, 2) if marks_count else None,
        "year_wise_trend": {year: dict(counter.most_common(5)) for year, counter in year_counter.items()},
        "trend_analysis": "Statistics are calculated from extracted PYQ questions; no ML is used.",
    }


def _extract_questions(pyq_file: PYQFile, extracted: str) -> dict:
    fallback = {"questions": [], "summary": "", "keywords": []}
    system = (
        "Analyze this previous-year-question paper. Return valid JSON only with keys questions, summary, and keywords. "
        "Each question object must include text, subject, unit, module, marks, type, year, difficulty, "
        "keywords, bloom_level, source_page, and exam if available. Extract every individual question exactly enough "
        "to be useful for revision. summary must be a concise student-facing overview of recurring topics, question "
        "patterns, and exam focus. keywords must contain the important concepts found in the paper."
    )
    user = f"Subject: {pyq_file.subject.code} {pyq_file.subject.name}\nYear: {pyq_file.year}\n\n{extracted[:30000]}"
    try:
        return GeminiDocumentService().json_chat(system, user, fallback=fallback)
    except Exception:
        # A provider outage or quota limit must not strand an uploaded PYQ in
        # "processing". Keep the source chunks and produce a deterministic
        # extraction until Gemini is available for later uploads/retries.
        return _local_pyq_extract(pyq_file, extracted)


def _local_pyq_extract(pyq_file: PYQFile, extracted: str) -> dict:
    lines = [" ".join(line.split()) for line in extracted.splitlines()]
    candidates: list[str] = []
    current = ""
    for line in lines:
        if not line:
            continue
        starts_question = bool(re.match(r"^(?:q(?:uestion)?\s*)?\d+[.)\-:]\s*", line, re.I))
        if starts_question:
            if current:
                candidates.append(current)
            current = re.sub(r"^(?:q(?:uestion)?\s*)?\d+[.)\-:]\s*", "", line, flags=re.I)
        elif current:
            current = f"{current} {line}"[:1800]
            if line.endswith("?"):
                candidates.append(current)
                current = ""
        elif line.endswith("?") and len(line) > 20:
            candidates.append(line)
    if current:
        candidates.append(current)

    words = re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{2,}", extracted.lower())
    ignored = {"the", "and", "for", "with", "that", "this", "from", "are", "what", "which", "into", "your", "answer", "marks", "question", "following"}
    keywords = [word for word, _count in Counter(word for word in words if word not in ignored).most_common(12)]
    questions = [{
        "text": text,
        "subject": pyq_file.subject.code,
        "year": pyq_file.year,
        "type": "Question",
        "keywords": keywords[:6],
    } for text in candidates[:100] if len(text) >= 12]
    summary = (
        f"PYQ {pyq_file.year} for {pyq_file.subject.code}. "
        f"{len(questions)} questions were extracted locally while the Gemini provider was unavailable. "
        f"Review the recurring concepts: {', '.join(keywords[:6]) or 'see extracted questions'}.")
    return {"questions": questions, "summary": summary, "keywords": keywords}


def _store_questions(pyq_file: PYQFile, document: AIDocument, raw_questions: object) -> int:
    PYQQuestion.objects.filter(pyq_file=pyq_file).delete()
    if not isinstance(raw_questions, list):
        raw_questions = []
    count = 0
    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or item.get("question") or "").strip()
        if not text:
            continue
        PYQQuestion.objects.create(
            subject=pyq_file.subject,
            pyq_file=pyq_file,
            document=document,
            year=str(item.get("year") or pyq_file.year),
            exam=str(item.get("exam") or "")[:100] or None,
            unit=str(item.get("unit") or "")[:255] or None,
            module=str(item.get("module") or "")[:255] or None,
            question=text[:8000],
            marks=_to_float(item.get("marks")),
            question_type=str(item.get("type") or item.get("question_type") or "")[:100] or None,
            difficulty=str(item.get("difficulty") or "")[:32] or None,
            keywords=normalize_list(item.get("keywords"), limit=12),
            bloom_level=str(item.get("bloom_level") or item.get("bloomLevel") or "")[:100] or None,
            page_number=_to_int(item.get("source_page") or item.get("page")),
        )
        count += 1
    return count


def _store_pyq_chunks(pyq_file: PYQFile, document: AIDocument, extracted: str, parsed: dict) -> None:
    AIDocumentChunk.objects.filter(document=document).delete()
    embedder = EmbeddingService()
    chunks = build_semantic_chunks(extracted)
    for chunk in chunks:
        AIDocumentChunk.objects.create(
            document=document,
            subject=pyq_file.subject,
            chunk_index=chunk.index,
            unit_name=chunk.unit_name,
            chapter_name=chunk.chapter_name,
            page_number=chunk.page_number,
            content=chunk.content,
            summary=chunk.content.replace("\n", " ")[:500],
            keywords=normalize_list(parsed.get("keywords"), limit=15),
            embedding=embedder.generate_embedding(chunk.content),
            token_count=chunk.token_count,
        )
    document.total_chunks = len(chunks)
    document.save(update_fields=["total_chunks", "updated_at"])
    AIDocumentMetadata.objects.update_or_create(
        document=document,
        defaults={
            "subject": pyq_file.subject,
            "units": [],
            "chapter_count": 0,
            "keywords": normalize_list(parsed.get("keywords"), limit=30),
            "generated_summary": str(parsed.get("summary") or f"Structured PYQ extraction for {pyq_file.subject.code} {pyq_file.year}.")[:5000],
            "prerequisites": [],
            "tables": [],
            "formulas": [],
        },
    )


def _matching_semester(pyq_file: PYQFile) -> Semester:
    semester = Semester.objects.filter(
        university_id=pyq_file.subject.university_id,
        number=pyq_file.subject.semester_number,
    ).order_by("-start_date").first()
    if semester is None:
        raise RuntimeError("Matching semester not found for PYQ analysis.")
    return semester


def _update_analysis(pyq_file: PYQFile, semester: Semester) -> dict:
    stats = analyze_pyq_statistics(str(pyq_file.subject_id))
    analysis, _created = PYQAnalysis.objects.get_or_create(subject=pyq_file.subject, semester=semester)
    # Keep raw occurrences. Probabilities made a single paper look like many PYQs
    # and prevented the portal from applying meaningful importance thresholds.
    analysis.topic_frequencies = {item["topic"]: item["occurrences"] for item in stats["topic_ranking"]}
    analysis.analyzed_at = timezone.now()
    analysis.save(update_fields=["topic_frequencies", "analyzed_at"])
    return stats


def _store_legacy_insight(pyq_file: PYQFile, semester: Semester, extracted: str, analysis: dict, parsed: dict) -> None:
    PYQInsight.objects.update_or_create(
        pyq_file=pyq_file,
        defaults={
            "subject_id": pyq_file.subject_id,
            "semester_id": semester.id,
            "extracted_text": extracted[:50000],
            "topics": analysis.get("important_topics", []),
            "keywords": normalize_list(parsed.get("keywords"), limit=30) or analysis.get("frequently_asked_topics", []),
            "difficulty": "",
            "marks_weightage": [{"topic": item["topic"], "weight": item["probability"]} for item in analysis.get("topic_ranking", [])],
            "question_types": [],
            "status": "completed",
        },
    )


def _to_float(value: object) -> float | None:
    try:
        return float(value) if value not in {None, ""} else None
    except (TypeError, ValueError):
        return None


def _to_int(value: object) -> int | None:
    try:
        return int(value) if value not in {None, ""} else None
    except (TypeError, ValueError):
        return None
