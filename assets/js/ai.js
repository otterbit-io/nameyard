// Optional AI suggestions. Only used when CONFIG.aiEndpoint is set.

import { CONFIG } from './config.js';

const NAME_RE = /^[A-Za-z][A-Za-z0-9]{2,19}$/;

export const aiAvailable = () => Boolean(CONFIG.aiEndpoint);

export async function fetchAiNames(words, industry, signal) {
  const res = await fetch(CONFIG.aiEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ words, industry }),
    signal,
  });
  if (!res.ok) throw new Error(`AI endpoint answered ${res.status}`);
  const data = await res.json();
  const names = Array.isArray(data.names) ? data.names : [];
  // Never trust the model's output shape: keep plain single-word names only.
  return [...new Set(names.map(String).map((n) => n.trim()).filter((n) => NAME_RE.test(n)))].slice(0, 30);
}
