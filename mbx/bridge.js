/* MyBox-Brücke – läuft in jedem Bereich (Haus, Gesundheit, Belege) innerhalb von MyBox.
   Entsperrt den Bereich mit dem MyBox-Passwort, meldet Aktivität für die Auto-Sperre,
   öffnet Links zu den anderen Boxen innerhalb von MyBox und stellt Daten fürs Dashboard bereit. */
'use strict';
window.MBX_EMBED=true; /* schaltet in den Apps den MyBox-Modus ein */
/* Nur ein Aufklappfenster je Gruppe: öffnet man eines, schließen sich die offenen daneben (nur bei eigenem Antippen, nicht beim Aufbau) */
document.addEventListener('click',e=>{const s=e.target&&e.target.closest&&e.target.closest('summary');const d=s&&s.parentElement;
  if(!d||d.tagName!=='DETAILS'||d.open||!d.parentElement)return;
  for(const o of d.parentElement.querySelectorAll(':scope > details[open]'))if(o!==d)o.open=false},true);
(function(){
  const P=(()=>{try{return window.parent!==window&&window.parent.MBX?window.parent.MBX:null}catch(e){return null}})();
  if(!P){location.replace('../');return}
  const APP=document.currentScript.dataset.app;
  document.documentElement.classList.add('mbx','mbx-'+APP);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const A=window.MBXA={app:APP,P,ready:false,waitOld:false,busy:false};

  /* Aktivität an MyBox melden (Auto-Sperre nach 5 Minuten gilt für alle Bereiche gemeinsam) */
  let lastAct=0;
  ['pointerdown','keydown','touchstart','scroll','input'].forEach(ev=>addEventListener(ev,()=>{const t=Date.now();if(t-lastAct>2000){lastAct=t;try{P.act()}catch(e){}}},{passive:true,capture:true}));

  /* Links zu MySmartBox, MyGesundBox, MyBelegBox: innerhalb von MyBox öffnen */
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
    let r=false;try{r=P.route(a.href)}catch(x){}if(r){e.preventDefault();e.stopImmediatePropagation()}},true);
  const wo=window.open;window.open=function(u){try{if(u&&P.route(String(u)))return null}catch(e){}return wo.apply(window,arguments)};

  /* Verknüpfte Einträge aus einem anderen Bereich: direkt dort öffnen */
  addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('[data-mbx-go],[data-mbx-do]');if(!g)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{if(g.dataset.mbxGo){const o=JSON.parse(g.dataset.mbxGo);P.go(o.app,o.ref)}else A.act&&A.act(g.dataset.mbxDo,g)}catch(x){}},true);
  /* Knopf „Sperren“ bzw. „Übersicht“ oben brauchen wir nicht mehr – unten gibt es die MyBox-Leiste */
  function homeBtn(){const sel=A.cfg&&A.cfg.lockBtn;if(!sel)return;const b=document.querySelector(sel);if(!b||b.dataset.mbx)return;
    b.dataset.mbx='1';b.classList.add('mbx-gone');b.setAttribute('aria-hidden','true');b.tabIndex=-1}
  addEventListener('click',e=>{const sel=A.cfg&&A.cfg.lockBtn;if(!sel)return;const b=e.target.closest&&e.target.closest(sel);if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();P.home()},true);
  /* Suche oben im Bereich öffnet die gemeinsame MyBox-Suche */
  addEventListener('click',e=>{const sel=A.cfg&&A.cfg.search;if(!sel)return;const b=e.target.closest&&e.target.closest(sel);if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();try{P.search()}catch(x){}},true);
  /* Einheitliches Aussehen: Bereichsname statt App-Name, Reiter oben statt unten, Menü-Titel */
  function decorate(){const c=A.cfg;if(!c)return;
    if(c.brand){const h=document.querySelector(c.brand);if(h&&h.textContent!==c.title)h.textContent=c.title}
    if(c.nav&&c.header){const n=document.querySelector(c.nav),h=document.querySelector(c.header);
      if(n&&h&&n.parentElement!==h){h.appendChild(n);h.classList.add('mbx-hd');n.classList.add('mbx-tt');(n.querySelector(':scope > .in')||n).classList.add('mbx-tt-row')}}
    if(c.tabRename&&c.nav){const n=document.querySelector(c.nav);if(n)n.querySelectorAll('button').forEach(b=>{for(const t of b.childNodes)if(t.nodeType===3&&c.tabRename[t.textContent.trim()])t.textContent=c.tabRename[t.textContent.trim()]})}
    if(c.menuTitle){document.querySelectorAll('h2').forEach(x=>{if(x.textContent.trim()==='Daten & Sicherheit')x.textContent=c.menuTitle});
      if(c.menuBtn){const m=document.querySelector(c.menuBtn);if(m&&m.getAttribute('aria-label')!==c.menuTitle){m.setAttribute('aria-label',c.menuTitle);m.title=c.menuTitle}}}}
  /* Neu anlegen über den Plus-Knopf von MyBox: die Aktionen des Bereichs (aus seinem eigenen Plus-Menü) */
  const fanBtns=()=>{const c=A.cfg;if(!c||!c.fan)return [];const L=[...document.querySelectorAll(c.fan)];
    if(c.fanOrder)L.sort((a,b)=>{const i=x=>{const k=c.fanOrder.indexOf(x.textContent.trim());return k<0?99:k};return i(a)-i(b)});return L};
  const addApi=()=>{const api=A.api;if(!api||api.newItems)return;
    api.newItems=()=>fanBtns().map((b,i)=>({k:i,label:(A.cfg.fanLabel&&A.cfg.fanLabel[b.textContent.trim()])||b.textContent.trim(),svg:(b.querySelector('svg')||{}).outerHTML||''}));
    api.doNew=k=>{const b=fanBtns()[k];if(b)b.click()};
    /* Zurück-Taste: zuerst offene Fenster und Blätter des Bereichs schließen */
    api.back=()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(d){try{d.close()}catch(e){}return true}
      let open=false;try{open=!!(A.cfg.overlay&&A.cfg.overlay())}catch(e){}
      if(!open){const n=A.cfg.nav&&document.querySelector(A.cfg.nav),bs=n?[...n.querySelectorAll('button')]:[],sel=bs.findIndex(x=>x.matches('[aria-selected="true"],.on,[aria-current="page"],.active,.sel'));
        if(sel>0){bs[0].click();scrollTo(0,0);return true}return false}
      const ev=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true});(document.activeElement||document).dispatchEvent(ev);return true};
    api.home=()=>{const c=A.cfg,n=c.nav&&document.querySelector(c.nav),t=n&&n.querySelector('button');if(t)t.click();scrollTo({top:0,behavior:'smooth'})}};

  /* Datei-Ausgabe abfangen, wenn MyBox eine gemeinsame Sicherung baut */
  A.capture=async fn=>{let out=null;window.MBX_CAP=(name,data)=>{out={name,data}};try{await fn()}finally{window.MBX_CAP=null}
    if(!out)throw new Error('Keine Sicherung erzeugt.');return typeof out.data==='string'?out.data:await new Blob([out.data]).text()};

  /* Entsperren mit dem MyBox-Passwort – über das Formular des Bereichs, damit alles wie gewohnt abläuft */
  A.submit=async pw=>{const c=A.cfg,f=c.form();if(!f)return 'noform';
    c.errClear();c.fill(pw);f.requestSubmit();const t0=Date.now();
    while(Date.now()-t0<30000){await sleep(120);if(!c.locked())return 'ok';const e=c.err();if(e)return /falsch/i.test(e)?'wrong':'err:'+e}
    return 'timeout'};
  /* Bisheriges Passwort (aus der alten App) einmal eingeben: entsperren, dann auf das MyBox-Passwort umschlüsseln */
  A.migrate=async old=>{while(A.busy)await sleep(100);A.busy=true;
    try{const r=await A.submit(old);if(r!=='ok')return r;
      try{await A.api.bkSet(P.bkCfg(APP))}catch(e){}
      await A.api.changePw(old,P.pw());try{await A.api.newVid()}catch(e){}
      A.waitOld=false;return 'ok'}
    finally{A.busy=false}};
  async function tick(){
    homeBtn();decorate();addApi();
    if(A.busy||!A.cfg||!P.unlocked())return;
    if(!A.cfg.locked()){if(!A.ready){A.ready=true;try{P.reg(APP,A.api)}catch(e){}}return}
    if(A.ready){A.ready=false;try{P.unreg(APP)}catch(e){}}
    if(A.waitOld)return;
    if(!window.MBX_BOOTED||!A.cfg.form())return; /* erst wenn der Bereich seinen Tresor geladen hat – sonst würde er einen neuen anlegen */
    A.busy=true;let r;
    try{r=await A.submit(P.pw())}finally{A.busy=false}
    if(r==='wrong'){A.waitOld=true;P.needOld(APP,A.migrate)}
    else if(r!=='ok'&&r!=='noform')P.areaErr(APP,r)}
  A.start=()=>{setInterval(tick,120);tick()};
  A.retry=()=>{A.waitOld=false};
})();
