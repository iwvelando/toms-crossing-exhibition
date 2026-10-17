import {readFile,writeFile,mkdir,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareInstall,applyInstall} from './install-collection.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const signature=Buffer.from('89504e470d0a1a0a','hex');
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
// Preserve compressed pixels and standard color interpretation. Strip ancillary
// provenance; reject profiles requiring color conversion instead of silently changing color.
export function sanitizePng(bytes){
  if(!bytes.subarray(0,8).equals(signature))throw Error('Supply a PNG image.');
  const keep=new Set(['IHDR','PLTE','IDAT','IEND','tRNS','sRGB','gAMA','cHRM']);
  const chunks=[signature],removed=[];let cursor=8,header=false,data=false;
  while(cursor+12<=bytes.length){
    const length=bytes.readUInt32BE(cursor),end=cursor+12+length;
    if(end>bytes.length)throw Error('Truncated PNG.');
    const kind=bytes.toString('ascii',cursor+4,cursor+8);
    if(crc32(bytes.subarray(cursor+4,end-4))!==bytes.readUInt32BE(end-4))throw Error('PNG chunk checksum mismatch.');
    if(!header && kind!=='IHDR')throw Error('PNG header is missing.');
    if(kind==='IHDR'){
      if(header || length!==13 || !bytes.readUInt32BE(cursor+8) || !bytes.readUInt32BE(cursor+12))throw Error('Invalid PNG header.');
      header=true;
    }
    if(kind==='iCCP')throw Error('Convert this color-profile image to an sRGB PNG before replacing artwork.');
    if(['acTL','fcTL','fdAT'].includes(kind))throw Error('Supply a static PNG, not an animation.');
    if(kind==='IDAT')data=true;
    if(keep.has(kind))chunks.push(bytes.subarray(cursor,end));
    else if(kind[0]===kind[0].toUpperCase())throw Error('Unsupported critical PNG chunk.');
    else removed.push(kind);
    cursor=end;
    if(kind==='IEND'){
      if(length || !data || cursor!==bytes.length)throw Error('Invalid PNG ending or trailing data.');
      return {bytes:Buffer.concat(chunks),removed};
    }
  }
  throw Error('Incomplete PNG.');
}
export async function replaceArtwork({workId,image,panel,reference=false,alt,apply=false,destination=join(root,'public/collection')}){
  const catalog=JSON.parse(await readFile(join(destination,'catalog.json'),'utf8'));
  const work=catalog.works.find(work=>work.id===workId);
  if(!work)throw Error('Choose an existing stable work ID from catalog.json.');
  if(panel!==undefined && (!Number.isInteger(panel) || panel<1 || !work.panels || panel>work.panels.length || reference))throw Error('Choose a valid one-based panel number.');
  if(work.panels && panel===undefined)throw Error('Panel groups require --panel N; order is preserved.');
  if(reference!==!!work.object || (!reference && !work.image))throw Error('Object images require --reference; ordinary images do not.');
  if(alt!==undefined && (typeof alt!=='string' || !alt.trim()))throw Error('Alt text cannot be blank.');
  const clean=sanitizePng(await readFile(image));
  const id=panel===undefined?workId:`${workId}-panel-${String(panel).padStart(2,'0')}`;
  const asset=`assets/${id}-${createHash('sha256').update(clean.bytes).digest('hex').slice(0,16)}.png`;
  const previous=panel===undefined?work[reference?'referenceImage':'image']:work.panels[panel-1].image;
  if(panel!==undefined){
    work.panels[panel-1].image=asset;if(alt!==undefined)work.panels[panel-1].alt=alt;
    work.image=work.panels[0].image;
  }else{work[reference?'referenceImage':'image']=asset;if(alt!==undefined)work.alt=alt;}
  const staging=await mkdtemp(join(tmpdir(),'exhibition-replacement-'));
  try{
    await mkdir(join(staging,'assets'));
    const paths=work.panels?work.panels.map(panel=>panel.image):[asset];
    for(const path of new Set(paths)){
      if(!/^assets\/[a-z0-9-]+-[a-f0-9]{16}\.png$/.test(path))throw Error('Invalid existing public asset path.');
      if(path===asset)await writeFile(join(staging,path),clean.bytes);
      else await copyFile(join(destination,path),join(staging,path));
    }
    await writeFile(join(staging,'catalog.json'),JSON.stringify({...catalog,works:[work]}));
    const plan=await prepareInstall(staging,destination);
    if(apply)await applyInstall(plan);
    return {work:workId,panel:panel??null,previous,next:asset,removedMetadata:clean.removed,applied:apply};
  }finally{await rm(staging,{recursive:true,force:true});}
}
async function main(){
  const options={};const args=process.argv.slice(2);
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(key==='--apply')options.apply=true;
    else if(key==='--reference')options.reference=true;
    else if(['--work','--image','--panel','--alt'].includes(key)){
      const value=args[++i];if(value===undefined)throw Error(`Missing value for ${key}`);
      options[key==='--work'?'workId':key.slice(2)]=key==='--panel'?Number(value):value;
    }else throw Error('Usage: node scripts/replace-artwork.mjs --work ID --image PNG [--panel N | --reference] [--alt TEXT] [--apply]');
  }
  if(!options.workId || !options.image)throw Error('Supply --work ID and --image PNG.');
  console.log(JSON.stringify(await replaceArtwork(options),null,2));
  console.log(options.apply?'Installed locally. Run npm run prepare-art, make check, and inspect the work.':'Preview only. No public files changed; add --apply after reviewing the replacement.');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
