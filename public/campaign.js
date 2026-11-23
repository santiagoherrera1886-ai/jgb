import {BRANDS, BRAND_IDS, CHANNELS} from './data.js';
import {defaults, sanitizeState, normalize, project, finite} from './model.js';

export const PERIODS = {jan:{name:'Enero 2027',short:'Enero',days:31},feb:{name:'Febrero 2027',short:'Febrero',days:28}};
// Values transcribed from the client's email. Investment was expressed in COP millions.
// The monthly values are authoritative for this draft; discrepancies remain visible.
export const BRIEF = {
  tarrito:{cpm:[942,1057,1565],frequency:[6,10],reportedTotal:150786000,reportedUnits:1181473,
    jan:{budget:78203000,units:666202,rotation:10,mix:[45,20,35,0,0],message:'Bienestar que acompaña el regreso a la rutina familiar.',reason:'YouTube desarrolla la historia de marca; Meta conecta con rutinas familiares y visitas; TikTok prueba momentos cotidianos. Se prioriza cobertura con una presión mensual de 6–10 impactos como hipótesis de trabajo.'},
    feb:{budget:72583000,units:515271,rotation:8,mix:[50,20,30,0,0],message:'Sostener los pequeños hábitos de bienestar en familia.',reason:'Con menor inversión y meta de rotación que enero, Meta gana cinco puntos del mix. Se mantiene video para recordación y se renuevan mensajes para sostener el interés sin repetir una única pieza.'}},
  cuidaderm:{cpm:[913,807,1268],frequency:[4,8],reportedTotal:51060000,reportedUnits:31249,
    jan:{budget:26481000,units:17621,rotation:10,mix:[45,25,30,0,0],message:'Cuidado práctico en momentos reales: ejercicio, afeitado y depilación.',reason:'YouTube explica el producto y sus usos; Meta combina demostración y visitas; TikTok explora demostraciones nativas. La presión mensual de 4–8 impactos es una hipótesis para validar con las primeras entregas.'},
    feb:{budget:24600000,units:13629,rotation:8,mix:[50,25,25,0,0],message:'Un cuidado que puedes integrar a tu día.',reason:'Se mueve cinco puntos de YouTube a Meta para reforzar visitas y consideración con los aprendizajes de enero. TikTok conserva su peso para contrastar usos y ganchos creativos.'}},
  pads:{cpm:[859,1801,1950],frequency:[3,6],reportedTotal:21389000,reportedUnits:118080,
    jan:{budget:7916000,units:48827,rotation:6,mix:[55,30,15,0,0],message:'Un básico suave para comenzar y cerrar tu rutina facial.',reason:'Meta concentra la inversión inicial por su CPM informado y la afinidad con rutinas. TikTok trabaja demostraciones; YouTube aporta una presencia acotada. Presión mensual propuesta: 3–6 impactos, sujeta a validación.'},
    feb:{budget:13473000,units:69253,rotation:8,mix:[50,35,15,0,0],message:'Tu momento de cuidado, todos los días.',reason:'La mayor inversión acompaña el aumento de la meta de rotación. TikTok gana cinco puntos para ampliar pruebas de contenido; no se asume que sea el medio más barato. Meta mantiene la mitad de la inversión.'}}
};
export const SOURCES = [
  ['Formatos de video de Google Ads','https://support.google.com/google-ads/answer/2375464?hl=en'],
  ['Alcance y frecuencia de Google Ads','https://support.google.com/google-ads/answer/2472714?hl=en_sg'],
  ['TikTok: In-Feed y zonas seguras','https://ads.tiktok.com/resources/help/article/tiktok-auction-in-feed-ads']
];

export function cleanControls(raw={}) {
  const nullable=(v,max)=>v===null||v===undefined||v===''?null:finite(v,0,0,max);
  return {cvr:nullable(raw.cvr,100),unitsPerOrder:finite(raw.unitsPerOrder,1,1,1000),overlap:nullable(raw.overlap,100)};
}
export function campaignDefaults() {
  const result={version:1,months:{},controls:{}};
  for(const p of Object.keys(PERIODS)){
    result.months[p]=defaults(); result.controls[p]={};
    for(const b of BRAND_IDS){
      const brief=BRIEF[b][p],c=result.months[p].contexts[b];
      Object.assign(c,{budget:brief.budget,days:PERIODS[p].days,mix:[...brief.mix]});
      c.channels.slice(0,3).forEach((ch,i)=>{ch.cpm=BRIEF[b].cpm[i];ch.frequency=[3.5,2.8,3][i]});
      result.controls[p][b]={cvr:1,unitsPerOrder:1,overlap:null};
    }
  }
  return result;
}
export function sanitizeCampaign(raw){
  const result=campaignDefaults(); if(raw?.version!==1)return result;
  for(const p of Object.keys(PERIODS)){
    if(raw.months?.[p]?.version===2){
      result.months[p]=sanitizeState(raw.months[p]);
      for(const b of BRAND_IDS){
        result.months[p].contexts[b].mix=normalize(result.months[p].contexts[b].mix.slice(0,3)).concat(0,0);
      }
      result.months[p].saved.forEach(s=>{
        s.config.mix=normalize(s.config.mix.slice(0,3)).concat(0,0);
        const previous=raw.months[p].saved?.find(v=>v.id===s.id);
        if(previous?.planning)s.planning=cleanControls(previous.planning);
      });
    }
    for(const b of BRAND_IDS)if(raw.controls?.[p]?.[b])result.controls[p][b]=cleanControls(raw.controls[p][b]);
  }
  return result;
}
export function campaignObjective(config,objective,brand,period){
  const mix=objective==='reach'?[40,20,40,0,0]:objective==='traffic'?[65,25,10,0,0]:BRIEF[brand][period].mix;
  return {...config,objective,mix:[...mix]};
}
export function salesProjection(result,controls,target){
  const c=cleanControls(controls),ready=result.configured&&c.cvr!==null;
  const orders=ready?result.sessions*c.cvr/100:null,units=ready?orders*c.unitsPerOrder:null;
  return {orders,units,coverage:units===null?null:units/target*100,cpa:orders>0?result.spend/orders:null,
    requiredCvr:result.configured&&result.sessions>0?target/(result.sessions*c.unitsPerOrder)*100:null,
    sensitivity:[.5,1,2].map(rate=>({rate,units:result.configured?result.sessions*rate/100*c.unitsPerOrder:null}))};
}
export function overlapStatus(value){return value===null||value===undefined?'pending':value<15?'within':'review'}
export function periodResult(plan,brand,period){return project(plan.months[period],brand)}
export function campaignChannels(result){return result.rows.slice(0,3).map(row=>{const reach=result.universe*-Math.expm1(-row.contacts/result.universe);return {...row,reach,frequency:reach?row.impressions/reach:0}})}
export function discrepancies(brand){
  const b=BRIEF[brand],budget=b.jan.budget+b.feb.budget,units=b.jan.units+b.feb.units;
  return {budget,units,budgetDifference:budget-b.reportedTotal,unitDifference:units-b.reportedUnits};
}
export function materials(brand,period){
  const theme=BRIEF[brand][period].message;
  return [
    {medium:'YouTube',role:'Explicar y construir recordación',format:'In-stream',size:'16:9 · 1920 × 1080',duration:'15–30 s',quantity:1,content:theme,kpi:'Alcance, frecuencia y visualización',timing:'Inicio del mes'},
    {medium:'YouTube',role:'Reforzar una idea',format:'Bumper',size:'16:9 · 1920 × 1080',duration:'6 s',quantity:2,content:'Dos cortes del mensaje principal, cada uno con una sola idea y cierre de marca.',kpi:'Alcance y frecuencia',timing:'Semanas 2 y 3'},
    {medium:'Meta',role:'Afinidad y visitas al destino',format:'Reels / Stories',size:'9:16 · 1080 × 1920',duration:'15–30 s',quantity:3,content:theme+' Tres aperturas distintas, producto visible y CTA al destino acordado.',kpi:'CTR de enlace y sesiones; compras solo si se miden',timing:'Dos al inicio; una renovación en semana 3'},
    {medium:'Meta',role:'Explicar el uso y facilitar la elección',format:'Feed estático',size:'4:5 · 1080 × 1350',duration:'Imagen',quantity:2,content:'Una pieza de uso cotidiano y una de producto / presentación. Destino y disponibilidad por validar.',kpi:'Clics y visitas a la página de destino',timing:'Una al inicio; una en semana 3'},
    {medium:'TikTok',role:'Descubrimiento y demostración',format:'In-Feed; Spark si hay autorización',size:'9:16 · 1080 × 1920',duration:'15–30 s',quantity:3,content:theme+' Tres ganchos nativos con demostración y subtítulos.',kpi:'Retención, CTR de enlace y sesiones',timing:'Dos al inicio; una renovación en semana 3'}
  ];
}
