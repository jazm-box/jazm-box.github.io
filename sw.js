// MyBox Service Worker – Netzwerk zuerst, offline aus dem Cache. Gilt für MyBox und alle drei Bereiche.
// Bei eingeschalteten Erinnerungen liegt zusätzlich eine Liste von Daten ohne Namen, Ärzte oder Beträge im Cache „sched-mybox“.
const CACHE = 'mybox-0.3.1', SCHED = 'sched-mybox';
const ASSETS = ["./",
  "./beleg/app.js",
  "./beleg/boxen/belegbox.png",
  "./beleg/boxen/gesundbox.png",
  "./beleg/boxen/smartbox.png",
  "./beleg/ds.js",
  "./beleg/icons/belegbox-180.png",
  "./beleg/icons/belegbox-192.png",
  "./beleg/icons/belegbox-512.png",
  "./beleg/icons/belegbox-badge-96.png",
  "./beleg/icons/belegbox-badge-v2-96.png",
  "./beleg/icons/belegbox-maskable-192.png",
  "./beleg/icons/belegbox-maskable-512.png",
  "./beleg/index.html",
  "./beleg/vendor/pdfjs/LICENSE",
  "./beleg/vendor/pdfjs/VERSION.txt",
  "./beleg/vendor/pdfjs/pdf.min.mjs",
  "./beleg/vendor/pdfjs/pdf.worker.min.mjs",
  "./boxen/belegbox.png",
  "./boxen/gesundbox.png",
  "./boxen/smartbox.png",
  "./ds.js",
  "./gesund/boxen/belegbox.png",
  "./gesund/boxen/gesundbox.png",
  "./gesund/boxen/smartbox.png",
  "./gesund/ds.js",
  "./gesund/icon-192.png",
  "./gesund/icon-512.png",
  "./gesund/icon-badge-96.png",
  "./gesund/icon-maskable-512.png",
  "./gesund/index.html",
  "./icons/mybox-180.png",
  "./icons/mybox-192.png",
  "./icons/mybox-512.png",
  "./icons/mybox-badge-96.png",
  "./icons/mybox-badge-v2-96.png",
  "./icons/mybox-maskable-192.png",
  "./icons/mybox-maskable-512.png",
  "./icons/sc-foto.png",
  "./icons/sc-geraet.png",
  "./icons/sc-medi.png",
  "./icons/sc-messung.png",
  "./icons/sc-suche.png",
  "./icons/sc-termin.png",
  "./index.html",
  "./manifest.json",
  "./mbx/ad-beleg.js",
  "./mbx/ad-gesund.js",
  "./mbx/ad-smart.js",
  "./mbx/bridge.js",
  "./mbx/embed.css",
  "./smart/app.js",
  "./smart/box.js",
  "./smart/boxen/belegbox.png",
  "./smart/boxen/gesundbox.png",
  "./smart/boxen/smartbox.png",
  "./smart/ds.js",
  "./smart/icon-192.png",
  "./smart/icon-512.png",
  "./smart/icon-maskable-512.png",
  "./smart/index.html",
  "./smart/jazm-logo.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mybox-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Beim Öffnen gleich prüfen, ob eine Erinnerung fällig ist – auch solange MyBox noch gesperrt ist
  if (req.mode === 'navigate' && req.destination === 'document') e.waitUntil(remind(false).catch(() => {}));
  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.url.split('?')[0], copy)); }
      return res;
    }).catch(() => caches.match(req.url.split('?')[0]).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

/* ---------- Erinnerungen ohne Server ---------- */
self.addEventListener('message', e => { if (e.data && e.data.type === 'REMIND') e.waitUntil(remind(!!e.data.force)); });
self.addEventListener('periodicsync', e => { if (e.tag === 'mybox-erinnerung') e.waitUntil(remind(false)); });

function dayIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function diffDays(s, today) { const p = s.split('-').map(Number); return Math.round((new Date(p[0], p[1] - 1, p[2]) - today) / 864e5); }
const when = n => n === 0 ? 'heute' : n === 1 ? 'morgen' : 'in ' + n + ' Tagen';
function line(x) {
  const w = when(x.n);
  switch (x.t) {
    case 'g.t': return 'Ein Arzttermin ist ' + w + '.';
    case 'g.v': return 'Eine Vorsorge ist ' + w + ' fällig.';
    case 'g.u': return 'Ein Dokument läuft ' + w + ' ab.';
    case 'g.w': return 'Kontaktlinsen wechseln: ' + w + '.';
    case 'g.n': return x.n === 0 ? 'Der Kontaktlinsen-Vorrat ist aufgebraucht.' : 'Der Kontaktlinsen-Vorrat reicht noch ' + x.n + (x.n === 1 ? ' Tag.' : ' Tage.');
    case 'b.k': return 'Eine Kündigungsfrist endet ' + w + '.';
    case 'b.g': return 'Eine Garantie läuft ' + w + ' ab.';
    case 'b.p': return 'Ein Preis ändert sich ' + w + '.';
    default: return 'Etwas ist ' + w + ' fällig.';
  }
}
async function remind(force) {
  const c = await caches.open(SCHED), r = await c.match('./__sched');
  const old = await self.registration.getNotifications({ tag: 'mybox-erinnerung' });
  if (!r) { old.forEach(n => n.close()); return; }
  const { items = [] } = await r.json().catch(() => ({}));
  const t = new Date(); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const soon = items.map(x => ({ t: x.t, n: diffDays(x.d, today), l: +x.l || 14 })).filter(x => x.n >= 0 && x.n <= x.l).sort((a, b) => a.n - b.n);
  if (!soon.length) { old.forEach(n => n.close()); await c.delete('./__last'); return; }
  const last = await c.match('./__last').then(x => x && x.json()).catch(() => null);
  const key = dayIso(today) + '|' + soon.length + '|' + soon[0].t + soon[0].n;
  if (!force && last && last.key === key) return;
  const body = soon.length === 1 ? line(soon[0]) : soon.length + ' Erinnerungen – als Nächstes: ' + line(soon[0]);
  await self.registration.showNotification('MyBox', { body, tag: 'mybox-erinnerung', renotify: true, icon: 'icons/mybox-192.png', badge: 'icons/mybox-badge-v2-96.png', data: { url: './' } });
  await c.put('./__last', new Response(JSON.stringify({ key })));
}
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const w = cs.find(x => new URL(x.url).pathname === new URL(self.registration.scope).pathname);
    return w ? w.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
