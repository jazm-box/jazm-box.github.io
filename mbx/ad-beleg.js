/* MyBox-Adapter für den Bereich Belege (MyBelegBox) – greift über window.__mbxB auf die App zu */
'use strict';
(function(){
const A=window.MBXA,B=window.__mbxB;if(!A||!B)return;
const q=s=>document.querySelector(s);
A.cfg={
  lockBtn:'#lockBtn',title:'Belege',brand:'header.top .brand h1',header:'header.top',nav:'nav.tabs',search:'#searchBtn',
  overlay:()=>!!q('.rscan')||!!q('.scanov')||!!(q('#sheetRoot')&&q('#sheetRoot').firstElementChild)||!q('#viewer').hidden||!q('#fan').hidden,
  menuBtn:'#menuBtn',menuTitle:'Belege · Extras',fan:'#fan .fi button',fanOrder:['Beleg fotografieren','Abo / Vertrag','Gerät'],fanLabel:{'Beleg fotografieren':'Beleg-Foto'},
  locked:()=>document.body.classList.contains('locked')||!B.db,
  form:()=>q('#lf'),
  fill:pw=>{const a=q('#lp1'),b=q('#lp2'),n=q('#lnew');if(a)a.value=pw;if(b)b.value=pw;if(n)n.checked=true},
  err:()=>{const e=q('#lerr');return e&&!e.hidden?e.textContent.trim():''},
  errClear:()=>{const e=q('#lerr');if(e){e.hidden=true;e.textContent=''}}
};
const db=()=>B.db;
A.api={
  name:'Belege',
  card(){const d=db(),act=d.contracts.filter(c=>c.status!=='gekuendigt');
    const raten=d.devices.map(x=>B.rateInfo(x)).filter(r=>r&&r.aktiv);
    const mon=act.reduce((s,c)=>s+B.monthly(c),0)+raten.reduce((s,r)=>s+r.b,0);
    const ohne=d.devices.filter(x=>x.nachweis==='keiner').length;
    const facts=[act.length===1?'1 Vertrag':act.length+' Verträge',d.devices.length===1?'1 Gerät':d.devices.length+' Geräte'];if(ohne)facts.push(ohne+' ohne Beleg');
    return{main:B.eur(mon)+' pro Monat',sub:'Fixkosten aus Verträgen und Raten',facts}},
  timeline(days){return B.upcoming().filter(e=>e.n>=0&&e.n<=days).map(e=>({d:B.iso(e.date),title:e.title,sub:e.sub,ref:{k:e.kind,id:e.id}}))},
  todos(){const r=[];for(const x of db().devices){const wi=B.wartInfo(x);if(wi&&wi.n<0)r.push({lvl:'crit',title:x.name+': Wartung überfällig seit '+B.fmtD(wi.next),ref:{k:'d',id:x.id}})}return r},
  stats(){const d=db(),act=d.contracts.filter(c=>c.status!=='gekuendigt'),by={};
    act.forEach(c=>{const k=c.kategorie||'Sonstiges';by[k]=(by[k]||0)+B.monthly(c)});
    const raten=d.devices.map(x=>B.rateInfo(x)).filter(r=>r&&r.aktiv);if(raten.length)by['Ratenkäufe']=raten.reduce((s,r)=>s+r.b,0);
    const g={ok:0,bald:0,ab:0};d.devices.forEach(x=>{const i=B.deviceInfo(x);if(!i.best)g.ab++;else if(B.days(i.best.date)<=90)g.bald++;else g.ok++});
    return{kats:Object.entries(by).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]),garantie:g,devices:d.devices.length}},
  eur:n=>B.eur(n),
  linkedCount:pre=>db().devices.filter(x=>x.ext&&String(x.ext.ref||'').startsWith(pre)).length,
  shortcut(k){try{B.closeSheet(false)}catch(e){}if(k==='foto')B.openForm('d',null,true);else if(k==='vertrag')B.openForm('c');else B.openForm('d')},
  search(raw){const s=String(raw||'').trim().toLowerCase();if(!s)return [];
    const has=(...f)=>f.some(x=>String(x||'').toLowerCase().includes(s)),r=[];
    db().contracts.filter(c=>has(c.anbieter,c.kategorie,c.notiz,c.kundennr,c.vertragsnr)).forEach(c=>r.push({g:'Verträge',title:c.anbieter||'Vertrag',sub:[c.kategorie,c.status==='gekuendigt'?'gekündigt':''].filter(Boolean).join(' · '),ref:{k:'c',id:c.id}}));
    db().devices.filter(d=>has(d.name,d.kategorie,d.haendler,d.notiz,d.seriennr,d.hersteller,d.modell,d.raum)).forEach(d=>r.push({g:'Geräte',title:d.name||'Gerät',sub:[d.kategorie,d.kauf?'gekauft '+B.fmtD(B.parse(d.kauf)):''].filter(Boolean).join(' · '),ref:{k:'d',id:d.id}}));
    return r},
  open(ref){try{B.closeSheet(false)}catch(e){}if(!ref)return;B.goTab(ref.k==='c'?'vertraege':'geraete');setTimeout(()=>B.openDetail(ref.k,ref.id),60)},
  ics(neutral){const r=B.buildIcs(!!neutral);return r&&r.count?r.text:''},
  sched(lead){window.MBX_LEAD=lead;try{return B.schedItems().map(x=>Object.assign({l:lead},x))}finally{window.MBX_LEAD=0}},
  count(){return db().devices.length+db().contracts.length},
  bkSet(g){const m=Object.assign({},db().meta);if(g)m.gh={owner:g.owner,repo:g.repo,token:g.token,dir:g.dir};else delete m.gh;
    db().meta=m;B.setGhStat({err:'',at:0,conflict:false});return B.save().then(()=>{if(g)B.ghQueue(0)})},
  bkInfo(){const d=db(),g=B.ghCfg(),s=B.ghStat,own=d.devices.some(x=>!x.ex)||d.contracts.some(x=>!x.ex);
    const lb=d.meta&&d.meta.lastBackup?B.parse(d.meta.lastBackup):null;
    return{ghErr:g?(s.err||''):'',ghOk:!!(g&&!s.err&&s.at),own,days:lb?-B.days(lb):null,dirty:(d.meta&&d.meta.dirty)||0,conflict:!!s.conflict,at:s.at||0,on:!!g,last:d.meta&&d.meta.lastBackup||null}},
  ghCur:()=>B.ghCfg(),
  bkNow:force=>B.ghSync(!!force),
  backupFile:()=>A.capture(()=>B.exportBackup()),
  restore:o=>B.restoreVault({vault:o.vault,files:o.files||{}}),
  restoreFile:async file=>B.restoreVault(await B.readBackupFile(file)),
  ghPull:async g=>B.restoreVault(await B.ghRestore(g)),
  changePw:(o,n)=>B.changePassword(o,n),
  newVid:()=>{B.newVid();return B.save()},
  theme:v=>DS.setTheme(v),
  flush:()=>B.saving,
  refresh(){try{B.render()}catch(e){}},
  /* Verknüpfung zu Haus (mysmartbox:<id>) bzw. Gesundheit (mygesundbox:<id>) */
  linkInfo(ref){const d=db();if(!d)return null;const dv=d.devices.find(x=>x.ext&&x.ext.ref===ref);
    if(dv){const i=B.deviceInfo(dv),f=[];if(dv.kauf)f.push('gekauft '+B.fmtD(i.kauf));if(+dv.preis)f.push(B.eur(dv.preis));
      f.push(i.best?i.best.typ+' bis '+B.fmtD(i.best.date):'kein Schutz mehr');const wi=B.wartInfo(dv);if(wi)f.push(wi.n<0?'Wartung überfällig':'Wartung am '+B.fmtD(wi.next));f.push(dv.nachweis==='keiner'?'noch kein Beleg':'Beleg vorhanden');
      return{k:'d',id:dv.id,title:dv.name,facts:f}}
    const c=d.contracts.find(x=>x.ext&&x.ext.ref===ref);
    if(c){const f=[B.eur(B.monthly(c))+' pro Monat'];const ci=B.contractInfo(c);if(c.status==='gekuendigt')f.push('gekündigt');else if(ci.by)f.push('kündbar bis '+B.fmtD(ci.by));
      return{k:'c',id:c.id,title:c.anbieter,facts:f}}
    return null},
  linkNew(neu){try{B.closeSheet(false)}catch(e){}setTimeout(()=>B.openExternal(neu,null),80)},
  /* Aus anderen Apps geteilt: über das Eingangsfach der Belege (neues Gerät, Vertrag oder vorhandener Eintrag) */
  async share(files,text){try{B.closeSheet(false)}catch(e){}const c=await caches.open(B.INBOX);
    const put=(body,type,name)=>c.put(new Request('./__inbox/'+Date.now()+'-'+Math.random().toString(36).slice(2,7)),new Response(body,{headers:{'content-type':type,'x-name':encodeURIComponent(name)}}));
    for(const f of files)await put(f,f.type||'application/octet-stream',f.name||'Datei');
    if(!files.length)await put(JSON.stringify({text:text||'',big:0,keys:['text']}),B.SHARE_T,'Geteilter Inhalt');
    B.openInbox(await B.inboxFiles())},
  /* Adressbuch: Wartungsfirmen, Händler und Vertragspartner */
  contacts(){const d=db(),r=[],add=(name,o)=>{name=String(name||'').trim();if(name)r.push(Object.assign({name},o))};
    d.devices.forEach(x=>{const w=x.wartung,wi=B.wartInfo(x);
      if(w&&w.firma){const items=[{title:x.name,sub:wi?(wi.n<0?'Wartung überfällig seit '+B.fmtD(wi.next):'nächste Wartung '+B.fmtD(wi.next)):'Wartung',ref:{k:'d',id:x.id},d:wi&&B.iso(wi.next)}];
        (x.wartLog||[]).slice().sort((a,b)=>a.datum<b.datum?1:-1).slice(0,4).forEach(l=>items.push({title:'Wartung '+x.name,sub:B.fmtD(B.parse(l.datum))+(+l.kosten?' · '+B.eur(+l.kosten):''),ref:{k:'d',id:x.id}}));
        add(w.firma,{role:'Wartung & Handwerk',tel:w.tel,items})}
      if(x.haendler)add(x.haendler,{role:'Händler',items:[{title:x.name,sub:[x.kauf?'gekauft '+B.fmtD(B.parse(x.kauf)):'',+x.preis?B.eur(+x.preis):''].filter(Boolean).join(' · '),ref:{k:'d',id:x.id}}]})});
    d.contracts.forEach(c=>add(c.anbieter,{role:c.kategorie||'Vertrag',items:[{title:c.kategorie||'Vertrag',sub:B.eur(B.monthly(c))+' pro Monat'+(c.status==='gekuendigt'?' · gekündigt':'')+(c.kundennr?' · Kd.-Nr. '+c.kundennr:''),ref:{k:'c',id:c.id}}]}));
    return r},
  /* Ausgaben eines Jahres: Anschaffungen, Wartungen, Verträge (anteilig nach Monaten) */
  costs(y){const d=db(),r=[],Y=+y,now=new Date(),lastM=Y===now.getFullYear()?now.getMonth():11;
    if(Y>now.getFullYear())return r;
    d.devices.forEach(x=>{if(String(x.kauf||'').slice(0,4)===String(Y)&&+x.preis>0)r.push({d:x.kauf,title:x.name+(x.haendler?' – '+x.haendler:''),amount:+x.preis,cat:'Anschaffungen',tax:null,ref:{k:'d',id:x.id}});
      (x.wartLog||[]).forEach(l=>{if(String(l.datum).slice(0,4)===String(Y)&&+l.kosten>0)r.push({d:l.datum,title:'Wartung '+x.name+(x.wartung&&x.wartung.firma?' – '+x.wartung.firma:''),amount:+l.kosten,cat:'Wartung & Handwerk',tax:'handwerk',ref:{k:'d',id:x.id}})})});
    d.contracts.forEach(c=>{const m=B.monthly(c);if(!(m>0))return;const st=c.beginn?B.parse(c.beginn):null,en=c.status==='gekuendigt'&&c.ende?B.parse(c.ende):null;let k=0;
      for(let i=0;i<=lastM;i++){const a=new Date(Y,i,1),b=new Date(Y,i+1,0);if(st&&b<st)continue;if(en&&a>en)continue;k++}
      if(!k)return;const vers=/versicher/i.test(c.kategorie||'');
      r.push({d:Y+'-'+String(lastM+1).padStart(2,'0')+'-01',title:c.anbieter+(c.kategorie?' – '+c.kategorie:''),amount:Math.round(m*k*100)/100,cat:vers?'Versicherungen':'Verträge & Abos',tax:vers?'vorsorge':null,sub:k+(k===1?' Monat':' Monate')+' × '+B.eur(m),ref:{k:'c',id:c.id}})});
    return r},
  /* Gerätepass: alles aus den Belegen zu einem Gerät aus dem Bereich Haus */
  passInfo(ref){const d=db();if(!d)return null;const x=d.devices.find(v=>v.ext&&v.ext.ref===ref);if(!x)return null;const i=B.deviceInfo(x),wi=B.wartInfo(x);
    return{k:'d',id:x.id,name:x.name,kauf:x.kauf?B.fmtD(i.kauf):'',preis:+x.preis?B.eur(+x.preis):'',haendler:x.haendler||'',hersteller:[x.hersteller,x.modell].filter(Boolean).join(' '),sn:x.sn||'',
      schutz:i.best?{typ:i.best.typ,bis:B.fmtD(i.best.date),tage:B.days(i.best.date)}:null,beleg:x.nachweis!=='keiner',
      wartung:wi?{next:B.fmtD(wi.next),n:wi.n,firma:x.wartung.firma||'',tel:x.wartung.tel||'',monate:x.wartung.monate}:null,
      log:(x.wartLog||[]).slice().sort((a,b)=>a.datum<b.datum?1:-1).slice(0,3).map(l=>B.fmtD(B.parse(l.datum))+(+l.kosten?' · '+B.eur(+l.kosten):'')+(l.notiz?' · '+l.notiz:'')),
      docs:(x.docs||[]).map(v=>v.name||'Dokument')}}
};
const AIC={smart:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',gesund:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'};
const CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const e_=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* In der Detailansicht: Daten aus dem verknüpften Bereich direkt anzeigen statt „In der … öffnen“ */
A.extHtml=x=>{const m=String(x&&x.ext&&x.ext.ref||'').match(/^(mysmartbox|mygesundbox):(.+)$/);if(!m)return '';
  const app=m[1]==='mysmartbox'?'smart':'gesund',name=app==='smart'?'Haus':'Gesundheit',api=A.P.api(app),info=api&&api.linkInfo?api.linkInfo(m[2]):undefined;
  const ico=`<span class="ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${AIC[app]}</svg></span>`;
  if(info===null)return `<div class="extlink ${app==='smart'?'sb':'gb'}">${ico}<span class="at"><b>Im Bereich ${name} nicht mehr vorhanden</b><small>Der verknüpfte Eintrag wurde dort gelöscht.</small></span><button type="button" class="btn small" data-mbx-do="unlink" data-ref="${e_(m[0])}">Lösen</button></div>`;
  const ref=app==='smart'?{a:'edit',id:m[2]}:{a:'seh',id:m[2]};
  return `<a class="extlink ${app==='smart'?'sb':'gb'}" href="#" data-mbx-go="${e_(JSON.stringify({app,ref}))}">${ico}<span class="at"><b>${e_(name)}${info&&info.sub?' · '+e_(info.sub):''}</b><small>${info?e_([info.title,...info.facts].filter(Boolean).join(' · ')):'Verknüpften Eintrag öffnen'}</small></span>${CHEV}</a>`};
A.act=(what,el)=>{if(what!=='unlink')return;const ref=el.dataset.ref,d=db();const it=d.devices.find(x=>x.ext&&x.ext.ref===ref)||d.contracts.find(x=>x.ext&&x.ext.ref===ref);
  if(!it)return;delete it.ext;B.save().then(()=>{B.render();try{B.closeSheet(false)}catch(e){}A.P.go('beleg',{k:d.devices.includes(it)?'d':'c',id:it.id})})};
A.start();
})();
