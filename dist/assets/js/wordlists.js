// Word lists used by the generator.
// Every list is deduplicated at load time, so an entry that appears twice
// can no longer produce duplicate names (the old "Coffeeify" twice bug).

const uniq = (list) => [...new Set(list.map((w) => w.toLowerCase()))];

// Short, real English words that work as a first part ("Upshop", "Brightbean").
const GENERAL_PREFIXES = [
  'active', 'bright', 'clear', 'core', 'daily', 'echo', 'ever', 'fair', 'first',
  'fresh', 'go', 'good', 'high', 'home', 'hyper', 'just', 'live', 'make', 'meta',
  'new', 'next', 'north', 'one', 'open', 'over', 'peak', 'pure', 'real', 'solid',
  'spark', 'true', 'up', 'wild', 'wise',
];

// Real words that work as a second part ("Coffeelab", "Shophub").
const GENERAL_SUFFIXES = [
  'base', 'bay', 'boost', 'box', 'cast', 'craft', 'dash', 'deck', 'dock', 'drop',
  'flow', 'forge', 'glow', 'grid', 'hive', 'hub', 'kit', 'lab', 'layer', 'line',
  'loop', 'mark', 'mode', 'nest', 'path', 'port', 'press', 'rise', 'scape', 'scout',
  'shift', 'side', 'snap', 'space', 'spot', 'stack', 'studio', 'sync', 'tap',
  'wave', 'works', 'yard',
];

// Artificial endings. These are the only ones kept from the original list;
// "-ible", "-sion", "-ite", "-ice", "-eon", "-gent", "-ance", "-ary" produced
// mostly unreadable names ("Teaible", "Teasion") and were dropped.
export const ARTIFICIAL_ENDINGS = uniq(['ly', 'ify', 'able', 'er', 'ful', 'io', 'o', 'a', 'ster']);

export const INDUSTRIES = {
  general: {
    label: 'Any industry',
    prefixes: [],
    suffixes: [],
  },
  tech: {
    label: 'Tech & software',
    prefixes: ['byte', 'cloud', 'code', 'data', 'dev', 'pixel', 'quantum', 'smart', 'bit', 'logic'],
    suffixes: ['api', 'bot', 'cloud', 'code', 'data', 'logic', 'ops', 'stack', 'ware', 'byte'],
  },
  food: {
    label: 'Food & drink',
    prefixes: ['crumb', 'fresh', 'golden', 'honey', 'salt', 'spice', 'sweet', 'urban', 'green'],
    suffixes: ['bakery', 'bar', 'bite', 'bowl', 'kitchen', 'market', 'pantry', 'plate', 'table', 'bean'],
  },
  finance: {
    label: 'Finance',
    prefixes: ['coin', 'fund', 'gold', 'ledger', 'prime', 'safe', 'trust', 'vault', 'capital'],
    suffixes: ['bank', 'capital', 'coin', 'fund', 'ledger', 'pay', 'trust', 'vault', 'wallet', 'wise'],
  },
  creative: {
    label: 'Creative & design',
    prefixes: ['canvas', 'color', 'ink', 'muse', 'paper', 'studio', 'tone', 'frame'],
    suffixes: ['canvas', 'ink', 'frame', 'muse', 'paper', 'shade', 'studio', 'tone', 'type', 'works'],
  },
  health: {
    label: 'Health & wellness',
    prefixes: ['calm', 'care', 'fit', 'heal', 'life', 'vital', 'well', 'zen', 'bloom'],
    suffixes: ['care', 'clinic', 'fit', 'health', 'life', 'mind', 'pulse', 'well', 'bloom', 'body'],
  },
  shop: {
    label: 'Shop & retail',
    prefixes: ['buy', 'deal', 'shop', 'store', 'cart', 'haul', 'pick', 'bazaar'],
    suffixes: ['cart', 'goods', 'mart', 'shop', 'store', 'supply', 'trade', 'deals', 'outlet'],
  },
};

export function wordsFor(industry = 'general') {
  const extra = INDUSTRIES[industry] || INDUSTRIES.general;
  return {
    prefixes: uniq([...extra.prefixes, ...GENERAL_PREFIXES]),
    suffixes: uniq([...extra.suffixes, ...GENERAL_SUFFIXES]),
    endings: ARTIFICIAL_ENDINGS,
  };
}
