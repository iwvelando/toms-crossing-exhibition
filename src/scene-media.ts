import type { Catalog } from "./types";
export type PreviewIndex = Record<string, { image: string; width: number; height: number }>;
export type SceneMedia = Map<string, HTMLImageElement>;
export async function prepareSceneMedia(catalog: Catalog, graphics: boolean, progress: (value:number)=>void) {
  const response=await fetch("/collection/scene-assets.json");
  if(!response.ok)throw new Error("The gallery previews could not be loaded. Please try again.");
  const previews=await response.json() as PreviewIndex;
  const media:SceneMedia=new Map();
  if(!graphics)return {previews,media};
  const paths=[...new Set(catalog.works.flatMap(work=>work.wallText?[]:work.panels?work.panels.map(panel=>panel.image):work.image?[work.image]:work.object==="film-screen"&&work.referenceImage?[work.referenceImage]:[]))];
  let cursor=0,done=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(cursor<paths.length){
      const path=paths[cursor++],preview=previews[path];
      if(!preview || !/^previews\/[a-f0-9]{16}\.webp$/.test(preview.image))throw new Error("An artwork preview is missing. Please refresh the collection.");
      const image=new Image();image.decoding="async";image.src=`/collection/${preview.image}`;
      try{await image.decode();}catch{throw new Error("An artwork preview could not be loaded. Please try entering again.");}
      media.set(path,image);progress(Math.round(++done/paths.length*100));
    }
  }));
  return {previews,media};
}
