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
    const east=room.headingWall==="east", axis=east?0:1, edge=east?room.bounds[1]:room.bounds[2];
    const length=(wall:Layout["walls"][number])=>Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);
    const wall=layout.walls.filter(w=>w.room===room.id && !w.partition && Math.abs(w.a[axis]-edge)<.01 && Math.abs(w.b[axis]-edge)<.01)
      .sort((a,b)=>length(b)-length(a))[0];
    if(!wall)throw new Error(`No solid heading wall for ${room.id}`);
    return {room,position:[(wall.a[0]+wall.b[0])/2-(east ? .145 : 0),room.headingHeight ?? 4.4,(wall.a[1]+wall.b[1])/2+(east ? 0 : .145)] as Vector,
      angle:east?-Math.PI/2:0,width:Math.min(6,length(wall)-.8),height:.68};
  });
}
