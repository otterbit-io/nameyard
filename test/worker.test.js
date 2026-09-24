import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../api/suggest.js';

const env = { ANTHROPIC_API_KEY: 'test-key' };
const post = (body) => new Request('https://example.test/', { method: 'POST', body: JSON.stringify(body) });

test('AI worker validates input and cleans the model output', async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    assert.equal(init.headers['x-api-key'], 'test-key');
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: 'Sure! ["Brewly", "Beanory", "<script>", "two words"]' }],
    }));
  };

  const res = await worker.fetch(post({ words: ['Coffee!', 'x'], industry: 'hacker' }), env);
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).names, ['Brewly', 'Beanory']);
  assert.match(sent.messages[0].content, /coffee/);
  assert.match(sent.messages[0].content, /Industry: general/);

  const bad = await worker.fetch(post({ words: [] }), env);
  assert.equal(bad.status, 400);
});
