import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve('public');
for(const file of ['index.html','styles.css','app.js','data.js','model.js','campaign.js','campaign-view.js','assets/favicon.svg','assets/tarrito.png','assets/pads.png','assets/cuidaderm.png',...['400','500','600','700','800'].map(w=>`assets/manrope-${w}.ttf`)]) {
  const info=await stat(resolve(root,file));
  if(!info.size)throw new Error(`Empty required asset: ${file}`);
}
for(const file of ['app.js','data.js','model.js','campaign.js','campaign-view.js'])execFileSync(process.execPath,['--check',resolve(root,file)],{stdio:'inherit'});
const html=await readFile(resolve(root,'index.html'),'utf8');
if(!html.includes('lang="es"')||!html.includes('id="main"'))throw new Error('Missing page language or main landmark');
console.log('Static build verified: entry point, ES modules, product images and local fonts.');
