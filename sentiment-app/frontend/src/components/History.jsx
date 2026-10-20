import { describe, mix, rgb, pct } from "../lib/sentiment";

export default function History({ items, onPick, onClear }) {
  return (
    <aside className="rounded-[1.5rem] border border-line bg-panel/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Recent reviews</h2>
        {items.length > 0 && (
          <button onClick={onClear} className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline">Clear</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-mute">Reviews you analyze are kept here, on this device only.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {items.map((h) => (
            <li key={h.id}>
              <button onClick={() => onPick(h.text)} className="group flex w-full items-start gap-3 rounded-xl p-2 text-left transition hover:bg-raised">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: rgb(mix(h.score)) }} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm text-ink/90">{h.text}</span>
                  <span className="text-xs text-mute">{describe(h.score).label}, {pct(h.score, 0)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
