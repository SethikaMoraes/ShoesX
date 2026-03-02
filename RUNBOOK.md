# ShoesX ML + API + AR Demo Runbook

## 1) Create Python virtual environment

```bash
python -m venv .venv
```

Windows PowerShell:

```bash
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

## 2) Install Python dependencies

```bash
pip install -r requirements.txt
```

## 3) Train the real ML model and generate artifacts

```bash
python train_model.py
```

Expected outputs:
- `ml_artifacts/model.pkl`
- `ml_artifacts/metrics.json`
- `ml_artifacts/metrics.png`
- `ml_artifacts/confusion_matrix.png`
- `ml_artifacts/features_used.md`

## 4) Run the FastAPI server

```bash
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## 5) Run the existing React frontend (unchanged UI)

```bash
npm install
npm run dev
```

Then open:
- `http://localhost:5173/fit-assurance`
- `http://localhost:5173/products`
- open any Product Details page from `/products` (example: `/product/aeroflex-runner` if present)
- `http://localhost:5173/profile`

## 6) Test `/predict` with curl

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d "{\"gender\":\"Male\",\"footLengthCm\":26.5,\"footWidthCm\":9.8,\"category\":\"Running\",\"preferredFit\":\"regular\"}"
```

Example response shape:

```json
{
  "recommendedSizeUK": "8",
  "confidence": 0.92,
  "riskLevel": "Low"
}
```

## 7) Evidence locations

- `evidence/metrics_screenshot.png`
- `evidence/confusion_matrix.png`
- `evidence/ui_fit_recommendation.png`
- `evidence/ui_ar_3d.png`
