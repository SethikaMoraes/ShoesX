from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import firebase_admin
from firebase_admin import credentials, firestore

from ml.model import load_model, predict_with_model
from ml.train import train_from_dataset

load_dotenv()

MODEL_DIR = Path(os.getenv("MODEL_DIR", "backend/models"))
DATASET_PATH = Path(
    os.getenv(
        "DATASET_PATH",
        str(Path(__file__).resolve().parents[1] / "footwear_dataset.csv"),
    )
)
MODEL_REGISTRY_COLLECTION = os.getenv("MODEL_REGISTRY_COLLECTION", "modelRegistry")
MODEL_REGISTRY_DOC = os.getenv("MODEL_REGISTRY_DOC", "fit-assurance")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

ALLOW_ORIGINS = [origin.strip() for origin in os.getenv("ALLOW_ORIGINS", "").split(",") if origin.strip()]
if not ALLOW_ORIGINS:
    ALLOW_ORIGINS = ["http://localhost:5501"]

app = FastAPI(title="ShoesX Fit Assurance API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_db = None
_model_bundle = None


def init_firestore() -> firestore.Client:
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        service_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if service_json:
            if service_json.startswith("{"):
                cred = credentials.Certificate(json.loads(service_json))
            else:
                cred = credentials.Certificate(service_json)
        else:
            cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred, {"projectId": os.getenv("FIREBASE_PROJECT_ID")})

    _db = firestore.client()
    return _db


def get_db() -> firestore.Client:
    return init_firestore()


def get_model_bundle():
    global _model_bundle
    if _model_bundle is None:
        _model_bundle = load_model(MODEL_DIR)
    return _model_bundle


def refresh_model_bundle():
    global _model_bundle
    _model_bundle = load_model(MODEL_DIR)
    return _model_bundle


class PredictRequest(BaseModel):
    userId: Optional[str] = None
    gender: str
    footLengthCm: float
    footWidthCm: float
    preferredFit: str
    productId: str
    category: Optional[str] = None


class PredictResponse(BaseModel):
    recommendedSizeUK: float
    topSizesUK: list
    confidence: float
    returnRisk: float
    modelVersion: str
    notes: list


class LogEventRequest(BaseModel):
    eventType: str
    userId: Optional[str] = None
    anonymousId: Optional[str] = None
    productId: Optional[str] = None
    category: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    outputs: Optional[Dict[str, Any]] = None
    chosenSize: Optional[str] = None
    chosenSizeUK: Optional[float] = None
    feedback: Optional[str] = None
    returned: Optional[bool] = None
    timestamp: Optional[str] = None


class TrainResponse(BaseModel):
    modelVersion: str
    metrics: Dict[str, Any]
    trainedAt: str
    calibrated: bool
    rows: int


def require_admin(x_api_key: str = Header(default="")):
    if not ADMIN_API_KEY or x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, db: firestore.Client = Depends(get_db)):
    bundle = get_model_bundle()
    request_data = payload.dict()

    if bundle is None:
        raise HTTPException(status_code=503, detail="Model not trained yet.")

    prediction = predict_with_model(bundle, request_data)

    return PredictResponse(
        recommendedSizeUK=prediction["recommendedSizeUK"],
        topSizesUK=prediction["topSizesUK"],
        confidence=prediction["confidence"],
        returnRisk=prediction["returnRisk"],
        modelVersion=bundle.version,
        notes=prediction.get("notes", []),
    )


@app.post("/log-event")
def log_event(payload: LogEventRequest, db: firestore.Client = Depends(get_db)):
    data = payload.dict()
    data["createdAt"] = firestore.SERVER_TIMESTAMP
    db.collection("fitEvents").add(data)
    return {"status": "ok"}


@app.post("/train-dataset", response_model=TrainResponse)
def train_dataset(_: None = Depends(require_admin), db: firestore.Client = Depends(get_db)):
    try:
        meta = train_from_dataset(DATASET_PATH, MODEL_DIR)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db.collection(MODEL_REGISTRY_COLLECTION).document(MODEL_REGISTRY_DOC).set(
        {
            "modelVersion": meta["version"],
            "trainedAt": meta["trainedAt"],
            "metrics": meta["metrics"],
            "rows": meta["rows"],
            "calibrated": meta["calibrated"],
        },
        merge=True,
    )

    refresh_model_bundle()

    return TrainResponse(
        modelVersion=meta["version"],
        metrics=meta["metrics"],
        trainedAt=meta["trainedAt"],
        calibrated=meta["calibrated"],
        rows=meta["rows"],
    )


@app.get("/model-info")
def model_info(db: firestore.Client = Depends(get_db)):
    bundle = get_model_bundle()
    if bundle and bundle.meta:
        return {
            "modelVersion": bundle.version,
            "metrics": bundle.meta.get("metrics", {}),
            "trainedAt": bundle.meta.get("trainedAt"),
            "calibrated": bundle.meta.get("calibrated"),
            "rows": bundle.meta.get("rows"),
        }

    doc = db.collection(MODEL_REGISTRY_COLLECTION).document(MODEL_REGISTRY_DOC).get()
    if doc.exists:
        return doc.to_dict()

    return {
        "modelVersion": "untrained",
        "metrics": {},
        "trainedAt": None,
        "calibrated": False,
        "rows": 0,
    }
