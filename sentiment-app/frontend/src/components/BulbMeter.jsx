import { mix, rgb, clamp } from "../lib/sentiment";

/** Marquee-style meter: bulbs light outward from the centre, blue for negative, gold for positive. */
export default function BulbMeter({ score = null, busy = false, count = 24, label }) {
  const half = count / 2;
  const strength = score == null ? 0 : clamp(Math.abs(score - 0.5) * 2);
  const lit = Math.round(strength * half);
  const side = score != null && score >= 0.5 ? "pos" : "neg";

  return (
    <div>
      <div
        role="img"
        aria-label={label || (score == null ? "Sentiment meter, no result yet" : `Sentiment meter, ${Math.round(score * 100)} percent positive`)}
        className={`bulbs ${busy ? "is-busy" : ""}`}
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: count }, (_, i) => {
          const bulbSide = i < half ? "neg" : "pos";
          const dist = i < half ? half - 1 - i : i - half;
          const on = !busy && score != null && bulbSide === side && dist < lit;
          return (
            <span
              key={i}
              className="bulb"
              data-on={on}
              style={{
                "--c": rgb(mix(i / (count - 1))),
                "--d": `${i * 55}ms`,
                transitionDelay: on ? `${dist * 55}ms` : "0ms",
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-mute">
        <span>Negative</span>
        <span>Positive</span>
      </div>
    </div>
  );
}
