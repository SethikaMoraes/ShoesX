from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

ROOT_DIR = Path(__file__).resolve().parent
DATASET_PATH = ROOT_DIR / "ml" / "data" / "footwear_size_dataset.csv"
ARTIFACTS_DIR = ROOT_DIR / "ml_artifacts"
EVIDENCE_DIR = ROOT_DIR / "evidence"

TARGET_COLUMN = "recommendedSizeUK"
FEATURE_COLUMNS = ["gender", "footLengthCm", "footWidthCm", "category", "preferredFit"]


@dataclass
class TrainingArtifacts:
    metrics: Dict[str, float]
    train_samples: int
    test_samples: int
    total_samples: int
    classes: List[str]
    class_distribution: Dict[str, int]


def normalize_size_label(value: float | str) -> str:
    number = float(value)
    if number.is_integer():
        return str(int(number))
    return str(number).rstrip("0").rstrip(".")


def derive_preferred_fit(frame: pd.DataFrame) -> pd.Series:
    grouped_quantiles = (
        frame.groupby(["gender", "category"])["footWidthCm"]
        .quantile([0.33, 0.66])
        .unstack()
        .rename(columns={0.33: "q33", 0.66: "q66"})
        .reset_index()
    )

    merged = frame.merge(grouped_quantiles, on=["gender", "category"], how="left")

    return np.where(
        merged["footWidthCm"] <= merged["q33"],
        "snug",
        np.where(merged["footWidthCm"] >= merged["q66"], "roomy", "regular"),
    )


def load_training_frame(dataset_path: Path) -> pd.DataFrame:
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    raw = pd.read_csv(dataset_path)

    required_columns = {
        "gender": "gender",
        "category": "category",
        "foot_length_cm": "footLengthCm",
        "foot_width_cm": "footWidthCm",
        "target_UK_size": "targetUK"
    }

    missing = [name for name in required_columns if name not in raw.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    frame = raw[list(required_columns.keys())].rename(columns=required_columns).copy()

    frame["gender"] = frame["gender"].astype(str).str.strip().str.title()
    frame["category"] = frame["category"].astype(str).str.strip().str.title()
    frame["footLengthCm"] = pd.to_numeric(frame["footLengthCm"], errors="coerce")
    frame["footWidthCm"] = pd.to_numeric(frame["footWidthCm"], errors="coerce")
    frame["targetUK"] = pd.to_numeric(frame["targetUK"], errors="coerce")

    frame = frame.dropna(subset=["gender", "category", "footLengthCm", "footWidthCm", "targetUK"])
    frame = frame[(frame["footLengthCm"] >= 10) & (frame["footLengthCm"] <= 40)]
    frame = frame[(frame["footWidthCm"] >= 5) & (frame["footWidthCm"] <= 20)]

    frame[TARGET_COLUMN] = frame["targetUK"].apply(normalize_size_label)
    frame["preferredFit"] = derive_preferred_fit(frame)

    class_counts = frame[TARGET_COLUMN].value_counts()
    valid_classes = class_counts[class_counts >= 2].index
    frame = frame[frame[TARGET_COLUMN].isin(valid_classes)].copy()

    if frame.empty:
        raise ValueError("No valid rows remain after preprocessing.")

    return frame


def build_pipeline() -> Pipeline:
    numeric_features = ["footLengthCm", "footWidthCm"]
    categorical_features = ["gender", "category", "preferredFit"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", StandardScaler(), numeric_features),
            ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ],
        remainder="drop",
    )

    classifier = RandomForestClassifier(
        n_estimators=180,
        max_depth=20,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ]
    )


def save_metrics_plot(metrics: Dict[str, float], output_path: Path) -> None:
    labels = ["Accuracy", "Macro F1", "Macro Precision", "Macro Recall"]
    values = [
        metrics["accuracy"],
        metrics["macro_f1"],
        metrics["macro_precision"],
        metrics["macro_recall"],
    ]

    fig, axis = plt.subplots(figsize=(8, 5))
    bars = axis.bar(labels, values, color=["#4c1d95", "#6d28d9", "#7c3aed", "#8b5cf6"])
    axis.set_ylim(0, 1.0)
    axis.set_ylabel("Score")
    axis.set_title("Fit Model Evaluation Metrics")

    for bar, value in zip(bars, values):
        axis.text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.02,
            f"{value:.3f}",
            ha="center",
            va="bottom",
            fontsize=10,
        )

    fig.tight_layout()
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def save_confusion_matrix(y_true: pd.Series, y_pred: pd.Series, labels: List[str], output_path: Path) -> None:
    matrix = confusion_matrix(y_true, y_pred, labels=labels)
    side = max(7, int(len(labels) * 0.85))

    fig, axis = plt.subplots(figsize=(side, side))
    disp = ConfusionMatrixDisplay(confusion_matrix=matrix, display_labels=labels)
    disp.plot(ax=axis, cmap="Blues", xticks_rotation=45, values_format="d", colorbar=False)
    axis.set_title("Confusion Matrix (Test Split)")
    fig.tight_layout()
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def write_features_summary(output_path: Path, dataset_path: Path) -> None:
    summary = f"""# Features Used

## Input Features
- `gender`
- `footLengthCm`
- `footWidthCm`
- `category`
- `preferredFit` (derived from width quantiles within each gender+category group)

## Target Label
- `recommendedSizeUK`

## Dataset Source
- Primary training dataset: `{dataset_path.as_posix()}`.
- This dataset is derived from footwear size references and category/gender-specific fit mappings.
- The target label comes from the real `target_UK_size` column in the dataset.
"""
    output_path.write_text(summary, encoding="utf-8")


def train(dataset_path: Path = DATASET_PATH) -> TrainingArtifacts:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    frame = load_training_frame(dataset_path)

    x = frame[FEATURE_COLUMNS]
    y = frame[TARGET_COLUMN]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)

    y_pred = pipeline.predict(x_test)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro")),
        "macro_precision": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
    }

    class_distribution = {
        str(label): int(count) for label, count in y.value_counts().sort_index().items()
    }
    ordered_labels = sorted(y.unique(), key=lambda value: float(value))

    model_bundle = {
        "pipeline": pipeline,
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "classes": ordered_labels,
        "risk_thresholds": {"low_min": 0.85, "medium_min": 0.70},
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "random_seed": RANDOM_SEED,
    }

    joblib.dump(model_bundle, ARTIFACTS_DIR / "model.pkl")

    metrics_payload = {
        **metrics,
        "train_samples": int(len(x_train)),
        "test_samples": int(len(x_test)),
        "total_samples": int(len(frame)),
        "class_distribution": class_distribution,
        "classes": ordered_labels,
        "random_seed": RANDOM_SEED,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    (ARTIFACTS_DIR / "metrics.json").write_text(
        json.dumps(metrics_payload, indent=2),
        encoding="utf-8",
    )

    save_metrics_plot(metrics, ARTIFACTS_DIR / "metrics.png")
    save_confusion_matrix(y_test, pd.Series(y_pred), ordered_labels, ARTIFACTS_DIR / "confusion_matrix.png")
    write_features_summary(ARTIFACTS_DIR / "features_used.md", dataset_path)

    shutil.copy2(ARTIFACTS_DIR / "metrics.png", EVIDENCE_DIR / "metrics_screenshot.png")
    shutil.copy2(ARTIFACTS_DIR / "confusion_matrix.png", EVIDENCE_DIR / "confusion_matrix.png")

    return TrainingArtifacts(
        metrics=metrics,
        train_samples=len(x_train),
        test_samples=len(x_test),
        total_samples=len(frame),
        classes=ordered_labels,
        class_distribution=class_distribution,
    )


def main() -> None:
    artifacts = train()
    output = {
        "metrics": artifacts.metrics,
        "train_samples": artifacts.train_samples,
        "test_samples": artifacts.test_samples,
        "total_samples": artifacts.total_samples,
        "classes": artifacts.classes,
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
