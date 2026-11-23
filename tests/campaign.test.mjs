import test from 'node:test';
import assert from 'node:assert/strict';
import {BRIEF,campaignDefaults,sanitizeCampaign,periodResult,salesProjection,overlapStatus,discrepancies,campaignObjective,materials,campaignChannels} from '../public/campaign.js';
import {redistribute} from '../public/model.js';

test('monthly source budgets, rotation and brand-specific CPMs are transcribed in full COP',()=>{
  const p=campaignDefaults();
  assert.equal(p.months.jan.contexts.tarrito.budget,78203000);
  assert.equal(p.months.feb.contexts.tarrito.budget,72583000);
  assert.equal(p.months.jan.contexts.pads.budget,7916000);
  assert.equal(p.months.feb.contexts.pads.budget,13473000);
  assert.equal(p.months.jan.contexts.cuidaderm.budget,26481000);
  assert.equal(p.months.feb.contexts.cuidaderm.budget,24600000);
  assert.deepEqual(p.months.jan.contexts.tarrito.channels.slice(0,3).map(x=>x.cpm),[942,1057,1565]);
  assert.deepEqual(p.months.feb.contexts.pads.channels.slice(0,3).map(x=>x.cpm),[859,1801,1950]);
  assert.deepEqual(p.months.jan.contexts.cuidaderm.channels.slice(0,3).map(x=>x.cpm),[913,807,1268]);
  assert.deepEqual(discrepancies('cuidaderm'),{budget:51081000,units:31250,budgetDifference:21000,unitDifference:1});
});
test('month, brand and free model parameters are independent; a deliberately blank budget remains blank after reload',()=>{
  const p=campaignDefaults();p.months.jan.contexts.tarrito.budget=null;p.months.jan.contexts.tarrito.channels[0].cpm=2000;
  p.controls.jan.tarrito.cvr=3;p.controls.jan.tarrito.overlap=15;
  const loaded=sanitizeCampaign(JSON.parse(JSON.stringify(p)));
  assert.equal(loaded.months.jan.contexts.tarrito.budget,null);
  assert.equal(loaded.months.feb.contexts.tarrito.budget,72583000);
  assert.equal(loaded.months.feb.contexts.tarrito.channels[0].cpm,942);
  assert.equal(loaded.controls.feb.tarrito.cvr,1);
  assert.equal(loaded.controls.jan.pads.cvr,1);
  assert.equal(loaded.controls.jan.tarrito.overlap,15);
});
test('CPM delivery reconciles by channel and the monthly model never funds unbriefed Search or Display',()=>{
  const p=campaignDefaults(),r=periodResult(p,'tarrito','jan');
  assert.ok(Math.abs(r.rows[0].impressions-(78203000*.45/942*1000))<.0001);
  assert.equal(r.rows[3].spend,0);assert.equal(r.rows[4].spend,0);
  const channels=campaignChannels(r);
  assert.equal(channels.length,3);
  assert.ok(channels.every(row=>row.reach<=r.universe&&row.reach<=r.reach));
  assert.ok(channels.reduce((s,row)=>s+row.reach,0)>r.reach);
  assert.ok(channels.every(row=>Math.abs(row.frequency*row.reach-row.impressions)<.0001));
  for(const objective of ['balanced','reach','traffic']){
    const c=campaignObjective(r.config,objective,'tarrito','jan');
    assert.equal(c.mix.reduce((a,b)=>a+b),100);assert.deepEqual(c.mix.slice(3),[0,0]);assert.equal(c.budget,78203000);
  }
  const one=redistribute([100,0,0],0,50).concat(0,0);assert.deepEqual(one,[50,25,25,0,0]);
});
test('sales is a separate session conversion hypothesis, never the rotation share',()=>{
  const r={configured:true,sessions:10000,spend:1000000};
  const s=salesProjection(r,{cvr:2,unitsPerOrder:3},50000);
  assert.equal(s.orders,200);assert.equal(s.units,600);assert.equal(s.coverage,1.2);assert.equal(s.cpa,5000);
  assert.ok(Math.abs(s.requiredCvr-166.6666666667)<1e-8);
  assert.equal(salesProjection(r,{cvr:null,unitsPerOrder:1},50000).orders,null);
  assert.equal(salesProjection(r,{cvr:0,unitsPerOrder:1},50000).orders,0);
  assert.equal(salesProjection({...r,configured:false},{cvr:1,unitsPerOrder:1},50000).orders,null);
});
test('overlap is not assumed measured and 15 percent exactly fails the strict limit',()=>{
  assert.equal(overlapStatus(null),'pending');assert.equal(overlapStatus(0),'within');
  assert.equal(overlapStatus(14.99),'within');assert.equal(overlapStatus(15),'review');assert.equal(overlapStatus(100),'review');
});
test('saved monthly scenarios retain conversion and overlap assumptions on reload',()=>{
  const p=campaignDefaults();p.months.jan.saved.push({id:'test',name:'Mes',brand:'pads',created:'2026-11-23',config:structuredClone(p.months.jan.contexts.pads),planning:{cvr:2,unitsPerOrder:2,overlap:null}});
  const loaded=sanitizeCampaign(p);assert.deepEqual(loaded.months.jan.saved[0].planning,{cvr:2,unitsPerOrder:2,overlap:null});
  assert.equal(loaded.months.feb.saved.length,0);
});
test('each monthly material proposal reconciles its final versions and contains the brand message',()=>{
  for(const b of Object.keys(BRIEF))for(const p of ['jan','feb']){
    const rows=materials(b,p);assert.equal(rows.reduce((s,r)=>s+r.quantity,0),11);
    assert.ok(rows.some(r=>r.content.includes(BRIEF[b][p].message)));
    assert.ok(rows.every(r=>r.role&&r.format&&r.size&&r.duration&&r.kpi&&r.timing));
  }
});
