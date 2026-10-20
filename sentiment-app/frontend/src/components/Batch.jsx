import { useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { describe, mix, rgb, pct } from "../lib/sentiment";
import BulbMeter from "./BulbMeter";

const DEMO = [
  "One of the best films I've seen this year. Brilliant script and a stunning lead performance.",
  "Painfully boring. Two hours of my life I will never get back.",
  "The visuals are lovely but the plot is thin and the ending felt rushed.",
  "A warm, funny crowd-pleaser that I'd happily watch again.",
  "Terrible acting, a ridiculous story and a soundtrack that gave me a headache.",
  "Solid thriller with a few great twists. Slightly too long, but worth it.",
].join("\n");

const COLORS = { positive: "#ffc24b", mixed: "#b49aa8", negative: "#7c8cff" };

function downloadCsv(items) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = ["review,label,positive_score", ...items.map((i) => `${esc(i.text)},${describe(i.score).label},${i.score}`)];
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "sentiment-results.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Batch() {
  const [text, setText] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("input");
  const fileRef = useRef(null);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  async function run() {
    if (!lines.length || busy) return;
    setBusy(true);
    setError("");
    try {
      setData(await api.batch(lines.slice(0, 200)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result));
    reader.readAsText(f);
    e.target.value = "";
  }

  const items = useMemo(() => {
    if (!data) return [];
    const list = [...data.items];
    if (sort === "high") list.sort((a, b) => b.score - a.score);
    if (sort === "low") list.sort((a, b) => a.score - b.score);
    return list;
  }, [data, sort]);

  const s = data?.summary;
  const share = (n) => (s ? (n / s.total) * 100 : 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-panel/80 p-5 sm:p-7">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Read a whole audience at once</h2>
        <p className="mt-2 max-w-prose text-mute">Put one review on each line, or load a text file. You'll get a summary you could show on a title's page.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="One review per line..."
          aria-label="Reviews, one per line"
          className="mt-5 w-full resize-y rounded-2xl border border-line bg-night/70 p-4 leading-relaxed placeholder:text-mute/70 focus:border-gold/60 focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={() => setText(DEMO)} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-mute transition hover:border-gold/50 hover:text-ink">Load sample reviews</button>
          <button onClick={() => fileRef.current?.click()} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-mute transition hover:border-gold/50 hover:text-ink">Open text file</button>
          <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={onFile} />
          <span className="text-sm text-mute">{lines.length} {lines.length === 1 ? "review" : "reviews"}</span>
          <button onClick={run} disabled={!lines.length || busy} className="ml-auto rounded-full bg-gold px-6 py-2.5 font-semibold text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? "Reading..." : "Analyze all"}
          </button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </section>

      {s && (
        <section className="rounded-[2rem] border border-line bg-raised/70 p-5 sm:p-7">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm text-mute">Audience mood</p>
              <p className="font-display text-6xl font-bold tracking-tight" style={{ color: rgb(mix(s.average_score)), fontStretch: "80%" }}>
                {pct(s.average_score, 0)}
              </p>
              <p className="text-mute">average positive score across {s.total} reviews</p>
            </div>
            <BulbMeter score={s.average_score} />
          </div>

          <div className="mt-8" role="img" aria-label={`${s.positive} positive, ${s.mixed} mixed, ${s.negative} negative`}>
            <div className="flex h-4 overflow-hidden rounded-full bg-night">
              {[["positive", s.positive], ["mixed", s.mixed], ["negative", s.negative]].map(([k, n]) => (
                <div key={k} style={{ width: `${share(n)}%`, background: COLORS[k] }} className="transition-all duration-700" />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {[["positive", "Positive", s.positive], ["mixed", "Mixed", s.mixed], ["negative", "Negative", s.negative]].map(([k, l, n]) => (
                <span key={k} className="flex items-center gap-2 text-mute">
                  <span className="size-2.5 rounded-full" style={{ background: COLORS[k] }} />
                  {l} <b className="font-semibold text-ink">{n}</b> ({share(n).toFixed(0)}%)
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-semibold">Every review</h3>
            <div className="flex items-center gap-3 text-sm">
              <label className="text-mute" htmlFor="sort">Order</label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-full border border-line bg-night px-3 py-1.5">
                <option value="input">As entered</option>
                <option value="high">Most positive</option>
                <option value="low">Most negative</option>
              </select>
              <button onClick={() => downloadCsv(items)} className="rounded-full border border-line px-3.5 py-1.5 text-mute transition hover:border-gold/50 hover:text-ink">Download CSV</button>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {items.map((it, i) => {
              const d = describe(it.score);
              return (
                <li key={i} className="flex items-start gap-4 py-3">
                  <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: COLORS[d.key], boxShadow: `0 0 10px ${COLORS[d.key]}88` }} />
                  <p className="min-w-0 flex-1 text-ink/90">{it.text}</p>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold" style={{ color: COLORS[d.key] }}>{d.label}</p>
                    <p className="text-xs text-mute">{pct(it.score, 0)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
