// nameyard name generator.
// Pure functions only: no DOM access, so it runs in the browser and in `node --test`.

import { wordsFor, ARTIFICIAL_ENDINGS } from './wordlists.js';
import { isKnownBrand } from './trademarks.js';

export const STYLES = {
  prefix: 'Word in front',
  suffix: 'Word behind',
  combo: 'Your words combined',
  blend: 'Blends',
  ending: 'Invented endings',
  twist: 'Spelling twists',
};

const VOWELS = 'aeiouy';
const isVowel = (ch) => VOWELS.includes(ch);

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

const GERMAN = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Lowercase ASCII letters/digits only. "Über" -> "ueber", "Café" -> "cafe". */
export function toAscii(word) {
  return String(word)
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => GERMAN[ch])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Splits free text into up to three clean, unique words. */
export function tokenize(input) {
  const words = String(input)
    .split(/[\s,;+&/_-]+/)
    .map(toAscii)
    .filter((w) => w.length >= 2);
  return [...new Set(words)].slice(0, 3);
}

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Joins two parts and merges a doubled letter at the seam ("hyper" + "rise" -> "hyperise"). */
export function join(a, b) {
  if (!a || !b) return '';
  return a.at(-1) === b[0] ? a + b.slice(1) : a + b;
}

/** Attaches an invented ending such as -ly, -ify or -io in a pronounceable way. */
export function attachEnding(word, ending) {
  if (word.endsWith(ending) || (ending === 'er' && /[aeiou]r$/.test(word))) return null;
  let stem = word;
  if (isVowel(ending[0])) {
    // "coffee" + "io" -> "coffio"; keep at least three letters of the stem.
    // A final "y" counts as a consonant here, so "sky" + "ify" -> "skify".
    while (stem.length > 3 && /[aeiou]$/.test(stem)) stem = stem.slice(0, -1);
    if (/[aeiou]$/.test(stem)) return null;
    // "maker" + "a" -> "makera" reads badly; only attach -a/-o/-io after a plain consonant.
    if (/r$/.test(stem) && ending !== 'able') return null;
  }
  if (ending === 'ify' && stem.endsWith('y')) stem = stem.slice(0, -1);
  if (ending === 'ify' && /er$/.test(stem)) return null; // "makerify"
  if (ending === 'ly' && stem.endsWith('l')) return null; // "coolly"
  if (ending === 'ster' && /(s|st|ee)$/.test(stem)) return null; // "coffeester"
  return stem + ending;
}

/**
 * Portmanteaus that overlap on a shared pair of letters:
 * "motor" + "hotel" -> "motel", "cloud" + "sound" -> "clound".
 * A single shared letter is not enough; that produced unreadable names.
 */
export function blends(a, b) {
  const out = [];
  for (let i = 1; i < a.length - 1; i++) {
    const pair = a.slice(i, i + 2);
    for (let j = 1; j < b.length - 1; j++) {
      if (b.slice(j, j + 2) !== pair) continue;
      const blend = a.slice(0, i) + b.slice(j);
      const keepsA = i >= 2 && i >= a.length / 3;
      const keepsB = b.length - j >= 3;
      if (keepsA && keepsB && blend.length >= 5 && blend.length <= 10 &&
          !a.startsWith(blend) && !b.endsWith(blend) && blend !== a + b.slice(j)) {
        out.push(blend);
      }
    }
  }
  return [...new Set(out)].slice(0, 2);
}

/** Playful re-spellings: "maker" -> "makr", "cloud" -> "kloud". */
export function twists(word) {
  const out = new Set();
  if (/[^aeiou]er$/.test(word) && word.length > 4) out.add(word.slice(0, -2) + 'r');
  if (/^c[aou]/.test(word)) out.add('k' + word.slice(1));
  if (word.includes('ph')) out.add(word.replace(/ph/g, 'f'));
  if (/[^s]s$/.test(word) && word.length > 3) out.add(word.slice(0, -1) + 'z');
  if (/i/.test(word) && !/y/.test(word)) out.add(word.replace(/i(?!.*i)/, 'y'));
  out.delete(word);
  return [...out];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Rough English syllable count, good enough for ranking short names. */
export function countSyllables(word) {
  const w = toAscii(word);
  if (!w) return 0;
  let count = (w.match(/[aeiouy]+/g) || []).length;
  // Silent final e ("space"), but not "-ee" ("coffee") or "-le" ("able").
  if (/[^aeiouyl]e$/.test(w) && count > 1) count -= 1;
  return Math.max(1, count);
}

const KIND_BONUS = { combo: 2, prefix: 0.5, suffix: 0.5, blend: 0.2, ending: -0.2, twist: -0.5 };

export function score(name, kind, rand = () => 0) {
  const w = name.toLowerCase();
  let s = 0;
  const syl = countSyllables(w);
  s += { 1: 1.5, 2: 3, 3: 2.5, 4: 0.5 }[syl] ?? -1;
  s += w.length <= 8 ? 2 : w.length <= 10 ? 1.2 : w.length <= 12 ? 0.3 : -1.5;
  if (/[^aeiouy]{4,}/.test(w)) s -= 2; // unpronounceable consonant cluster
  if (/(.)\1\1/.test(w)) s -= 3; // "xxx"
  if (/[aeiou]{3,}/.test(w)) s -= 1; // "ueea"
  s += KIND_BONUS[kind] ?? 0;
  s += rand() * 0.6; // small jitter so "Shuffle" changes the order
  return Math.round(s * 100) / 100;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** Small seeded PRNG (mulberry32) so results are reproducible for a given seed. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const DEFAULTS = {
  industry: 'general',
  seed: 0,
  styles: Object.keys(STYLES),
  maxLength: 14,
  maxSyllables: 0, // 0 = no limit
};

/**
 * @returns {{ words: string[], names: {name: string, kind: string, syllables: number, score: number}[] }}
 */
export function generateNames(input, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const words = tokenize(input);
  if (!words.length) return { words, names: [] };

  const { prefixes, suffixes } = wordsFor(opts.industry);
  const styles = new Set(opts.styles);
  const candidates = [];
  const add = (raw, kind) => {
    if (raw && styles.has(kind)) candidates.push({ raw, kind });
  };

  for (const word of words) {
    for (const p of prefixes) if (p !== word) add(join(p, word), 'prefix');
    for (const s of suffixes) if (s !== word) add(join(word, s), 'suffix');
    for (const e of ARTIFICIAL_ENDINGS) add(attachEnding(word, e), 'ending');
    for (const t of twists(word)) add(t, 'twist');
    for (const s of suffixes) for (const b of blends(word, s)) add(b, 'blend');
  }

  for (const a of words) {
    for (const b of words) {
      if (a === b) continue;
      add(join(a, b), 'combo');
      for (const bl of blends(a, b)) add(bl, 'blend');
    }
  }

  const rand = seededRandom(hashString(words.join(' ')) ^ opts.seed);
  const seen = new Set(words); // never suggest the input word itself
  const names = [];

  for (const { raw, kind } of candidates) {
    const key = raw.toLowerCase();
    if (seen.has(key) || key.length < 3 || isKnownBrand(key)) continue;
    seen.add(key);
    const syllables = countSyllables(key);
    if (key.length > opts.maxLength) continue;
    if (opts.maxSyllables && syllables > opts.maxSyllables) continue;
    names.push({ name: capitalize(key), kind, syllables, score: score(key, kind, rand) });
  }

  names.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  return { words, names };
}
