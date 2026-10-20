import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function ModelInfo() {
  const [m, setM] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.model().then(setM).catch((e) => setErr(e.message)); }, []);

  if (err) return <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{err}</p>;
  if (!m) return <p className="text-mute">Loading model details...</p>;

  const t = m.training;
  const stats = [
    ["Test accuracy", `${t.test_accuracy}%`],
    ["Final training loss", t.final_loss.toFixed(4)],
    ["Epochs", t.epochs],
    ["Parameters", m.parameters.toLocaleString()],
    ["Vocabulary used", m.num_words.toLocaleString()],
    ["Sequence length", `${m.max_len} words`],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-panel/80 p-5 sm:p-7">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">The model behind the meter</h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {stats.map(([k, v]) => (
            <div key={k}><dt className="text-sm text-mute">{k}</dt><dd className="font-display text-3xl font-semibold" style={{ fontStretch: "85%" }}>{v}</dd></div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-mute">Trained on {t.dataset}.</p>
      </section>

      <section className="rounded-[2rem] border border-line bg-raised/70 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">Layers</h3>
        <ol className="mt-4 flex flex-col gap-3 md:flex-row md:items-stretch">
          {m.architecture.map((l, i) => (
            <li key={l.layer} className="relative flex-1 rounded-2xl border border-line bg-night/60 p-4">
              <p className="font-display text-lg font-semibold">{l.layer}</p>
              <p className="mt-1 text-sm text-mute">{l.detail}</p>
              {i < m.architecture.length - 1 && <span aria-hidden className="absolute -bottom-3 left-1/2 z-10 h-3 w-px bg-gold/60 md:-right-3 md:bottom-auto md:left-auto md:top-1/2 md:h-px md:w-3" />}
            </li>
          ))}
        </ol>
        <h3 className="mt-8 font-display text-xl font-semibold">Why an LSTM and not a plain RNN</h3>
        <p className="mt-2 max-w-prose text-ink/90">
          Its gated memory cell carries sentiment cues across a long review without the gradients fading, so an early "loved it" or a late "but the ending ruined it" still counts.
        </p>
        <p className="mt-6 text-xs text-mute">
          Text is lowercased, split into words, mapped to ids with vocab.json and {m.pad_side}-padded to {m.max_len} ids{m.add_start_token ? ", with a start token first" : ""}.
        </p>
      </section>
    </div>
  );
}
