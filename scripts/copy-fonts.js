// Copies the self-hosted logo-preview fonts from node_modules into dist/assets/fonts.
import { copyFileSync, mkdirSync } from 'node:fs';

const FILES = [
  ['@fontsource-variable/inter', 'inter-latin-wght-normal.woff2'],
  ['@fontsource/space-grotesk', 'space-grotesk-latin-700-normal.woff2'],
  ['@fontsource/fraunces', 'fraunces-latin-700-normal.woff2'],
  ['@fontsource/syne', 'syne-latin-700-normal.woff2'],
  ['@fontsource/dm-serif-display', 'dm-serif-display-latin-400-normal.woff2'],
  ['@fontsource/pacifico', 'pacifico-latin-400-normal.woff2'],
];

mkdirSync('dist/assets/fonts', { recursive: true });
for (const [pkg, file] of FILES) {
  copyFileSync(`node_modules/${pkg}/files/${file}`, `dist/assets/fonts/${file}`);
}
console.log(`Copied ${FILES.length} font files to dist/assets/fonts`);
