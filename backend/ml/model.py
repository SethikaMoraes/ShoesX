from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class ModelBundle:
    model: Dict[str, Any]
    classes: List[float]
    version: str
    meta: Dict[str, Any]


def _model_paths(model_dir: Path) -> Tuple[Path, Path]:
    return model_dir / "fit_model.joblib", model_dir / "fit_model_meta.json"


def load_model(model_dir: Path) -> Optional[ModelBundle]:
    model_path, meta_path = _model_paths(model_dir)
    if not model_path.exists() or not meta_path.exists():
        return None
    model = json.loads(model_path.read_text(encoding="utf-8"))
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    classes = [float(c) for c in meta.get("classes", [])]
    return ModelBundle(model=model, classes=classes, version=meta.get("version", "unknown"), meta=meta)


def save_model(model_dir: Path, model: Any, meta: Dict[str, Any]) -> None:
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path, meta_path = _model_paths(model_dir)
    model_path.write_text(json.dumps(model, indent=2), encoding="utf-8")
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")


def predict_with_model(bundle: ModelBundle, payload: Dict[str, Any]) -> Dict[str, Any]:
    samples = bundle.model.get("samples", [])
    if not samples:
        raise ValueError("Model has no samples.")

    gender = str(payload.get("gender", "")).strip().lower()
    category = str(payload.get("category", "")).strip().lower()
    preferred_fit = str(payload.get("preferredFit", "")).strip().lower()
    length = float(payload.get("footLengthCm") or 0.0)
    width = float(payload.get("footWidthCm") or 0.0)

    scored = []
    for sample in samples:
        sample_gender = sample.get("gender", "").lower()
        sample_category = sample.get("category", "").lower()
        sample_fit = sample.get("preferredFit", "").lower()

        length_diff = length - float(sample.get("footLengthCm", 0.0))
        width_diff = width - float(sample.get("footWidthCm", 0.0))
        distance = math.sqrt((length_diff ** 2) + (0.7 * (width_diff ** 2)))

        if gender and sample_gender and gender != sample_gender:
            distance += 2.0
        if category and sample_category and category != sample_category:
            distance += 1.5
        if preferred_fit and sample_fit and preferred_fit != sample_fit:
            distance += 0.8

        scored.append((distance, float(sample.get("sizeUK"))))

    scored.sort(key=lambda item: item[0])
    top = scored[:8]
    if not top:
        raise ValueError("No candidate sizes found.")

    weight_by_size: Dict[float, float] = {}
    for distance, size in top:
        weight = 1.0 / (distance + 1e-6)
        weight_by_size[size] = weight_by_size.get(size, 0.0) + weight

    total_weight = sum(weight_by_size.values()) or 1.0
    size_probs = [(size, weight / total_weight) for size, weight in weight_by_size.items()]
    size_probs.sort(key=lambda item: item[1], reverse=True)

    top_sizes = [{"size": float(size), "p": float(prob)} for size, prob in size_probs[:3]]
    recommended_size = float(size_probs[0][0])
    confidence = float(size_probs[0][1])

    return {
        "recommendedSizeUK": recommended_size,
        "topSizesUK": top_sizes,
        "confidence": confidence,
        "returnRisk": 1.0 - confidence,
        "notes": ["nearest_neighbor"],
    }
