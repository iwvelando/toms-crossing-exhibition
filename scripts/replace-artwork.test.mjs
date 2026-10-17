import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {replaceArtwork,sanitizePng} from './replace-artwork.mjs';
function chunk(type,data=Buffer.alloc(0)){
  const body=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
}
function png(value=0,metadata=[]){
  const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),...metadata,chunk('IDAT',deflateSync(Buffer.from([0,value,100,150,255]))),chunk('IEND')]);
}
const asset=(id,bytes)=>`assets/${id}-${createHash('sha256').update(bytes).digest('hex').slice(0,16)}.png`;
async function fixture(t,mode='image'){
  const dir=await mkdtemp(join(tmpdir(),'art-replacement-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const destination=join(dir,'collection');await mkdir(join(destination,'assets'),{recursive:true});
  const old=png(),image=asset('study',old);
  const work={id:'study',title:'Study',collection:'interpretation',medium:'Digital study',description:'A geometric study.',attribution:'Curator',credit:'Synthetic fixture',note:'Interpretation',alt:'Blue square',image,frame:'none',placement:{room:'room-1',label:'Room',note:'Candidate'}};
  await writeFile(join(destination,image),old);
  if(mode==='panels'){
    work.panels=[1,2].map(n=>({title:`Part ${n}`,alt:`Square ${n}`,image:asset(`study-panel-0${n}`,old)}));work.image=work.panels[0].image;work.presentation='variants';
    for(const panel of work.panels)await writeFile(join(destination,panel.image),old);
  }else if(mode==='object'){delete work.image;delete work.frame;work.object='syrup-glass';work.referenceImage=image;}
  const catalog={version:1,title:'Collection',author:'Author',works:[work,{...work,id:'untouched',title:'Unchanged'}]};
  const layout={version:1,reservations:[{id:'slot',room:'room-1',kind:mode==='object'?'object':'panel',workId:'study',assetStatus:'ready',placementStatus:'candidate',position:[1,2,3]}]};
  await writeFile(join(destination,'catalog.json'),JSON.stringify(catalog));await writeFile(join(destination,'layout.json'),JSON.stringify(layout));
  const input=join(dir,'input.png'),bytes=png(255,[chunk('tEXt',Buffer.from('prompt\0private generation text')),chunk('eXIf',Buffer.from('private'))]);await writeFile(input,bytes);
  return {destination,image:input,workId:'study',catalog,layout,bytes};
}
test('PNG sanitation preserves pixel chunks while removing embedded provenance',()=>{
  const clean=png(255),source=png(255,[chunk('tEXt',Buffer.from('prompt\0private')),chunk('iTXt',Buffer.from('private'))]);
  const result=sanitizePng(source);assert.deepEqual(result.bytes,clean);assert.deepEqual(result.removed,['tEXt','iTXt']);
  for(const bad of [Buffer.concat([clean,Buffer.from('hidden')]),clean.subarray(0,-1),png(0,[chunk('iCCP')]),png(0,[chunk('acTL')])])assert.throws(()=>sanitizePng(bad));
  const corrupt=Buffer.from(clean);corrupt[20]^=1;assert.throws(()=>sanitizePng(corrupt),/checksum/);
});
test('replacement dry run writes nothing; apply preserves unrelated works, captions and geometry',async t=>{
  const f=await fixture(t),before=await readFile(join(f.destination,'catalog.json')),files=await readdir(join(f.destination,'assets'));
  const result=await replaceArtwork(f);assert.equal(result.applied,false);assert.deepEqual(await readFile(join(f.destination,'catalog.json')),before);assert.deepEqual(await readdir(join(f.destination,'assets')),files);
  await replaceArtwork({...f,apply:true,alt:'A revised square'});
  const after=JSON.parse(await readFile(join(f.destination,'catalog.json')));
  assert.deepEqual(after.works[0],{...f.catalog.works[0],image:result.next,alt:'A revised square'});assert.deepEqual(after.works[1],f.catalog.works[1]);
  assert.deepEqual(JSON.parse(await readFile(join(f.destination,'layout.json'))),f.layout);
  assert.deepEqual(await readFile(join(f.destination,result.next)),png(255));assert.deepEqual(await readFile(f.image),f.bytes);
  assert.ok((await readdir(join(f.destination,'assets'))).includes(f.catalog.works[0].image.slice(7)));
});
test('panel replacement retains order, cover, presentation and other panels',async t=>{
  const f=await fixture(t,'panels');await assert.rejects(replaceArtwork(f),/require --panel/);
  await replaceArtwork({...f,panel:2,apply:true});
  let work=JSON.parse(await readFile(join(f.destination,'catalog.json'))).works[0];
  assert.equal(work.image,f.catalog.works[0].image);assert.deepEqual(work.panels[0],f.catalog.works[0].panels[0]);assert.equal(work.presentation,'variants');assert.equal(work.panels[1].title,'Part 2');assert.notEqual(work.panels[1].image,f.catalog.works[0].panels[1].image);
  const second=work.panels[1];await replaceArtwork({...f,panel:1,apply:true});work=JSON.parse(await readFile(join(f.destination,'catalog.json'))).works[0];assert.equal(work.image,work.panels[0].image);assert.deepEqual(work.panels[1],second);
});
test('object reference replacement preserves the model and rejects ambiguous targets',async t=>{
  const f=await fixture(t,'object');await assert.rejects(replaceArtwork(f),/require --reference/);
  await replaceArtwork({...f,reference:true,apply:true});const work=JSON.parse(await readFile(join(f.destination,'catalog.json'))).works[0];
  assert.equal(work.object,'syrup-glass');assert.equal(work.image,undefined);assert.notEqual(work.referenceImage,f.catalog.works[0].referenceImage);
  for(const options of [{workId:'missing'},{panel:0},{panel:2},{reference:true,panel:1},{reference:true,alt:' '}])await assert.rejects(replaceArtwork({...f,...options}));
});
