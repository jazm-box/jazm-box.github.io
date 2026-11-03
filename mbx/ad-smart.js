/* MyBox-Adapter für den Bereich Haus (MySmartBox) – Kern über window.__mbxS, Oberfläche über die globalen Werte aus app.js */
'use strict';
(function(){
const A=window.MBXA,S=window.__mbxS;if(!A||!S)return;
const q=s=>document.querySelector(s);
const click=attrs=>{const b=document.createElement('button');b.type='button';b.hidden=true;for(const [k,v] of Object.entries(attrs))b.setAttribute(k,v);document.body.appendChild(b);b.click();b.remove()};
A.cfg={
  lockBtn:'[data-box="lock"]',
  locked:()=>document.body.classList.contains('bxlocked'),
  form:()=>q('#lockForm'),
  fill:pw=>{q('#pw').value=pw;q('#pw2').value=pw},
  err:()=>q('#lockErr').textContent.trim(),
  errClear:()=>{q('#lockErr').textContent=''}
};
A.api={
  name:'Haus',
  card(){const d=state.devices.length,r=new Set(state.devices.map(x=>x.room).filter(Boolean)).size,rt=(state.routines||[]).length;
    const facts=[rt===1?'1 Routine':rt+' Routinen',(state.apps||[]).length+' Apps'];const bb=A.P.api('beleg'),nb=bb&&bb.linkedCount?bb.linkedCount('mysmartbox:'):0;if(nb)facts.push(nb===1?'1 mit Kaufbeleg':nb+' mit Kaufbeleg');
    return{main:d===1?'1 Gerät':d+' Geräte',sub:r?'in '+(r===1?'1 Raum':r+' Räumen'):'Geräte, Räume, Grundriss',facts}},
  timeline(){return []},
  stats(){const by={};state.devices.forEach(d=>{const r=d.room||'Ohne Raum';by[r]=(by[r]||0)+1});return{rooms:Object.entries(by).sort((a,b)=>b[1]-a[1])}},
  shortcut(k){try{S.closeSheet()}catch(e){}if(k==='geraet')openEditor(null)},
  todos(){return []},
  search(raw){const s=String(raw||'').trim().toLowerCase();if(!s)return [];
    const r=[];
    state.devices.filter(d=>[d.name,d.note,d.ip,d.mac,d.room].join(' ').toLowerCase().includes(s)).slice(0,40).forEach(d=>r.push({g:'Geräte',title:d.name||'Gerät',sub:d.room||'Ohne Raum',ref:{a:'edit',id:d.id}}));
    (state.routines||[]).filter(x=>[x.name,x.note].join(' ').toLowerCase().includes(s)).forEach(x=>r.push({g:'Routinen',title:x.name||'Routine',sub:'Routine',ref:{a:'open-routine',r:x.id}}));
    return r},
  open(ref){try{S.closeSheet()}catch(e){}if(!ref)return;
    if(ref.a==='edit'){click({'data-act':'edit','data-id':ref.id})}else if(ref.a==='open-routine')click({'data-act':'open-routine','data-r':ref.r})},
  ics(){return ''},
  sched(){return []},
  count(){return state.devices.length},
  bkSet(g){const M=S.META;if(g)M.backupGh={owner:g.owner,repo:g.repo,token:g.token,dir:g.dir};else delete M.backupGh;
    S.setBk({err:'',at:0,conflict:false});return S.save({clean:true}).then(()=>{if(g)S.bkQueue(0)})},
  bkInfo(){const i=BOX.bkInfo(),M=S.META,st=S.bkStat;const own=state.devices.length>0;
    return{ghErr:i.ghErr,ghOk:i.ghOk,own,days:i.last?Math.round((new Date(new Date().toDateString())-new Date(i.last+'T00:00'))/864e5):null,dirty:i.dirty,conflict:!!st.conflict,at:st.at||0,on:!!M.backupGh,last:i.last}},
  ghCur:()=>S.META.backupGh?{...S.META.backupGh}:null,
  bkNow:force=>S.bkSync(!!force),
  backupFile:()=>A.capture(()=>S.exportBackup()),
  restore:o=>S.restoreVault(JSON.stringify(o.vault)),
  restoreFile:async file=>{const r=await S.readAnyBackup(file);if(r.kind!=='vault')throw new Error('Das ist eine sehr alte Sicherung. Öffne sie bitte zuerst in der MySmartBox.');return S.restoreVault(r.vault)},
  ghPull:async g=>S.restoreVault(await S.bkRestore(g)),
  changePw:(o,n)=>S.changePw(o,n),
  newVid:()=>S.newVid(),
  theme:v=>DS.setTheme(v),
  flush:()=>S.saving,
  refresh(){try{render()}catch(e){}},
  linkInfo(id){const d=state.devices.find(x=>x.id===id);if(!d)return null;
    return{title:d.name,sub:d.room||'ohne Raum',facts:[(appById(d.app)||{}).name,(TYPES[d.type]||[])[0]].filter(Boolean)}}
};
const e_=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BI='<span class="ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg></span>';
const CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
/* Im Gerät: Kaufbeleg und Garantie direkt aus dem Bereich Belege */
A.bbHtml=d=>{if(!d||!state.devices.some(x=>x.id===d.id))return '';const api=A.P.api('beleg'),info=api&&api.linkInfo('mysmartbox:'+d.id);
  if(info)return `<a class="bblink" href="#" data-mbx-go="${e_(JSON.stringify({app:'beleg',ref:{k:info.k,id:info.id}}))}">${BI}<span class="at"><b>Beleg &amp; Garantie</b><small>${e_(info.facts.join(' · '))}</small></span>${CHEV}</a>`;
  return `<a class="bblink" href="#" data-mbx-do="beleg-neu" data-id="${e_(d.id)}">${BI}<span class="at"><b>Kaufbeleg anlegen</b><small>Kauf, Preis und Garantie im Bereich Belege</small></span>${CHEV}</a>`};
A.act=(what,el)=>{if(what!=='beleg-neu')return;const d=state.devices.find(x=>x.id===el.dataset.id);if(!d)return;A.P.linkNew(bbLink(d).split('#neu=')[1])};
A.start();
})();
