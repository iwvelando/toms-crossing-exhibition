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

 test("object references keep the model, slot and explicit framing semantics",async t=>{
  const f=await fixture(t);
  const catalog=JSON.parse(await readFile(join(f.bundle,"catalog.json"),"utf8"));
  const w=catalog.works[0]; w.object="syrup-glass"; w.referenceImage=w.image; delete w.image;
  f.layout.reservations[0].kind="object";
  await writeFile(join(f.dest,"layout.json"),JSON.stringify(f.layout));
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  const plan=await prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"});
  assert.equal(plan.catalog.works[0].object,"syrup-glass");
  assert.equal(plan.catalog.works[0].referenceImage,f.work.image);
  assert.equal(plan.catalog.works[0].image,undefined);
  await applyInstall(plan);
  assert.deepEqual(await readFile(join(f.dest,f.work.image)),png);
  w.image=w.referenceImage;
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  await assert.rejects(prepareInstall(f.bundle,f.dest),/asset combination/);
  delete w.image;delete w.object;
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  await assert.rejects(prepareInstall(f.bundle,f.dest),/asset combination/);
 });
 test("frame styles are validated rather than inferred from a work ID",async t=>{
  const f=await fixture(t);
  const catalog=JSON.parse(await readFile(join(f.bundle,"catalog.json"),"utf8"));
  catalog.works[0].frame="walnut";
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  assert.equal((await prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"})).catalog.works[0].frame,"walnut");
  catalog.works[0].frame="unknown";
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/Unsupported frame/);
 });

 test("ordered montages verify every panel and reject reordered files and private panel fields",async t=>{
  const f=await fixture(t);
  const catalog=JSON.parse(await readFile(join(f.bundle,"catalog.json"),"utf8"));
  const w=catalog.works[0];const hash=createHash("sha256").update(png).digest("hex").slice(0,16);
  w.panels=[1,2].map(n=>({title:`Part ${n}`,alt:`Geometric study ${n}`,image:`assets/new-work-panel-0${n}-${hash}.png`}));
  w.image=w.panels[0].image;
  for(const panel of w.panels) await writeFile(join(f.bundle,panel.image),png);
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  const plan=await prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"});
  assert.equal(plan.assets.length,2);assert.equal(plan.catalog.works[0].panels[1].title,"Part 2");
  w.panels.reverse();w.image=w.panels[0].image;
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/asset path/);
  w.panels.reverse();w.image=w.panels[0].image;w.panels[1].prompt="private";
  await writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/public panel fields/);
 });

 test("wall lettering retains its reference and rejects ambiguous display modes",async t=>{
  const f=await fixture(t);
  const catalog=JSON.parse(await readFile(join(f.bundle,"catalog.json"),"utf8"));
  const w=catalog.works[0]; w.wallText="Look closely."; w.frame="none";
  const save=()=>writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));
  await save();
  const plan=await prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"});
  assert.equal(plan.catalog.works[0].wallText,"Look closely.");
  assert.equal(plan.assets.length,1);
  for (const value of ["", " ", 12, "x".repeat(201)]) {
    w.wallText=value;await save();
    await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/wall text/);
  }
  w.wallText="Look closely.";w.frame="gallery";await save();
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/wall text/);
  w.frame="none";w.panels=[];await save();
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/wall text/);
  delete w.panels;delete w.image;await save();
  await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/wall text/);
 });


test("alternate images retain their comparison mode and reject invalid modes",async t=>{
 const f=await fixture(t);const catalog=JSON.parse(await readFile(join(f.bundle,"catalog.json"),"utf8"));
 const w=catalog.works[0],hash=createHash("sha256").update(png).digest("hex").slice(0,16);
 w.panels=[1,2].map(n=>({title:`Version ${n}`,alt:`Study ${n}`,image:`assets/new-work-panel-0${n}-${hash}.png`}));w.image=w.panels[0].image;w.presentation="variants";
 for(const panel of w.panels)await writeFile(join(f.bundle,panel.image),png);
 const save=()=>writeFile(join(f.bundle,"catalog.json"),JSON.stringify(catalog));await save();
 const plan=await prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"});assert.equal(plan.catalog.works[0].presentation,"variants");assert.equal(plan.assets.length,2);
 w.presentation="private-notes";await save();await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/presentation/);
 delete w.presentation;delete w.panels;w.image=catalog.works[0].image;w.object=null;await save();await assert.rejects(prepareInstall(f.bundle,f.dest,{"new-work":"slot-1"}),/visual asset combination/);
});
