/**
 * SocialView PWA — app.js  (content-first, full-screen redesign)
 * ─────────────────────────────────────────────────────────────
 */

/* ════════════════════════════════════════════════════════════
   PLATFORM DETECTION
   ════════════════════════════════════════════════════════════ */
const PLATFORMS = {
  FACEBOOK:  'facebook',
  INSTAGRAM: 'instagram',
  YOUTUBE:   'youtube',
  TIKTOK:    'tiktok',
  TWITTER:   'twitter',
  GENERIC:   'generic',
};

const PLATFORM_META = {
  [PLATFORMS.FACEBOOK]:  { label: 'Facebook',  emoji: '📘', dot: '#1877f2' },
  [PLATFORMS.INSTAGRAM]: { label: 'Instagram', emoji: '📸', dot: '#e1306c' },
  [PLATFORMS.YOUTUBE]:   { label: 'YouTube',   emoji: '▶️',  dot: '#ff0000' },
  [PLATFORMS.TIKTOK]:    { label: 'TikTok',    emoji: '🎵', dot: '#69c9d0' },
  [PLATFORMS.TWITTER]:   { label: 'Twitter/X', emoji: '🐦', dot: '#1da1f2' },
  [PLATFORMS.GENERIC]:   { label: 'Web',       emoji: '🌐', dot: '#7c3aed' },
};

function detectPlatform(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (h === 'facebook.com' || h === 'fb.watch' || h === 'fb.com' || h.endsWith('.facebook.com')) return PLATFORMS.FACEBOOK;
    if (h === 'instagram.com' || h.endsWith('.instagram.com'))                                      return PLATFORMS.INSTAGRAM;
    if (h === 'youtube.com'   || h.endsWith('.youtube.com')  || h === 'youtu.be')                   return PLATFORMS.YOUTUBE;
    if (h === 'tiktok.com'    || h.endsWith('.tiktok.com')   || h === 'vm.tiktok.com')               return PLATFORMS.TIKTOK;
    if (h === 'twitter.com'   || h.endsWith('.twitter.com')  || h === 'x.com' || h === 't.co')       return PLATFORMS.TWITTER;
  } catch (_) {}
  return PLATFORMS.GENERIC;
}

/* ════════════════════════════════════════════════════════════
   EMBED RENDERERS  — return HTML string injected into #embed-wrap
   All user-supplied URLs run through escapeAttr before hitting the DOM.
   ════════════════════════════════════════════════════════════ */

function escapeHTML(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escapeAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
                  .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── YouTube ─────────────────────────────────────────────── */
function getYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be')             return u.pathname.slice(1).split(/[/?]/)[0];
    if (u.pathname.startsWith('/shorts/'))     return u.pathname.split('/shorts/')[1].split(/[/?]/)[0];
    if (u.pathname.startsWith('/embed/'))      return u.pathname.split('/embed/')[1].split(/[/?]/)[0];
    if (u.hostname.includes('youtube.com'))    return u.searchParams.get('v') || null;
  } catch (_) {}
  return null;
}

function renderYouTube(url) {
  const id = getYouTubeId(url);
  if (!id) return null;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return `<iframe
    src="https://www.youtube.com/embed/${safeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
    style="position:absolute;inset:0;width:100%;height:100%;border:none;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    title="YouTube Video">
  </iframe>`;
}

/* ── Facebook ─────────────────────────────────────────────── */
function renderFacebook(url) {
  const safeUrl = escapeAttr(url);
  const appId   = (typeof CONFIG !== 'undefined' && CONFIG.META_APP_ID) ? CONFIG.META_APP_ID : '';
  const sdk     = appId
    ? `https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0&appId=${encodeURIComponent(appId)}`
    : `https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0`;

  let isVideo = false;
  try { const u = new URL(url); isVideo = u.pathname.includes('/videos/') || u.hostname === 'fb.watch'; } catch(_) {}

  const tag = isVideo
    ? `<div class="fb-video" data-href="${safeUrl}" data-width="auto" data-allowfullscreen="true" data-autoplay="true"></div>`
    : `<div class="fb-post"  data-href="${safeUrl}" data-width="auto"></div>`;

  return `
    <div id="fb-root"></div>
    <script async defer src="${sdk}"><\/script>
    <div style="padding:20px;max-width:560px;width:100%;margin:auto;">${tag}</div>`;
}

/* ── Instagram ─────────────────────────────────────────────── */
function renderInstagram(url) {
  let clean;
  try { const u = new URL(url); clean = `${u.origin}${u.pathname}`.replace(/\/?$/, '/'); }
  catch(_) { clean = url; }
  const safeUrl = escapeAttr(clean);

  return `
    <div style="padding:16px;max-width:480px;width:100%;margin:auto;overflow:hidden;">
      <blockquote class="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink="${safeUrl}"
        data-instgrm-version="14"
        style="background:#fff;border:0;border-radius:3px;margin:0;width:calc(100% - 2px);min-width:300px;">
      </blockquote>
      <script async src="https://www.instagram.com/embed.js"><\/script>
    </div>`;
}

/* ── TikTok ─────────────────────────────────────────────────── */
function renderTikTok(url) {
  const match = url.match(/\/video\/(\d+)/);
  if (!match) return null;
  const safeId  = match[1].replace(/\D/g, '');
  const safeUrl = escapeAttr(url);
  return `
    <div style="max-width:400px;width:100%;margin:auto;">
      <blockquote class="tiktok-embed" cite="${safeUrl}" data-video-id="${safeId}"
        style="max-width:100%;min-width:300px;">
        <section></section>
      </blockquote>
      <script async src="https://www.tiktok.com/embed.js"><\/script>
    </div>`;
}

/* ── Twitter / X ─────────────────────────────────────────────── */
function renderTwitter(url) {
  let tweetUrl = url;
  try {
    const u = new URL(url);
    if (u.hostname === 'x.com' || u.hostname === 'www.x.com') u.hostname = 'twitter.com';
    tweetUrl = `${u.origin}${u.pathname}`;
  } catch(_) {}
  const safeUrl = escapeAttr(tweetUrl);
  return `
    <div style="max-width:560px;width:100%;margin:auto;padding:16px;">
      <blockquote class="twitter-tweet" data-theme="dark">
        <a href="${safeUrl}">Loading tweet…</a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js"><\/script>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   HISTORY
   ════════════════════════════════════════════════════════════ */
const HISTORY_KEY   = 'sv_history';
const HISTORY_LIMIT = (typeof CONFIG !== 'undefined' && CONFIG.HISTORY_LIMIT) || 20;

function loadHistory()  {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(_) { return []; }
}
function saveHistory(url, platform) {
  let h = loadHistory().filter(i => i.url !== url);
  h.unshift({ url, platform, time: Date.now() });
  h = h.slice(0, HISTORY_LIMIT);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch(_) {}
}
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function renderHistory() {
  const row = document.getElementById('history-row');
  if (!row) return;
  const h = loadHistory();
  row.innerHTML = '';
  if (h.length === 0) return;

  h.forEach(item => {
    const meta = PLATFORM_META[item.platform] || PLATFORM_META[PLATFORMS.GENERIC];
    const pill = document.createElement('div');
    pill.className  = 'history-pill';
    pill.role       = 'listitem';
    pill.tabIndex   = 0;
    pill.title      = item.url;
    pill.innerHTML  = `<span class="pill-dot" style="background:${meta.dot}"></span>${meta.label}`;
    pill.addEventListener('click',   () => openLink(item.url));
    pill.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openLink(item.url); });
    row.appendChild(pill);
  });

  // Long-press / right-click on row → clear all
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (confirm('Clear all recent links?')) clearHistory();
  });
}

/* ════════════════════════════════════════════════════════════
   UI CONTROLS AUTO-HIDE
   ════════════════════════════════════════════════════════════ */
let _hideTimer = null;
let _controlsVisible = true;

function showControls() {
  const top = document.getElementById('viewer-controls');
  const bot = document.getElementById('viewer-controls-bottom');
  if (!top || !bot) return;
  top.classList.remove('hidden-ui');
  bot.classList.remove('hidden-ui');
  _controlsVisible = true;
  scheduleHide();
}

function hideControls() {
  const top = document.getElementById('viewer-controls');
  const bot = document.getElementById('viewer-controls-bottom');
  if (!top || !bot) return;
  top.classList.add('hidden-ui');
  bot.classList.add('hidden-ui');
  _controlsVisible = false;
}

function toggleControls() {
  if (_controlsVisible) { clearTimeout(_hideTimer); hideControls(); }
  else showControls();
}

function scheduleHide() {
  clearTimeout(_hideTimer);
  _hideTimer = setTimeout(hideControls, 3500);
}

/* ════════════════════════════════════════════════════════════
   MAIN VIEWER
   ════════════════════════════════════════════════════════════ */
let _currentUrl = '';

function openLink(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) return;
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try { new URL(url); }
  catch(_) { showToast('⚠️ Invalid link'); return; }

  const urlInput = document.getElementById('url-input');
  if (urlInput) urlInput.value = '';

  _currentUrl = url;
  const platform = detectPlatform(url);
  const meta     = PLATFORM_META[platform];

  saveHistory(url, platform);
  renderHistory();

  /* ── switch to viewer ── */
  document.getElementById('home').classList.add('hidden');
  const viewer = document.getElementById('viewer');
  viewer.classList.add('active');

  /* ── update badge ── */
  const badge = document.getElementById('platform-badge');
  if (badge) badge.textContent = `${meta.emoji} ${meta.label}`;

  /* ── update bottom actions ── */
  const ctrlBrowser = document.getElementById('ctrl-browser');
  if (ctrlBrowser) ctrlBrowser.href = url;

  /* ── show skeleton ── */
  const skeleton  = document.getElementById('skeleton');
  const embedWrap = document.getElementById('embed-wrap');
  const generic   = document.getElementById('generic-card');

  skeleton.classList.remove('gone');
  embedWrap.innerHTML = '';
  generic.classList.remove('active');

  /* ── push history state ── */
  window.history.pushState({ url, platform }, '', '#view');

  /* ── render embed ── */
  let embedHtml = null;
  switch (platform) {
    case PLATFORMS.YOUTUBE:   embedHtml = renderYouTube(url);   break;
    case PLATFORMS.FACEBOOK:  embedHtml = renderFacebook(url);  break;
    case PLATFORMS.INSTAGRAM: embedHtml = renderInstagram(url); break;
    case PLATFORMS.TIKTOK:    embedHtml = renderTikTok(url);    break;
    case PLATFORMS.TWITTER:   embedHtml = renderTwitter(url);   break;
    default: break;
  }

  if (embedHtml) {
    /* YouTube gets true full-screen iframe wrapper */
    if (platform === PLATFORMS.YOUTUBE) {
      embedWrap.style.cssText = 'position:absolute;inset:0;';
      embedWrap.innerHTML = embedHtml;
    } else {
      embedWrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:auto;';
      embedWrap.innerHTML = embedHtml;
    }
    setTimeout(() => skeleton.classList.add('gone'), 800);
  } else {
    /* generic fallback */
    embedWrap.innerHTML = '';
    skeleton.classList.add('gone');
    const gcIcon  = document.getElementById('gc-icon');
    const gcTitle = document.getElementById('gc-title');
    const gcUrl   = document.getElementById('gc-url');
    const gcOpen  = document.getElementById('gc-open');
    if (gcIcon)  gcIcon.textContent  = meta.emoji;
    if (gcTitle) gcTitle.textContent = meta.label;
    if (gcUrl)   gcUrl.textContent   = url;
    if (gcOpen)  gcOpen.href         = url;
    generic.classList.add('active');
  }

  /* ── auto-hide controls after 3.5s ── */
  showControls();

  /* ── tap anywhere on viewer to toggle controls ── */
  viewer.addEventListener('click', _onViewerClick);
}

function _onViewerClick(e) {
  // Don't toggle if clicking a control button
  if (e.target.closest('#viewer-controls, #viewer-controls-bottom, #generic-card')) return;
  toggleControls();
}

function closeViewer() {
  const viewer   = document.getElementById('viewer');
  const embedWrap= document.getElementById('embed-wrap');
  const home     = document.getElementById('home');

  clearTimeout(_hideTimer);
  viewer.classList.remove('active');
  viewer.removeEventListener('click', _onViewerClick);

  /* clean up injected scripts/iframes */
  embedWrap.innerHTML = '';
  document.getElementById('generic-card').classList.remove('active');
  document.getElementById('skeleton').classList.remove('gone');

  home.classList.remove('hidden');
  _currentUrl = '';

  renderHistory();

  if (window.history.state && window.history.state.url) {
    window.history.pushState({}, '', '/');
  }
}

/* ════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════ */
let _toastTimer = null;
function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  clearTimeout(_toastTimer);
  t.classList.add('show');
  _toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ════════════════════════════════════════════════════════════
   PWA INSTALL PROMPT
   ════════════════════════════════════════════════════════════ */
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  if (!sessionStorage.getItem('ib-dismissed')) {
    setTimeout(() => document.getElementById('install-banner')?.classList.add('show'), 2000);
  }
});

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Service worker ── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW:', e));
  }

  /* ── Pick up shared URL from share_target redirect ── */
  const params = new URLSearchParams(window.location.search);
  const shared = params.get('shared') || params.get('url');
  if (shared) {
    window.history.replaceState({}, '', '/');
    openLink(shared);
  } else if (params.get('action') === 'paste') {
    window.history.replaceState({}, '', '/');
    document.getElementById('url-input')?.focus();
  }

  /* ── Back navigation ── */
  window.addEventListener('popstate', e => {
    if (!e.state || !e.state.url) closeViewer();
  });

  /* ── URL input ── */
  const urlInput = document.getElementById('url-input');
  document.getElementById('go-btn')?.addEventListener('click', () => openLink(urlInput?.value || ''));
  urlInput?.addEventListener('keydown', e => { if (e.key === 'Enter') openLink(urlInput.value); });

  /* ── Auto-paste from clipboard ── */
  urlInput?.addEventListener('focus', async () => {
    if (urlInput.value.trim()) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (/^https?:\/\//i.test(text)) { urlInput.value = text; urlInput.select(); }
    } catch(_) {}
  });

  /* ── Close button ── */
  document.getElementById('close-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    closeViewer();
  });

  /* ── Bottom action buttons ── */
  document.getElementById('ctrl-share')?.addEventListener('click', e => {
    e.stopPropagation();
    if (!_currentUrl) return;
    if (navigator.share) navigator.share({ url: _currentUrl }).catch(() => {});
    else navigator.clipboard.writeText(_currentUrl).then(() => showToast('✅ Link copied!')).catch(() => {});
  });

  document.getElementById('ctrl-copy')?.addEventListener('click', e => {
    e.stopPropagation();
    if (!_currentUrl) return;
    navigator.clipboard.writeText(_currentUrl)
      .then(() => showToast('✅ Link copied!'))
      .catch(() => showToast('❌ Copy failed'));
  });

  /* ── Install banner ── */
  document.getElementById('ib-install')?.addEventListener('click', () => {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    _installPrompt.userChoice.then(c => {
      if (c.outcome === 'accepted') document.getElementById('install-banner')?.classList.remove('show');
      _installPrompt = null;
    }).catch(() => {});
  });
  document.getElementById('ib-dismiss')?.addEventListener('click', () => {
    document.getElementById('install-banner')?.classList.remove('show');
    sessionStorage.setItem('ib-dismissed', '1');
  });

  /* ── Offline ── */
  window.addEventListener('offline', () => showToast('📶 Offline'));
  window.addEventListener('online',  () => showToast('✅ Back online'));

  /* ── Initial history ── */
  renderHistory();
});
