import {BRANDS,BRAND_IDS,CHANNELS,SCENARIOS} from './data.js';
export const MAX_BUDGET=Number.MAX_SAFE_INTEGER;
export const finite=(v,fallback=0,min=0,max=1e12)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
export const normalize=values=>{const v=values.map(x=>finite(x)),sum=v.reduce((a,b)=>a+b,0);return sum?v.map(x=>x/sum*100):v.map(()=>100/v.length)};
export function redistribute(values,index,value){const v=normalize(values),target=finite(value,0,0,100),rest=v.reduce((s,n,i)=>s+(i===index?0:n),0);return v.map((n,i)=>i===index?target:rest?n/rest*(100-target):(100-target)/(v.length-1))}
export function parseBudget(text){
 const raw=String(text??'').trim();if(!raw)return null;
 const s=raw.replace(/COP/gi,'').replace(/[$\s]/g,'');if(!s||!/^[\d.,]+$/.test(s))return NaN;
 let value;
 if(s.includes(',')){if((s.match(/,/g)||[]).length!==1)return NaN;const [integer,decimals]=s.split(',');if(!/^\d{1,2}$/.test(decimals)||!(/^[0-9]+$/.test(integer)||/^\d{1,3}(\.\d{3})+$/.test(integer)))return NaN;value=Number(integer.replace(/\./g,'')+'.'+decimals)}
 else if(/^\d+$/.test(s))value=Number(s);else if(/^\d{1,3}(\.\d{3})+$/.test(s))value=Number(s.replace(/\./g,''));else if(/^\d+\.\d{1,2}$/.test(s))value=Number(s);else return NaN;
 return value>=0&&value<=MAX_BUDGET&&Number.isFinite(value)?value:NaN;
}
export function defaults(){return {version:2,contexts:Object.fromEntries(BRAND_IDS.map(id=>[id,{budget:null,days:30,universe:BRANDS[id].universe,scenario:'base',objective:'balanced',mix:[...BRANDS[id].mix],channels:CHANNELS.map(c=>({cpm:c.cpm,cpc:c.cpc,ctr:c.ctr,arrival:c.arrival,frequency:c.frequency}))}])),saved:[]};}
export function sanitizeConfig(input={},base=defaults().contexts.tarrito){
 input=input&&typeof input==='object'?input:{};
 const budget=input.budget===null||input.budget===undefined||input.budget===''?null:(Number.isFinite(Number(input.budget))&&Number(input.budget)>=0&&Number(input.budget)<=MAX_BUDGET?Number(input.budget):null);
 return {budget,days:finite(input.days,base.days,1,3650),universe:finite(input.universe,base.universe,1,1e9),scenario:SCENARIOS[input.scenario]?input.scenario:base.scenario,objective:['balanced','reach','traffic'].includes(input.objective)?input.objective:base.objective,mix:Array.isArray(input.mix)&&input.mix.length===5?normalize(input.mix):[...base.mix],channels:CHANNELS.map((c,i)=>{const v=input.channels?.[i]||base.channels[i];return {cpm:finite(v.cpm,c.cpm,1,1e9),cpc:finite(v.cpc,c.cpc,1,1e8),ctr:finite(v.ctr,c.ctr,.001,100),arrival:finite(v.arrival,c.arrival,0,100),frequency:finite(v.frequency,c.frequency,1,100)}})};
}
export function sanitizeState(raw){const s=defaults();if(raw?.version!==2)return s;for(const id of BRAND_IDS)s.contexts[id]=sanitizeConfig(raw.contexts?.[id],s.contexts[id]);s.saved=Array.isArray(raw.saved)?raw.saved.filter(v=>v&&BRAND_IDS.includes(v.brand)&&v.config?.budget!==null&&v.config?.budget!==undefined).slice(0,18).map(v=>({id:String(v.id||Date.now()+Math.random()),name:String(v.name||'Escenario').slice(0,64),brand:v.brand,created:String(v.created||''),config:sanitizeConfig(v.config,s.contexts[v.brand])})).filter(v=>v.config.budget!==null):[];return s;}
export function projectChannels(config){const c=sanitizeConfig(config),factor=SCENARIOS[c.scenario];return CHANNELS.map((ch,i)=>{const p=c.channels[i],spend=(c.budget??0)*c.mix[i]/100,ctr=Math.min(100,p.ctr*factor.ctr)/100,arrival=Math.min(100,p.arrival*factor.arrival)/100,impressions=ch.buy==='CPC'?spend/(p.cpc*factor.cost)/ctr:spend/(p.cpm*factor.cost)*1000,clicks=impressions*ctr,sessions=clicks*arrival;return {id:ch.id,name:ch.name,color:ch.color,buy:ch.buy,spend,impressions,clicks,sessions,contacts:impressions/p.frequency,cpm:impressions?spend/impressions*1000:0,cpc:clicks?spend/clicks:0,ctr:ctr*100,arrival:arrival*100,frequency:p.frequency}})}
export function project(state,brand,override){
 if(!BRAND_IDS.includes(brand))throw new Error('Choose one brand to project its independent budget.');
 const config=sanitizeConfig(override||state.contexts[brand],defaults().contexts[brand]),rows=projectChannels(config),totals=rows.reduce((sum,r)=>{for(const k of ['spend','impressions','clicks','sessions','contacts'])sum[k]+=r[k];return sum},{spend:0,impressions:0,clicks:0,sessions:0,contacts:0}),U=config.universe,reach=U*-Math.expm1(-totals.contacts/U);
 return {...totals,brand,configured:config.budget!==null,rows,reach,universe:U,coverage:reach/U*100,frequency:reach?totals.impressions/reach:0,ctr:totals.impressions?totals.clicks/totals.impressions*100:0,arrival:totals.clicks?totals.sessions/totals.clicks*100:0,cpc:totals.clicks?totals.spend/totals.clicks:0,cps:totals.sessions?totals.spend/totals.sessions:0,cpm:totals.impressions?totals.spend/totals.impressions*1000:0,perDay:(config.budget??0)/config.days,config};
}
export function applyObjective(config,objective,brand){if(!BRAND_IDS.includes(brand))throw new Error('A brand is required');return {...config,objective,mix:objective==='reach'?[40,25,28,5,2]:objective==='traffic'?[37,18,8,35,2]:[...BRANDS[brand].mix]};}
