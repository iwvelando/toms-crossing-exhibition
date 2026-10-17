import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const fields=new Set(["id","title","collection","medium","description","attribution","credit","note","alt","placement","image","object","referenceImage","frame","panels","wallText","presentation"]);
const objects=new Set(["syrup-glass", "diorama", "horse-sculpture", "wax-rider", "boxed-gear", "relic-case", "film-screen", "stump-case", "shard-case", "scree-relief", "stone-boxes", "geology", "ropes", "screen-installation", "bronze-figure", "marble-figure", "hologram-figure", "broken-bowl", "scroll-case", "bone-cliffs", "mesh-cloth", "ash-bin", "plastic-bag", "cartridge-cases", "tin-can", "snowball", "revolver-case", "audio-station"]);
const required=["id","title","collection","medium","description","attribution","credit","note","alt"];
const json=async path=>JSON.parse(await readFile(path,"utf8"));
export async function prepareInstall(bundle, destination=join(root,"public/collection"), placements={}) {
  const incoming=await json(join(bundle,"catalog.json"));
  const catalog=await json(join(destination,"catalog.json"));
  const layout=await json(join(destination,"layout.json"));
  if (Object.keys(incoming).some(k=>!["version","title","author","works"].includes(k)) || incoming.version!==1 || !Array.isArray(incoming.works) || incoming.title!==catalog.title || incoming.author!==catalog.author)
    throw new Error("Expected a public export for this collection, with no private metadata.");
  const seen=new Set(), assets=[];
  const changes=[];
  for (const work of incoming.works) {
    if (Object.keys(work).some(k=>!fields.has(k)) || required.some(k=>typeof work[k]!=="string" || !work[k].trim()) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.id) || !["exhibition","interpretation"].includes(work.collection))
      throw new Error("Invalid public work fields.");
    if (seen.has(work.id)) throw new Error(`Duplicate work: ${work.id}`);
    seen.add(work.id);
    if (work.placement && (Object.keys(work.placement).some(k=>!["room","label","note"].includes(k)) || ["room","label","note"].some(k=>typeof work.placement[k]!=="string")))
      throw new Error(`Invalid placement: ${work.id}`);
    if (work.object !== undefined && !objects.has(work.object) || work.image && work.object || work.referenceImage && !work.object || work.frame && work.object) throw new Error(`Unsupported visual asset combination: ${work.id}`);
    if (work.frame !== undefined && !["gallery","none","walnut","aluminum","fence-slats"].includes(work.frame)) throw new Error(`Unsupported frame: ${work.id}`);
    if (work.wallText !== undefined && (typeof work.wallText!=="string" || !work.wallText.trim() || work.wallText.trim().length>200 || !work.image || work.object || work.panels || work.referenceImage || work.frame!=="none"))
      throw new Error(`Invalid wall text display: ${work.id}`);
    if (work.presentation!==undefined && (!["sequence","variants"].includes(work.presentation) || !work.panels)) throw new Error(`Invalid panel presentation: ${work.id}`);
    const panels=work.panels;
    if (panels !== undefined && (!Array.isArray(panels) || panels.length<2 || panels.length>24 || work.object || work.referenceImage || work.image!==panels[0]?.image))
      throw new Error(`Invalid ordered montage: ${work.id}`);
    const images=[];
    if (panels) for (let i=0;i<panels.length;i++) {
      const panel=panels[i];
      if (!panel || Object.keys(panel).some(k=>!["title","alt","image"].includes(k)) || ["title","alt","image"].some(k=>typeof panel[k]!=="string" || !panel[k].trim()))
        throw new Error(`Invalid public panel fields: ${work.id}`);
      images.push({image:panel.image,id:`${work.id}-panel-${String(i+1).padStart(2,"0")}`});
    }
    else if (work.image || work.referenceImage) images.push({image:work.image ?? work.referenceImage,id:work.id});
    else if (!objects.has(work.object)) throw new Error(`Unsupported or missing visual asset: ${work.id}`);
    for (const {image,id} of images) {
      const match=/^assets\/([a-z0-9-]+)-([a-f0-9]{16})\.png$/.exec(image);
      if (!match || match[1]!==id) throw new Error(`Invalid asset path: ${work.id}`);
      const bytes=await readFile(join(bundle,image));
      if (bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a" || createHash("sha256").update(bytes).digest("hex").slice(0,16)!==match[2])
        throw new Error(`Image checksum or PNG signature mismatch: ${work.id}`);
      assets.push({source:join(bundle,image),destination:join(destination,image)});
    }
    const existing=layout.reservations.filter(r=>r.workId===work.id);
    if (existing.length>1) throw new Error(`Duplicate position: ${work.id}`);
    if (placements[work.id] && existing.length && placements[work.id]!==existing[0].id) throw new Error(`Move ${work.id} explicitly in the room plan; an import preserves its position.`);
    const slot=existing[0] ?? layout.reservations.find(r=>r.id===placements[work.id]);
    if (!slot) throw new Error(`Assign ${work.id} with --place ${work.id}=RESERVATION_ID`);
    if (slot.workId && slot.workId!==work.id) throw new Error(`Position already occupied: ${slot.id}`);
    if (work.placement && work.placement.room!==slot.room) throw new Error(`Room mismatch for ${work.id}`);
    if (work.image && slot.kind!=="panel" || work.object && slot.kind!=="object") throw new Error(`Review the display medium for ${work.id}`);
    slot.workId=work.id;slot.assetStatus="ready";
    const i=catalog.works.findIndex(w=>w.id===work.id);
    changes.push({work:work.id,position:slot.id,action:i<0?"add":"refresh"});
    if(i<0) catalog.works.push(work);else catalog.works[i]=work;
  }
  if (Object.keys(placements).some(id=>!seen.has(id))) throw new Error("A placement refers to a work absent from this bundle.");
  return {catalog,layout,assets,changes,destination};
}
export async function applyInstall(plan) {
  // Validate the entire bundle before mutation. Immutable asset names go first;
  // write the expanded layout before the catalog starts referring to new works.
  await mkdir(join(plan.destination,"assets"),{recursive:true});
  for (const a of plan.assets) if(resolve(a.source)!==resolve(a.destination)) await copyFile(a.source,a.destination);
  await writeFile(join(plan.destination,"layout.json"),JSON.stringify(plan.layout,null,2)+"\n");
  await writeFile(join(plan.destination,"catalog.json"),JSON.stringify(plan.catalog,null,2)+"\n");
}
async function main() {
  let bundle,apply=false;const placements={};
  const args=process.argv.slice(2);
  for(let i=0;i<args.length;i++) {
    if(args[i]==="--bundle") bundle=args[++i];
    else if(args[i]==="--apply") apply=true;
    else if(args[i]==="--place") {
      const parts=(args[++i]??"").split("=");
      if(parts.length!==2 || !parts.every(Boolean) || placements[parts[0]]) throw new Error("Use --place work-id=reservation-id once per work.");
      placements[parts[0]]=parts[1];
    } else throw new Error("Usage: node scripts/install-collection.mjs --bundle PATH [--place work-id=reservation-id] [--apply]");
  }
  if(!bundle) throw new Error("Supply --bundle with a reviewed public export directory.");
  const plan=await prepareInstall(resolve(bundle),undefined,placements);
  console.table(plan.changes);
  if(apply) {await applyInstall(plan);console.log("Installed locally. Run make check and inspect the changed works.");}
  else console.log("Preview only; no files changed. Add --apply to install this reviewed bundle locally.");
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(e.message);process.exitCode=1;});
