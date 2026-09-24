// Site configuration. Everything a maintainer is likely to change lives here.

export const CONFIG = {
  version: '1.0.0',

  // Domain endings users can pick from, and the ones selected on first visit.
  tlds: ['com', 'io', 'app', 'de', 'co', 'ai', 'net', 'dev'],
  defaultTlds: ['com', 'io', 'de'],
  maxTlds: 4,

  // Endings that can turn a name into a domain hack ("Shoply" -> shop.ly).
  hackTlds: ['ly', 'io', 'ai', 'co', 'me', 'it', 'us', 'is', 'to', 'am', 'so'],

  // Registrar link. This is a Namecheap affiliate link and is labelled as such in the UI.
  registrarUrl(domain) {
    const target = `https://www.namecheap.com/domains/registration/results.aspx?domain=${encodeURIComponent(domain)}`;
    return `https://namecheap.pxf.io/c/3518952/386170/5618?u=${encodeURIComponent(target)}`;
  },

  // Availability is checked with DNS-over-HTTPS. If you change the provider,
  // update connect-src in the Content-Security-Policy in index.html too.
  dohUrl: 'https://cloudflare-dns.com/dns-query',

  // Optional AI suggestions. Deploy api/suggest.js (see README) and put its URL here.
  // Leave empty to hide the AI option completely.
  aiEndpoint: '',

  pageSize: 24,
};
