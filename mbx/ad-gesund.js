/* MyBox-Adapter für den Bereich Gesundheit (MyGesundBox) */
'use strict';
(function(){
const A=window.MBXA;if(!A)return;
const q=s=>document.querySelector(s);
const hhmm=s=>{const d=new Date(s);return isNaN(d)?'':d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})};
const act=(a,id)=>{const b=document.createElement('button');b.dataset.act=a;if(id!=null)b.dataset.id=id;onAct({target:b})};
A.cfg={
  lockBtn:'#lockNow',
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
    if(bp)facts.push('Blutdruck '+fmtNum(bp.v1,0)+'/'+fmtNum(bp.v2,0));if(fq)facts.push(fq===1?'1 Frage gemerkt':fq+' Fragen gemerkt');
    if(!facts.length){const n=D.termine.filter(t=>new Date(t.datum)>=Date.now()).length,k=D.dokumente.length;facts.push((n===1?'1 Termin':n+' Termine')+' geplant',k===1?'1 Dokument':k+' Dokumente')}
    if(nt){const a=arzt(nt.arztId);return{main:nt.titel,sub:relDay(daysUntil(nt.datum)).replace(/^./,c=>c.toUpperCase())+' · '+hhmm(nt.datum)+' Uhr'+(a?' · '+a.name:''),facts}}
    return{main:'Kein Termin geplant',sub:D.aerzte.length?D.aerzte.length+' Ärzte gespeichert':'Termine, Werte, Dokumente',facts};
  },
  timeline(days){
    return D.termine.filter(t=>{const n=daysUntil(t.datum);return n>=0&&n<=days&&new Date(t.datum)>=Date.now()-2*3600e3}).map(t=>{const a=arzt(t.arztId);
      return{d:t.datum.slice(0,10),time:hhmm(t.datum),title:t.titel,sub:'Arzttermin'+(a?' · '+a.name:''),ref:{a:'t-edit',id:t.id}}});
  },
  todos(){return dashTodos().map(([lv,ic,txt,a,id])=>({lvl:lv,title:txt,ref:{a,id}}))},
  search(raw){
    const s=String(raw||'').trim().toLowerCase();if(!s)return [];
    const has=(...f)=>f.some(x=>String(x||'').toLowerCase().includes(s)),r=[];
    D.termine.filter(t=>has(t.titel,t.notiz,t.fragen,t.nachher,t.ort,arzt(t.arztId)?.name)).sort((a,b)=>b.datum.localeCompare(a.datum)).forEach(t=>r.push({g:'Termine',title:t.titel,sub:fmtDT(t.datum)+(arzt(t.arztId)?' · '+arzt(t.arztId).name:''),ref:{a:'t-edit',id:t.id}}));
    D.aerzte.filter(a=>has(a.name,a.fach,a.adresse,a.notiz,a.tel)).forEach(a=>r.push({g:'Ärzte',title:a.name,sub:[a.fach,a.tel].filter(Boolean).join(' · '),ref:{a:'a-edit',id:a.id}}));
    D.vorsorge.filter(v=>has(v.name,v.notiz)).forEach(v=>r.push({g:'Vorsorge',title:v.name,sub:vStatus(v).txt,ref:{a:'v-edit',id:v.id}}));
    D.sehhilfen.filter(x=>has(x.name,x.haendler,x.fassung,x.glaeser,x.notiz,hilfeTitel(x))).forEach(x=>r.push({g:'Augen',title:hilfeTitel(x),sub:(x.art==='brille'?'Brille':'Kontaktlinsen')+(x.haendler?' · '+x.haendler:''),ref:{a:'hilfe-edit',id:x.id}}));
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
  linkInfo(id){const x=D.sehhilfen.find(y=>y.id===id);if(!x)return null;
    return{title:hilfeTitel(x),sub:x.art==='brille'?'Brille':'Kontaktlinsen',facts:[HSTATUS[x.status],x.gekauft?'gekauft '+fmtD(x.gekauft):'',x.haendler].filter(Boolean)}}
};
/* Brillen und Kontaktlinsen: Beleg bzw. Abo direkt im Bereich Belege */
const linked=x=>{const api=A.P.api('beleg');return api?api.linkInfo('mygesundbox:'+x.id):null};
window.MBXL=x=>!!linked(x);
A.toBeleg=x=>{const i=linked(x);if(i)A.P.go('beleg',{k:i.k,id:i.id});else A.P.linkNew(belegLink(x).split('?neu=')[1])};
A.start();
})();
