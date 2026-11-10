// MyBox Service Worker – Netzwerk zuerst, offline aus dem Cache. Gilt für MyBox und alle drei Bereiche.
// Bei eingeschalteten Erinnerungen liegt zusätzlich eine Liste von Daten ohne Namen, Ärzte oder Beträge im Cache „sched-mybox“.
const CACHE = 'mybox-0.8.1', SCHED = 'sched-mybox';
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
  "./icons/sca-beleg.png",
  "./icons/sca-gesund.png",
  "./icons/sca-smart.png",
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
// Teilen aus anderen Apps: Dateien kurz ins Eingangsfach (bis MyBox entsperrt ist und du den Bereich wählst)
const INBOX = 'share-mybox';
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'POST' || url.origin !== location.origin || !url.searchParams.has('teilen')) return;
  e.respondWith((async () => {
    try {
      const c = await caches.open(INBOX), fd = await req.formData(), id = () => Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      for (const f of fd.getAll('files')) {
        if (!f || typeof f === 'string' || !f.size || f.size > 50e6) continue;
        await c.put(new Request('./__share/' + id()), new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'Datei') } }));
      }
      const meta = { at: Date.now(), title: String(fd.get('title') || ''), text: String(fd.get('text') || ''), url: String(fd.get('url') || '') };
      if (meta.title || meta.text || meta.url) await c.put(new Request('./__share/meta-' + id()), new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/x-mybox-share' } }));
    } catch (x) {}
    return Response.redirect(new URL('./?geteilt=1', self.registration.scope).href, 303);
  })());
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
/* Tageszusammenfassung: eine Meldung am Tag, nach Art gruppiert – ohne Namen, Ärzte oder Beträge */
const KIND = {
  'g.t': ['Arzttermin', 'Arzttermine'], 'g.v': ['Vorsorge fällig', 'Vorsorgen fällig'], 'g.u': ['Dokument läuft ab', 'Dokumente laufen ab'],
  'g.w': ['Kontaktlinsen wechseln', 'Kontaktlinsen wechseln'], 'g.n': ['Kontaktlinsen nachbestellen', 'Kontaktlinsen nachbestellen'], 'g.m': ['Rezept besorgen', 'Rezepte besorgen'],
  'b.k': ['Kündigungsfrist', 'Kündigungsfristen'], 'b.g': ['Garantie endet', 'Garantien enden'], 'b.p': ['Preisänderung', 'Preisänderungen'], 'b.w': ['Wartung fällig', 'Wartungen fällig']
};
function part(t, L) {
  const k = KIND[t] || ['Erinnerung', 'Erinnerungen'], n = L[0].n;
  if (t === 'g.m') return (L.length === 1 ? 'Ein Medikament' : L.length + ' Medikamente') + (n === 0 ? ' aufgebraucht' : ' reicht' + (L.length === 1 ? '' : ' teils') + ' nur noch ' + n + (n === 1 ? ' Tag' : ' Tage')) + ' – Rezept besorgen';
  if (t === 'g.n') return n === 0 ? 'Kontaktlinsen-Vorrat aufgebraucht' : 'Kontaktlinsen-Vorrat reicht noch ' + n + (n === 1 ? ' Tag' : ' Tage');
  return (L.length === 1 ? k[0] : L.length + ' × ' + k[1]) + ' ' + (L.length === 1 ? when(n) : '– als Nächstes ' + when(n));
}
function digest(soon) {
  const by = {}; soon.forEach(x => (by[x.t] = by[x.t] || []).push(x));
  return Object.entries(by).sort((a, b) => a[1][0].n - b[1][0].n).map(([t, L]) => part(t, L));
}
/* Jede Erinnerung nur einmal: gemerkt wird Art + Datum. Neue Meldung nur, wenn etwas Neues dazukommt.
   force (Test, Vorlauf geändert) zeigt alles Anstehende erneut. */
async function remind(force) {
  const c = await caches.open(SCHED), r = await c.match('./__sched');
  const old = await self.registration.getNotifications({ tag: 'mybox-erinnerung' });
  if (!r) { old.forEach(n => n.close()); return; }
  const { items = [] } = await r.json().catch(() => ({}));
  const t = new Date(); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()), tIso = dayIso(today);
  const soon = items.map(x => ({ t: x.t, d: x.d, n: diffDays(x.d, today), l: +x.l || 14 })).filter(x => x.n >= 0 && x.n <= x.l).sort((a, b) => a.n - b.n);
  const id = x => x.t + '|' + x.d;
  let seen = await c.match('./__seen').then(x => x && x.json()).catch(() => null);
  if (!seen) { // Umstieg von der alten Tageslogik: was schon gemeldet wurde, nicht noch einmal melden
    seen = {}; if (await c.match('./__last')) soon.forEach(x => { seen[id(x)] = x.d; });
    await c.delete('./__last');
  }
  for (const k of Object.keys(seen)) if (seen[k] < tIso) delete seen[k];
  const fresh = force ? soon : soon.filter(x => !seen[id(x)]);
  soon.forEach(x => { seen[id(x)] = x.d; });
  await c.put('./__seen', new Response(JSON.stringify(seen)));
  if (!soon.length) { old.forEach(n => n.close()); return; }
  if (!fresh.length) return;
  const lines = digest(fresh), heute = fresh.filter(x => x.n === 0).length;
  const title = heute ? 'MyBox · heute ' + (heute === 1 ? '1 Sache' : heute + ' Sachen') : 'MyBox · ' + (fresh.length === 1 ? '1 Erinnerung' : fresh.length + ' Erinnerungen');
  const body = lines.length === 1 ? lines[0] : lines.map(l => '• ' + l).join('\n');
  await self.registration.showNotification(title, { body, tag: 'mybox-erinnerung', renotify: true, icon: 'icons/mybox-192.png', badge: 'icons/mybox-badge-v2-96.png', data: { url: './' } });
}
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const w = cs.find(x => new URL(x.url).pathname === new URL(self.registration.scope).pathname);
    return w ? w.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
