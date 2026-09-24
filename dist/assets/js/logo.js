// Logo previews: the name set in a handful of typefaces and colour pairs.
// Fonts are self-hosted (see src/style.css), so no request goes to a font CDN.

export const LOGO_STYLES = [
  { family: 'Inter Variable', weight: 800, tracking: -0.04, transform: 'none', bg: '#ffffff', fg: '#111827' },
  { family: 'Space Grotesk', weight: 700, tracking: -0.02, transform: 'lowercase', bg: '#2dca87', fg: '#0b3b2a' },
  { family: 'Fraunces', weight: 700, tracking: -0.01, transform: 'none', bg: '#fff4e0', fg: '#7a2e0e' },
  { family: 'Syne', weight: 700, tracking: 0.08, transform: 'uppercase', bg: '#111827', fg: '#6fffca' },
  { family: 'DM Serif Display', weight: 400, tracking: 0, transform: 'none', bg: '#1e3a8a', fg: '#f8fafc' },
  { family: 'Pacifico', weight: 400, tracking: 0, transform: 'none', bg: '#fde2e4', fg: '#9d174d' },
];

function applyTransform(text, transform) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'lowercase') return text.toLowerCase();
  return text;
}

/** Builds the preview tiles. Returns a DocumentFragment. */
export function renderLogoPreviews(name, onDownload) {
  const frag = document.createDocumentFragment();
  LOGO_STYLES.forEach((style, index) => {
    const figure = document.createElement('figure');
    figure.className = 'logo-card';
    figure.style.background = style.bg;

    const mark = document.createElement('span');
    mark.className = 'logo-mark';
    mark.textContent = applyTransform(name, style.transform);
    mark.style.color = style.fg;
    mark.style.fontFamily = `"${style.family}", system-ui, sans-serif`;
    mark.style.fontWeight = String(style.weight);
    mark.style.letterSpacing = `${style.tracking}em`;
    mark.style.setProperty('--chars', String(Math.max(name.length, 6)));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'logo-download';
    button.textContent = 'Download PNG';
    button.setAttribute('aria-label', `Download ${name} in ${style.family} as PNG`);
    button.addEventListener('click', () => onDownload(name, index));

    figure.append(mark, button);
    frag.append(figure);
  });
  return frag;
}

/** Draws one preview onto a canvas and triggers a PNG download. */
export async function downloadLogo(name, index) {
  const style = LOGO_STYLES[index];
  const fontSize = 120;
  const font = `${style.weight} ${fontSize}px "${style.family}"`;
  await document.fonts.load(font, name);

  const text = applyTransform(name, style.transform);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${style.tracking * fontSize}px`;
  const width = Math.ceil(ctx.measureText(text).width);

  canvas.width = width + fontSize * 1.6;
  canvas.height = fontSize * 2.4;
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = font; // resizing the canvas resets the context
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${style.tracking * fontSize}px`;
  ctx.fillStyle = style.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const link = document.createElement('a');
  link.download = `${name.toLowerCase()}-logo-${index + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
