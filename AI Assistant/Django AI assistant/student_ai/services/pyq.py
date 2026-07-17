from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from django.conf import settings

from student_ai.models import PYQAnalysis, PYQFile, PYQInsight, Semester
from student_ai.services.ai_service import SharedAIService
from student_ai.services.documents import extract_text


def resolve_local_path(file_url: str, file_key: str) -> Path:
    candidate = Path(file_url)
    if candidate.exists():
        return candidate
    return Path(settings.MEDIA_ROOT) / file_key


def analyze_pyq(pyq_file: PYQFile) -> dict:
    path = resolve_local_path(pyq_file.file_url, pyq_file.file_key)
    extracted = extract_text(path)
    prompt = [
        {
            "role": "system",
            "content": "Extract structured PYQ analysis and return valid JSON with keys: topics, keywords, difficulty, marks_weightage, question_types.",
        },
        {"role": "user", "content": extracted[:18000]},
    ]
    parsed = json.loads(SharedAIService().chat(prompt)["reply"])
    semester = Semester.objects.filter(
        university_id=pyq_file.subject.university_id,
        number=pyq_file.subject.semester_number,
    ).order_by("-start_date").first()
    if semester is None:
        raise RuntimeError("Matching semester not found for PYQ analysis.")

    insight, _ = PYQInsight.objects.update_or_create(
        pyq_file=pyq_file,
        defaults={
            "subject_id": pyq_file.subject_id,
            "semester_id": semester.id,
            "extracted_text": extracted[:50000],
            "topics": parsed.get("topics", []),
            "keywords": parsed.get("keywords", []),
            "difficulty": parsed.get("difficulty", ""),
            "marks_weightage": parsed.get("marks_weightage", []),
            "question_types": parsed.get("question_types", []),
            "status": "completed",
        },
    )
    counter: Counter[str] = Counter(insight.topics)
    analysis, _ = PYQAnalysis.objects.get_or_create(subject=pyq_file.subject, semester=semester)
    merged = Counter(analysis.topic_frequencies or {})
    merged.update(counter)
    analysis.topic_frequencies = dict(merged)
    analysis.save(update_fields=["topic_frequencies", "analyzed_at"])
    pyq_file.is_analyzed = True
    pyq_file.save(update_fields=["is_analyzed"])
    return {"pyq_id": str(pyq_file.id), "status": "completed"}


def predict_topic_trends(subject_id: str) -> dict:
    combined: Counter[str] = Counter()
    for analysis in PYQAnalysis.objects.filter(subject_id=subject_id):
        combined.update(analysis.topic_frequencies or {})
    ranking = combined.most_common(10)
    total = sum(combined.values()) or 1
    return {
        "important_topics": [topic for topic, _ in ranking[:5]],
        "frequently_asked_topics": [topic for topic, _ in ranking[:5]],
        "topic_ranking": [{"topic": topic, "rank": index + 1, "probability": round(count / total, 4)} for index, (topic, count) in enumerate(ranking)],
        "trend_analysis": "Topic ranking is based on accumulated PYQ frequencies and will improve as more PYQs are analyzed.",
    }
