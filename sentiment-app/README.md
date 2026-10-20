# Marquee: IMDB movie review sentiment app

React + Tailwind CSS frontend, FastAPI + PyTorch backend, packaged with Docker.
It serves your trained `sentiment_lstm.pt` (Embedding -> LSTM -> Dropout -> Linear -> Sigmoid).

## Run with Docker

```bash
docker compose up --build
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

The first build downloads CPU-only PyTorch, so give it a few minutes.

## Run without Docker

```bash
# terminal 1
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :8000)
```

## Features

- **Analyze**: verdict, confidence, a marquee bulb meter, and a word heatmap showing which words pushed the score up or down. The page glow changes colour with the verdict.
- **Batch**: paste or upload one review per line, get the audience mood, a positive/mixed/negative split, sortable results and CSV export.
- **Model**: architecture, parameter count, accuracy and loss, and the one-line "why LSTM over RNN" answer.
- **Recent reviews**: saved in the browser (localStorage), click to re-run.
- Live backend status indicator, keyboard shortcut (Ctrl+Enter), responsive layout, reduced-motion support.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET | `/api/model` | model and training details |
| POST | `/api/predict` | `{"text": "..."}` -> label, score, confidence |
| POST | `/api/explain` | same plus per-word influence |
| POST | `/api/batch` | `{"texts": [...]}` -> results and summary |

```bash
curl -X POST localhost:8000/api/predict -H "Content-Type: application/json" \
  -d '{"text":"A brilliant, moving film"}'
```

## If predictions look wrong

Inference must preprocess text exactly like your Colab notebook did. The defaults
(`PAD_SIDE=pre`, `ADD_START_TOKEN=1`) match Keras IMDB with `pad_sequences`. If your
notebook padded at the end or did not add a start token, change those two variables in
`docker-compose.yml` and rebuild. Tokenization is in `backend/app/model.py`.

The `.pt` file is loaded as a state dict. If you ever re-export it as a full pickled
model, change the `torch.load` call in `model.py`.

## Layout

```
backend/   FastAPI app, model class, Dockerfile, model/ (pt, vocab, config)
frontend/  Vite + React + Tailwind v4, nginx Dockerfile
docker-compose.yml
```
