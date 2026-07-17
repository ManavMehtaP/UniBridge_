from __future__ import annotations

from typing import Any

from student_ai.models import Student

from model import get_model, retrain_from_db, train_model
from predictor import model_metadata, predict_final_score, predict_student_next_semester_marks


def preprocess_data(t1: float, t2: float, t3: float) -> list[float]:
    return [t1, t2, t3]


def save_model() -> Any:
    return get_model()


def load_model() -> Any:
    return get_model()


def train_marks_model() -> Any:
    return train_model()


def predict_marks(t1: float, t2: float, t3: float, subject_name: str | None = None) -> dict:
    return predict_final_score(t1, t2, t3, subject_name)


def predict_student_marks(student: Student) -> dict | None:
    return predict_student_next_semester_marks(str(student.id))


def retrain_marks_model() -> dict:
    return retrain_from_db()


def get_marks_model_metadata() -> dict:
    return model_metadata()
