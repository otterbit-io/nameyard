import { CONFIG } from './config.js';
import { generateNames, tokenize, STYLES } from './generator.js';
import { INDUSTRIES } from './wordlists.js';
import { domainsFor, checkDomain, socialLinks } from './domains.js';
import { trademarkSearchUrl } from './trademarks.js';
import { loadShortlist, saveShortlist, shareUrl, parseSharedList } from './shortlist.js';
import { renderLogoPreviews, downloadLogo } from './logo.js';
import { aiAvailable, fetchAiNames } from './ai.js';
import { createSheet } from './sheet.js';
import { createSpring, reducedMotion } from './spring.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// ---------------------------------------------------------------------------
// Settings (remembered in this browser)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'nameyard:settings';
const DEFAULT_SETTINGS = {
  industry: 'general',
  maxLength: 14,
  maxSyllables: 0,
  styles: Object.keys(STYLES),
  tlds: CONFIG.defaultTlds,
  checkDomains: true,
  hideTaken: false,
  useAi: false,
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const s = { ...DEFAULT_SETTINGS, ...saved };
    // Drop anything that no longer exists after an update.
    s.styles = s.styles.filter((k) => k in STYLES);
    s.tlds = s.tlds.filter((t) => CONFIG.tlds.includes(t)).slice(0, CONFIG.maxTlds);
    if (!s.tlds.length) s.tlds = DEFAULT_SETTINGS.tlds;
    if (!(s.industry in INDUSTRIES)) s.industry = 'general';
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    // Storage unavailable: settings last for this visit only.
  }
}

const state = {
  query: '',
  names: [],
  shown: 0,
  seed: 0,
  settings: loadSettings(),
  shortlist: loadShortlist(),
  aiController: null,
};

// ---------------------------------------------------------------------------
// Option controls
// ---------------------------------------------------------------------------

function chip(type, name, value, label, checked) {
  const wrapper = document.createElement('label');
  wrapper.className = 'chip';
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  input.checked = checked;
  const text = document.createElement('span');
  text.textContent = label;
  wrapper.append(input, text);
  return wrapper;
}

function buildOptions() {
  const s = state.settings;

  const industry = $('#industry');
  for (const [key, { label }] of Object.entries(INDUSTRIES)) {
    industry.append(new Option(label, key, false, key === s.industry));
  }

  const styles = $('#styles');
  for (const [key, label] of Object.entries(STYLES)) {
    styles.append(chip('checkbox', 'style', key, label, s.styles.includes(key)));
  }

  const tlds = $('#tlds');
  for (const tld of CONFIG.tlds) {
    tlds.append(chip('checkbox', 'tld', tld, `.${tld}`, s.tlds.includes(tld)));
  }
  limitTlds();

  $('#maxLength').value = s.maxLength;
  $('#maxLengthOut').value = `${s.maxLength} letters`;
  $('#maxSyllables').value = String(s.maxSyllables);
  $('#checkDomains').checked = s.checkDomains;
  $('#hideTaken').checked = s.hideTaken;
  $('#hideTaken').disabled = !s.checkDomains;

  if (aiAvailable()) {
    $('#aiToggle').hidden = false;
    $('#useAi').checked = s.useAi;
  }
}

/** At most CONFIG.maxTlds endings, and never zero. */
function limitTlds() {
  const boxes = $$('#tlds input');
  const checked = boxes.filter((b) => b.checked);
  for (const box of boxes) {
    box.disabled = (!box.checked && checked.length >= CONFIG.maxTlds) || (box.checked && checked.length === 1);
  }
}

function readOptions() {
  const s = state.settings;
  s.industry = $('#industry').value;
  s.maxLength = Number($('#maxLength').value);
  s.maxSyllables = Number($('#maxSyllables').value);
  s.styles = $$('#styles input:checked').map((i) => i.value);
  s.tlds = $$('#tlds input:checked').map((i) => i.value);
  s.checkDomains = $('#checkDomains').checked;
  s.hideTaken = $('#hideTaken').checked;
  s.useAi = aiAvailable() && $('#useAi').checked;
  saveSettings();
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const resultsEl = () => $('#results');

function run({ scroll = false } = {}) {
  const query = $('#input').value.trim();
  const error = $('#input-error');
  if (!tokenize(query).length) {
    error.hidden = false;
    $('#input').setAttribute('aria-invalid', 'true');
    $('#input').focus();
    return;
  }
  error.hidden = true;
  $('#input').removeAttribute('aria-invalid');

  if (query !== state.query) state.seed = 0;
  state.query = query;
  const { words, names } = generateNames(query, { ...state.settings, seed: state.seed });
  state.names = names;
  state.shown = 0;

  resultsEl().replaceChildren();
  $('#results-section').classList.toggle('hide-taken', state.settings.hideTaken && state.settings.checkDomains);
  $('#results-section').hidden = false;
  updateUrl();

  const empty = $('#emptyState');
  empty.hidden = names.length > 0;
  empty.textContent = state.settings.styles.length
    ? 'No names fit these filters. Allow longer names or more syllables under Refine.'
    : 'Pick at least one name style under Refine.';

  setStatus(words);
  renderMore();
  if (state.settings.useAi) loadAiNames(words);

  if (scroll) {
    $('#results-section').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }
}

function setStatus(words, extra = '') {
  const count = state.names.length;
  const label = count === 1 ? 'name' : 'names';
  const countEl = document.createElement('span');
  countEl.textContent = `${count} ${label}`;
  const queryEl = document.createElement('span');
  queryEl.className = 'query';
  queryEl.textContent = ` for “${words.join(' ')}”${extra}`;
  $('#results-status').replaceChildren(countEl, queryEl);
  $('#refineStatus').textContent = `${count} ${label} with these options`;
}

function renderMore() {
  const next = state.names.slice(state.shown, state.shown + CONFIG.pageSize);
  const frag = document.createDocumentFragment();
  next.forEach((item, i) => frag.append(createTile(item, i)));
  resultsEl().append(frag);
  state.shown += next.length;
  $('#moreBtn').hidden = state.shown >= state.names.length;
}

function createTile(item, index = 0) {
  const tile = $('#tileTemplate').content.firstElementChild.cloneNode(true);
  tile.dataset.name = item.name;
  // A short cascade on first appearance; capped so later cards don't wait.
  tile.style.setProperty('--i', String(Math.min(index, 12)));

  const nameBtn = $('.card-name', tile);
  nameBtn.textContent = item.name;
  nameBtn.setAttribute('aria-label', `${item.name}: logo ideas, domains and handles`);
  nameBtn.addEventListener('click', () => openDetails(item.name, tile));

  $('.card-badge', tile).hidden = item.kind !== 'ai';

  const heart = $('.heart', tile);
  setHeart(heart, item.name, state.shortlist.includes(item.name));
  heart.addEventListener('click', () => toggleShortlist(item.name, heart));

  const list = $('.domain-list', tile);
  for (const d of domainsFor(item.name, state.settings.tlds)) list.append(domainChip(d));

  observeTile(tile);
  return tile;
}

function domainChip({ domain, hack }) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.className = 'domain-row';
  a.href = CONFIG.registrarUrl(domain);
  a.target = '_blank';
  a.rel = 'sponsored noopener';
  a.dataset.domain = domain;
  a.dataset.status = 'idle';
  if (hack) a.classList.add('is-hack');

  const name = document.createElement('span');
  name.className = 'domain-name';
  name.textContent = domain;
  const status = document.createElement('span');
  status.className = 'domain-status';

  a.append(name, status);
  li.append(a);
  return li;
}

const STATUS_TEXT = {
  idle: '',
  checking: 'Checking',
  available: 'Free',
  taken: 'Taken',
  unknown: 'Unknown',
};

function setChipStatus(chipEl, status) {
  chipEl.dataset.status = status;
  $('.domain-status', chipEl).textContent = STATUS_TEXT[status];
  chipEl.setAttribute('aria-label', STATUS_TEXT[status]
    ? `${chipEl.dataset.domain}, ${STATUS_TEXT[status].toLowerCase()}, opens Namecheap`
    : `${chipEl.dataset.domain}, opens Namecheap`);
}

async function checkChips(root) {
  const chips = $$('.domain-row', root);
  await Promise.all(chips.map(async (c) => {
    if (c.dataset.status === 'available' || c.dataset.status === 'taken') return;
    setChipStatus(c, 'checking');
    setChipStatus(c, await checkDomain(c.dataset.domain));
  }));
  if (root.classList.contains('card')) {
    root.dataset.allTaken = String(chips.every((c) => c.dataset.status === 'taken'));
  }
}

// Only look up domains for tiles that are actually on screen.
const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      checkChips(entry.target);
    }
  }, { rootMargin: '200px' })
  : null;

function observeTile(tile) {
  if (!state.settings.checkDomains) return;
  if (observer) observer.observe(tile);
  else checkChips(tile);
}

async function loadAiNames(words) {
  state.aiController?.abort();
  const controller = new AbortController();
  state.aiController = controller;
  setStatus(words, ', asking the AI for more…');
  try {
    const aiNames = await fetchAiNames(words, state.settings.industry, controller.signal);
    if (controller.signal.aborted) return;
    const existing = new Set(state.names.map((n) => n.name.toLowerCase()));
    const fresh = aiNames
      .filter((n) => !existing.has(n.toLowerCase()) && n.length <= state.settings.maxLength)
      .map((name) => ({ name, kind: 'ai', syllables: 0, score: 99 }));
    state.names = [...fresh, ...state.names];
    state.shown += fresh.length;
    const frag = document.createDocumentFragment();
    fresh.forEach((item, i) => frag.append(createTile(item, i)));
    resultsEl().prepend(frag);
    $('#emptyState').hidden = state.names.length > 0;
    setStatus(words);
  } catch (err) {
    if (err.name === 'AbortError') return;
    setStatus(words, ' (AI suggestions are unavailable right now)');
  }
}

function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('q', state.query);
  if (state.settings.industry !== 'general') url.searchParams.set('industry', state.settings.industry);
  else url.searchParams.delete('industry');
  url.searchParams.delete('list');
  history.replaceState(null, '', url);
}

// ---------------------------------------------------------------------------
// Shortlist
// ---------------------------------------------------------------------------

function setHeart(button, name, saved) {
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', saved ? `Remove ${name} from shortlist` : `Save ${name} to shortlist`);
}

function toggleShortlist(name, sourceEl) {
  const list = state.shortlist;
  const index = list.indexOf(name);
  const adding = index < 0;
  if (adding) list.push(name);
  else list.splice(index, 1);
  saveShortlist(list);

  for (const heart of $$(`.card[data-name="${CSS.escape(name)}"] .heart`)) setHeart(heart, name, adding);
  if ($('#detailsTitle').textContent === name) setHeart($('#detailsHeart'), name, adding);

  if (adding && sourceEl) {
    navigator.vibrate?.(8); // same frame as the visual change
    flyToShortlist(sourceEl, renderShortlist);
  } else {
    renderShortlist();
  }
}

/**
 * A dot travels from the heart to the Shortlist button along a slight arc, so it is
 * obvious where the name went. The counter changes when the dot arrives.
 */
function flyToShortlist(fromEl, done) {
  const target = $('#shortlistBtn');
  if (reducedMotion() || !target) return done();
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  const to = { x: b.left + 1.5 * 16, y: b.top + b.height / 2 };
  const arc = Math.min(160, Math.hypot(to.x - from.x, to.y - from.y) * 0.25);

  const dot = document.createElement('div');
  dot.className = 'fly-dot';
  document.body.append(dot);
  const spring = createSpring({
    value: 0,
    onUpdate: (t) => {
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - arc * Math.sin(Math.PI * Math.min(1, t));
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${1 - 0.4 * Math.min(1, t)})`;
    },
  });
  spring.to(1, {
    damping: 1,
    response: 0.45,
    onRest: () => {
      dot.remove();
      done();
      bump(target);
    },
  });
}

/** The button gives a little under the weight of the arriving name. */
function bump(el) {
  const spring = createSpring({ value: 1, onUpdate: (s) => { el.style.transform = `scale(${s})`; } });
  spring.to(1, { velocity: 1.6, damping: 0.55, response: 0.3, onRest: () => { el.style.transform = ''; } });
}

function renderShortlist() {
  const list = state.shortlist;
  $('#shortlistCount').textContent = String(list.length);
  $('#shortlistBtn').classList.toggle('has-items', list.length > 0);
  $('#shortlistEmpty').hidden = list.length > 0;
  $('#shortlistActions').hidden = list.length === 0;
  $('#shortlistItems').hidden = list.length === 0;

  const ul = $('#shortlistItems');
  ul.replaceChildren();
  for (const name of list) {
    const li = document.createElement('li');
    li.dataset.name = name;

    const top = document.createElement('div');
    top.className = 'shortlist-top';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'shortlist-name';
    open.textContent = name;
    open.addEventListener('click', () => {
      sheets.shortlist.close();
      openDetails(name, $('#shortlistBtn'));
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${name} from shortlist`);
    remove.addEventListener('click', () => toggleShortlist(name));
    top.append(open, remove);

    const domains = document.createElement('ul');
    domains.className = 'domain-list';
    for (const d of domainsFor(name, state.settings.tlds)) domains.append(domainChip(d));
    if (state.settings.checkDomains) checkChips(domains);

    li.append(top, domains);
    ul.append(li);
  }
}

async function copyShareLink() {
  const url = shareUrl(state.shortlist);
  const status = $('#copyStatus');
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'Share link copied.';
  } catch {
    status.textContent = `Copy this link: ${url}`;
  }
}

function handleSharedList() {
  const shared = parseSharedList();
  if (!shared.length) return;
  $('#sharedNames').textContent = shared.join(', ');
  $('#sharedBanner').hidden = false;

  const done = () => {
    $('#sharedBanner').hidden = true;
    const url = new URL(location.href);
    url.searchParams.delete('list');
    history.replaceState(null, '', url);
  };
  $('#importShared').addEventListener('click', () => {
    for (const name of shared) if (!state.shortlist.includes(name)) state.shortlist.push(name);
    saveShortlist(state.shortlist);
    renderShortlist();
    done();
    sheets.shortlist.open($('#shortlistBtn'));
  });
  $('#dismissShared').addEventListener('click', done);
}

// ---------------------------------------------------------------------------
// Details dialog
// ---------------------------------------------------------------------------

function openDetails(name, sourceEl) {
  $('#detailsTitle').textContent = name;
  setHeart($('#detailsHeart'), name, state.shortlist.includes(name));
  $('#logoGrid').replaceChildren(renderLogoPreviews(name, downloadLogo));

  const domains = $('#detailsDomains');
  domains.replaceChildren();
  for (const d of domainsFor(name, CONFIG.tlds)) domains.append(domainChip(d));
  if (state.settings.checkDomains) checkChips(domains);

  const handles = $('#detailsHandles');
  handles.replaceChildren();
  for (const { label, url } of socialLinks(name)) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'chip-link';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    li.append(a);
    handles.append(li);
  }

  $('#detailsTrademark').href = trademarkSearchUrl(name);
  sheets.details.open(sourceEl);
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

const sheets = {};

function setupSheets() {
  sheets.refine = createSheet($('#refineSheet'));
  sheets.details = createSheet($('#detailsSheet'));
  sheets.shortlist = createSheet($('#shortlistSheet'));
  sheets.changelog = createSheet($('#changelogSheet'));

  for (const btn of $$('.js-open-refine')) btn.addEventListener('click', () => sheets.refine.open(btn));
  $('#changelogBtn').addEventListener('click', (e) => sheets.changelog.open(e.currentTarget));
  $('#shortlistBtn').addEventListener('click', (e) => {
    $('#copyStatus').textContent = '';
    sheets.shortlist.open(e.currentTarget);
  });
  $('#detailsHeart').addEventListener('click', (e) => toggleShortlist($('#detailsTitle').textContent, e.currentTarget));
}

/** The toolbar turns into a floating material only while content scrolls under it. */
function setupToolbar() {
  const sentinel = $('#toolbarSentinel');
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    const stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    $('#toolbar').classList.toggle('is-stuck', stuck);
  }).observe(sentinel);
}

function setupEvents() {
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    run({ scroll: true });
  });

  $('#input').addEventListener('input', () => {
    $('#input-error').hidden = true;
    $('#input').removeAttribute('aria-invalid');
  });

  let timer;
  const rerun = () => {
    readOptions();
    if (!$('#results-section').hidden) run();
  };
  $('#options').addEventListener('change', (e) => {
    if (e.target.name === 'tld') limitTlds();
    if (e.target.id === 'checkDomains') $('#hideTaken').disabled = !e.target.checked;
    rerun();
  });
  $('#maxLength').addEventListener('input', (e) => {
    $('#maxLengthOut').value = `${e.target.value} letters`;
    clearTimeout(timer);
    timer = setTimeout(rerun, 200);
  });

  $('#shuffleBtn').addEventListener('click', () => {
    state.seed = (state.seed + 1) >>> 0;
    run();
  });
  $('#moreBtn').addEventListener('click', renderMore);
  $('#copyShare').addEventListener('click', copyShareLink);
  $('#clearShortlist').addEventListener('click', () => {
    for (const name of [...state.shortlist]) toggleShortlist(name);
  });
}

function init() {
  for (const el of $$('.js-version')) el.textContent = CONFIG.version;
  buildOptions();
  setupSheets();
  setupToolbar();
  setupEvents();
  renderShortlist();
  handleSharedList();

  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  const industry = params.get('industry');
  if (industry && industry in INDUSTRIES) {
    $('#industry').value = industry;
    state.settings.industry = industry;
  }
  if (q) {
    $('#input').value = q.slice(0, 60);
    run();
  }
}

init();
