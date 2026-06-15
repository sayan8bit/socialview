/**
 * SocialView PWA — Service Worker  [GitHub Pages compatible]
 * ─────────────────────────────────────────────────────────────
 * Uses self.registration.scope as the dynamic base URL so this
 * works correctly whether hosted at:
 *   https://user.github.io/            (custom domain / root)
 *   https://user.github.io/repo-name/  (GitHub Pages subdirectory)
 *   http://localhost:3000/             (local dev)
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME    = `socialview-${CACHE_VERSION}`;

/* ── Derive the base path from the SW's own scope ─────────── */
// e.g. "https://user.github.io/socialview/"
const BASE = self.registration.scope;

/* ── Assets to cache (relative to BASE) ──────────────────── */
const SHELL_PATHS = [
  '',               // → BASE  (index.html served at root)
  'index.html',
  'styles.css',
  'app.js',
  'config.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
];

/* Resolve to full absolute URLs so cache.match() works properly */
const APP_SHELL = SHELL_PATHS.map(p => new URL(p, BASE).href);

/* ── The share-target pathname relative to scope ─────────── */
const SHARE_PATHNAME = new URL('share-target', BASE).pathname;

/* ══════════════════════════════════════════════════════════
   INSTALL — pre-cache app shell
   ══════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        // allSettled: one 404 doesn't abort the whole install
        Promise.allSettled(
          APP_SHELL.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Could not cache ${url}:`, err)
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* ══════════════════════════════════════════════════════════
   ACTIVATE — delete stale caches
   ══════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ══════════════════════════════════════════════════════════
   FETCH — share target intercept + caching strategy
   ══════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  let reqUrl;

  try { reqUrl = new URL(request.url); }
  catch (_) { return; } // malformed URL — let browser handle

  /* ── Intercept share_target GET ────────────────────────── */
  if (reqUrl.pathname === SHARE_PATHNAME && request.method === 'GET') {
    const sharedUrl   = reqUrl.searchParams.get('url')   || '';
    const sharedText  = reqUrl.searchParams.get('text')  || '';
    const sharedTitle = reqUrl.searchParams.get('title') || '';

    const targetUrl = sharedUrl || extractURL(sharedText) || sharedText;

    // Redirect into the app with the shared URL as a query param
    const redirectTo = new URL('./', BASE).href +
      `?shared=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(sharedTitle)}`;

    event.respondWith(Promise.resolve(Response.redirect(redirectTo, 303)));
    return;
  }

  /* ── Skip cross-origin requests ────────────────────────── */
  if (reqUrl.origin !== self.location.origin) return;

  /* ── App shell: cache-first ─────────────────────────────── */
  if (isShell(reqUrl.href)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        }).catch(() => caches.match(new URL('index.html', BASE).href));
      })
    );
    return;
  }

  /* ── Everything else: network-first, cache fallback ──────── */
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then(cached =>
        cached || caches.match(new URL('index.html', BASE).href)
      )
    )
  );
});

/* ── Helpers ──────────────────────────────────────────────── */
function isShell(href) {
  return APP_SHELL.includes(href) ||
    // Also match BASE itself (trailing slash variants)
    href === BASE || href === BASE.replace(/\/$/, '');
}

function extractURL(text) {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}
