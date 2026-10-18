export const bankProfiles = [
  {id:'income',label:'Income oriented',equity:20,bonds:80},
  {id:'conservative',label:'Conservative',equity:40,bonds:60},
  {id:'balanced',label:'Balanced',equity:60,bonds:40},
  {id:'growth',label:'Growth',equity:80,bonds:20},
  {id:'equity',label:'Equity oriented',equity:100,bonds:0},
];
export const bankIds=['rbc','td','bmo','scotia','cibc'];
export const bankPeriods=[1,3,5,10];
export function bankSelection(value={}) {
  const profile=bankProfiles.find(p=>p.id===value.bankProfile)||bankProfiles[2];
  const supplied=value.bankMix!=null;
  const input=Array.isArray(value.bankMix)&&value.bankMix.length===3?{equity:value.bankMix[0],bonds:value.bankMix[1],cash:value.bankMix[2]}:null;
  return {
    bankProfile:profile.id,
    bankId:bankIds.includes(value.bankId)?value.bankId:'rbc',
    bankPeriod:bankPeriods.includes(Number(value.bankPeriod))?Number(value.bankPeriod):5,
    bankMix:validWeights(input)?[input.equity,input.bonds,input.cash]:[profile.equity,profile.bonds,0],
    bankInputIssue:value.bankInputIssue===true || supplied&&!validWeights(input),
  };
}
export function validWeights(weights) {
  return ['equity','bonds','cash'].every(k=>Number.isFinite(weights?.[k])&&weights[k]>=0&&weights[k]<=100)
    && Math.abs(weights.equity+weights.bonds+weights.cash-100)<1e-8;
}
// Buy-and-hold terminal wealth: weighted component growth factors, not a
// weighted average of CAGRs. No invented intervening path or rebalancing.
export function illustrateMix(weights, years, reference) {
  if(!validWeights(weights)||!bankPeriods.includes(years))return null;
  let growth=0;
  for(const key of ['equity','bonds','cash']) {
    if(weights[key]===0)continue;
    const rate=reference?.[key]?.returns?.[years];
    if(!Number.isFinite(rate)||rate<=-100)return null;
    growth+=weights[key]/100*Math.pow(1+rate/100,years);
  }
  return {annualized:(Math.pow(growth,1/years)-1)*100,cumulative:(growth-1)*100,endingValue:10000*growth};
}
export function calendarCAGR(annual,years,end=2025) {
  if(!bankPeriods.includes(years))return null;
  let growth=1;
  for(let year=end-years+1;year<=end;year++) {
    const rate=annual?.[year];
    if(!Number.isFinite(rate)||rate<=-100)return null;
    growth*=1+rate/100;
  }
  return (Math.pow(growth,1/years)-1)*100;
}
export function portfolioReturn(row,years) {
  const direct=row?.returns?.[years];
  return Number.isFinite(direct)?{value:direct,derived:false}:
    Number.isFinite(calendarCAGR(row?.calendar,years,Number(row?.asOf?.slice(0,4))||2025))?{value:calendarCAGR(row.calendar,years,Number(row?.asOf?.slice(0,4))||2025),derived:true}:null;
}
export function compoundCash(observations,start,end) {
  const a=Date.parse(start),b=Date.parse(end);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return null;
  const rows=observations.filter(r=>Number.isFinite(r.rate)&&r.rate>-100&&Date.parse(r.date)<b).sort((x,y)=>x.date.localeCompare(y.date));
  if(!rows.length||Date.parse(rows[0].date)>a)return null;
  let growth=1,covered=0;
  for(let i=0;i<rows.length;i++) {
    const left=Math.max(a,Date.parse(rows[i].date)),right=Math.min(b,i+1<rows.length?Date.parse(rows[i+1].date):b);
    if(right<=left)continue;
    // ACT/365, simple accrual over non-business-day spans, then compounded.
    const days=(right-left)/86400000;
    if(days>7)return null;
    growth*=1+rows[i].rate/100*days/365;covered+=right-left;
  }
  return covered===b-a?{growth,days:(b-a)/86400000}:null;
}
