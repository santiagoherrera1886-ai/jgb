import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,project,redistribute,sanitizeState,applyObjective,parseBudget,MAX_BUDGET} from '../public/model.js';
import {BRAND_IDS,PROFILES} from '../public/data.js';
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const funded=(brand='tarrito',budget=27350000)=>{const s=defaults();s.contexts[brand].budget=budget;return s};
test('every brand starts without a budget and there is no portfolio context',()=>{
 const s=defaults();assert.deepEqual(Object.keys(s.contexts),BRAND_IDS);assert.equal(s.contexts.all,undefined);
 for(const id of BRAND_IDS){assert.equal(s.contexts[id].budget,null);assert.equal(project(s,id).configured,false)}
 assert.throws(()=>project(s,'all'));assert.throws(()=>project(s));
});
test('budget accepts arbitrary full COP amounts with Colombian formatting',()=>{
 for(const [input,expected]of [['27350000',27350000],['27.350.000',27350000],['$ 27.350.000 COP',27350000],['123456789',123456789],['1.234.567,89',1234567.89],['1250,5',1250.5],['42',42],['0',0],['',null],['  ',null]])assert.equal(parseBudget(input),expected,input);
 for(const input of ['-1','abc','4e7','40 millones','1,234,567','12.34.567','12,345','COP',String(MAX_BUDGET+1)])assert.ok(Number.isNaN(parseBudget(input)),input);
});
test('editing a brand budget, universe or mix never changes another brand',()=>{
 const s=defaults();s.contexts.tarrito.budget=27350000;assert.equal(s.contexts.pads.budget,null);assert.equal(s.contexts.cuidaderm.budget,null);
 s.contexts.pads.budget=9100000;const before=project(s,'pads');s.contexts.tarrito.budget=72500000;s.contexts.tarrito.universe=200;s.contexts.tarrito.mix=[0,0,0,100,0];s.contexts.tarrito.channels[0].cpm=12345;
 assert.deepEqual(project(s,'pads'),before);assert.equal(project(s,'cuidaderm').configured,false);
 s.contexts.tarrito=defaults().contexts.tarrito;assert.deepEqual(project(s,'pads'),before);assert.equal(project(s,'tarrito').configured,false);
});
test('zero is an explicit budget and returns zero reach, traffic and costs',()=>{
 const s=defaults();for(const id of BRAND_IDS){s.contexts[id].budget=0;const p=project(s,id);assert.equal(p.configured,true);for(const key of ['reach','impressions','clicks','sessions','frequency','cpc','cps','coverage'])assert.equal(p[key],0,key)}
});
test('CPM and Search CPC use separate, correct buying equations',()=>{
 const s=funded('pads',850000);s.contexts.pads.mix=[100,0,0,0,0];const p=project(s,'pads');close(p.impressions,100000);close(p.clicks,1200);close(p.sessions,936);
 s.contexts.pads.mix=[0,0,0,100,0];s.contexts.pads.budget=1600000;const q=project(s,'pads');close(q.clicks,1000);close(q.sessions,880);close(q.impressions,1000/.045);
});
test('zero-funded channels contribute no projected volume',()=>{const s=funded();s.contexts.tarrito.mix=[100,0,0,0,0];const r=project(s,'tarrito');for(const row of r.rows.slice(1))for(const key of ['spend','impressions','clicks','sessions'])assert.equal(row[key],0)});
test('higher budgets increase reach and traffic without exceeding the universe',()=>{
 const s=defaults();for(const id of BRAND_IDS){let prev=0;for(const budget of [0,1e6,2735e4,200e6,1e12,MAX_BUDGET]){const r=project(s,id,{...s.contexts[id],budget});assert.ok(r.reach>=prev-1e-5);assert.ok(r.reach<=r.universe+1e-5);assert.ok(r.coverage<=100+1e-8);assert.ok(r.clicks<=r.impressions);assert.ok(r.sessions<=r.clicks);assert.ok(Object.values(r).filter(v=>typeof v==='number').every(Number.isFinite));prev=r.reach}}
});
test('media allocation changes preserve 100% and the entered total budget',()=>{
 let values=[100,0,0,0,0];for(let i=0;i<100;i++){values=redistribute(values,i%5,(i*17)%101);close(values.reduce((a,b)=>a+b),100);assert.ok(values.every(v=>v>=0&&v<=100))}
 assert.deepEqual(redistribute([100,0,0],0,0),[0,50,50]);const s=funded();s.contexts.tarrito.mix=values;close(project(s,'tarrito').spend,27350000);
});
test('reported rates and cost denominators reconcile',()=>{
 const p=project(funded(),'tarrito');close(p.ctr,p.clicks/p.impressions*100);close(p.arrival,p.sessions/p.clicks*100);close(p.cps,p.spend/p.sessions);close(p.cpc,p.spend/p.clicks);close(p.frequency,p.impressions/p.reach);
});
test('duration affects daily pace, not total delivery at the same budget',()=>{const s=funded(),a=project(s,'tarrito');s.contexts.tarrito.days=60;const b=project(s,'tarrito');close(a.reach,b.reach);close(a.sessions,b.sessions);close(a.perDay/2,b.perDay)});
test('efficiency assumptions order outcomes and cap rates at 100%',()=>{
 const s=funded();const results=['prudent','base','optimistic'].map(scenario=>project(s,'tarrito',{...s.contexts.tarrito,scenario}));assert.ok(results[0].sessions<results[1].sessions&&results[1].sessions<results[2].sessions);s.contexts.tarrito.channels.forEach(c=>{c.ctr=100;c.arrival=100});s.contexts.tarrito.scenario='optimistic';for(const r of project(s,'tarrito').rows){close(r.ctr,100);close(r.arrival,100);close(r.sessions,r.clicks)}
});
test('old automatic budgets are discarded; v2 preserves only explicit brand budgets',()=>{
 assert.deepEqual(sanitizeState({version:1,contexts:{all:{budget:40000000},tarrito:{budget:40000000}}}),defaults());assert.deepEqual(sanitizeState({version:19}),defaults());
 const s=funded('pads',9100000);s.contexts.tarrito.budget=-4;s.contexts.pads.channels[0].cpm=0;s.contexts.pads.channels[0].ctr=Infinity;s.contexts.pads.days=0;s.contexts.pads.universe=0;
 const clean=sanitizeState(s);assert.equal(clean.contexts.tarrito.budget,null);assert.equal(clean.contexts.pads.budget,9100000);assert.equal(clean.contexts.cuidaderm.budget,null);assert.ok(clean.contexts.pads.days>=1);assert.ok(Object.values(project(clean,'pads')).filter(v=>typeof v==='number').every(Number.isFinite));
});
test('saved scenarios retain independent snapshots and invalid contexts are ignored',()=>{
 const s=funded();s.saved=[{id:'tarrito-test',name:'Mi monto',brand:'tarrito',config:structuredClone(s.contexts.tarrito)},{id:'all',brand:'all',config:{budget:40000000}},{id:'empty',brand:'pads',config:{budget:null}}];
 const before=project(s,'tarrito');s.contexts.tarrito.budget=17;s.contexts.pads.universe=100;const clean=sanitizeState(s);assert.equal(clean.saved.length,1);assert.equal(clean.saved[0].brand,'tarrito');close(project(clean,'tarrito',clean.saved[0].config).reach,before.reach);
});
test('each brand has four complete profiles with creative priorities totaling 100%',()=>{for(const id of BRAND_IDS){const list=PROFILES.filter(p=>p.brand===id);assert.equal(list.length,4);assert.equal(list.reduce((a,b)=>a+b.weight,0),100);for(const p of list){assert.ok(p.interests.length>=6);assert.ok(p.keywords.length>=3);assert.ok(p.activation&&p.exclude&&p.kpi)}}});
test('mix objectives never supply or modify a budget',()=>{for(const id of BRAND_IDS)for(const budget of [null,0,27350000])for(const objective of ['balanced','reach','traffic']){const c=applyObjective({...defaults().contexts[id],budget},objective,id);close(c.mix.reduce((a,b)=>a+b),100);assert.equal(c.budget,budget)}});
