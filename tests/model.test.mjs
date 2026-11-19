import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,project,redistribute,sanitizeState,applyObjective,comparisonState} from '../public/model.js';
import {BRAND_IDS,PROFILES} from '../public/data.js';
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
test('zero budget produces no reach, delivery, traffic or cost',()=>{
 const s=defaults();for(const id of ['all',...BRAND_IDS]){s.contexts[id].budget=0;const p=project(s,id);for(const key of ['reach','impressions','clicks','sessions','frequency','cpc','cps','coverage'])assert.equal(p[key],0,key)}
});
test('CPM and Search CPC use separate, correct buying equations',()=>{
 const s=defaults();s.contexts.pads.mix=[100,0,0,0,0];s.contexts.pads.budget=850000;const p=project(s,'pads');close(p.impressions,100000);close(p.clicks,1200);close(p.sessions,936);
 s.contexts.pads.mix=[0,0,0,100,0];s.contexts.pads.budget=1600000;const q=project(s,'pads');close(q.clicks,1000);close(q.sessions,880);close(q.impressions,1000/.045);
});
test('zero-funded channels contribute no projected volume',()=>{const s=defaults();s.contexts.all.mix=[100,0,0,0,0];const r=project(s);for(const row of r.rows.slice(1))for(const key of ['spend','impressions','clicks','sessions'])assert.equal(row[key],0)});
test('budget growth increases reach and traffic, while reach never exceeds universe',()=>{
 const s=defaults();for(const id of ['all',...BRAND_IDS]){let prev=0;for(const budget of [0,1e6,40e6,200e6,1e12]){const r=project(s,id,{...s.contexts[id],budget});assert.ok(r.reach>=prev-1e-5);assert.ok(r.reach<=r.universe+1e-5);assert.ok(r.coverage<=100+1e-8);assert.ok(r.clicks<=r.impressions);assert.ok(r.sessions<=r.clicks);prev=r.reach}}
});
test('portfolio reach reconciles brand duplication under the documented formula',()=>{
 const s=defaults(),p=project(s);close(p.brands.reduce((a,b)=>a+b.spend,0),p.spend);close(p.brands.reduce((a,b)=>a+b.sessions,0),p.sessions);assert.ok(p.reach>=Math.max(...p.brands.map(b=>b.reach))-1e-5);assert.ok(p.reach<p.brands.reduce((a,b)=>a+b.reach,0));close(p.reach,p.universe*(1-p.brands.reduce((a,b)=>a*(1-b.reach/p.universe),1)));
 s.contexts.all.shares=[100,0,0];const q=project(s);close(q.reach,q.brands[0].reach);assert.equal(q.brands[1].reach,0);
});
test('portfolio universe constrains individual effective brand universes',()=>{const s=defaults();s.contexts.all.universe=100;const p=project(s);for(const b of p.brands){assert.equal(b.universe,100);assert.ok(b.reach<=100)}assert.ok(p.reach<=100)});
test('allocation edits preserve 100%, including transitions from 100% to 0%',()=>{
 let values=[100,0,0,0,0];for(let i=0;i<100;i++){values=redistribute(values,i%5,(i*17)%101);close(values.reduce((a,b)=>a+b),100);assert.ok(values.every(v=>v>=0&&v<=100))}const v=redistribute([100,0,0],0,0);assert.deepEqual(v,[0,50,50]);
});
test('reported rates are volume weighted and cost denominators reconcile',()=>{
 const p=project(defaults());close(p.ctr,p.clicks/p.impressions*100);close(p.arrival,p.sessions/p.clicks*100);close(p.cps,p.spend/p.sessions);close(p.cpc,p.spend/p.clicks);close(p.frequency,p.impressions/p.reach);
});
test('duration affects daily pace, not total delivery at the same budget',()=>{const s=defaults(),a=project(s);s.contexts.all.days=60;const b=project(s);close(a.reach,b.reach);close(a.sessions,b.sessions);close(a.perDay/2,b.perDay)});
test('efficiency assumptions order results and cap rates at 100%',()=>{
 const s=defaults();const results=['prudent','base','optimistic'].map(scenario=>project(s,'all',{...s.contexts.all,scenario}));assert.ok(results[0].sessions<results[1].sessions&&results[1].sessions<results[2].sessions);s.contexts.all.channels.forEach(c=>{c.ctr=100;c.arrival=100});s.contexts.all.scenario='optimistic';const p=project(s);for(const r of p.rows){close(r.ctr,100);close(r.arrival,100);close(r.sessions,r.clicks)}
});
test('invalid stored state is bounded and unknown schemas reset',()=>{assert.deepEqual(sanitizeState({version:19}),defaults());const s=defaults();s.contexts.all.budget=-4;s.contexts.all.channels[0].cpm=0;s.contexts.all.channels[0].ctr=Infinity;s.contexts.all.days=0;s.contexts.all.universe=0;const clean=sanitizeState(s),r=project(clean);assert.equal(r.spend,0);assert.ok(clean.contexts.all.days>=1&&r.universe>=1);assert.ok(Object.values(r).filter(v=>typeof v==='number').every(Number.isFinite));});
test('saved portfolio keeps its universes independently from later edits',()=>{const s=defaults(),snapshot={brand:'all',config:structuredClone(s.contexts.all),universes:Object.fromEntries(BRAND_IDS.map(id=>[id,s.contexts[id].universe]))},before=project(s);s.contexts.pads.universe=100;const recovered=project(comparisonState(s,snapshot),'all',snapshot.config);close(recovered.reach,before.reach);});
test('each brand has four usable profiles and creative priorities total 100%',()=>{for(const id of BRAND_IDS){const list=PROFILES.filter(p=>p.brand===id);assert.equal(list.length,4);assert.equal(list.reduce((a,b)=>a+b.weight,0),100);for(const p of list){assert.ok(p.interests.length>=6);assert.ok(p.keywords.length>=3);assert.ok(p.activation&&p.exclude&&p.kpi)}}});
test('objective presets preserve context and allocate the full budget',()=>{const s=defaults();for(const id of ['all',...BRAND_IDS])for(const objective of ['balanced','reach','traffic']){const c=applyObjective(s.contexts[id],objective,id);close(c.mix.reduce((a,b)=>a+b),100);assert.equal(c.budget,40e6)}});
