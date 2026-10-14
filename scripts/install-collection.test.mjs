import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { prepareInstall,applyInstall } from "./install-collection.mjs";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=","base64");
async function fixture(t) {
  const dir=await mkdtemp(join(tmpdir(),"exhibition-import-"));t.after(()=>rm(dir,{recursive:true,force:true}));
  const bundle=join(dir,"bundle"),dest=join(dir,"collection");
  await mkdir(join(bundle,"assets"),{recursive:true});await mkdir(dest);
  const image=`assets/new-work-${createHash("sha256").update(png).digest("hex").slice(0,16)}.png`;
  const work={id:"new-work",title:"Study",collection:"interpretation",medium:"Digital image",description:"A geometric study.",attribution:"Curator",credit:"Local fixture",note:"Interpretation",alt:"A small study",image,placement:{room:"room-1",label:"Room",note:"Candidate"}};
  const catalog={version:1,title:"Collection",author:"Author",works:[]};
  const layout={version:1,reservations:[{id:"slot-1",room:"room-1",kind:"panel",assetStatus:"planned",placementStatus:"candidate",position:[1,2,3]},{id:"slot-2",room:"room-1",kind:"panel",assetStatus:"planned",placementStatus:"candidate",position:[4,5,6]}]};
  await writeFile(join(bundle,image),png);
  await writeFile(join(bundle,"catalog.json"),JSON.stringify({...catalog,works:[work]}));
  await writeFile(join(dest,"catalog.json"),JSON.stringify(catalog));await writeFile(join(dest,"layout.json"),JSON.stringify(layout));
  return {bundle,dest,work,layout};
}
test("preview writes nothing; installation fills an explicit slot and preserves geometry and evidence status",async t=>{
  const f=await fixture(t),before=await readFile(join(f.dest,"layout.json"),"utf8");
  const plan=await prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"});
  assert.equal(await readFile(join(f.dest,"layout.json"),"utf8"),before);
  await applyInstall(plan);
  const layout=JSON.parse(await readFile(join(f.dest,"layout.json"),"utf8"));
  assert.equal(layout.reservations[0].workId,"new-work");assert.equal(layout.reservations[0].assetStatus,"ready");
  assert.equal(layout.reservations[0].placementStatus,"candidate");assert.deepEqual(layout.reservations[0].position,[1,2,3]);
  assert.deepEqual(layout.reservations[1],f.layout.reservations[1]);
  assert.deepEqual(await readFile(join(f.dest,f.work.image)),png);
  const again=await prepareInstall(f.bundle,f.dest);assert.equal(again.catalog.works.length,1);
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-2"}),/preserves its position/);
});
test("missing positions, corrupt images, and private export fields fail before writing",async t=>{
  const f=await fixture(t);
  await assert.rejects(prepareInstall(f.bundle,f.dest),/Assign new-work/);
  await writeFile(join(f.bundle,f.work.image),"broken");
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/checksum/);
  await writeFile(join(f.bundle,f.work.image),png);
  const data=JSON.parse(await readFile(join(f.bundle,"catalog.json"),"utf8"));data.works[0].private_note="not public";
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(data));
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/public work fields/);
  assert.equal(JSON.parse(await readFile(join(f.dest,"catalog.json"),"utf8")).works.length,0);
});
