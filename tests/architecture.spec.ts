import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { wallFootprint, wallGeometry, BASE_HEIGHT } from "../src/architecture";
import type { Layout, Point } from "../src/layout";
const layout: Layout=JSON.parse(readFileSync(new URL("../public/collection/layout.json",import.meta.url),"utf8"));
function overlap(a: Point[],b: Point[]) {
  for (const p of [a,b]) for (let i=0;i<p.length;i++) {
    const q=p[(i+1)%p.length],x=-(q[1]-p[i][1]),z=q[0]-p[i][0];
    const pa=a.map(v=>v[0]*x+v[1]*z),pb=b.map(v=>v[0]*x+v[1]*z);
    if (Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb))<1e-6) return false;
  }
  return true;
}
test("all wall and base joints have disjoint interiors, including foyer and rear walls",()=>{
  for (const width of [.24,.28]) {
    const footprints=layout.walls.map(w=>wallFootprint(w,layout.walls,width));
    for(let i=0;i<footprints.length;i++) for(let j=i+1;j<footprints.length;j++)
      expect(overlap(footprints[i],footprints[j]),`segments ${i}/${j}, thickness ${width}`).toBe(false);
  }
  for(const w of layout.walls) {
    const g=wallGeometry(w,layout.walls);
    g.wall.computeBoundingBox();g.base.computeBoundingBox();
    expect(g.wall.boundingBox!.min.y).toBeCloseTo(BASE_HEIGHT);
    expect(g.base.boundingBox!.max.y).toBeCloseTo(BASE_HEIGHT);
    // The old full-height wall and base overlapped over the entire base height.
    expect(g.wall.boundingBox!.min.y).toBeGreaterThanOrEqual(g.base.boundingBox!.max.y);
    for(const mesh of [g.wall,g.base]) {
      expect([...mesh.getAttribute("position").array].every(Number.isFinite)).toBe(true);
      mesh.dispose();
    }
  }
});
