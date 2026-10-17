import * as THREE from "three";
import type { Layout, Vector } from "./layout";
export type DisplayLight = { position: Vector; angle: number; width: number; height: number };

// Bake diffuse spotlight washes once. They remain fixed at every viewing distance,
// and each wall face clips its own light so it cannot spill across a doorway.
export function litWallMaterials(
  geometry: THREE.BufferGeometry,
  base: THREE.MeshStandardMaterial,
  sources: DisplayLight[],
  textures: THREE.Texture[],
) {
  const positions=geometry.getAttribute("position"), normals=geometry.getAttribute("normal");
  const uv=new Float32Array(positions.count*2);
  const materials:THREE.MeshStandardMaterial[]=[base];
  geometry.clearGroups();
  for(let start=0;start<positions.count;start+=6){
    const normal=new THREE.Vector3().fromBufferAttribute(normals,start);
    if(Math.abs(normal.y)>.1){geometry.addGroup(start,Math.min(6,positions.count-start),0);continue;}
    const tangent=new THREE.Vector3(normal.z,0,-normal.x);
    const origin=new THREE.Vector3().fromBufferAttribute(positions,start);
    const points=Array.from({length:6},(_,i)=>new THREE.Vector3().fromBufferAttribute(positions,start+i));
    const coordinates=points.map(p=>p.dot(tangent));
    const min=Math.min(...coordinates),max=Math.max(...coordinates),width=max-min;
    const bottom=Math.min(...points.map(p=>p.y)),top=Math.max(...points.map(p=>p.y)),height=top-bottom;
    if(width<.4){geometry.addGroup(start,6,0);continue;}
    const lights=sources.filter(source=>{
      const p=new THREE.Vector3(...source.position),n=new THREE.Vector3(Math.sin(source.angle),0,Math.cos(source.angle));
      return n.dot(normal)>.99 && Math.abs(p.clone().sub(origin).dot(normal))<.22 && p.dot(tangent)>=min && p.dot(tangent)<=max;
    });
    if(!lights.length){geometry.addGroup(start,6,0);continue;}
    const canvas=document.createElement("canvas");
    canvas.width=Math.min(1024,Math.max(128,Math.ceil(width*40)));
    canvas.height=Math.min(512,Math.max(128,Math.ceil(height*40)));
    const ctx=canvas.getContext("2d")!;ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation="lighter";
    for(const source of lights){
      const x=(new THREE.Vector3(...source.position).dot(tangent)-min)/width*canvas.width;
      const y=(top-source.position[1]-.18)/height*canvas.height;
      const rx=Math.max(1.15,source.width*.74)/width*canvas.width;
      const ry=Math.max(1.55,source.height*.9)/height*canvas.height;
      ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
      const gradient=ctx.createRadialGradient(0,-.2,.05,0,0,1);
      gradient.addColorStop(0,"#888888");gradient.addColorStop(.38,"#727272");gradient.addColorStop(.72,"#303030");gradient.addColorStop(1,"#000000");
      ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    for(let i=0;i<6;i++){uv[(start+i)*2]=(coordinates[i]-min)/width;uv[(start+i)*2+1]=(points[i].y-bottom)/height;}
    const texture=new THREE.CanvasTexture(canvas);texture.channel=1;texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
    const material=base.clone();material.emissive.set("#fff0d5");material.emissiveIntensity=.7;material.emissiveMap=texture;
    geometry.addGroup(start,6,materials.length);materials.push(material);
  }
  geometry.setAttribute("uv1",new THREE.BufferAttribute(uv,2));
  return materials;
}

export function roomHeadingMounts(layout:Layout){
  return layout.rooms.map(room=>{
    const north=layout.walls.filter(w=>w.room===room.id && !w.partition && Math.abs(w.a[1]-room.bounds[2])<.01 && Math.abs(w.b[1]-room.bounds[2])<.01)
      .sort((a,b)=>Math.abs(b.b[0]-b.a[0])-Math.abs(a.b[0]-a.a[0]))[0];
    if(!north)throw new Error(`No solid heading wall for ${room.id}`);
    return {room,position:[(north.a[0]+north.b[0])/2,4.4,room.bounds[2]+.145] as Vector,width:Math.min(6,Math.abs(north.b[0]-north.a[0])-.8),height:.68};
  });
}
