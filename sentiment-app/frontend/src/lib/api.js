const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the API. Check that the backend is running.");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const msg = Array.isArray(detail?.detail) ? detail.detail[0]?.msg : detail?.detail;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  health: () => request("/health"),
  model: () => request("/model"),
  explain: (text) => request("/explain", { text }),
  batch: (texts) => request("/batch", { texts }),
};
