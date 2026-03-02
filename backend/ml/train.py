from __future__ import annotations

import csv
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .features import normalize_str
from .model import save_model


def map_fit_profile(value: Any) -> str:
    normalized = normalize_str(value, "regular").lower()
    if normalized == "snug":
        return "tight"
    if normalized == "roomy":
        return "loose"
    return normalized


def parse_sizes_list(value: Any) -> List[float]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [float(v) for v in value]
    text = str(value).strip()
    if not text:
        return []
    parts = [p.strip() for p in text.split(",") if p.strip()]
    sizes = []
    for part in parts:
        try:
            sizes.append(float(part))
        except ValueError:
            continue
    return sizes


def build_rows_from_dataset(dataset_path: Path) -> Tuple[List[Dict[str, Any]], List[float]]:
    rows: List[Dict[str, Any]] = []
    labels: List[float] = []

    with dataset_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for record in reader:
            product_id = record.get("product_id") or record.get("productId")
            category = record.get("category")
            gender = record.get("gender_target") or record.get("gender")
            preferred_fit = map_fit_profile(record.get("fit_profile"))

            sizes = parse_sizes_list(record.get("sizes_available_uk"))
            if not sizes:
                continue
            min_size = min(sizes)
            max_size = max(sizes)

            try:
                length_min = float(record.get("foot_length_min_cm") or 0)
                length_max = float(record.get("foot_length_max_cm") or 0)
                width_min = float(record.get("recommended_foot_width_cm_min") or 0)
                width_max = float(record.get("recommended_foot_width_cm_max") or 0)
            except ValueError:
                continue

            if not product_id or not category or not gender:
                continue
            if length_min <= 0 or length_max <= 0 or width_min <= 0 or width_max <= 0:
                continue

            size_span = max_size - min_size
            length_span = length_max - length_min
            width_span = width_max - width_min

            width_samples = [width_min, (width_min + width_max) / 2, width_max]

            for size in sizes:
                ratio = 0.0 if size_span == 0 else (size - min_size) / size_span
                foot_length = length_min + (length_span * ratio)
                base_width = width_min + (width_span * ratio)

                for width in width_samples:
                    rows.append(
                        {
                            "gender": gender,
                            "footLengthCm": foot_length,
                            "footWidthCm": (width + base_width) / 2,
                            "preferredFit": preferred_fit,
                            "productId": product_id,
                            "category": category,
                        }
                    )
                    labels.append(float(size))

    return rows, labels


def train_from_dataset(dataset_path: Path, model_dir: Path) -> Dict[str, Any]:
    rows, labels = build_rows_from_dataset(dataset_path)
    if len(rows) < 5:
        raise ValueError("Not enough dataset rows. Need at least 5 rows.")

    classes = sorted({float(size) for size in labels})

    model_version = f"v0.1.0-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    meta = {
        "version": model_version,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "rows": len(rows),
        "classes": [float(c) for c in classes],
        "metrics": {},
        "calibrated": False,
    }

    model_payload = {
        "samples": [
            {
                "gender": row["gender"],
                "footLengthCm": row["footLengthCm"],
                "footWidthCm": row["footWidthCm"],
                "preferredFit": row["preferredFit"],
                "productId": row["productId"],
                "category": row["category"],
                "sizeUK": label,
            }
            for row, label in zip(rows, labels)
        ]
    }

    save_model(model_dir, model_payload, meta)
    return meta


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train fit model from dataset CSV.")
    parser.add_argument("--dataset", type=Path, default=Path("footwear_dataset.csv"))
    parser.add_argument("--model-dir", type=Path, default=Path("backend/models"))
    args = parser.parse_args()

    meta = train_from_dataset(args.dataset, args.model_dir)
    print(json.dumps(meta, indent=2))
