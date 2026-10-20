import { useState } from "react";
import { api } from "../lib/api";
import { SAMPLES, describe, mix, rgb, pct } from "../lib/sentiment";
import BulbMeter from "./BulbMeter";

const POS_RGB = [255, 194, 75];
const NEG_RGB = [124, 140, 255];

function Heatmap({ words }) {
  const max = Math.max(0.001, ...words.map((w) => Math.abs(w.weight)));
  return (
    <p className="text-lg leading-9 text-ink/90">
      {words.map((w, i) => {
        const a = Math.min(0.6, (Math.abs(w.weight) / max) * 0.6);
        const strong = Math.abs(w.weight) / max > 0.12;
        return (
          <span key={i}>
            <span
              className="word"
              title={`${w.weight > 0 ? "+" : ""}${w.weight.toFixed(2)} ${w.known ? "" : "(not in vocabulary)"}`}
              style={{
                background: strong ? rgb(w.weight > 0 ? POS_RGB : NEG_RGB, a) : "transparent",
                opacity: w.known ? 1 : 0.55,
              }}
            >
              {w.word}
            </span>{" "}
          </span>
        );
      })}
    </p>
  );
}

export default function Analyzer({ onResult, initial = "" }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showWords, setShowWords] = useState(true);

  async function run(value = text) {
    const t = value.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.explain(t);
      setResult(r);
      onResult?.({ text: t, score: r.score, label: r.label });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const verdict = result ? describe(result.score) : null;
  const color = result ? rgb(mix(result.score)) : undefined;
  const known = result?.words.filter((w) => w.known && Math.abs(w.weight) > 0.15) ?? [];
  const up = [...known].sort((a, b) => b.weight - a.weight).filter((w) => w.weight > 0).slice(0, 4);
  const down = [...known].sort((a, b) => a.weight - b.weight).filter((w) => w.weight < 0).slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-panel/80 p-5 backdrop-blur sm:p-7">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">How does this review feel?</h2>
        <label htmlFor="review" className="sr-only">Movie review</label>
        <textarea
          id="review"
          value={text}
          maxLength={5000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && run()}
          placeholder="Paste a movie review..."
          rows={5}
          className="mt-5 w-full resize-y rounded-2xl border border-line bg-night/70 p-4 text-base leading-relaxed placeholder:text-mute/70 focus:border-gold/60 focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.name}
              onClick={() => { setText(s.text); run(s.text); }}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm text-mute transition hover:border-gold/50 hover:text-ink"
            >
              {s.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-mute sm:inline">Ctrl + Enter to analyze</span>
            <button
              onClick={() => run()}
              disabled={!text.trim() || busy}
              className="rounded-full bg-gold px-6 py-2.5 font-semibold text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Reading..." : "Analyze review"}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </section>

      <section className="rounded-[2rem] border border-line bg-raised/70 p-5 sm:p-7" aria-live="polite">
        <BulbMeter score={result?.score ?? null} busy={busy} />
        {!result && !busy && (
          <p className="mt-6 text-mute">Analyze a review to see the verdict, a confidence score and which words moved it.</p>
        )}
        {result && !busy && (
          <div className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="font-display text-6xl font-bold leading-none tracking-tight sm:text-7xl" style={{ color, fontStretch: "80%" }}>
                {verdict.label}
              </p>
              <dl className="flex gap-6 text-sm">
                <div><dt className="text-mute">Confidence</dt><dd className="text-xl font-semibold">{pct(result.confidence)}</dd></div>
                <div><dt className="text-mute">Positive score</dt><dd className="text-xl font-semibold">{pct(result.score)}</dd></div>
                <div><dt className="text-mute">Time</dt><dd className="text-xl font-semibold">{result.latency_ms} ms</dd></div>
              </dl>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Which words moved it</h3>
              <button onClick={() => setShowWords((s) => !s)} className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline">
                {showWords ? "Hide highlights" : "Show highlights"}
              </button>
            </div>
            {showWords && (
              <div className="mt-3 rounded-2xl bg-night/60 p-4">
                <Heatmap words={result.words} />
                <p className="mt-3 text-xs text-mute">
                  Gold words lift the score, blue words pull it down, faded words are outside the model's vocabulary.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm text-mute">Pushing positive</p>
                <div className="flex flex-wrap gap-2">
                  {up.length ? up.map((w, i) => <span key={i} className="rounded-full bg-gold/15 px-3 py-1 text-sm text-gold">{w.word}</span>) : <span className="text-sm text-mute">Nothing strong</span>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-mute">Pushing negative</p>
                <div className="flex flex-wrap gap-2">
                  {down.length ? down.map((w, i) => <span key={i} className="rounded-full bg-dusk/15 px-3 py-1 text-sm text-dusk">{w.word}</span>) : <span className="text-sm text-mute">Nothing strong</span>}
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-mute">
              {result.tokens} words read, {result.unknown} outside the vocabulary
              {result.truncated ? ", earliest words trimmed to fit the 200-word window" : ""}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
