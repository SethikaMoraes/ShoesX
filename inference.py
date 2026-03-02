from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "ml_artifacts" / "model.pkl"

DEFAULT_RISK_THRESHOLDS = {
    "low_min": 0.85,
    "medium_min": 0.70,
}


def normalize_category(value: str) -> str:
    return str(value).strip().title()


def normalize_gender(value: str) -> str:
    return str(value).strip().title()


def normalize_fit(value: str) -> str:
    normalized = str(value).strip().lower()
    if normalized in {"snug", "regular", "roomy"}:
        return normalized
    return "regular"


@lru_cache(maxsize=1)
def load_model_bundle() -> Dict[str, Any]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model artifact not found at {MODEL_PATH}. Run `python train_model.py` first."
        )

    bundle = joblib.load(MODEL_PATH)

    if "pipeline" not in bundle:
        raise ValueError("Invalid model bundle: missing `pipeline` key.")

    return bundle


def confidence_to_risk(confidence: float, thresholds: Dict[str, float]) -> str:
    if confidence >= thresholds["low_min"]:
        return "Low"
    if confidence >= thresholds["medium_min"]:
        return "Medium"
    return "High"


def predict(payload: Dict[str, Any]) -> Dict[str, Any]:
    bundle = load_model_bundle()
    pipeline = bundle["pipeline"]

    row = {
        "gender": normalize_gender(payload["gender"]),
        "footLengthCm": float(payload["footLengthCm"]),
        "footWidthCm": float(payload["footWidthCm"]),
        "category": normalize_category(payload["category"]),
        "preferredFit": normalize_fit(payload.get("preferredFit", "regular")),
    }

    features = pd.DataFrame([row])

    predicted_label = pipeline.predict(features)[0]

    if hasattr(pipeline, "predict_proba"):
        probabilities = pipeline.predict_proba(features)[0]
        class_labels = pipeline.classes_
        best_index = int(np.argmax(probabilities))
        confidence = float(probabilities[best_index])
        recommended_size = str(class_labels[best_index])
    else:
        recommended_size = str(predicted_label)
        confidence = 0.75

    thresholds = bundle.get("risk_thresholds", DEFAULT_RISK_THRESHOLDS)
    risk_level = confidence_to_risk(confidence, thresholds)

    return {
        "recommendedSizeUK": recommended_size,
        "confidence": round(confidence, 4),
        "riskLevel": risk_level,
    }
