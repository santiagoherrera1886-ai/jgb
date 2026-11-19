import {BRANDS,BRAND_IDS,CHANNELS,SCENARIOS} from './data.js';

export const finite = (value,fallback=0,min=0,max=1e12) => Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback;
export const normalize = values => { const safe=values.map(v=>finite(v));const total=safe.reduce((a,b)=>a+b,0);return total>0?safe.map(v=>v/total*100):safe.map(()=>100/safe.length); };
export function redistribute(values,index,value) {
  const next=normalize(values), target=finite(value,0,0,100), rest=next.reduce((s,v,i)=>s+(i===index?0:v),0);
  return next.map((v,i)=>i===index?target:rest>0?v/rest*(100-target):(100-target)/(next.length-1));
}
export function defaults() {
  const contexts={};
  for(const id of ['all',...BRAND_IDS])contexts[id]={budget:40000000,days:30,universe:BRANDS[id].universe,scenario:'base',objective:'balanced',shares:[50,25,25],mix:id==='all'?[40,22,18,17,3]:[...BRANDS[id].mix],channels:CHANNELS.map(c=>({cpm:c.cpm,cpc:c.cpc,ctr:c.ctr,arrival:c.arrival,frequency:c.frequency}))};
  return {version:1,contexts,saved:[]};
}
export function sanitizeConfig(input={},base=defaults().contexts.all) {
  return {...base,budget:finite(input.budget,base.budget),days:finite(input.days,base.days,1,3650),universe:finite(input.universe,base.universe,1,1e9),scenario:SCENARIOS[input.scenario]?input.scenario:base.scenario,objective:['balanced','reach','traffic'].includes(input.objective)?input.objective:base.objective,shares:Array.isArray(input.shares)&&input.shares.length===3?normalize(input.shares):[...base.shares],mix:Array.isArray(input.mix)&&input.mix.length===5?normalize(input.mix):[...base.mix],channels:CHANNELS.map((c,i)=>{const v=input.channels?.[i]||base.channels[i];return {cpm:finite(v.cpm,c.cpm,1,1e9),cpc:finite(v.cpc,c.cpc,1,1e8),ctr:finite(v.ctr,c.ctr,0.001,100),arrival:finite(v.arrival,c.arrival,0,100),frequency:finite(v.frequency,c.frequency,1,100)}})};
}
export function sanitizeState(raw) {
  const s=defaults();if(raw?.version!==1)return s;
  for(const id of ['all',...BRAND_IDS])s.contexts[id]=sanitizeConfig(raw.contexts?.[id],s.contexts[id]);
  s.saved=Array.isArray(raw.saved)?raw.saved.slice(0,6).filter(v=>['all',...BRAND_IDS].includes(v.brand)).map(v=>({name:String(v.name||'Escenario').slice(0,64),brand:v.brand,created:String(v.created||''),config:sanitizeConfig(v.config,s.contexts[v.brand]),universes:Object.fromEntries(BRAND_IDS.map(id=>[id,finite(v.universes?.[id],s.contexts[id].universe,1,1e9)]))})):[];
  return s;
}
export function projectChannels(config,budget=config.budget) {
  const c=sanitizeConfig(config), factor=SCENARIOS[c.scenario];
  return CHANNELS.map((channel,i)=>{
    const param=c.channels[i],spend=budget*c.mix[i]/100,ctr=Math.min(100,param.ctr*factor.ctr)/100,arrival=Math.min(100,param.arrival*factor.arrival)/100;
    const impressions=channel.buy==='CPC'?spend/(param.cpc*factor.cost)/ctr:spend/(param.cpm*factor.cost)*1000;
    const clicks=impressions*ctr,sessions=clicks*arrival;
    return {id:channel.id,name:channel.name,color:channel.color,buy:channel.buy,spend,impressions,clicks,sessions,contacts:impressions/param.frequency,cpm:impressions?spend/impressions*1000:0,cpc:clicks?spend/clicks:0,ctr:ctr*100,arrival:arrival*100,frequency:param.frequency};
  });
}
function sumChannels(rows){return rows.reduce((a,r)=>{for(const k of ['spend','impressions','clicks','sessions','contacts'])a[k]+=r[k];return a},{spend:0,impressions:0,clicks:0,sessions:0,contacts:0});}
export function project(state,brand='all',override) {
  const config=sanitizeConfig(override||state.contexts[brand],defaults().contexts[brand]), rows=projectChannels(config),totals=sumChannels(rows),U=config.universe;
  let brands=[],reach;
  if(brand==='all') {
    brands=BRAND_IDS.map((id,i)=>{
      const universe=Math.min(U,finite(state.contexts[id]?.universe,BRANDS[id].universe,1,1e9)),spend=config.budget*config.shares[i]/100,rr=projectChannels(config,spend),t=sumChannels(rr);
      const r=universe*-Math.expm1(-t.contacts/universe);
      return {id,universe,reach:r,coverage:r/universe*100,...t};
    });
    // Independent placement of each brand's modeled reached population within the shared universe.
    reach=U*(1-brands.reduce((product,b)=>product*(1-b.reach/U),1));
  } else reach=U*-Math.expm1(-totals.contacts/U);
  return {...totals,rows,brands,reach,universe:U,coverage:reach/U*100,frequency:reach?totals.impressions/reach:0,ctr:totals.impressions?totals.clicks/totals.impressions*100:0,arrival:totals.clicks?totals.sessions/totals.clicks*100:0,cpc:totals.clicks?totals.spend/totals.clicks:0,cps:totals.sessions?totals.spend/totals.sessions:0,cpm:totals.impressions?totals.spend/totals.impressions*1000:0,perDay:config.budget/config.days,config};
}
export function applyObjective(config,objective,brand='all') {
  const balanced=brand==='all'?[40,22,18,17,3]:BRANDS[brand].mix;
  return {...config,objective,mix:objective==='reach'?[40,25,28,5,2]:objective==='traffic'?[37,18,8,35,2]:[...balanced]};
}
export function comparisonState(state,saved){const copy=structuredClone(state);for(const id of BRAND_IDS)copy.contexts[id].universe=saved.universes[id];return copy;}
