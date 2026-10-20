const NEG = [124, 140, 255];
const POS = [255, 194, 75];

export const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const mix = (t) => NEG.map((n, i) => Math.round(n + (POS[i] - n) * clamp(t)));
export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
export const glowFor = (score) => hex(mix(score));

export function describe(score) {
  if (score >= 0.65) return { key: "positive", label: "Positive" };
  if (score <= 0.35) return { key: "negative", label: "Negative" };
  return { key: "mixed", label: "Mixed" };
}

export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

export const SAMPLES = [
  { name: "Rave", text: "An absolute triumph. The performances are stunning, the score gave me chills, and the final act is unforgettable." },
  { name: "Pan", text: "A dull, predictable mess. The dialogue is painful, the pacing drags, and I wanted to leave an hour in." },
  { name: "Split decision", text: "Gorgeous to look at, but the story never really goes anywhere. Good acting can't fully rescue the slow middle." },
  { name: "Sleeper hit", text: "I wasn't expecting much, but it surprised me. Funny, warm and surprisingly moving." },
];
