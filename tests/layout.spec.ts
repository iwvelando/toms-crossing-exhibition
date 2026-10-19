import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";
import { wallGeometry } from "../src/architecture";
import { imageDimensions, frameMargin, inscriptionLayout, montageLayout } from "../src/display";
import type { Work } from "../src/types";
import { canStand, validateLayout, type Layout } from "../src/layout";
const layout: Layout = JSON.parse(readFileSync(new URL("../public/collection/layout.json", import.meta.url), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("../public/collection/catalog.json", import.meta.url), "utf8"));

test("display identities and viewing clearances remain valid", () => {
  validateLayout(layout, catalog.works.map((w: { id: string }) => w.id).reverse());
  for (const room of layout.rooms) expect(canStand(layout, room.spawn[0], room.spawn[2], true), room.id).toBe(true);
  for (const r of layout.reservations) expect(canStand(layout, r.camera[0], r.camera[2], true), r.id).toBe(true);
  expect(layout.reservations.some(r => r.room === "chamber-5" && r.assetStatus === "ready")).toBe(true);
  expect(canStand(layout, 100,100,true)).toBe(false);
  for (const wall of layout.walls) expect(canStand(layout, (wall.a[0]+wall.b[0])/2, (wall.a[1]+wall.b[1])/2, true)).toBe(false);
});

test("every room and viewing point is reachable on foot with placeholders visible", () => {
  // Flood-fill a half-metre grid using the same collision rules as walking.
  const key = (x: number,z: number) => `${x},${z}`;
  const queue = [[0,6.5]];
  const visited = new Set([key(0,6.5)]);
  const checked = new Set(visited);
  for (let i=0;i<queue.length;i++) {
    const [x,z]=queue[i];
    for (const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]) {
      const nx=x+dx,nz=z+dz,k=key(nx,nz);
      if (checked.has(k)) continue;
      checked.add(k);
      if (canStand(layout,nx,nz,true) && canStand(layout,x+dx/2,z+dz/2,true)) { visited.add(k);queue.push([nx,nz]); }
    }
  }
  for (const r of [...layout.rooms.map(r => ({id:r.id, point:r.spawn})),...layout.reservations.map(r=>({id:r.id,point:r.camera}))])
    expect(queue.some(([x,z])=>Math.hypot(x-r.point[0],z-r.point[2])<.55),r.id).toBe(true);
});


test("installed wall works are visible across their width from their viewing points", () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const walls = layout.walls.map(wall => {
    const geometry = wallGeometry(wall, layout.walls);
    geometry.base.dispose();
    const mesh = new THREE.Mesh(geometry.wall, material);
    mesh.updateMatrixWorld();
    return mesh;
  });
  const blocked: string[] = [];
  try {
    for (const work of catalog.works.filter((work: { image?: string }) => work.image)) {
      const slot = layout.reservations.find(r => r.workId === work.id)!;
      const bytes = readFileSync(new URL(`../public/collection/${work.image}`, import.meta.url));
      const ratio = bytes.readUInt32BE(16) / bytes.readUInt32BE(20);
      const width = work.panels ? 3.7 : work.wallText ? inscriptionLayout(work.wallText,slot.displaySize?.[0]).width : imageDimensions(work, ratio, slot, layout).width;
      const origin = new THREE.Vector3(...slot.camera);
      for (let sample = 0; sample <= 10; sample++) {
        const target = new THREE.Vector3(width * (sample / 10 - .5), 0, .08)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), slot.angle)
          .add(new THREE.Vector3(...slot.position));
        const direction = target.clone().sub(origin);
        const ray = new THREE.Raycaster(origin, direction.clone().normalize(), .01, direction.length() - .01);
        if (ray.intersectObjects(walls, false).length) {
          blocked.push(`${slot.id}: ${work.title}, sample ${sample}`);
          break;
        }
      }
    }
    expect(blocked).toEqual([]);
  } finally {
    walls.forEach(wall => wall.geometry.dispose());
    material.dispose();
  }
});


test("installed images and their frames do not intersect around corners", () => {
  const displays = (catalog.works as Work[]).filter(work => work.image && !work.wallText).map(work => {
    const slot = layout.reservations.find(r => r.workId === work.id)!;
    const bytes = readFileSync(new URL(`../public/collection/${work.image}`, import.meta.url));
    const ratio = bytes.readUInt32BE(16) / bytes.readUInt32BE(20);
    const size = work.panels ? montageLayout(work.panels.length,work.presentation==='variants') : imageDimensions(work,ratio,slot,layout);
    const margin = work.panels ? 0 : frameMargin(work);
    const geometry = new THREE.BoxGeometry(size.width+margin,size.height+margin,margin ? .11 : .002);
    geometry.translate(0,0,margin ? .04 : .08);
    geometry.computeBoundingBox();
    const transform = new THREE.Matrix4().makeRotationY(slot.angle);
    transform.setPosition(...slot.position);
    const box = new OBB().fromBox3(geometry.boundingBox!).applyMatrix4(transform);
    geometry.dispose();
    return {id:work.id,box};
  });
  const overlaps: string[] = [];
  for (let i=0;i<displays.length;i++) for (let j=i+1;j<displays.length;j++) {
    if (displays[i].box.intersectsOBB(displays[j].box))
      overlaps.push(`${displays[i].id} / ${displays[j].id}`);
  }
  expect(overlaps).toEqual([]);
});
