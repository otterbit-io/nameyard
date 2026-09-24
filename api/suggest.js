// Optional AI endpoint for nameyard, written as a Cloudflare Worker.
//
// Deploy:
//   npx wrangler deploy api/suggest.js --name nameyard-ai --compatibility-date 2026-01-01
//   npx wrangler secret put ANTHROPIC_API_KEY --name nameyard-ai
// Then set CONFIG.aiEndpoint in dist/assets/js/config.js to the Worker URL and add
// that origin to connect-src in the Content-Security-Policy of dist/index.html.
//
// Optional environment variables:
//   ALLOWED_ORIGIN  e.g. https://nameyard.xyz (default: *)
//   MODEL           default: claude-haiku-4-5-20251001
//
// Put a rate limit in front of this Worker (Cloudflare dashboard → Security → WAF →
// Rate limiting rules), otherwise anyone can spend your API budget.

const INDUSTRIES = new Set(['general', 'tech', 'food', 'finance', 'creative', 'health', 'shop']);

export default {
  async fetch(request, env) {
    const cors = {
      'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, cors);
    }

    const words = (Array.isArray(body.words) ? body.words : [])
      .map((w) => String(w).toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length >= 2 && w.length <= 20)
      .slice(0, 3);
    const industry = INDUSTRIES.has(body.industry) ? body.industry : 'general';
    if (!words.length) return json({ error: 'No usable words' }, 400, cors);

    const prompt = `Suggest 20 short, brandable business names for an idea described by these words: ${words.join(', ')}.
Industry: ${industry}.
Rules: one word each, letters only, 4 to 12 characters, easy to pronounce and spell, no existing well-known brand names.
Answer with a JSON array of strings and nothing else.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return json({ error: 'Upstream error' }, 502, cors);

    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let names = [];
    try {
      names = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    } catch {
      names = [];
    }
    names = names.map(String).filter((n) => /^[A-Za-z][A-Za-z0-9]{2,19}$/.test(n)).slice(0, 30);
    return json({ names }, 200, cors);
  },
};

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}
