/* MyBox-Adapter für den Bereich Gesundheit (MyGesundBox) */
'use strict';
(function(){
const A=window.MBXA;if(!A)return;
const fk=L=>L.flatMap(d=>(d.files||[]).map((f,i)=>({fid:f.fid,mime:f.mime,name:f.name||((d.titel||'Dokument')+((d.files.length>1)?' '+(i+1):''))})));
const q=s=>document.querySelector(s);
const hhmm=s=>{const d=new Date(s);return isNaN(d)?'':d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})};
const act=(a,id)=>{const b=document.createElement('button');b.dataset.act=a;if(id!=null)b.dataset.id=id;onAct({target:b})};
A.cfg={
  lockBtn:'#lockNow',title:'Gesundheit',brand:'header .brand h1',header:'header',nav:'nav[aria-label="Bereiche"]',search:'#searchBtn',
  overlay:()=>sheetOpen()||!q('#viewer').hidden||!q('#fan').hidden||SEARCH!==null,
  menuBtn:'#menuBtn',menuTitle:'Gesundheit · Extras',fan:'#fan .fi button',fanOrder:['Termin','Messung','Medikament','Dokument fotografieren','Arzt','Vorsorge'],fanLabel:{'Dokument fotografieren':'Dokument'},
  locked:()=>!q('#lock').hidden||!KEY,
  form:()=>q('#lockForm'),
  fill:pw=>{q('#pw').value=pw;q('#pw2').value=pw},
  err:()=>q('#lockErr').textContent.trim(),
  errClear:()=>{q('#lockErr').textContent=''}
};
A.api={
  name:'Gesundheit',
  card(){
    const nt=D.termine.filter(t=>new Date(t.datum)>=Date.now()-2*3600e3).sort((a,b)=>a.datum.localeCompare(b.datum))[0];
    const due=D.vorsorge.filter(v=>vStatus(v).rank<=2).length,fq=D.fragen.filter(x=>!x.done).length;
    const bp=D.werte.filter(w=>w.typ==='bp').sort((a,b)=>a.datum.localeCompare(b.datum)).pop();
    const facts=[];if(due)facts.push(due===1?'1 Vorsorge fällig':due+' Vorsorgen fällig');
    const rz=D.medis.filter(m=>{if(m.aktiv===false)return false;const i=mInfo(m);return i.reicht!=null&&i.reicht<=i.vorlauf}).length;if(rz)facts.push(rz===1?'1 Rezept nötig':rz+' Rezepte nötig');
    if(bp)facts.push('Blutdruck '+fmtNum(bp.v1,0)+'/'+fmtNum(bp.v2,0));if(fq)facts.push(fq===1?'1 Frage gemerkt':fq+' Fragen gemerkt');
    if(!facts.length){const n=D.termine.filter(t=>new Date(t.datum)>=Date.now()).length,k=D.dokumente.length;facts.push((n===1?'1 Termin':n+' Termine')+' geplant',k===1?'1 Dokument':k+' Dokumente')}
    if(nt){const a=arzt(nt.arztId);return{main:nt.titel,sub:relDay(daysUntil(nt.datum)).replace(/^./,c=>c.toUpperCase())+' · '+hhmm(nt.datum)+' Uhr'+(a?' · '+a.name:''),facts}}
    return{main:'Kein Termin geplant',sub:D.aerzte.length?D.aerzte.length+' Ärzte gespeichert':'Termine, Werte, Dokumente',facts};
  },
  timeline(days){
    return D.termine.filter(t=>{const n=daysUntil(t.datum);return n>=0&&n<=days&&new Date(t.datum)>=Date.now()-2*3600e3}).map(t=>{const a=arzt(t.arztId);
      return{d:t.datum.slice(0,10),time:hhmm(t.datum),title:t.titel,sub:'Arzttermin'+(a?' · '+a.name:''),ref:{a:'t-edit',id:t.id}}});
  },
  stats(){const bp=D.werte.filter(w=>w.typ==='bp').sort((a,b)=>a.datum.localeCompare(b.datum)).slice(-30).map(w=>({d:w.datum,v1:w.v1,v2:w.v2}));
    let Z={};try{Z=ziel('bp')||{}}catch(e){}
    const medis=D.medis.filter(m=>m.aktiv!==false).map(m=>({name:m.name,...mInfo(m)})).filter(m=>m.reicht!=null).sort((a,b)=>a.reicht-b.reicht);
    return{bp,ziel:{v1:Z.v1||null,v2:Z.v2||null},medis}},
  shortcut(k){try{closeSheet()}catch(e){}act({termin:'q-termin',wert:'q-wert',medi:'q-medi',dok:'q-dok'}[k]||'q-termin')},
  todos(){return dashTodos().map(([lv,ic,txt,a,id])=>({lvl:lv,title:txt,ref:{a,id}}))},
  search(raw){
    const s=String(raw||'').trim().toLowerCase();if(!s)return [];
    const has=(...f)=>f.some(x=>String(x||'').toLowerCase().includes(s)),r=[];
    D.termine.filter(t=>has(t.titel,t.notiz,t.fragen,t.nachher,t.ort,arzt(t.arztId)?.name)).sort((a,b)=>b.datum.localeCompare(a.datum)).forEach(t=>r.push({g:'Termine',title:t.titel,sub:fmtDT(t.datum)+(arzt(t.arztId)?' · '+arzt(t.arztId).name:''),ref:{a:'t-edit',id:t.id}}));
    D.aerzte.filter(a=>has(a.name,a.fach,a.adresse,a.notiz,a.tel)).forEach(a=>r.push({g:'Ärzte',title:a.name,sub:[a.fach,a.tel].filter(Boolean).join(' · '),ref:{a:'a-edit',id:a.id}}));
    D.vorsorge.filter(v=>has(v.name,v.notiz)).forEach(v=>r.push({g:'Vorsorge',title:v.name,sub:vStatus(v).txt,ref:{a:'v-edit',id:v.id}}));
    D.sehhilfen.filter(x=>has(x.name,x.haendler,x.fassung,x.glaeser,x.notiz,hilfeTitel(x))).forEach(x=>r.push({g:'Augen',title:hilfeTitel(x),sub:(x.art==='brille'?'Brille':'Kontaktlinsen')+(x.haendler?' · '+x.haendler:''),ref:{a:'hilfe-edit',id:x.id}}));
    D.medis.filter(m=>has(m.name,m.staerke,m.notiz)).forEach(m=>r.push({g:'Medikamente',title:m.name,sub:[m.staerke,m.bedarf?'bei Bedarf':m.schema].filter(Boolean).join(' · '),ref:{a:'goto-medis',id:m.id}}));
    D.dokumente.filter(d=>has(dokTitel(d),d.notiz,DOKTYP[d.typ],arzt(d.arztId)?.name)).forEach(d=>r.push({g:'Dokumente',title:dokTitel(d),sub:(DOKTYP[d.typ]||'Dokument')+(d.datum?' · '+fmtD(d.datum):''),ref:{a:'d-view',id:d.id}}));
    return r;
  },
  open(ref){try{if(typeof closeSheet==='function')closeSheet()}catch(e){}
    if(!ref)return;if(ref.a==='seh'){TAB='werte';WTYP='augen';render();setTimeout(()=>{try{flashCard('h-'+ref.id)}catch(e){}},120);return}
    if(ref.a==='goto-augen'){TAB='werte';WTYP='augen';render();return}if(ref.a==='go'){TAB=ref.id;render();return}act(ref.a,ref.id)},
  ics(){const list=D.termine.filter(t=>new Date(t.datum)>=Date.now());if(!list.length)return '';
    return makeICS(list.map(t=>{const a=arzt(t.arztId);const s=new Date(t.datum);const e=new Date(s.getTime()+(+t.dauer||30)*6e4);
      return{uid:t.id,titel:t.titel+(a?' – '+a.name:''),start:s,end:e,ort:t.ort||a?.adresse||'',notiz:[t.fragen?'Fragen: '+t.fragen:'',a?.tel?'Tel: '+a.tel:''].filter(Boolean).join('\n'),alarms:['-P1D','-PT2H']}}))},
  sched(lead){window.MBX_LEAD=lead;try{return schedItems()}finally{window.MBX_LEAD=0}},
  count(){return D.termine.length+D.aerzte.length+D.vorsorge.length+D.werte.length+D.dokumente.length+D.sehhilfen.length},
  /* Datensicherung */
  bkSet(g){if(g){D.backupGh={owner:g.owner,repo:g.repo,token:g.token,dir:g.dir}}else delete D.backupGh;
    setBk({err:'',at:0,conflict:false});return save({clean:true}).then(()=>{if(g)bkQueue(0)})},
  bkInfo(){const o=bkO();return Object.assign(o,{conflict:!!bkStat.conflict,at:bkStat.at||0,on:!!bkCfg(),last:D.meta.lastBackup||null})},
  ghCur:()=>D.backupGh?{...D.backupGh}:null,
  bkNow:force=>bkSync(!!force),
  backupFile:()=>A.capture(()=>exportBackup()),
  restore(o){return restoreVaultStr({vault:JSON.stringify(o.vault||o),files:o.files||{}})},
  restoreFile:async file=>restoreVaultStr(await readBackupFile(file)),
  ghPull:async g=>restoreVaultStr(await bkRestore(g)),
  /* Passwort */
  async changePw(oldPw,newPw){const p=JSON.parse(vaultJson);await decryptObj(p,await derive(oldPw,unb64(p.salt)));
    SALT=crypto.getRandomValues(new Uint8Array(16));KEY=await derive(newPw,SALT);await save({clean:true});await saving},
  newVid(){VID=b64(rnd(12));return save({clean:true})},
  theme:v=>DS.setTheme(v),
  flush:async()=>{try{await stashDraft()}catch(e){}await saving},
  refresh(){try{render(true)}catch(e){}},
  /* Adressbuch: Ärzte und Optiker mit allem, was dazugehört */
  contacts(){const r=[],now=Date.now()-2*3600e3;
    D.aerzte.forEach(a=>{const ts=D.termine.filter(t=>t.arztId===a.id).sort((x,y)=>x.datum.localeCompare(y.datum));
      const up=ts.filter(t=>new Date(t.datum)>=now),past=ts.filter(t=>new Date(t.datum)<now).reverse();
      const items=[...up.slice(0,3).map(t=>({title:t.titel,sub:'Termin '+fmtDT(t.datum),ref:{a:'t-edit',id:t.id},d:t.datum.slice(0,10)})),
        ...past.slice(0,2).map(t=>({title:t.titel,sub:'zuletzt '+fmtD(t.datum.slice(0,10))+(+t.kosten?' · '+fmtNum(+t.kosten,2)+' €':''),ref:{a:'t-edit',id:t.id}})),
        ...D.vorsorge.filter(v=>v.arztId===a.id).map(v=>({title:v.name,sub:'Vorsorge · '+vStatus(v).txt,ref:{a:'v-edit',id:v.id}})),
        ...D.medis.filter(m=>m.arztId===a.id&&m.aktiv!==false).map(m=>({title:m.name,sub:'Medikament · verschrieben',ref:{a:'goto-medis',id:m.id}}))];
      r.push({name:a.name,role:a.fach||'Arzt',tel:a.tel,addr:a.adresse,web:a.web,note:a.zeiten?'Sprechzeiten: '+a.zeiten:'',ref:{a:'a-edit',id:a.id},items})});
    const by={};D.sehhilfen.filter(x=>String(x.haendler||'').trim()).forEach(x=>{const k=x.haendler.trim();(by[k]=by[k]||[]).push(x)});
    for(const [k,L] of Object.entries(by))r.push({name:k,role:'Optiker',items:L.map(x=>({title:hilfeTitel(x),sub:(x.art==='brille'?'Brille':'Kontaktlinsen')+(x.gekauft?' · gekauft '+fmtD(x.gekauft):'')+(+x.preis?' · '+fmtNum(+x.preis,2)+' €':''),ref:{a:'seh',id:x.id}}))});
    return r},
  /* Ausgaben eines Jahres (für Jahresübersicht und Steuer) */
  fileData:f=>getFile(f.fid),
  costs(y){const Y=String(y),r=[];const n=v=>{const x=typeof v==='number'?v:dnum(v);return x>0?x:0};
    D.termine.forEach(t=>{if(String(t.datum).slice(0,4)===Y&&n(t.kosten)){const a=arzt(t.arztId);r.push({d:t.datum.slice(0,10),title:t.titel+(a?' – '+a.name:''),amount:n(t.kosten),cat:'Arzt & Behandlung',tax:'krankheit',ref:{a:'t-edit',id:t.id},files:fk(D.dokumente.filter(d=>d.terminId===t.id))})}});
    /* Rechnungen mit Betrag – nicht doppelt, wenn der zugehörige Termin schon „Selbst bezahlt“ hat */
    D.dokumente.forEach(d=>{if(d.typ!=='rechnung'||String(d.datum).slice(0,4)!==Y||!n(d.betrag))return;const t=D.termine.find(x=>x.id===d.terminId);if(t&&n(t.kosten))return;
      const a=arzt(d.arztId),v=D.vorsorge.find(x=>x.id===d.vorsorgeId);r.push({d:d.datum,title:(d.titel||(v?v.name:'Rechnung'))+(a?' – '+a.name:''),amount:n(d.betrag),cat:'Arzt & Behandlung',tax:'krankheit',ref:{a:'d-view',id:d.id},files:fk([d])})});
    D.medis.forEach(m=>(m.packLog||[]).forEach(p=>{if(String(p.datum).slice(0,4)===Y&&n(p.zz))r.push({d:p.datum,title:m.name+' – Zuzahlung',amount:n(p.zz),cat:'Medikamente',tax:'krankheit',ref:{a:'goto-medis',id:m.id},files:[]})}));
    D.sehhilfen.forEach(x=>{if(String(x.gekauft||'').slice(0,4)===Y&&n(x.preis))r.push({d:x.gekauft,title:hilfeTitel(x)+(x.haendler?' – '+x.haendler:''),amount:n(x.preis),cat:'Brille & Kontaktlinsen',tax:'krankheit',ref:{a:'seh',id:x.id},files:fk(D.dokumente.filter(d=>d.sehId===x.id))})});
    return r},
  /* Aus anderen Apps geteilt: wie in der MyGesundBox (Dokument, Termin aus Text, .ics, .csv, Samsung Health) */
  async share(files,title,text){try{closeSheet()}catch(e){}const fs=[];for(const f of files)fs.push({name:f.name||'',type:f.type||'',buf:await f.arrayBuffer()});
    await idb.put('share',{at:Date.now(),title:title||'',text:text||'',url:'',files:fs});await handleShare()},
  linkInfo(id){const x=D.sehhilfen.find(y=>y.id===id);if(!x)return null;
    return{title:hilfeTitel(x),sub:x.art==='brille'?'Brille':'Kontaktlinsen',facts:[HSTATUS[x.status],x.gekauft?'gekauft '+fmtD(x.gekauft):'',x.haendler].filter(Boolean)}}
};
/* Brillen und Kontaktlinsen: Beleg bzw. Abo direkt im Bereich Belege */
const linked=x=>{const api=A.P.api('beleg');return api?api.linkInfo('mygesundbox:'+x.id):null};
window.MBXL=x=>!!linked(x);
A.toBeleg=x=>{const i=linked(x);if(i)A.P.go('beleg',{k:i.k,id:i.id});else A.P.linkNew(belegLink(x).split('?neu=')[1])};
A.start();
})();
