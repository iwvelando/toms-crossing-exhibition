import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {roomHeadingMounts} from '../src/gallery-lighting';
import {imageDimensions} from '../src/display';
import type {Catalog} from '../src/types';
import type {Layout} from '../src/layout';
const layout=JSON.parse(readFileSync(new URL('../public/collection/layout.json',import.meta.url),'utf8')) as Layout;
const catalog=JSON.parse(readFileSync(new URL('../public/collection/catalog.json',import.meta.url),'utf8')) as Catalog;
const previews=JSON.parse(readFileSync(new URL('../public/collection/scene-assets.json',import.meta.url),'utf8'));
test('chamber headings sit entirely on solid wall sections, clear of the north route arrow',()=>{
  const mounts=roomHeadingMounts(layout);
  expect(mounts).toHaveLength(layout.rooms.length);
  for(const mount of mounts){
    const [x,y,z]=mount.position;
    const supporting=layout.walls.find(w=>w.room===mount.room.id && Math.abs(w.a[1]-(z-.145))<.01 && Math.abs(w.b[1]-(z-.145))<.01 && x-mount.width/2>Math.min(w.a[0],w.b[0]) && x+mount.width/2<Math.max(w.a[0],w.b[0]));
    expect(supporting,`${mount.room.id} must not bridge a doorway`).toBeTruthy();
    expect(y+mount.height/2).toBeLessThan(supporting!.height ?? 4.8);
    for(const slot of layout.reservations){
      const work=catalog.works.find(w=>w.id===slot.workId);
      if(!work || work.object || Math.abs(slot.angle)>.01 || Math.abs(slot.position[2]-z)>.3 || Math.abs(slot.position[0]-x)>mount.width/2+.2)continue;
      const preview=work.image?previews[work.image]:undefined;
      const size=work.panels?{height:2.2}:preview?imageDimensions(work,preview.width/preview.height,slot,layout):{height:1.6};
      const fixtureTop=slot.position[1]+size.height/2+.6;
      const fixtureBottom=fixtureTop-.24;
      expect(y-mount.height/2>fixtureTop+.1 || y+mount.height/2<fixtureBottom-.1,`${mount.room.id} heading must clear the fixture over ${work.id}`).toBe(true);
    }
    if(mount.room.id==='chamber-2')expect(x+mount.width/2).toBeLessThan(33-2.8/2);
  }
});
