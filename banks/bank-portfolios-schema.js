import {bankIds,bankProfiles,bankPeriods} from './bank-portfolios-math.js';

export const BANK_POLL_MS=15*60*1000;
export const BANK_STALE_MS=72*60*60*1000;
export const bankSourceHosts=['funds.rbcgam.com','www.rbcgam.com','www.td.com','www.scotiafunds.com','www.cibc.com','fundfacts.bmo.com','www.bmoetfs.ca','www.bankofcanada.ca'];
const text=(s,max=3000)=>typeof s==='string'&&s.length>0&&s.length<=max;
const date=(s,now)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s&&Date.parse(s)<=+now;
const rates=r=>r&&bankPeriods.every(n=>Number.isFinite(r[n])&&r[n]>-100&&r[n]<1000);
export const bankSourceURL=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&bankSourceHosts.includes(u.hostname);}catch{return false;}};

// This is an untrusted public document, even when served by our own publisher.
// Validate the entire comparable cohort before replacing any displayed record.
export function validBankSnapshot(d,now=new Date(),previous) {
 try {
  if(d?.schema!==1||!date(d.returnAsOf,now)||!Number.isFinite(Date.parse(d.reviewedAt))||Date.parse(d.reviewedAt)>+now||!Array.isArray(d.portfolios)||d.portfolios.length!==25||!Array.isArray(d.banks)||d.banks.length!==5)return false;
  if(!d.sources||Object.keys(d.sources).length>350)return false;
  for(const s of Object.values(d.sources))if(!bankSourceURL(s.url)||!text(s.title)||s.sha256&&!/^[a-f0-9]{64}$/.test(s.sha256))return false;
  const ref=r=>!!d.sources[r?.id]&&(!('page' in r)||Number.isInteger(r.page)&&r.page>0&&r.page<=100);
  const seen=new Set();
  for(const r of d.portfolios) {
   const id=r.bank+':'+r.profile;
   if(seen.has(id)||!bankIds.includes(r.bank)||!bankProfiles.some(p=>p.id===r.profile)||!text(r.name,150)||!text(r.series,60)||r.currency!=='CAD'||r.asOf!==d.returnAsOf||!ref(r.returnSource))return false;
   seen.add(id);
   if(r.bank==='bmo') {
    const year=Number(r.asOf.slice(0,4));
    if(r.asOf!==year+'-12-31'||!Number.isFinite(r.returns?.[1])||!Array.from({length:10},(_,i)=>r.calendar?.[year-i]).every(v=>Number.isFinite(v)&&v>-100&&v<1000)||r.returns[1]!==r.calendar[year]||r.benchmarkReturns!==null)return false;
   } else if(!rates(r.returns)||!rates(r.benchmarkReturns))return false;
   const a=r.allocation;
   if(!a||!text(a.label,150)||!date(a.asOf,now)||!ref(a.source)||!Array.isArray(a.components)||!a.components.length||a.components.length>35||!a.components.every(c=>text(c.name,250)&&['equity','bonds','cash','other'].includes(c.role)&&Number.isFinite(c.weight)&&c.weight>=-5&&c.weight<=100)||Math.abs(a.components.reduce((s,c)=>s+c.weight,0)-100)>.21)return false;
   if(!r.mer||(!Number.isFinite(r.mer.value)||r.mer.value<0||r.mer.value>10||r.mer.asOf&&!date(r.mer.asOf,now)||!ref(r.mer.source)))return false;
   if(r.riskSource&&!ref(r.riskSource))return false;
   const old=previous?.portfolios.find(p=>p.bank===r.bank&&p.profile===r.profile);
   if(old&&(old.name!==r.name||old.series!==r.series||old.fundCode!==r.fundCode||a.asOf<old.allocation.asOf||old.mer?.asOf&&(!r.mer?.asOf||r.mer.asOf<old.mer.asOf)))return false;
  }
  const banks=new Set();
  for(const b of d.banks) {
   const o=b.outlook;
   if(!bankIds.includes(b.id)||banks.has(b.id)||!text(b.label,25)||!text(b.name,150)||!text(b.family,150)||!o||!date(o.asOf,now)||!text(o.title,250)||!text(o.summary)||!text(o.scope)||!text(o.stance,250)||!ref(o.source))return false;
   const oldBank=previous?.banks.find(p=>p.id===b.id);
   if(oldBank&&['label','name','family'].some(k=>oldBank[k]!==b[k]))return false;
   banks.add(b.id);
   if(o.mix!==null&&(!Array.isArray(o.mix)||o.mix.length>10||!o.mix.every(c=>text(c.name,150)&&Number.isFinite(c.weight)&&c.weight>=0&&c.weight<=100)||Math.abs(o.mix.reduce((s,c)=>s+c.weight,0)-100)>.21))return false;
   if(previous&&o.asOf<previous.banks.find(p=>p.id===b.id).outlook.asOf)return false;
  }
  if(d.reference?.asOf!==d.returnAsOf||!text(d.reference.method)||!['equity','bonds','cash'].every(k=>text(d.reference[k]?.name,250)&&rates(d.reference[k].returns)&&ref(d.reference[k].source)))return false;
  if(previous&&(d.returnAsOf<previous.returnAsOf||previous.sync&&!d.sync))return false;
  if(d.sync) {
   const s=d.sync;
   if(s.schema!==1||s.cadenceHours!==24||!['ready','partial','unavailable'].includes(s.status)||!Number.isFinite(Date.parse(s.checkedAt))||Date.parse(s.checkedAt)>+now+300000||!Number.isFinite(Date.parse(s.updatedAt))||Date.parse(s.updatedAt)>Date.parse(s.checkedAt)||!Array.isArray(s.checks)||s.checks.length>80)return false;
   if(!s.checks.length||s.checks.some(c=>!text(c.id,150)||!text(c.label,200)||!['ready','retained','pending'].includes(c.status)||!text(c.message,600)))return false;
   if(previous?.sync&&s.checkedAt<previous.sync.checkedAt)return false;
  }
  return true;
 }catch{return false;}
}

export function bankSyncMessage(sync,now=new Date()) {
 if(!sync)return 'Bundled fallback · automatic source check unavailable. Original observation dates apply.';
 const age=+now-Date.parse(sync.checkedAt),stale=age<0||age>BANK_STALE_MS;
 const issues=sync.checks.filter(c=>c.status!=='ready').length;
 return `${stale?'Check overdue':sync.status==='ready'?'Sources checked':`${issues} source checks retained or pending`} · checked ${sync.checkedAt.slice(0,16).replace('T',' ')} UTC · daily source checks; page checks every 15 min. Return / allocation / outlook dates are separate.`;
}
