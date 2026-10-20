"""Loads the trained LSTM (state dict in sentiment_lstm.pt) and runs inference."""
import json
import math
import os
import re
import time
from pathlib import Path

import torch
import torch.nn as nn

PAD, START, UNK = 0, 1, 2  # Keras IMDB conventions (index_from = 3)
WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")

TRAINING = {"epochs": 5, "final_loss": 0.2440, "test_accuracy": 83.82, "dataset": "Keras IMDB (25k train / 25k test)"}


class SentimentLSTM(nn.Module):
    """Embedding -> LSTM -> Dropout -> Linear -> Sigmoid (matches the saved layer names)."""

    def __init__(self, num_words: int, embed_dim: int, hidden_dim: int):
        super().__init__()
        self.embedding = nn.Embedding(num_words, embed_dim, padding_idx=PAD)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True)
        self.dropout = nn.Dropout(0.3)
        self.fc = nn.Linear(hidden_dim, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        _, (h, _) = self.lstm(self.embedding(x))
        return self.sigmoid(self.fc(self.dropout(h[-1]))).squeeze(-1)


def _logit(p: float) -> float:
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


class SentimentEngine:
    def __init__(self, model_dir: Path):
        model_dir = Path(model_dir)
        self.cfg = json.loads((model_dir / "config.json").read_text())
        self.vocab = json.loads((model_dir / "vocab.json").read_text())
        self.num_words = self.cfg["num_words"]
        self.max_len = self.cfg["max_len"]
        # Must match how the notebook built its training sequences.
        self.pad_side = os.getenv("PAD_SIDE", "pre")
        self.add_start = os.getenv("ADD_START_TOKEN", "1").lower() not in ("0", "false", "no")

        self.model = SentimentLSTM(self.num_words, self.cfg["embed_dim"], self.cfg["hidden_dim"])
        state = torch.load(model_dir / "sentiment_lstm.pt", map_location="cpu", weights_only=True)
        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]
        self.model.load_state_dict(state)
        self.model.eval()
        self.params = sum(p.numel() for p in self.model.parameters())

    # ---- text -> tensor -------------------------------------------------
    def tokenize(self, text: str) -> list[str]:
        return WORD_RE.findall(text.lower())

    def _id(self, word: str) -> int:
        i = self.vocab.get(word, UNK)
        return i if i < self.num_words else UNK

    def _prepare(self, ids: list[int]) -> list[int]:
        seq = ([START] if self.add_start else []) + ids
        seq = seq[-self.max_len:]
        pad = [PAD] * (self.max_len - len(seq))
        return pad + seq if self.pad_side == "pre" else seq + pad

    @torch.inference_mode()
    def _score(self, batches: list[list[int]], chunk: int = 128) -> list[float]:
        out: list[float] = []
        for s in range(0, len(batches), chunk):
            x = torch.tensor([self._prepare(b) for b in batches[s:s + chunk]], dtype=torch.long)
            out.extend(self.model(x).tolist())
        return out

    # ---- public API -----------------------------------------------------
    def _summary(self, score: float, words: list[str], ids: list[int], ms: float) -> dict:
        positive = score >= 0.5
        window = self.max_len - (1 if self.add_start else 0)
        return {
            "label": "positive" if positive else "negative",
            "score": round(score, 4),
            "confidence": round(score if positive else 1 - score, 4),
            "tokens": len(words),
            "unknown": sum(1 for i in ids if i == UNK),
            "truncated": len(words) > window,
            "latency_ms": round(ms, 1),
        }

    def predict(self, text: str) -> dict:
        t0 = time.perf_counter()
        words = self.tokenize(text)
        ids = [self._id(w) for w in words]
        score = self._score([ids])[0]
        return self._summary(score, words, ids, (time.perf_counter() - t0) * 1000)

    def predict_many(self, texts: list[str]) -> list[dict]:
        t0 = time.perf_counter()
        toks = [self.tokenize(t) for t in texts]
        ids = [[self._id(w) for w in ws] for ws in toks]
        scores = self._score(ids)
        ms = (time.perf_counter() - t0) * 1000 / max(len(texts), 1)
        return [self._summary(s, w, i, ms) for s, w, i in zip(scores, toks, ids)]

    def explain(self, text: str) -> dict:
        """Word influence by occlusion: how much does the logit drop when a word is removed?"""
        t0 = time.perf_counter()
        words = self.tokenize(text)
        ids = [self._id(w) for w in words]
        window = self.max_len - (1 if self.add_start else 0)
        first = max(0, len(ids) - window)  # earlier words never reach the model
        variants = [ids] + [ids[:i] + ids[i + 1:] for i in range(first, len(ids))]
        scores = self._score(variants)
        base = _logit(scores[0])
        weights = [0.0] * first + [round(base - _logit(p), 3) for p in scores[1:]]
        result = self._summary(scores[0], words, ids, (time.perf_counter() - t0) * 1000)
        result["words"] = [{"word": w, "weight": wt, "known": i != UNK} for w, wt, i in zip(words, weights, ids)]
        return result

    def info(self) -> dict:
        c = self.cfg
        return {
            "architecture": [
                {"layer": "Embedding", "detail": f"{self.num_words} words x {c['embed_dim']} dims"},
                {"layer": "LSTM", "detail": f"{c['embed_dim']} inputs, {c['hidden_dim']} hidden units"},
                {"layer": "Dropout", "detail": "p = 0.3, training only"},
                {"layer": "Linear", "detail": f"{c['hidden_dim']} to 1 output"},
                {"layer": "Sigmoid", "detail": "probability the review is positive"},
            ],
            "parameters": self.params,
            "vocab_size": len(self.vocab),
            "num_words": self.num_words,
            "max_len": self.max_len,
            "pad_side": self.pad_side,
            "add_start_token": self.add_start,
            "training": TRAINING,
        }
