import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {roomHeadingMounts} from '../src/gallery-lighting';
import {imageDimensions, inscriptionLayout, montageLayout} from '../src/display';
import type {Catalog} from '../src/types';
import type {Layout} from '../src/layout';
const layout=JSON.parse(readFileSync(new URL('../public/collection/layout.json',import.meta.url),'utf8')) as Layout;
const catalog=JSON.parse(readFileSync(new URL('../public/collection/catalog.json',import.meta.url),'utf8')) as Catalog;
const previews=JSON.parse(readFileSync(new URL('../public/collection/scene-assets.json',import.meta.url),'utf8'));
test('chamber headings sit on solid walls, clear of artworks, captions and fixtures',()=>{
  const mounts=roomHeadingMounts(layout);
  expect(mounts).toHaveLength(layout.rooms.length);
  for(const mount of mounts){
    const [x,y,z]=mount.position;
    const east=Math.abs(mount.angle)>1;
    const along=east?z:x, axis=east?1:0, wallAxis=east?0:1, edge=east?x+.145:z-.145;
    const supporting=layout.walls.find(w=>w.room===mount.room.id && !w.partition
      && Math.abs(w.a[wallAxis]-edge)<.01 && Math.abs(w.b[wallAxis]-edge)<.01
      && along-mount.width/2>Math.min(w.a[axis],w.b[axis]) && along+mount.width/2<Math.max(w.a[axis],w.b[axis]));
    expect(supporting,`${mount.room.id} must not bridge a doorway`).toBeTruthy();
    expect(y+mount.height/2).toBeLessThan(supporting!.height ?? 4.8);
    for(const slot of layout.reservations){
      const work=catalog.works.find(w=>w.id===slot.workId);
      if(!work || work.object || Math.abs(slot.angle-mount.angle)>.01 || Math.abs(slot.position[east?0:2]-(east?x:z))>.3)continue;
      const preview=work.image?previews[work.image]:undefined;
      const size=work.wallText?inscriptionLayout(work.wallText,slot.displaySize?.[0])
        :work.panels?montageLayout(work.panels.length,work.presentation==='variants')
        :preview?imageDimensions(work,preview.width/preview.height,slot,layout):{width:2.2,height:1.6};
      if(Math.abs(slot.position[east?2:0]-along)>(mount.width+size.width)/2+.1)continue;
      const artTop=slot.position[1]+size.height/2+.1;
      const captionBottom=slot.position[1]-size.height/2-.57;
      expect(y-mount.height/2>artTop+.1 || y+mount.height/2<captionBottom-.1,`${mount.room.id} heading must clear the artwork and caption of ${work.id}`).toBe(true);
      const fixtureTop=slot.position[1]+size.height/2+.6;
      const fixtureBottom=fixtureTop-.24;
      expect(y-mount.height/2>fixtureTop+.1 || y+mount.height/2<fixtureBottom-.1,`${mount.room.id} heading must clear the fixture over ${work.id}`).toBe(true);
    }
    if(mount.room.id==='chamber-2')expect(x+mount.width/2).toBeLessThan(33-2.8/2);
  }
});

test('Chamber 4 heading clears protruding lamps in perspective from nearby viewing points',()=>{
  const mount=roomHeadingMounts(layout).find(m=>m.room.id==='chamber-4')!;
  const neighbors=layout.reservations.filter(r=>r.room===mount.room.id && r.workId && Math.abs(r.angle-mount.angle)<.01 && Math.abs(r.position[0]-mount.position[0])<.3);
  const origin=new THREE.Vector3(...mount.position);
  const wall=new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(Math.sin(mount.angle),0,Math.cos(mount.angle)),origin);
  for(const viewer of neighbors){
    const camera=new THREE.Vector3(...viewer.camera);
    for(const slot of neighbors){
      const work=catalog.works.find(w=>w.id===slot.workId)!;
      const preview=previews[work.image!];
      const size=imageDimensions(work,preview.width/preview.height,slot,layout);
      // Project the protruding fixture's silhouette onto the lettering's wall plane.
      const projected=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>{
        const point=new THREE.Vector3(x*.09,size.height/2+.48+y*.12,.5+z*.09)
          .applyAxisAngle(new THREE.Vector3(0,1,0),slot.angle).add(new THREE.Vector3(...slot.position));
        return new THREE.Ray(camera,point.sub(camera).normalize()).intersectPlane(wall,new THREE.Vector3())!
          .sub(origin).applyAxisAngle(new THREE.Vector3(0,1,0),-mount.angle);
      })));
      const overlaps=Math.min(...projected.map(p=>p.x))<mount.width/2 && Math.max(...projected.map(p=>p.x))>-mount.width/2
        && Math.min(...projected.map(p=>p.y))<mount.height/2 && Math.max(...projected.map(p=>p.y))>-mount.height/2;
      expect(overlaps,`${viewer.id}: heading behind lamp for ${slot.workId}`).toBe(false);
    }
  }
});
