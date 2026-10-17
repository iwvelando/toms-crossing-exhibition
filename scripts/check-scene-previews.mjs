import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../public/collection/',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
const previews=JSON.parse(await readFile(new URL('scene-assets.json',root),'utf8'));
const paths=[...new Set(catalog.works.flatMap(w=>w.panels?w.panels.map(p=>p.image):[w.image??w.referenceImage]).filter(Boolean))];
for(const path of paths){
 const p=previews[path];
 if(!p || !/^previews\/[a-f0-9]{16}\.webp$/.test(p.image) || !Number.isInteger(p.width) || !Number.isInteger(p.height) || Math.min(p.width,p.height)<1 || Math.max(p.width,p.height)>768)throw Error('Missing or invalid display preview; run npm run prepare-art.');
 const bytes=await readFile(new URL(p.image,root));
 if(bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP' || !p.image.includes(createHash('sha256').update(bytes).digest('hex').slice(0,16)))throw Error('Display preview checksum mismatch; run npm run prepare-art.');
}
console.log(`${paths.length} display previews validated.`);
