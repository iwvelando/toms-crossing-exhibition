import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { canStand, validateLayout, type Layout } from "../src/layout";
const layout: Layout = JSON.parse(readFileSync(new URL("../public/collection/layout.json", import.meta.url), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("../public/collection/catalog.json", import.meta.url), "utf8"));

test("display identities and viewing clearances remain valid", () => {
  validateLayout(layout, catalog.works.map((w: { id: string }) => w.id).reverse());
  for (const room of layout.rooms) expect(canStand(layout, room.spawn[0], room.spawn[2], true), room.id).toBe(true);
  for (const r of layout.reservations) expect(canStand(layout, r.camera[0], r.camera[2], true), r.id).toBe(true);
  expect(layout.reservations.filter(r => r.room === "chamber-5")).toEqual([]);
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
