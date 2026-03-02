from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List


@dataclass
class FeatureRow:
    gender: str
    footLengthCm: float
    footWidthCm: float
    preferredFit: str
    productId: str
    category: str


def normalize_str(value: Any, fallback: str = "unknown") -> str:
    if value is None:
        return fallback
    value = str(value).strip()
    return value if value else fallback


def build_feature_frame(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cleaned: List[Dict[str, Any]] = []
    for row in rows:
        cleaned.append(
            {
                "gender": normalize_str(row.get("gender")),
                "footLengthCm": float(row.get("footLengthCm", 0.0)),
                "footWidthCm": float(row.get("footWidthCm", 0.0)),
                "preferredFit": normalize_str(row.get("preferredFit")),
                "productId": normalize_str(row.get("productId")),
                "category": normalize_str(row.get("category")),
            }
        )
    return cleaned
