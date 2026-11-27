// ==================================================================
// UI: hero, routing, panel (list + detail), modal, contact window.
// ==================================================================
import { CONFIG, SECTIONS } from './content.js';
import { svg } from './icons.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const body = document.body;

// ---------------- static content ----------------
$('#hero-eyebrow-text').textContent = CONFIG.eyebrow;
$('#hero-lead').textContent = CONFIG.heroLead;
$('#hero-sub').textContent = CONFIG.heroSub;
$('#built-for').innerHTML =
  `<span class="bf-label">Built for</span><span class="bf-arrow">&rarr;</span>` +
  CONFIG.builtFor.map((b) => `<span class="bf-item">${esc(b)}</span>`).join('<span class="bf-sep">&middot;</span>');

$('#trust-label-text').textContent = CONFIG.stripLabel;
const trustItems = CONFIG.strip.map((t) => `<span class="trust-logo"><i></i>${esc(t)}</span>`).join('');
$('#trust-track').innerHTML = trustItems + trustItems; // duplicated for a seamless loop

$('#social-dock').innerHTML = CONFIG.socials
  .map((s) => `<a class="social-icon" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${svg(s.id)}</a>`)
  .join('');

// ---------------- hero rotator ----------------
(function rotator() {
  const el = $('#rot-text');
  const words = CONFIG.rotator;
  if (REDUCED) { el.textContent = words[0]; return; }
  let w = 0, i = 0, del = false;
  const caret = $('.hero-caret');
  function step() {
    const word = words[w];
    i += del ? -1 : 1;
    el.textContent = word.slice(0, i);
    caret.classList.add('typing');
    let wait = del ? 34 : 62 + Math.random() * 50;
    if (!del && i === word.length) { del = true; wait = 2300; caret.classList.remove('typing'); }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; wait = 380; caret.classList.remove('typing'); }
    setTimeout(step, wait);
  }
  setTimeout(step, 700);
})();

// ---------------- scene ----------------
let scene = { focus() {}, home() {} };
import('./scene.js')
  .then(({ createScene }) => {
    scene = createScene({
      canvas: $('#scene'),
      labelsEl: $('#labels'),
      sections: SECTIONS,
      onSelect: (id) => go(id),
    });
    route();
  })
  .catch((err) => {
    console.error('3D scene failed to load', err);
    body.classList.add('no-webgl');
    renderFallbackNav();
  });

function renderFallbackNav() {
  const nav = document.createElement('div');
  nav.className = 'fallback-nav';
  nav.innerHTML = SECTIONS.map((s) => `<a href="#${s.id}" style="--c:${s.color}">${esc(s.label)}</a>`).join('');
  $('.hero').appendChild(nav);
}

// ---------------- routing ----------------
function go(hash) {
  if (!hash) {
    history.pushState(null, '', location.pathname + location.search);
    route();
  } else {
    location.hash = hash;
  }
}
window.addEventListener('hashchange', route);

let current = { section: null, item: null, cat: 'all' };

function route() {
  const [sid, slug] = location.hash.replace(/^#/, '').split('/');
  const sec = byId[sid];
  if (!sec) return closePanel();
  const item = slug ? sec.items.find((x) => x.slug === slug) : null;
  if (current.section !== sec.id) current.cat = sec.defaultCat || 'all';
  current.section = sec.id;
  current.item = item ? item.slug : null;
  openPanel(sec, item);
}

// ---------------- panel ----------------
const panel = $('#panel');

function openPanel(sec, item) {
  panel.style.setProperty('--c', sec.color);
  body.style.setProperty('--section', sec.color);
  panel.setAttribute('aria-hidden', 'false');
  body.classList.add('panel-open');
  body.classList.toggle('detail-open', !!item);
  body.dataset.layout = sec.layout || 'cards';
  renderList(sec);
  if (item) renderDetail(sec, item);
  scene.focus(sec.id);
}

function closePanel() {
  current = { section: null, item: null, cat: 'all' };
  body.classList.remove('panel-open', 'detail-open');
  panel.setAttribute('aria-hidden', 'true');
  scene.home();
}

// A category matches by `cat`, or by a field for filter tabs (e.g. { id: 'live', test: 'demo' }).
function inCat(sec, x, id) {
  if (id === 'all') return true;
  const c = (sec.categories || []).find((k) => k.id === id);
  return c && c.test ? !!x[c.test] : x.cat === id;
}

function renderList(sec) {
  $('#panel-title').textContent = sec.title;
  $('#panel-count').textContent = `${pad(sec.items.length)} items`;
  $('#panel-intro').innerHTML = sec.intro ? `<p>${esc(sec.intro)}</p>` : '';

  // category tabs
  const tabs = $('#cat-tabs');
  if (sec.categories) {
    const count = (id) => sec.items.filter((x) => inCat(sec, x, id)).length;
    const all = [{ id: 'all', label: 'All', color: sec.color }, ...sec.categories];
    tabs.innerHTML = all
      .map(
        (c) => `<button type="button" class="cat-tab${current.cat === c.id ? ' active' : ''}" data-cat="${c.id}" style="--dot:${c.color}">
          <i></i>${esc(c.label)}<span class="cat-tab-count">${count(c.id)}</span></button>`,
      )
      .join('');
    tabs.hidden = false;
  } else {
    tabs.innerHTML = '';
    tabs.hidden = true;
  }

  const items = sec.items.filter((x) => inCat(sec, x, current.cat));
  const layout = sec.layout || 'cards';
  const cards = $('#cards');
  cards.className = `cards layout-${layout}`;
  cards.innerHTML = items.map((it, i) => cardHTML(sec, it, i, layout)).join('');
}

function cardHTML(sec, it, i, layout) {
  const active = current.item === it.slug ? ' active-card' : '';
  const href = `#${sec.id}/${it.slug}`;
  const style = `style="--i:${i};--c:${catColor(sec, it)}"`;
  if (layout === 'tiles') {
    return `<a class="industry-tile${active}" href="${href}" ${style}>
      <span class="industry-icon${it.step ? ' is-step' : ''}">${it.step ? esc(it.step) : svg(it.icon)}</span>
      <span class="industry-text"><span class="industry-name">${esc(it.title)}</span><span class="industry-sub">${esc(it.sub)}</span></span>
      <span class="industry-arrow">${svg('arrow')}</span></a>`;
  }
  if (layout === 'videos') {
    return `<a class="card video-card${active}" href="${href}" ${style}>
      ${thumbHTML(sec, it, 'portrait')}
      <span class="card-body"><span class="card-tag">${esc(it.tag)}</span><span class="card-title">${esc(it.title)}</span></span></a>`;
  }
  return `<a class="card${active}" href="${href}" ${style}>
    ${thumbHTML(sec, it)}
    <span class="card-body">
      <span class="card-tag">${esc(it.tag)}</span>
      <span class="card-title">${esc(it.title)}</span>
      <span class="card-meta">${esc(it.year || '')}${it.kind ? ' · ' + esc(it.kind) : ''}</span>
      <span class="card-arrow">${svg('arrow')}</span>
    </span></a>`;
}

// Generated thumbnails: a code window for repositories, a poster for the rest.
// An `image` field on an item replaces it with a real screenshot.
function thumbHTML(sec, it, variant = '') {
  const cls = `card-thumb ${variant ? 'card-thumb-' + variant : ''}`;
  if (it.phase && it.poster && variant !== 'hero') {
    const live = it.demo ? `<span class="live-badge"><i></i>Live</span>` : `<span class="live-badge is-shots">${it.gallery.length || 1} screens</span>`;
    return `<span class="${cls} shot-thumb">
      <img class="shot-img" src="${esc(it.poster)}" alt="" loading="lazy" />
      ${it.video ? `<video class="shot-video" data-src="${esc(it.video)}" muted loop playsinline preload="none"></video>` : ''}
      ${live}</span>`;
  }
  if (it.image) return `<span class="${cls}"><img class="card-thumb-img" src="${esc(it.image)}" alt="" loading="lazy" /></span>`;

  if (variant === 'portrait') {
    return `<span class="${cls} gen-thumb poster">
      <span class="gen-dots"></span>
      <span class="poster-title">${esc(it.title)}</span>
      <span class="video-play">${playSVG()}</span>
      <span class="poster-foot">${esc(it.summary || '')}</span></span>`;
  }

  if (it.cat === 'delivery' && it.checks) {
    const rows = it.checks.slice(0, variant === 'hero' ? 6 : 4)
      .map((c, i) => `<span class="chk" style="--d:${i}">${svg('check')}<span>${esc(c)}</span></span>`).join('');
    return `<span class="${cls} gen-thumb check-thumb">
      <span class="gen-dots"></span>
      <span class="win">
        <span class="win-bar"><i></i><i></i><i></i><span class="win-path">${esc(it.title)}</span><span class="win-pass">${it.checks.length}/${it.checks.length} passing</span></span>
        <span class="chk-list">${rows}</span>
      </span></span>`;
  }

  if (it.cat === 'repo' || it.phase) {
    const lines = codeLines(it.slug);
    const phase = it.phase ? `<span class="win-phase" style="--p:${it.phase}">${esc(it.kind)}<b>${it.phase}/5</b></span>` : '';
    return `<span class="${cls} gen-thumb repo-thumb">
      <span class="gen-dots"></span>
      <span class="win">
        <span class="win-bar"><i></i><i></i><i></i><span class="win-path">~/${esc(it.slug)}</span>${phase}</span>
        <span class="win-code">${lines}</span>
        <span class="win-stack">${(it.stack || []).slice(0, 3).map((s) => `<b>${esc(s)}</b>`).join('')}</span>
      </span></span>`;
  }

  return `<span class="${cls} gen-thumb poster wide">
    <span class="gen-dots"></span>
    <span class="poster-kicker">${esc((typeof it.html === 'string' || it.url ? it.tag : it.kind) || sec.title)}</span>
    <span class="poster-title">${esc(it.title)}</span>
    <span class="poster-foot">${esc(it.summary || '')}</span></span>`;
}

function codeLines(seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
  let out = '';
  for (let l = 0; l < 6; l++) {
    const indent = l === 0 || l === 5 ? 0 : 1 + Math.floor(rnd() * 2);
    out += `<span class="ln" style="--in:${indent}">`;
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) out += `<b class="t${Math.floor(rnd() * 4)}" style="--w:${18 + Math.floor(rnd() * 46)}px"></b>`;
    out += '</span>';
  }
  return out;
}

function playSVG() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
}

function renderDetail(sec, it) {
  const meta = [it.year, it.kind, ...(it.stack || []).slice(0, 2)].filter(Boolean).map(esc).join(' · ');
  const hero = detailHero(sec, it);
  const pills = (it.stack || []).map((s) => `<span class="tech-pill">${esc(s)}</span>`).join('');
  // Long-form items (research, writing) carry trusted, pre-sanitised HTML generated from quirq.ai.
  const longform = typeof it.html === 'string';
  const lede = longform ? `<p class="detail-lede">${esc(it.lede || it.summary || '')}</p>${it.companion ? `<p class="detail-companion">${it.companion}</p>` : ''}` : '';
  const paras = longform
    ? `${lede}<div class="prose">${it.html || `<p>${esc(it.summary || '')}</p>`}</div>`
    : it.phase
      ? repoHTML(it)
      : (it.body || [it.summary || it.sub || '']).map((p) => `<p>${esc(p)}</p>`).join('');
  const selfLink = `#${sec.id}/${it.slug}`;
  const ctas = [
    it.demo && !it.phase ? `<a class="panel-cta-primary" href="${esc(it.demo)}" target="_blank" rel="noopener">Open app ${svg('ext')}</a>` : '',
    it.repo && !it.phase ? `<a class="panel-cta-secondary" href="${esc(it.repo)}" target="_blank" rel="noopener">View code ${svg('ext')}</a>` : '',
    it.url ? `<a class="panel-cta-primary" href="${esc(it.url)}" target="_blank" rel="noopener">Read the chapter ${svg('ext')}</a>` : '',
    it.study && it.study !== selfLink ? `<a class="panel-cta-primary" href="${esc(it.study)}">${it.study.startsWith('#research') ? 'Read the study' : 'Read the paper'} ${svg('arrow')}</a>` : '',
    it.source ? `<a class="panel-cta-secondary" href="${esc(it.source)}" target="_blank" rel="noopener">Read on quirq.ai ${svg('ext')}</a>` : '',
    longform || it.url ? '' : `<button type="button" class="panel-cta-secondary" data-book>Start a project like this ${svg('arrow')}</button>`,
  ].join('');
  const note = it.placeholder ? `<p class="placeholder-note">Placeholder entry. Swap in the real ${sec.id === 'work' ? (it.cat === 'delivery' ? 'delivery' : 'repository') : 'content'} in <code>js/content.js</code>.</p>` : '';

  const others = sec.items.filter((x) => x.slug !== it.slug);
  const related = [...others.filter((x) => x.cat && x.cat === it.cat), ...others.filter((x) => !x.cat || x.cat !== it.cat)].slice(0, 3);
  const relatedHTML = related.length
    ? `<section class="related"><h3 class="related-title">More ${esc(sec.title.toLowerCase())}</h3>
        <div class="related-track">${related
          .map((r) => `<a class="related-card" href="#${sec.id}/${r.slug}" style="--c:${catColor(sec, r)}"><span class="card-tag">${esc(r.tag || r.sub || '')}</span><span class="card-title">${esc(r.title)}</span>${svg('arrow')}</a>`)
          .join('')}</div></section>`
    : '';

  $('#detail').innerHTML = `
    <div class="detail-inner">
      <a class="detail-back" href="#${sec.id}">&larr; Back to list</a>
      <div class="detail-eyebrow">${esc(sec.title)}</div>
      <h1 class="detail-title">${esc(it.title)}</h1>
      <div class="detail-meta">${meta}</div>
      ${hero}
      ${pills && !it.phase ? `<div class="tech-pills">${pills}</div>` : ''}
      ${checklistHTML(it)}
      <div class="detail-body">${paras}${note}</div>
      <div class="panel-cta-row">${ctas}</div>
      ${relatedHTML}
    </div>`;
  $('#detail').scrollTop = 0;
  if (it.readmeUrl) loadReadme(it);
}

const PHASE_NAMES = ['Thought', 'Prototype', 'Built', 'Shipping', 'In use'];

// A repository as a showcase: a live stage (clip or screenshot) with a "play" card, like ximmersion's
// showcase pages, then the screens, how far it has come (quirq.dev's phases), the facts and the README.
function host(u) { try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } }

function showcaseHTML(sec, it) {
  const screen = it.video
    ? `<video class="stage-media" src="${esc(it.video)}" poster="${esc(it.poster || '')}" autoplay muted loop playsinline></video>`
    : it.poster
      ? `<img class="stage-media" src="${esc(it.poster)}" alt="${esc(it.title)} screenshot" />`
      : `<div class="stage-code">${thumbHTML(sec, it, 'hero')}</div>`;
  const url = it.demo ? host(it.demo) : `github.com/${it.repo.replace('https://github.com/', '')}`;
  const playBtn = it.demo
    ? it.embed
      ? `<button type="button" class="play-cta" data-play="${esc(it.demo)}">Play it here ${svg('arrow')}</button>`
      : `<a class="play-cta" href="${esc(it.demo)}" target="_blank" rel="noopener">Open the app ${svg('ext')}</a>`
    : `<a class="play-cta" href="${esc(it.repo)}" target="_blank" rel="noopener">Explore the code ${svg('ext')}</a>`;
  const badge = it.demo ? (it.embed ? 'Live app · plays right here' : 'Live app · opens in a new tab') : it.gallery.length ? 'Screens from the README' : 'Open source';
  const title = it.demo ? `Play with ${it.title}` : it.poster ? `See ${it.title} in action` : `Read the code of ${it.title}`;
  const pills = [it.language, `${PHASE_NAMES[it.phase - 1]} ${it.phase}/5`, it.people ? `${it.people} ${it.people === 1 ? 'person' : 'people'}` : '', it.stars ? `${it.stars} stars` : '', it.embed ? 'No install' : '']
    .filter(Boolean).map((p) => `<span>${esc(p)}</span>`).join('');
  return `<div class="showcase">
    <div class="stage${it.embed ? ' can-play' : ''}" ${it.embed ? `data-play="${esc(it.demo)}" role="button" tabindex="0" aria-label="Play ${esc(it.title)} here"` : ''}>
      <div class="stage-bar"><i></i><i></i><i></i><span class="stage-url">${esc(url)}</span>${it.demo ? '<span class="stage-live"><i></i>Live</span>' : ''}</div>
      <div class="stage-screen">${screen}${it.embed ? `<span class="stage-play">${playSVG()}<b>Play it here</b></span>` : ''}</div>
    </div>
    <aside class="play-card">
      <span class="play-badge"><i></i>${esc(badge)}</span>
      <h3 class="play-title">${esc(title)} <span aria-hidden="true">&rarr;</span></h3>
      <div class="play-pills">${pills}</div>
      <p class="play-blurb">${esc(it.summary)}</p>
      <div class="play-actions">${playBtn}
        ${it.demo ? `<a class="play-link" href="${esc(it.repo)}" target="_blank" rel="noopener">View code ${svg('ext')}</a>` : ''}
        ${it.demo && it.embed ? `<a class="play-link" href="${esc(it.demo)}" target="_blank" rel="noopener">New tab ${svg('ext')}</a>` : ''}</div>
    </aside>
  </div>`;
}

function repoHTML(it) {
  const name = it.repo.replace('https://github.com/', '');
  const steps = PHASE_NAMES.map((p, i) => `<span class="phase-step${i < it.phase ? ' on' : ''}${i === it.phase - 1 ? ' now' : ''}">${esc(p)}</span>`).join('');
  const facts = [
    ['Repository', `<a href="${esc(it.repo)}" target="_blank" rel="noopener">${esc(name)}</a>`],
    it.demo ? ['Live at', `<a href="${esc(it.demo)}" target="_blank" rel="noopener">${esc(host(it.demo))}</a>`] : null,
    it.language ? ['Language', esc(it.language)] : null,
    ['Updated', esc(it.year.replace('Updated ', ''))],
    ['People', `${it.people} committing${it.stars ? ` · ${it.stars} stars` : ''}`],
    ['Ships via', [it.ci ? 'CI on GitHub' : '', it.qq ? 'qq' : '', it.deploy ? 'deploy config' : '', it.demo ? 'live app' : ''].filter(Boolean).join(' · ') || 'Not yet'],
  ].filter(Boolean).map(([k, v]) => `<div class="repo-fact"><span>${k}</span><span>${v}</span></div>`).join('');
  const shots = (it.gallery || []).length
    ? `<section class="shots"><h3 class="shots-title">Screens</h3><div class="shot-strip">${it.gallery
        .map((g, i) => `<button type="button" class="shot" data-shot="${esc(g.src)}" style="--i:${i}"><img src="${esc(g.src)}" alt="${esc(it.title)} screen ${i + 1}" loading="lazy" /></button>`)
        .join('')}</div></section>`
    : '';
  return `${shots}
    <section class="repo-phase">
      <div class="repo-phase-head"><span>Phase ${it.phase} of 5 · ${esc(PHASE_NAMES[it.phase - 1])}</span><span>${esc(it.phaseWhy)}</span></div>
      <div class="phase-track">${steps}</div>
    </section>
    <div class="repo-facts">${facts}</div>
    <section class="readme is-clipped">
      <div class="readme-head">${svg('github')}<span>README.md</span><a href="${esc(it.repo)}#readme" target="_blank" rel="noopener">On GitHub ${svg('ext')}</a></div>
      <div class="prose readme-body" data-readme="${esc(it.slug)}">${it.readmeUrl ? '<p class="readme-loading">Loading the README...</p>' : '<p class="readme-loading">No README yet.</p>'}</div>
      <button type="button" class="readme-more" data-readme-more>Read the whole README</button>
    </section>`;
}

const readmeCache = new Map();
async function loadReadme(it) {
  try {
    if (!readmeCache.has(it.slug)) readmeCache.set(it.slug, fetch(it.readmeUrl).then((r) => (r.ok ? r.text() : '')));
    const html = await readmeCache.get(it.slug);
    const el = document.querySelector(`[data-readme="${CSS.escape(it.slug)}"]`);
    if (el) el.innerHTML = html || '<p class="readme-loading">No README yet.</p>';
  } catch {
    const el = document.querySelector(`[data-readme="${CSS.escape(it.slug)}"]`);
    if (el) el.innerHTML = `<p class="readme-loading">Couldn't load the README. <a href="${esc(it.repo)}" target="_blank" rel="noopener">Read it on GitHub</a>.</p>`;
  }
}

function catColor(sec, it) {
  const c = (sec.categories || []).find((x) => x.id === it.cat);
  return c ? c.color : sec.color;
}

function checklistHTML(it) {
  if (!it.checks || !it.checks.length) return '';
  return `<section class="checklist">
    <div class="checklist-head"><span>What done means</span><span class="checklist-count">${it.checks.length} checks</span></div>
    ${it.checks.map((c) => `<div class="checklist-row">${svg('check')}<span>${esc(c)}</span></div>`).join('')}
  </section>`;
}

function detailHero(sec, it) {
  if (it.phase) return showcaseHTML(sec, it);
  if (sec.layout === 'videos') {
    return `<div class="detail-hero" data-video="${esc(it.youtube || '')}" role="button" tabindex="0" aria-label="Play video">
      ${thumbHTML(sec, it, 'hero')}
      <span class="detail-play-btn">${playSVG()}</span></div>`;
  }
  if (sec.layout === 'tiles') {
    const mark = it.step ? `<span class="tile-hero-icon is-step">${esc(it.step)}</span>` : `<span class="tile-hero-icon">${svg(it.icon)}</span>`;
    return `<div class="detail-hero tile-hero"><span class="gen-dots"></span>${mark}<span class="tile-hero-sub">${esc(it.sub)}</span></div>`;
  }
  return `<div class="detail-hero">${thumbHTML(sec, it, 'hero')}</div>`;
}

// Cards with a captured clip play it on hover.
$('#cards').addEventListener('pointerover', (e) => {
  const v = e.target.closest('.card')?.querySelector('.shot-video');
  if (!v || !matchMedia('(hover: hover)').matches) return;
  if (!v.src) v.src = v.dataset.src;
  v.play().catch(() => {});
});
$('#cards').addEventListener('pointerout', (e) => {
  const card = e.target.closest('.card');
  if (!card || card.contains(e.relatedTarget)) return;
  const v = card.querySelector('.shot-video');
  if (v) v.pause();
});

// panel interactions
panel.addEventListener('click', (e) => {
  const tab = e.target.closest('.cat-tab');
  if (tab) {
    current.cat = tab.dataset.cat;
    const cards = $('#cards');
    cards.classList.add('swapping');
    setTimeout(() => {
      renderList(byId[current.section]);
      cards.classList.remove('swapping');
    }, 160);
    return;
  }
  if (e.target.closest('[data-close]')) return go('');
  const play = e.target.closest('[data-play]');
  if (play) return openApp(play.dataset.play, $('.detail-title')?.textContent);
  const shot = e.target.closest('[data-shot]');
  if (shot) return openShot(shot.dataset.shot);
  const more = e.target.closest('[data-readme-more]');
  if (more) { more.closest('.readme').classList.remove('is-clipped'); more.remove(); return; }
  const hero = e.target.closest('.detail-hero[data-video]');
  if (hero) openVideo(hero.dataset.video, $('.detail-title')?.textContent);
});
panel.addEventListener('keydown', (e) => {
  const stage = e.target.closest('.stage[data-play]');
  if (stage && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return openApp(stage.dataset.play, $('.detail-title')?.textContent); }
  const hero = e.target.closest('.detail-hero[data-video]');
  if (hero && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openVideo(hero.dataset.video, $('.detail-title')?.textContent); }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (body.classList.contains('modal-open')) return closeModal();
  if (body.classList.contains('lead-open')) return toggleLead(false);
  if (current.item) return go(current.section);
  if (current.section) return go('');
});

document.querySelectorAll('[data-home]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(''); }));

// ---------------- video modal ----------------
const modal = $('#modal');
function openVideo(id, title = '') {
  const media = $('#modal-media');
  media.innerHTML = id
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : `<div class="modal-empty"><img src="assets/favicon.svg" alt="" /><p class="modal-empty-title">${esc(title || 'Intro')}</p><p>Video coming soon.</p></div>`;
  modal.setAttribute('aria-hidden', 'false');
  body.classList.add('modal-open');
}
// The live app, inside the page, in a browser frame. Only for apps whose headers allow embedding.
function openApp(url, title = '') {
  $('#modal-media').innerHTML = `<div class="app-frame">
      <div class="stage-bar"><i></i><i></i><i></i><span class="stage-url">${esc(host(url))}</span>
        <a class="app-newtab" href="${esc(url)}" target="_blank" rel="noopener">Open in a new tab ${svg('ext')}</a></div>
      <div class="app-body"><span class="app-loading">Loading ${esc(title)}...</span>
        <iframe src="${esc(url)}" title="${esc(title)}" allow="fullscreen; autoplay; clipboard-write; xr-spatial-tracking" loading="eager"></iframe></div>
    </div>`;
  $('.modal-box').classList.add('is-app');
  modal.setAttribute('aria-hidden', 'false');
  body.classList.add('modal-open');
}
function openShot(src) {
  $('#modal-media').innerHTML = `<div class="shot-full"><img src="${esc(src)}" alt="" /></div>`;
  $('.modal-box').classList.add('is-shot');
  modal.setAttribute('aria-hidden', 'false');
  body.classList.add('modal-open');
}
function closeModal() {
  setTimeout(() => $('.modal-box').classList.remove('is-app', 'is-shot'), 300);
  body.classList.remove('modal-open');
  modal.setAttribute('aria-hidden', 'true');
  setTimeout(() => ($('#modal-media').innerHTML = ''), 300);
}
modal.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) closeModal(); });
$('[data-intro]').addEventListener('click', () => openVideo(CONFIG.introVideoId, `How ${CONFIG.brand} works`));

// ---------------- contact window ----------------
const lead = $('#lead-window');
const form = $('#lead-form');
let topic = '';

$('#lead-pills').innerHTML = CONFIG.leadTopics.map((t) => `<button type="button" class="lead-pill">${esc(t)}</button>`).join('');
$('#lead-pills').addEventListener('click', (e) => {
  const p = e.target.closest('.lead-pill');
  if (!p) return;
  const on = !p.classList.contains('selected');
  lead.querySelectorAll('.lead-pill').forEach((x) => x.classList.remove('selected'));
  p.classList.toggle('selected', on);
  topic = on ? p.textContent : '';
});

function toggleLead(open = !body.classList.contains('lead-open')) {
  body.classList.toggle('lead-open', open);
  lead.setAttribute('aria-hidden', String(!open));
  $('.chatbot-badge').classList.remove('show');
  if (open) setTimeout(() => form.email.focus(), 250);
}
$('#chatbot').addEventListener('click', () => toggleLead());
lead.querySelector('[data-lead-close]').addEventListener('click', () => toggleLead(false));
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book]');
  if (!b) return;
  e.preventDefault();
  if (CONFIG.bookingUrl) window.open(CONFIG.bookingUrl, '_blank', 'noopener');
  else toggleLead(true);
});
setTimeout(() => { if (!body.classList.contains('lead-open')) $('.chatbot-badge').classList.add('show'); }, 6000);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const brief = form.brief.value.trim();
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  form.email.closest('.lead-field').classList.toggle('has-error', !okEmail);
  form.brief.closest('.lead-field').classList.toggle('has-error', brief.length < 3);
  if (!okEmail || brief.length < 3) return;
  const subject = `New result${topic ? ': ' + topic : ''}`;
  const text = `${brief}\n\nReply to: ${email}${topic ? '\nTopic: ' + topic : ''}`;
  window.location.href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  form.classList.add('done');
});
form.addEventListener('click', (e) => {
  if (!e.target.closest('[data-lead-restart]')) return;
  form.reset();
  topic = '';
  lead.querySelectorAll('.lead-pill').forEach((x) => x.classList.remove('selected'));
  form.classList.remove('done');
});

// first paint
requestAnimationFrame(() => body.classList.add('ready'));
route();
