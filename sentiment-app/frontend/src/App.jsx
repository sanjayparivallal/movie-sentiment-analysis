import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./lib/api";
import { glowFor } from "./lib/sentiment";
import Analyzer from "./components/Analyzer";
import Batch from "./components/Batch";
import ModelInfo from "./components/ModelInfo";
import History from "./components/History";

const TABS = [
  ["analyze", "Analyze"],
  ["batch", "Batch"],
  ["model", "Model"],
];
const KEY = "marquee.history.v1";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

export default function App() {
  const [tab, setTab] = useState("analyze");
  const [history, setHistory] = useState(loadHistory);
  const [online, setOnline] = useState(null);
  const analyzerRef = useRef(null);
  const [seed, setSeed] = useState({ text: "", n: 0 });

  useEffect(() => {
    let alive = true;
    const ping = () => api.health().then(() => alive && setOnline(true)).catch(() => alive && setOnline(false));
    ping();
    const id = setInterval(ping, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(history)); } catch { /* storage unavailable */ }
  }, [history]);

  const onResult = useCallback((r) => {
    document.documentElement.style.setProperty("--glow", glowFor(r.score));
    setHistory((h) => [{ id: Date.now(), ...r }, ...h.filter((x) => x.text !== r.text)].slice(0, 12));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex gap-1">
            <i className="size-2.5 rounded-full bg-dusk shadow-[0_0_8px_#7c8cff]" />
            <i className="size-2.5 rounded-full bg-[#c9a7a5] shadow-[0_0_8px_#c9a7a5aa]" />
            <i className="size-2.5 rounded-full bg-gold shadow-[0_0_8px_#ffc24b]" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">Marquee</h1>
        </div>
        <nav aria-label="Sections" className="flex rounded-full border border-line bg-panel/70 p-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === id ? "bg-ink text-night" : "text-mute hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <p className="flex items-center gap-2 text-sm text-mute" role="status">
          <span className={`size-2 rounded-full ${online ? "bg-emerald-400" : online === false ? "bg-red-400" : "bg-mute"}`} />
          {online ? "Model ready" : online === false ? "Backend offline" : "Connecting..."}
        </p>
      </header>

      <main className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {tab === "analyze" && <Analyzer key={seed.n} initial={seed.text} onResult={onResult} />}
          {tab === "batch" && <Batch />}
          {tab === "model" && <ModelInfo />}
        </div>
        <div ref={analyzerRef} className="lg:sticky lg:top-6 lg:self-start">
          <History
            items={history}
            onPick={(text) => { setSeed((s) => ({ text, n: s.n + 1 })); setTab("analyze"); }}
            onClear={() => setHistory([])}
          />
        </div>
      </main>
    </div>
  );
}
