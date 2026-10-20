import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .model import SentimentEngine

MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).resolve().parent.parent / "model"))
MAX_CHARS = 5000


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = SentimentEngine(MODEL_DIR)
    yield


app = FastAPI(title="Marquee Sentiment API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_CHARS)


class BatchIn(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=200)

    @field_validator("texts")
    @classmethod
    def clean(cls, v: list[str]) -> list[str]:
        v = [t.strip()[:MAX_CHARS] for t in v if t and t.strip()]
        if not v:
            raise ValueError("Provide at least one non-empty review.")
        return v


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": hasattr(app.state, "engine")}


@app.get("/api/model")
def model_info():
    return app.state.engine.info()


@app.post("/api/predict")
def predict(body: TextIn):
    return app.state.engine.predict(body.text)


@app.post("/api/explain")
def explain(body: TextIn):
    """Prediction plus per-word influence (used by the word heatmap)."""
    return app.state.engine.explain(body.text)


@app.post("/api/batch")
def batch(body: BatchIn):
    results = app.state.engine.predict_many(body.texts)
    items = [{"text": t, **r} for t, r in zip(body.texts, results)]
    pos = sum(1 for r in results if r["score"] >= 0.65)
    neg = sum(1 for r in results if r["score"] <= 0.35)
    return {
        "items": items,
        "summary": {
            "total": len(items),
            "positive": pos,
            "negative": neg,
            "mixed": len(items) - pos - neg,
            "average_score": round(sum(r["score"] for r in results) / len(results), 4),
        },
    }
