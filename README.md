<div align="center">

# nameyard

![License](https://img.shields.io/github/license/otterbit-io/nameyard)
![Issues](https://img.shields.io/github/issues/otterbit-io/nameyard)
![Last Commit](https://img.shields.io/github/last-commit/otterbit-io/nameyard)
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/otterbit-io/nameyard?include_prereleases)
</div>

## 🚀 Overview

nameyard is a business name generator in the spirit of Namelix, running at [nameyard.website](https://nameyard.website).
Type one to three words and get brandable names, see which domains look free, save favourites
to a shortlist and preview each name as a logo.

## 🎯 Features

- Names from one to three words: prefixes, suffixes, combinations of your words, blends, invented endings and spelling twists
- Industry word lists (tech, food, finance, creative, health, shop)
- Filters for maximum length, syllables and name style, plus a Shuffle button
- Domain availability for up to four endings at once (.com, .io, .app, .de, .co, .ai, .net, .dev), including domain hacks like `shop.ly`
- Shortlist that stays in the browser and can be shared as a link
- Logo previews in six typefaces, downloadable as PNG
- Links to check social handles and a TMview trademark search; well-known brands are never suggested
- Optional AI suggestions through a small Cloudflare Worker (`api/suggest.js`)
- Follows the system light or dark setting, uses the platform font, and respects reduced motion, reduced transparency and increased contrast
- Sheets that open out of the element you tapped, can be dragged away on phones and can be interrupted at any moment (springs in `spring.js`, sheet logic in `sheet.js`)
- No jQuery, no third-party fonts, no cookies, about 25 KB of CSS

## 🛠️ Development

```bash
npm install
npm run build   # copies fonts, builds dist/assets/css/main.css
npm start       # serves dist/ on http://localhost:3000
npm test        # generator, domain, spring and worker tests
```

Use `npm run watch` while editing classes. The JavaScript in `dist/assets/js/` is plain ES modules and needs no build step,
but it has to be served over HTTP; opening `index.html` as a file does not work.

| File | What it does |
| --- | --- |
| `dist/assets/js/config.js` | TLDs, affiliate link, DNS provider, AI endpoint, page size |
| `dist/assets/js/wordlists.js` | Prefixes, suffixes and endings per industry |
| `dist/assets/js/generator.js` | Name generation and scoring (pure functions, tested) |
| `dist/assets/js/trademarks.js` | Brand blocklist and TMview link |
| `dist/assets/js/domains.js` | Domain list, DNS-over-HTTPS checks, social links |
| `dist/assets/js/main.js` | UI |
| `dist/assets/js/spring.js` | Spring animator (damping + response), momentum projection, rubber-banding |
| `dist/assets/js/sheet.js` | Bottom sheets and panels built on `<dialog>` |
| `src/style.css` | Tailwind input and component styles |

## 🌍 Deployment

Serve the `dist/` folder, for example as the document root of an Apache virtual host:

```apache
<VirtualHost *:443>
    ServerName nameyard.website
    DocumentRoot /var/www/nameyard/dist
</VirtualHost>
```

Before going live, fill in the placeholders in `dist/impressum.html` and `dist/datenschutz.html`.

### How the availability check works

The browser asks Cloudflare's DNS-over-HTTPS service for the name servers of each domain. No name servers
(NXDOMAIN) means the domain is almost certainly unregistered, so it is shown as "looks free". Reserved and
premium domains can still show up as free, which is why the UI never promises more than that.
To use another resolver, change `dohUrl` in `config.js` and `connect-src` in the Content-Security-Policy in `index.html`.

### Optional AI suggestions

1. Deploy the Worker: `npx wrangler deploy api/suggest.js --name nameyard-ai --compatibility-date 2026-01-01`
2. Add the key: `npx wrangler secret put ANTHROPIC_API_KEY --name nameyard-ai`
3. Set `ALLOWED_ORIGIN` to your site's origin and add a rate limiting rule for the Worker.
4. Put the Worker URL into `aiEndpoint` in `config.js` and add its origin to `connect-src` in `index.html`.

The toggle only appears when `aiEndpoint` is set.

## 🤝 Contributing

Contributions, issues and feature requests are welcome on the [issues page](https://github.com/otterbit-io/nameyard/issues).
Please run `npm test` before opening a pull request.

## 📜 License

MIT, see [LICENSE](LICENSE).