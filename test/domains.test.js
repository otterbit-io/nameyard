import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainsFor, statusFromDns, checkDomain, socialLinks } from '../dist/assets/js/domains.js';
import { parseSharedList, shareUrl } from '../dist/assets/js/shortlist.js';
import { CONFIG } from '../dist/assets/js/config.js';

test('domains for the selected endings plus a domain hack', () => {
  assert.deepEqual(domainsFor('Shoply', ['com', 'de']).map((d) => d.domain), ['shoply.com', 'shoply.de', 'shop.ly']);
  assert.deepEqual(domainsFor('Coffio', ['com']).map((d) => d.domain), ['coffio.com', 'coff.io']);
  assert.deepEqual(domainsFor('Shopio', ['com', 'io']).map((d) => d.domain), ['shopio.com', 'shopio.io']);
  assert.deepEqual(domainsFor('Cloudio', ['com']).map((d) => d.domain), ['cloudio.com', 'cloud.io']);
});

test('DNS answers are mapped to a status', () => {
  assert.equal(statusFromDns({ Status: 3 }), 'available');
  assert.equal(statusFromDns({ Status: 0, Answer: [] }), 'taken');
  assert.equal(statusFromDns({ Status: 2 }), 'unknown');
  assert.equal(statusFromDns(null), 'unknown');
});

test('domain checks are cached and failures are reported as unknown', async () => {
  let calls = 0;
  const fakeFetch = async (url) => {
    calls += 1;
    assert.match(url, /name=test-free\.com&type=NS|name=test-fail\.com&type=NS/);
    if (url.includes('fail')) throw new Error('offline');
    return { ok: true, json: async () => ({ Status: 3 }) };
  };
  assert.equal(await checkDomain('test-free.com', fakeFetch), 'available');
  assert.equal(await checkDomain('test-free.com', fakeFetch), 'available');
  assert.equal(calls, 1);
  assert.equal(await checkDomain('test-fail.com', fakeFetch), 'unknown');
});

test('registrar link encodes the domain', () => {
  const url = CONFIG.registrarUrl('a&b.com');
  assert.ok(url.startsWith('https://namecheap.pxf.io/'));
  assert.ok(!url.includes('&b.com'));
  assert.ok(decodeURIComponent(url).includes('domain=a%26b.com'));
});

test('shared shortlists only accept plain names', () => {
  assert.deepEqual(parseSharedList('?list=Coffio,Coffio,<b>x</b>,Evil"Name,Shoply'), ['Coffio', 'Shoply']);
  assert.equal(shareUrl(['Coffio', 'Shoply'], 'https://nameyard.xyz/'), 'https://nameyard.xyz/?list=Coffio%2CShoply');
});

test('social links are lowercase and encoded', () => {
  assert.equal(socialLinks('Coffio')[0].url, 'https://www.instagram.com/coffio/');
});
