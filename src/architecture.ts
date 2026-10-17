import * as THREE from "three";
import type { Layout, Point } from "./layout";
type Wall = Layout["walls"][number];
const EPS = 1e-6;
const same = (a: Point,b: Point) => Math.hypot(a[0]-b[0],a[1]-b[1]) < EPS;
const cross = (a: Point,b: Point) => a[0]*b[1]-a[1]*b[0];
function end(wall: Wall, p: Point, other: Point, walls: Wall[], half: number): [Point,Point] {
  const length=Math.hypot(other[0]-p[0],other[1]-p[1]);
  if (length<EPS) throw new Error("Zero-length wall");
  const u: Point=[(other[0]-p[0])/length,(other[1]-p[1])/length];
  const n: Point=[-u[1],u[0]];
  const neighbors=walls.filter(w=>w!==wall && (same(w.a,p)||same(w.b,p)));
  if (neighbors.length>1) throw new Error("Wall junction needs an explicit footprint");
  const neighbor=neighbors[0];
  return [1,-1].map(side=>{
    const origin: Point=[p[0]+n[0]*half*side,p[1]+n[1]*half*side];
    if (!neighbor) {
      // A foyer wall can terminate against the middle of a longer room wall.
      const crossing=walls.find(w=>{
        if(w===wall) return false;
        const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],length2=dx*dx+dz*dz;
        const t=((p[0]-w.a[0])*dx+(p[1]-w.a[1])*dz)/length2;
        return t>EPS && t<1-EPS && Math.hypot(p[0]-w.a[0]-t*dx,p[1]-w.a[1]-t*dz)<EPS;
      });
      if (!crossing) return origin;
      const dx=crossing.b[0]-crossing.a[0],dz=crossing.b[1]-crossing.a[1],len=Math.hypot(dx,dz);
      const normal: Point=[-dz/len,dx/len];
      const direction=u[0]*normal[0]+u[1]*normal[1];
      if(Math.abs(direction)<EPS) throw new Error("Overlapping wall segments");
      const t=(Math.sign(direction)*half-(origin[0]-p[0])*normal[0]-(origin[1]-p[1])*normal[1])/direction;
      return [origin[0]+t*u[0],origin[1]+t*u[1]] as Point;
    }
    const q=same(neighbor.a,p)?neighbor.b:neighbor.a;
    const length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const v: Point=[(q[0]-p[0])/length,(q[1]-p[1])/length];
    const denominator=cross(u,v);
    if (Math.abs(denominator)<EPS) {
      if (u[0]*v[0]+u[1]*v[1]>0) throw new Error("Overlapping wall segments");
      return origin;
    }
    // Match the opposite offset of the adjoining segment to form a miter.
    const offset: Point=[p[0]+v[1]*half*side-origin[0],p[1]-v[0]*half*side-origin[1]];
    const t=cross(offset,v)/denominator;
    if (Math.abs(t)>half*4) throw new Error("Acute wall junction needs an explicit footprint");
    return [origin[0]+t*u[0],origin[1]+t*u[1]] as Point;
  }) as [Point,Point];
}
export function wallFootprint(wall: Wall,walls: Wall[],thickness: number): Point[] {
  const [al,ar]=end(wall,wall.a,wall.b,walls,thickness/2);
  const [bl,br]=end(wall,wall.b,wall.a,walls,thickness/2);
  return [ar,bl,br,al];
}
export function prism(points: Point[],bottom: number,top: number) {
  const vertices: number[]=[],uv: number[]=[];
  function triangle(a: number[],b: number[],c: number[]) {
    vertices.push(...a,...b,...c);uv.push(0,0,1,0,1,1);
  }
  const low=points.map(([x,z])=>[x,bottom,z]), high=points.map(([x,z])=>[x,top,z]);
  for (let i=0;i<points.length;i++) {
    const j=(i+1)%points.length;
    triangle(low[i],high[i],high[j]);triangle(low[i],high[j],low[j]);
  }
  for (let i=1;i<points.length-1;i++) {
    triangle(high[0],high[i+1],high[i]);triangle(low[0],low[i],low[i+1]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  geometry.computeVertexNormals();
  return geometry;
}
export const BASE_HEIGHT=.09;
export function wallGeometry(wall: Wall,walls: Wall[]) {
  return {
    wall: prism(wallFootprint(wall,walls,.24),BASE_HEIGHT,wall.height ?? (wall.partition?3.6:4.8)),
    base: prism(wallFootprint(wall,walls,.28),0,BASE_HEIGHT),
  };
}
