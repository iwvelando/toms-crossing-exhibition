import { chromium } from '@playwright/test';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Public originals remain untouched. Derived display textures carry no source prose.
const root=new URL('../public/collection/',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
const paths=[...new Set(catalog.works.flatMap(w=>w.panels?w.panels.map(p=>p.image):[w.image??w.referenceImage]).filter(Boolean))];
await mkdir(new URL('previews/',root),{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage();const index={};let total=0;
try{
 for(const path of paths){
  const original=await readFile(new URL(path,root));
  const result=await page.evaluate(async data=>{
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
   const scale=Math.min(1,768/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   return {data:canvas.toDataURL('image/webp',.85).split(',')[1],width:canvas.width,height:canvas.height};
  },original.toString('base64'));
  const data=Buffer.from(result.data,'base64');const hash=createHash('sha256').update(data).digest('hex').slice(0,16);
  const image=`previews/${hash}.webp`;await writeFile(new URL(image,root),data);index[path]={image,width:result.width,height:result.height};total+=data.length;
 }
 await writeFile(new URL('scene-assets.json',root),JSON.stringify(index,null,2)+'\n');
 console.log(`${paths.length} display previews; ${(total/1048576).toFixed(1)} MiB. Original PNGs unchanged.`);
}finally{await browser.close();}
