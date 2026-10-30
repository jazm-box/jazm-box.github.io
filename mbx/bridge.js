/* MyBox-Brücke – läuft in jedem Bereich (Haus, Gesundheit, Belege) innerhalb von MyBox.
   Entsperrt den Bereich mit dem MyBox-Passwort, meldet Aktivität für die Auto-Sperre,
   öffnet Links zu den anderen Boxen innerhalb von MyBox und stellt Daten fürs Dashboard bereit. */
'use strict';
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
  /* Knopf „Sperren“ oben wird zum Knopf „Übersicht“ (zurück zum MyBox-Dashboard) */
  const HOME='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>';
  function homeBtn(){const sel=A.cfg&&A.cfg.lockBtn;if(!sel)return;const b=document.querySelector(sel);if(!b||b.dataset.mbx)return;
    b.dataset.mbx='1';b.innerHTML=HOME;b.setAttribute('aria-label','Zur MyBox-Übersicht');b.title='Zur MyBox-Übersicht'}
  addEventListener('click',e=>{const sel=A.cfg&&A.cfg.lockBtn;if(!sel)return;const b=e.target.closest&&e.target.closest(sel);if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();P.home()},true);

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
    homeBtn();
    if(A.busy||!A.cfg||!P.unlocked())return;
    if(!A.cfg.locked()){if(!A.ready){A.ready=true;try{P.reg(APP,A.api)}catch(e){}}return}
    if(A.ready){A.ready=false;try{P.unreg(APP)}catch(e){}}
    if(A.waitOld)return;
    if(!window.MBX_BOOTED||!A.cfg.form())return; /* erst wenn der Bereich seinen Tresor geladen hat – sonst würde er einen neuen anlegen */
    A.busy=true;let r;
    try{r=await A.submit(P.pw())}finally{A.busy=false}
    if(r==='wrong'){A.waitOld=true;P.needOld(APP,A.migrate)}
    else if(r!=='ok'&&r!=='noform')P.areaErr(APP,r)}
  A.start=()=>{setInterval(tick,300);tick()};
  A.retry=()=>{A.waitOld=false};
})();
