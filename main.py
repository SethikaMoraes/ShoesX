from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from inference import MODEL_PATH, predict

app = FastAPI(title="ShoesX ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5500",
        "http://localhost:5501",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    gender: str = Field(..., examples=["Male"])
    footLengthCm: float = Field(..., examples=[26.5])
    footWidthCm: float = Field(..., examples=[9.8])
    category: str = Field(..., examples=["Running"])
    preferredFit: str = Field(default="regular", examples=["regular"])

    @field_validator("gender", "category", "preferredFit")
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError("Field must be a non-empty string.")
        return cleaned

    @field_validator("footLengthCm")
    @classmethod
    def validate_foot_length(cls, value: float) -> float:
        if value < 10 or value > 40:
            raise ValueError("footLengthCm must be between 10 and 40 cm.")
        return value

    @field_validator("footWidthCm")
    @classmethod
    def validate_foot_width(cls, value: float) -> float:
        if value < 5 or value > 20:
            raise ValueError("footWidthCm must be between 5 and 20 cm.")
        return value


class PredictResponse(BaseModel):
    recommendedSizeUK: str
    confidence: float
    riskLevel: Literal["Low", "Medium", "High"]


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "modelPath": str(MODEL_PATH),
        "modelExists": MODEL_PATH.exists(),
    }


@app.post("/predict", response_model=PredictResponse)
def predict_size(payload: PredictRequest) -> PredictResponse:
    try:
        result = predict(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Model artifact not found. Run `python train_model.py` before calling /predict.",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return PredictResponse(**result)
