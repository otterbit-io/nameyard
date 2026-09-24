// Shortlist ("favorites"), stored in the visitor's own browser and shareable by link.

const KEY = 'nameyard:shortlist';
const NAME_RE = /^[A-Za-z0-9]{2,30}$/;

export function loadShortlist() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((n) => NAME_RE.test(n)) : [];
  } catch {
    return [];
  }
}

export function saveShortlist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or storage full: the shortlist still works for this visit.
  }
}

/** Builds a link that opens this page with the given names as a shared shortlist. */
export function shareUrl(names, base = location.origin + location.pathname) {
  const url = new URL(base);
  url.searchParams.set('list', names.join(','));
  return url.toString();
}

/** Reads a shared shortlist from ?list=… and ignores anything that is not a plain name. */
export function parseSharedList(search = location.search) {
  const raw = new URLSearchParams(search).get('list') || '';
  return [...new Set(raw.split(',').map((n) => n.trim()).filter((n) => NAME_RE.test(n)))].slice(0, 50);
}
