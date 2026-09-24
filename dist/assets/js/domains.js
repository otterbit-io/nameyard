// Domain helpers: which domains to show for a name, and whether they look free.

import { CONFIG } from './config.js';

/** Domains to show for a name: the selected TLDs plus a domain hack if the name allows one. */
export function domainsFor(name, tlds) {
  const base = name.toLowerCase();
  const list = tlds.map((tld) => ({ domain: `${base}.${tld}`, tld, hack: false }));
  for (const tld of CONFIG.hackTlds) {
    const stem = base.slice(0, -tld.length);
    if (base.endsWith(tld) && stem.length >= 3 && !tlds.includes(tld)) {
      list.push({ domain: `${stem}.${tld}`, tld, hack: true });
      break;
    }
  }
  return list;
}

/**
 * Interprets a DNS-over-HTTPS JSON answer for an NS query.
 * NXDOMAIN (Status 3) means nobody has delegated the name, which almost always
 * means it is unregistered. It is still only "likely free": a domain can be
 * registered without name servers, or be reserved or premium.
 */
export function statusFromDns(json) {
  if (!json || typeof json.Status !== 'number') return 'unknown';
  if (json.Status === 3) return 'available';
  if (json.Status === 0) return 'taken';
  return 'unknown';
}

const cache = new Map();
const queue = [];
let running = 0;
const MAX_PARALLEL = 4;

function pump(fetchImpl) {
  while (running < MAX_PARALLEL && queue.length) {
    const { domain, resolve } = queue.shift();
    running += 1;
    const url = `${CONFIG.dohUrl}?name=${encodeURIComponent(domain)}&type=NS`;
    fetchImpl(url, { headers: { accept: 'application/dns-json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then(statusFromDns)
      .catch(() => 'unknown')
      .then((status) => {
        running -= 1;
        if (status === 'unknown') cache.delete(domain); // allow a retry later
        resolve(status);
        pump(fetchImpl);
      });
  }
}

/** Resolves to 'available' | 'taken' | 'unknown'. Results are cached per page load. */
export function checkDomain(domain, fetchImpl = globalThis.fetch.bind(globalThis)) {
  if (!cache.has(domain)) {
    cache.set(domain, new Promise((resolve) => {
      queue.push({ domain, resolve });
      pump(fetchImpl);
    }));
  }
  return cache.get(domain);
}

export function socialLinks(name) {
  const h = encodeURIComponent(name.toLowerCase());
  return [
    { label: 'Instagram', url: `https://www.instagram.com/${h}/` },
    { label: 'X', url: `https://x.com/${h}` },
    { label: 'TikTok', url: `https://www.tiktok.com/@${h}` },
    { label: 'YouTube', url: `https://www.youtube.com/@${h}` },
    { label: 'GitHub', url: `https://github.com/${h}` },
  ];
}
