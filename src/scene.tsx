import { litWallMaterials, roomHeadingMounts, type DisplayLight } from "./gallery-lighting";
import type { SceneMedia } from "./scene-media";
import { createObjectStudy } from "./objects";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { wallGeometry } from "./architecture";
import { imageDimensions, inscriptionLayout, montageLayout } from "./display";
import type { GalleryHandle, Work } from "./types";
import { canStand, locationAt, roomAt, type Layout, type Reservation } from "./layout";

type Props = {
  entered: boolean;
  works: Work[];
  paused: boolean;
  retainMouseLook: boolean;
  layout?: Layout;
  planning: boolean;
  onMouseLook: (active: boolean) => void;
  onMouseLookError: (message: string) => void;
  media: SceneMedia;
  onRoom: (id: string) => void;
  onNear: (work?: Work | Reservation) => void;
  onSelect: (work: Work | Reservation) => void;
  onUnavailable: () => void;
};
export const Gallery = forwardRef<GalleryHandle, Props>((props, ref) => {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const runtime = useRef<
    | {
        visit: (id: string) => void;
        visitRoom: (id: string) => void;
        visitReservation: (id: string) => void;
        setPlanning: () => void;
        reset: () => void;
        toggleMouseLook: () => void;
        keys: Set<string>;
        axes: [number,number];
        invalidate: () => void;
        install: (works: Work[]) => void;
        enter: () => void;
      }
    | undefined
  >(undefined);
  useImperativeHandle(ref, () => ({
    visit: (id) => runtime.current?.visit(id),
    visitRoom: (id) => runtime.current?.visitRoom(id),
    visitReservation: (id) => runtime.current?.visitReservation(id),
    reset: () => runtime.current?.reset(),
    toggleMouseLook: () => runtime.current?.toggleMouseLook(),
    steer: (x,y) => {if(runtime.current){runtime.current.axes[0]=x;runtime.current.axes[1]=y;runtime.current.invalidate();}},
    move: (d, p) => {
      if (p) runtime.current?.keys.add(d);
      else runtime.current?.keys.delete(d);
      runtime.current?.invalidate();
    },
  }));
  useEffect(() => {
    const root = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "3D exhibition. Press M to capture or release the mouse, or drag to look. Use W A S D or arrow keys to walk.",
    );
    root.appendChild(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#171a19");
    scene.fog = new THREE.FogExp2("#171a19", 0.006);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentScene = new RoomEnvironment();
    const environment = pmrem.fromScene(environmentScene, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.18;
    environmentScene.dispose();
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 140);
    camera.position.set(-2.8, 1.7, 13.6);
    camera.rotation.order = "YXZ";
    const keys = new Set<string>();
    const axes:[number,number]=[0,0];
    const clickable: THREE.Object3D[] = [];
    const occluders: THREE.Object3D[] = [];
    const planned = new THREE.Group();
    planned.visible = false;
    scene.add(planned);
    const foyerPreview = new THREE.Group();
    scene.add(foyerPreview);
    let built = false, lastRoom = "", settledImages = 0;
    const content = new THREE.Group();
    scene.add(content);
    const textures: THREE.Texture[] = [];
    const displayLights: DisplayLight[] = [];
    const imageJobs: { position: THREE.Vector3; started: boolean; load: () => void }[] = [];
    let pendingImages = 0;
    function loadArt(path:string, success:(texture:THREE.Texture)=>void, failure:()=>void) {
      const image=latest.current.media.get(path);
      if(!image){failure();return;}
      const texture=new THREE.Texture(image);texture.needsUpdate=true;success(texture);
    }
    function updateNearbyArt() {
      if (!latest.current.entered || latest.current.paused) return;
      // Decoding completed in the foyer. Build every surface before the first room render.
      for (const job of imageJobs) if(!job.started){job.started=true;pendingImages++;job.load();}
      canvas.dataset.pendingImages=String(pendingImages);
      canvas.dataset.artLights=String(displayLights.length+Number(canvas.dataset.modeledObjects ?? 0));
      canvas.dataset.lighting="static";
      canvas.dataset.sceneImages=String(imageJobs.length);
    }
    const doors = new THREE.Group();
    scene.add(doors);
    let disposed = false,
      frame = 0,
      prev = performance.now(),
      lastNear = "",
      lookYaw = 0,
      lookPitch = 0,
      drag = false,
      dragged = false,
      px = 0,
      py = 0,
      installed = false;
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function mineralTexture(seed: number, coarse: boolean) {
      const size = 256;
      const data = new Uint8Array(size * size * 4);
      let state = seed;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
          const grain = (state / 4294967296 - 0.5) * (coarse ? 20 : 12);
          const cloud = Math.sin(x * Math.PI / 64) * Math.cos(y * Math.PI / 128) * 5;
          const tone = Math.round(220 + grain + cloud);
          const i = (y * size + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = tone;
          data[i + 3] = 255;
        }
      }
      const texture = new THREE.DataTexture(data, size, size);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(coarse ? 8 : 5, coarse ? 13 : 3);
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
      textures.push(texture);
      return texture;
    }
    const plaster = mineralTexture(31, false);
    const limestone = mineralTexture(79, true);
    const wall = new THREE.MeshStandardMaterial({
      color: "#343b38",
      roughness: 0.98,
      bumpMap: plaster,
      bumpScale: 0.025,
    });
    const foyerWall = new THREE.MeshStandardMaterial({
      color: "#252b28",
      roughness: 1,
      bumpMap: plaster,
      bumpScale: 0.025,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: "#817056",
      roughness: 0.5,
      metalness: 0.45,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#151917",
      roughness: 0.7,
    });
    const stone = new THREE.MeshStandardMaterial({
      color: "#343632",
      roughness: 0.84,
      map: limestone,
      bumpMap: limestone,
      bumpScale: 0.015,
    });
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.Material,
      parent: THREE.Object3D = scene,
    ) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }
    // A closed, unspoiled entry is drawn before collection data is requested.
    box(10, .2, 10, 0, -.12, 13.5, stone, foyerPreview);
    box(.24, 4.8, 10, -5, 2.4, 13.5, foyerWall, foyerPreview);
    box(.24, 4.8, 10, 5, 2.4, 13.5, foyerWall, foyerPreview);
    box(10, .2, 10, 0, 4.85, 13.5, dark, foyerPreview);
    for (const x of [-3.6,3.6]) box(2.8,4.8,.24,x,2.4,8.5,foyerWall,foyerPreview);
    box(4.4,1.1,.24,0,4.25,8.5,foyerWall,foyerPreview);
    box(2.12,3.75,.12,-1.08,1.88,8.56,dark,doors);
    box(2.12,3.75,.12,1.08,1.88,8.56,dark,doors);
    for (const x of [-2.22,2.22]) box(.06,3.8,.09,x,1.9,8.68,trim,foyerPreview);
    const ambient = new THREE.HemisphereLight("#fff0d5", "#74766e", 1.55);
    scene.add(ambient);
    function spot(
      x: number,
      z: number,
      tx: number,
      ty: number,
      tz: number,
      intensity = 150,
      withFixture = true,
    ) {
      const light = new THREE.SpotLight(
        "#ffe0b2",
        intensity,
        18,
        Math.PI / 4,
        0.65,
        1.4,
      );
      light.position.set(x, 4.35, z);
      light.target.position.set(tx, ty, tz);
      scene.add(light, light.target);
      if (!withFixture) return light;
      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.12, 0.22, 16),
        dark,
      );
      fixture.position.copy(light.position);
      scene.add(fixture);
      const bulb = new THREE.Mesh(
        new THREE.CircleGeometry(0.085, 16),
        new THREE.MeshBasicMaterial({ color: "#fff2d4" }),
      );
      bulb.rotation.x = -Math.PI / 2;
      bulb.position.set(x, 4.23, z);
      scene.add(bulb);
      return light;
    }
    const objectLight = spot(0, 0, 0, 1, 0, 155);
    objectLight.castShadow = true;
    objectLight.shadow.mapSize.set(1024,1024);
    objectLight.shadow.bias = -0.001;
    spot(0,11,0,2,8.4,140);
    function label(
      text: string | string[],
      w: number,
      h: number,
      fontSize = 42,
      color = "#e9dfcc",
    ) {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = Math.round((1024 * h) / w);
      const ctx = c.getContext("2d")!;
      const lines=Array.isArray(text)?text:[text];
      const lineHeight=c.height/lines.length;
      ctx.textAlign = "center";ctx.textBaseline = "middle";
      lines.forEach((line,index)=>{
        let size=Math.min(fontSize*(lines.length>1 && index>0 ? .66 : 1),lineHeight*.86);
        ctx.font=`${size}px Georgia`;
        size*=Math.min(1,c.width*.93/Math.max(1,ctx.measureText(line).width));
        ctx.font=`${size}px Georgia`;
        const y=lineHeight*(index+.5);
        // Letter edges provide contrast without putting an opaque strip on the wall.
        ctx.lineJoin="round";ctx.strokeStyle="rgba(5,10,8,.88)";ctx.lineWidth=Math.max(1.4,size*.055);
        ctx.shadowColor="rgba(0,0,0,.65)";ctx.shadowBlur=size*.09;ctx.shadowOffsetY=1;
        ctx.strokeText(line,c.width/2,y);
        ctx.fillStyle=index===0?color:"#d5c9b4";ctx.fillText(line,c.width/2,y);
      });
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      return new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          alphaTest: .015,
          depthWrite: false,
          toneMapped: false,
        }),
      );
    }
    const entranceLabel = label("TOM’S CROSSING", 3.6, 0.3, 58);
    entranceLabel.position.set(0, 3.2, 8.65);
    doors.add(entranceLabel);
    const entranceSub = label(
      "AN UNOFFICIAL EXHIBITION",
      3.1,
      0.22,
      25,
      "#baac91",
    );
    entranceSub.position.set(0, 2.78, 8.65);
    doors.add(entranceSub);
    function buildLayout(layout: Layout) {
      if (built) return;
      built = true;
      foyerPreview.visible = false;
      const pale = new THREE.MeshStandardMaterial({ color: "#717263", roughness: .98, bumpMap: plaster, bumpScale: .025 });
      const passage = new THREE.MeshStandardMaterial({ color: "#171e1c", roughness: 1 });
      const material = (tone: string) => tone === "light" ? pale : tone === "passage" ? passage : wall;
      const joints = new THREE.LineBasicMaterial({color: "#232922", transparent: true, opacity: .6});
      for (const floor of layout.floors) {
        const [x0,x1,z0,z1] = floor.bounds;
        box(x1-x0,.2,z1-z0,(x0+x1)/2,-.12,(z0+z1)/2,stone);
        box(x1-x0,.15,z1-z0,(x0+x1)/2,floor.ceilingHeight ?? 4.9,(z0+z1)/2,dark);
        const vertices: number[] = [];
        for (let x=x0+2; x<x1; x+=2) vertices.push(x,-.015,z0,x,-.015,z1);
        for (let z=z0+2; z<z1; z+=2) vertices.push(x0,-.015,z,x1,-.015,z);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
        scene.add(new THREE.LineSegments(geometry,joints));
      }
      for (const segment of layout.walls) {
        const geometry=wallGeometry(segment,layout.walls);
        const wallMaterials=litWallMaterials(geometry.wall,material(segment.tone),displayLights,textures);
        canvas.dataset.wallLightmaps=String(Number(canvas.dataset.wallLightmaps ?? 0)+wallMaterials.length-1);
        const mesh=new THREE.Mesh(geometry.wall,wallMaterials);
        const base=new THREE.Mesh(geometry.base,trim);
        for (const part of [mesh,base]) { part.receiveShadow=true;part.castShadow=true;scene.add(part); }
        occluders.push(mesh,base);
      }
      for (const mount of roomHeadingMounts(layout)) {
        const heading=label([mount.room.title.toUpperCase(),mount.room.subtitle],mount.width,mount.height,52);
        heading.position.fromArray(mount.position);heading.rotation.y=mount.angle;scene.add(heading);
      }
      // Separate wayfinding lettering indicates the suggested route without moving visitors automatically.
      for (const [x,z,angle,text] of [
        [15.84,-6,-Math.PI/2,"02"], [33,-19.34,0,"03"],
        [20.16,-39,Math.PI/2,"04"], [-11.84,-39,Math.PI/2,"05"],
        [-63,-25.66,Math.PI,"06"],
      ] as [number,number,number,string][]) {
        const sign=label(text,2.8,.5,100,"#d9c291");
        sign.position.set(x,3.95,z);sign.rotation.y=angle;scene.add(sign);
      }
      const kinds = new Map<string,THREE.Material>();
      function placeholderMaterial(kind: string, group: boolean) {
        const key=kind+group;
        if (kinds.has(key)) return kinds.get(key)!;
        const c=document.createElement("canvas");c.width=512;c.height=384;
        const ctx=c.getContext("2d")!;
        ctx.fillStyle=group?"#34423d":"#293631";ctx.fillRect(0,0,512,384);
        ctx.strokeStyle="#819385";ctx.lineWidth=2;ctx.setLineDash([10,10]);ctx.strokeRect(16,16,480,352);
        ctx.beginPath();ctx.moveTo(35,35);ctx.lineTo(477,349);ctx.moveTo(477,35);ctx.lineTo(35,349);ctx.stroke();
        ctx.fillStyle="#293631";ctx.fillRect(55,133,402,118);
        ctx.textAlign="center";ctx.fillStyle="#e7e4d5";ctx.font="24px Arial";
        ctx.fillText(group?"GROUP BAY":kind==="panel"?"WALL PANEL":kind==="object"?"OBJECT STUDY":"INSTALLATION",256,178);
        ctx.fillStyle="#c7b993";ctx.font="18px Arial";ctx.fillText("PLANNED · PROVISIONAL",256,216);
        const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);
        const mat=new THREE.MeshBasicMaterial({map:tex});kinds.set(key,mat);return mat;
      }
      for (const r of layout.reservations.filter(r=>r.assetStatus==="planned")) {
        const group=new THREE.Group();group.position.fromArray(r.position);group.rotation.y=r.angle;planned.add(group);
        let mesh: THREE.Mesh;
        if (r.kind === "panel") {
          mesh=box(r.footprint[0],r.footprint[1],.055,0,0,.015,placeholderMaterial(r.kind,r.group),group);
        } else if (r.kind === "object") {
          box(r.footprint[0],.85,r.footprint[2],0,.425,0,dark,group);
          mesh=box(r.footprint[0]*.72,.72,r.footprint[2]*.72,0,1.21,0,placeholderMaterial(r.kind,r.group),group);
        } else {
          mesh=box(r.footprint[0],.025,r.footprint[2],0,.01,0,placeholderMaterial(r.kind,r.group),group);
          const marker=label("INSTALLATION AREA",3,.25,64);marker.position.set(0,.3,0);group.add(marker);
        }
        mesh.userData.reservation=r;clickable.push(mesh);
      }
      setPlanning();
    }
    function setPlanning() {
      planned.visible=latest.current.planning && latest.current.entered;
      // A newly revealed placeholder must not trap someone inside its volume.
      const layout=latest.current.layout;
      if (layout && latest.current.entered && !canStand(layout,camera.position.x,camera.position.z,latest.current.planning)) {
        const room=roomAt(layout,camera.position.x,camera.position.z);
        if (room) { camera.position.fromArray(room.spawn); setLook(new THREE.Vector3(...room.look)); }
      }
      renderer.shadowMap.needsUpdate=true;
      invalidate();
    }
    function install(works: Work[]) {
      const layout=latest.current.layout;
      if (installed || !layout) return;
      for(const work of works){
        const slot=layout.reservations.find(r=>r.workId===work.id)!;
        if(work.object)continue;
        const image=work.image?latest.current.media.get(work.image):undefined;
        const size=work.wallText?inscriptionLayout(work.wallText,slot.displaySize?.[0])
          :work.panels?montageLayout(work.panels.length,work.presentation==="variants")
          :image?imageDimensions(work,image.width/image.height,slot,layout):{width:2.2,height:1.6};
        displayLights.push({position:slot.position,angle:slot.angle,...size});
      }
      buildLayout(layout);
      installed = true;
      // Constant fill lights keep materials readable without moving pools of light.
      const fill=new THREE.DirectionalLight("#eee7d4",.65);fill.position.set(-20,40,20);scene.add(fill);
      const rim=new THREE.DirectionalLight("#c2d2dc",.35);rim.position.set(20,20,-30);scene.add(rim);
      const poolCanvas=document.createElement("canvas");poolCanvas.width=poolCanvas.height=128;
      const poolContext=poolCanvas.getContext("2d")!;
      const poolGradient=poolContext.createRadialGradient(64,64,6,64,64,64);
      poolGradient.addColorStop(0,"#8b806b");poolGradient.addColorStop(.45,"#4c4537");poolGradient.addColorStop(1,"#000");
      poolContext.fillStyle=poolGradient;poolContext.fillRect(0,0,128,128);
      const poolTexture=new THREE.CanvasTexture(poolCanvas);poolTexture.colorSpace=THREE.SRGBColorSpace;textures.push(poolTexture);
      const poolMaterial=new THREE.MeshBasicMaterial({map:poolTexture,transparent:true,opacity:.38,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      works.forEach((work) => {
        const slot = layout.reservations.find(r=>r.workId===work.id)!;
        const group = new THREE.Group();
        group.position.fromArray(slot.position);
        group.rotation.y = slot.angle;
        content.add(group);
        const displayLight=displayLights.find(light=>light.position===slot.position);
        if(displayLight){
          // Fixed physical fixture corresponds to the baked wall wash below it.
          const fixture=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.2,12),dark);
          const y=displayLight.height/2+.48;
          fixture.position.set(0,y,.5);
          fixture.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,y,.5).normalize());
          group.add(fixture);
          box(.03,.03,.46,0,y+.08,.24,dark,group);
          const bulb=new THREE.Mesh(new THREE.CircleGeometry(.055,12),new THREE.MeshBasicMaterial({color:"#fff0d5"}));
          bulb.position.set(0,y-.09,.46);bulb.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(0,-y,-.5).normalize());group.add(bulb);
        }
        if (work.wallText) {
          // Typeset on the actual wall; the generated gallery view is only a reference.
          const {lines,width,height,lineHeight}=inscriptionLayout(work.wallText,slot.displaySize?.[0]);
          const inscription=new THREE.Group(); group.add(inscription);
          lines.forEach((line,index)=>{
            const lettering=label(line,width,.25,64);
            lettering.position.set(0,(lines.length-1)/2*lineHeight-index*lineHeight,.08);
            inscription.add(lettering);
          });
          // Transparent hit target keeps gaps between letters easy to inspect.
          const target=new THREE.Mesh(new THREE.PlaneGeometry(width,height),
            new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
          target.position.z=.085; target.userData.work=work;group.add(target);clickable.push(target);
          target.userData.inspectDistance=Math.max(8,new THREE.Vector3(...slot.camera).distanceTo(group.position)+1);
          canvas.dataset.wallInscriptions=String(Number(canvas.dataset.wallInscriptions ?? 0)+1);
        } else if (work.image) {
          const panels=work.panels ?? [{image:work.image,title:work.title,alt:work.alt}];
          const montage=!!work.panels;
          const variants=work.presentation === "variants";
          const montageSize=montageLayout(panels.length,variants);
          const {columns,pitch,rowHeight}=montageSize;
          if (montage) {
            const backing=box(montageSize.width,montageSize.height,.04,0,montageSize.backingY,.01,dark,group);
            backing.userData.work=work;clickable.push(backing);
          }
          panels.forEach((panel,index) => {
          const surface=new THREE.Group();
          if (montage) surface.position.set((index%columns-(columns-1)/2)*pitch, (Math.ceil(panels.length/columns)-1)/2*rowHeight-Math.floor(index/columns)*rowHeight, 0);
          group.add(surface);
          imageJobs.push({position: group.position.clone(), started: false, load: () => {
          loadArt(
            panel.image,
            (tex) => {
              if (disposed) {
                tex.dispose();
                return;
              }
              pendingImages--;
              const original = tex.image as HTMLImageElement;
              const scale = Math.min(1, 1024 / Math.max(original.width,original.height));
              if (scale < 1) {
                const reduced=document.createElement("canvas");
                reduced.width=Math.max(1,Math.round(original.width*scale));
                reduced.height=Math.max(1,Math.round(original.height*scale));
                reduced.getContext("2d")!.drawImage(original,0,0,reduced.width,reduced.height);
                (tex as THREE.Texture).image=reduced;
              }
              canvas.dataset.maxArtTexture=String(Math.max(Number(canvas.dataset.maxArtTexture ?? 0),(tex.image as HTMLImageElement).width,(tex.image as HTMLImageElement).height));
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = Math.min(
                8,
                renderer.capabilities.getMaxAnisotropy(),
              );
              textures.push(tex);
              canvas.dataset.loadedImages = String(++settledImages);
              const img = tex.image as HTMLImageElement;
              const ratio = img.width / img.height;
              const height = montage ? Math.min(variants ? 1.5 : .5,(variants ? 1.65 : .82)/ratio) : imageDimensions(work, ratio, slot, layout).height;
              const width = height * ratio;
              const m = new THREE.Mesh(
                new THREE.PlaneGeometry(width, height),
                new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
              );
              m.position.z = 0.08;
              m.userData.work = work;
              m.userData.inspectDistance=Math.max(8,new THREE.Vector3(...slot.camera).distanceTo(group.position)+1);
              surface.add(m);
              clickable.push(m);
              if (!montage && work.frame !== "none") {
                const frameMaterial = work.frame === "walnut" || work.frame === "fence-slats"
                  ? new THREE.MeshStandardMaterial({color: work.frame === "walnut" ? "#372319" : "#74634e", roughness:.88, bumpMap:plaster, bumpScale:.018})
                  : work.frame === "aluminum"
                    ? new THREE.MeshStandardMaterial({color:"#a6aaa7",roughness:.65,metalness:.7}) : trim;
                const rail=work.frame === "fence-slats" ? .11 : .04;
                box(
                  width + 2*rail + 0.02,
                  height + 2*rail + 0.02,
                  0.055,
                  0,
                  0,
                  0.01,
                  dark,
                  surface,
                );
                for (const x of [-(width+rail+.02)/2, (width+rail+.02)/2])
                  box(rail, height+.02, 0.07, x, 0, 0.055, frameMaterial, surface);
                for (const y of [-(height+rail+.02)/2, (height+rail+.02)/2])
                  box(width+2*rail+.02, rail, 0.07, 0, y, 0.055, frameMaterial, surface);
              }
              const title = label(montage ? String(index+1).padStart(2,"0") : work.title, montage ? .3 : Math.max(width,2), montage ? .09 : .18, montage ? 220 : 36);
              title.position.set(0,-height/2-(montage ? .08 : .28),.085);
              surface.add(title);
              if (!montage) {
                const tag=label(work.collection === "exhibition" ? "Exhibition reconstruction" : "Reader interpretation",2.4,.14,22,"#bcae95");
                tag.position.set(0,-height/2-.49,.085); surface.add(tag);
              }
              renderer.shadowMap.needsUpdate = true;
              invalidate();
            },
            () => {
              if (disposed) return;
              pendingImages--;
              canvas.dataset.loadedImages = String(++settledImages);
              const failed = label(
                "Image unavailable · open Collection",
                montage ? .8 : 3,
                montage ? .1 : .3,
                34,
              );
              surface.add(failed);
              invalidate();
            },
          );
          }});
          });
          if (montage) {
            const title=label(work.title,3.5,.18,36);title.position.set(0,montageSize.titleY,.085);group.add(title);
          }
        } else if (work.object !== "syrup-glass") {
          canvas.dataset.modeledObjects=String(Number(canvas.dataset.modeledObjects ?? 0)+1);
          const pedestal=box(1,1.08,1,0,.54,0,dark,group);
          const study=createObjectStudy(work.object!);
          study.position.y=1.1; group.add(study);
          const pool=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),poolMaterial);
          pool.rotation.x=-Math.PI/2;pool.position.y=-.012;group.add(pool);
          const fixture=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.22,12),dark);
          fixture.position.set(0,3.85,0);group.add(fixture);
          // One inspection volume covers gaps in sparse sculptures and small relics.
          const hitbox=box(.96,1.12,.96,0,1.65,0,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),group);
          hitbox.userData.work=work;clickable.push(hitbox);
          const title=label(work.title,1.05,.16,70); title.position.set(0,.78,.507);group.add(title);
          const tag=label("Exhibition reconstruction",1.03,.11,30,"#bcae95");tag.position.set(0,.55,.508);group.add(tag);
          pedestal.userData.work=work;clickable.push(pedestal);
          study.traverse(child=>{ if(child instanceof THREE.Mesh){child.userData.work=work;clickable.push(child);} });
          if (work.object==="film-screen" && work.referenceImage) {
            imageJobs.push({position:group.position.clone(),started:false,load:()=>{
              loadArt(work.referenceImage!,tex=>{
                if(disposed){tex.dispose();return;} pendingImages--;tex.colorSpace=THREE.SRGBColorSpace;
                const original=tex.image as HTMLImageElement, reduced=document.createElement("canvas");
                const scale=Math.min(1,1024/Math.max(original.width,original.height));
                reduced.width=Math.round(original.width*scale);reduced.height=Math.round(original.height*scale);
                reduced.getContext("2d")!.drawImage(original,0,0,reduced.width,reduced.height);(tex as THREE.Texture).image=reduced;textures.push(tex);
                const height=Math.min(.55,.84/(original.width/original.height));
                const screen=new THREE.Mesh(new THREE.PlaneGeometry(height*original.width/original.height,height),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
                screen.position.set(0,1.67,.091);screen.userData.work=work;group.add(screen);clickable.push(screen);
                canvas.dataset.loadedImages=String(++settledImages);invalidate();
              },()=>{if(!disposed){pendingImages--;canvas.dataset.loadedImages=String(++settledImages);invalidate();}});
            }});
          }
        } else {
          canvas.dataset.modeledObjects=String(Number(canvas.dataset.modeledObjects ?? 0)+1);
          const pedestal = box(1.0, 1.08, 1.0, 0, 0.54, 0, dark, group);
          pedestal.userData.work = work;
          clickable.push(pedestal);
          box(1.04, 0.025, 1.04, 0, 1.092, 0, stone, group);
          const vessel = new THREE.Group();
          vessel.position.y = 1.11;
          vessel.scale.setScalar(0.65);
          group.add(vessel);
          const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: "#ffffff",
            roughness: 0.08,
            metalness: 0,
            transmission: 1,
            thickness: 0.07,
            ior: 1.5,
            envMapIntensity: 1.2,
          });
          const points = [
            new THREE.Vector2(0.25, 0),
            new THREE.Vector2(0.27, 0.03),
            new THREE.Vector2(0.31, 0.62),
            new THREE.Vector2(0.295, 0.64),
            new THREE.Vector2(0.28, 0.61),
            new THREE.Vector2(0.24, 0.08),
            new THREE.Vector2(0.02, 0.08),
          ];
          const glass = new THREE.Mesh(
            new THREE.LatheGeometry(points, 64),
            glassMaterial,
          );
          glass.position.y = 0;
          glass.userData.work = work;
          vessel.add(glass);
          clickable.push(glass);
          const syrup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.268, 0.24, 0.39, 48),
            new THREE.MeshPhysicalMaterial({
              color: "#350008",
              roughness: 0.21,
              clearcoat: 1,
              metalness: 0.08,
            }),
          );
          syrup.position.y = 0.28;
          syrup.userData.work = work;
          vessel.add(syrup);
          clickable.push(syrup);
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.302, 0.012, 8, 64),
            new THREE.MeshStandardMaterial({
              color: "#e0d9cb",
              metalness: 0.55,
              roughness: 0.15,
            }),
          );
          rim.rotation.x = Math.PI / 2;
          rim.position.y = 0.637;
          vessel.add(rim);
          const smear = new THREE.Mesh(
            new THREE.CylinderGeometry(0.297, 0.278, 0.2, 48, 1, true, 0, 0.5),
            new THREE.MeshStandardMaterial({
              color: "#841523",
              roughness: 0.26,
              side: THREE.DoubleSide,
            }),
          );
          smear.position.y = 0.52;
          smear.rotation.y = 0.5;
          vessel.add(smear);
          const title = label(work.title, 1.05, 0.16, 70);
          title.position.set(0, 0.78, 0.507);
          group.add(title);
          const tag = label(
            "Exhibition reconstruction",
            1.03,
            0.11,
            30,
            "#bcae95",
          );
          tag.position.set(0, 0.55, 0.508);
          group.add(tag);
        }
      });
    }
    function setLook(target: THREE.Vector3) {
      camera.lookAt(target);
      lookYaw = camera.rotation.y;
      lookPitch = camera.rotation.x;
    }
    function reset() {
      camera.position.set(0, 1.7, 6.7);
      setLook(new THREE.Vector3(0, 1.7, -4));
      keys.clear();
      invalidate();
    }
    function visitReservation(id: string) {
      const slot=latest.current.layout?.reservations.find(r=>r.id===id);
      if (!slot) return;
      camera.position.fromArray(slot.camera);
      const target=new THREE.Vector3(...slot.position);
      if (slot.kind!=="panel") target.y=slot.kind==="object"?1.48:.15;
      setLook(target);keys.clear();invalidate();
    }
    function visit(id: string) {
      const slot=latest.current.layout?.reservations.find(r=>r.workId===id);
      if (slot) visitReservation(slot.id);
    }
    function visitRoom(id: string) {
      const room=latest.current.layout?.rooms.find(r=>r.id===id);
      if (!room) return;
      camera.position.fromArray(room.spawn);
      setLook(new THREE.Vector3(...room.look));keys.clear();invalidate();
    }
    function enter() {
      doors.visible = false;
      renderer.shadowMap.needsUpdate = true;
      reset();
    }
    runtime.current = { visit, visitRoom, visitReservation, setPlanning, reset, toggleMouseLook, keys, axes, install, enter, invalidate };
    if (latest.current.entered) {
      install(latest.current.works);
      enter();
    }
    function resize() {
      camera.aspect = root.clientWidth / root.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(root.clientWidth, root.clientHeight);
      invalidate();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();
    function targetAt(pointer: THREE.Vector2): Work | Reservation | undefined {
      camera.updateMatrixWorld();scene.updateMatrixWorld(true);
      ray.setFromCamera(pointer,camera);
      const targets=clickable.filter(o=>!o.userData.reservation || latest.current.planning);
      const hit=ray.intersectObjects([...targets,...occluders],false)[0];
      return hit && hit.distance<(hit.object.userData.inspectDistance ?? 8) ? hit.object.userData.work ?? hit.object.userData.reservation : undefined;
    }
    function inspectAt(x: number, y: number) {
      const r=canvas.getBoundingClientRect();
      pointer.set(((x-r.left)/r.width)*2-1,(-(y-r.top)/r.height)*2+1);
      const target=targetAt(pointer);
      if (target) latest.current.onSelect(target);
    }
    function down(e: PointerEvent) {
      if (!latest.current.entered || latest.current.paused) return;
      drag = true;
      dragged = false;
      px = e.clientX;
      py = e.clientY;
      if (document.pointerLockElement !== canvas) canvas.setPointerCapture(e.pointerId);
      canvas.focus();
    }
    function move(e: PointerEvent) {
      if (!latest.current.entered || latest.current.paused) return;
      const locked = document.pointerLockElement === canvas;
      if (!drag && !locked) {
        // Keep drag coordinates current while the pointer is free.
        px = e.clientX;
        py = e.clientY;
        return;
      }
      const dx = locked ? e.movementX : e.clientX - px,
        dy = locked ? e.movementY : e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      lookYaw -= dx * 0.0026;
      lookPitch = THREE.MathUtils.clamp(lookPitch - dy * 0.0026, -1.05, 1.05);
      camera.rotation.set(lookPitch, lookYaw, 0, "YXZ");
      invalidate();
    }
    function up(e: PointerEvent) {
      if (!latest.current.entered || latest.current.paused) return;
      drag = false;
      if (!dragged) {
        if (document.pointerLockElement === canvas) {
          const target = targetAt(new THREE.Vector2());
          if (target) latest.current.onSelect(target);
        } else inspectAt(e.clientX, e.clientY);
      }
    }
    let capturePending = false;
    function captureError() {
      capturePending = false;
      if (disposed) return;
      latest.current.onMouseLook(document.pointerLockElement === canvas);
      latest.current.onMouseLookError("Mouse capture unavailable. Drag to look; press M to retry.");
    }
    function toggleMouseLook() {
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
        return;
      }
      if (!latest.current.entered || latest.current.paused || capturePending) return;
      capturePending = true;
      try {
        if (!canvas.requestPointerLock) { captureError(); return; }
        // Request directly from the key event to retain the browser's user gesture.
        const request = canvas.requestPointerLock();
        request?.catch(captureError);
      } catch { captureError(); }
    }
    function pointerLockChanged() {
      capturePending = false;
      const locked = document.pointerLockElement === canvas;
      if (locked && ((latest.current.paused && !latest.current.retainMouseLook) || !latest.current.entered)) {
        document.exitPointerLock();
        return;
      }
      clear();
      latest.current.onMouseLook(locked);
      if (locked) {
        latest.current.onMouseLookError("");
        if (!latest.current.paused) canvas.focus();
      }
      invalidate();
    }
    function keydown(e: KeyboardEvent) {
      if (
        !latest.current.entered ||
        latest.current.paused ||
        e.defaultPrevented ||
        (e.target instanceof HTMLElement &&
          (e.target.isContentEditable || e.target.closest("input, textarea, select")))
      )
        return;
      const mapping: Record<string, string> = {
        KeyW: "forward",
        ArrowUp: "forward",
        KeyS: "back",
        ArrowDown: "back",
        KeyA: "left",
        ArrowLeft: "left",
        KeyD: "right",
        ArrowRight: "right",
      };
      if (mapping[e.code]) {
        keys.add(mapping[e.code]);
        invalidate();
        e.preventDefault();
      }
      if (e.code === "KeyE" && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        const target=targetAt(new THREE.Vector2());
        if (target) { e.preventDefault(); latest.current.onSelect(target); }
      }
    }
    function keyup(e: KeyboardEvent) {
      const mapping: Record<string, string> = {
        KeyW: "forward",
        ArrowUp: "forward",
        KeyS: "back",
        ArrowDown: "back",
        KeyA: "left",
        ArrowLeft: "left",
        KeyD: "right",
        ArrowRight: "right",
      };
      keys.delete(mapping[e.code]);
    }
    const clear = () => {
      keys.clear();axes[0]=axes[1]=0;
      drag = false;
    };
    const visibility = () => {
      clear();
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else invalidate();
    };
    const lost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      latest.current.onUnavailable();
    };
    const enterPointer=(e:PointerEvent)=>{px=e.clientX;py=e.clientY;};
    canvas.addEventListener("pointerenter",enterPointer);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", clear);
    document.addEventListener("pointerlockchange", pointerLockChanged);
    document.addEventListener("pointerlockerror", captureError);
    canvas.addEventListener("webglcontextlost", lost);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibility);
    // No perpetual loop: wake only for input, content changes or a resized view.
    function invalidate() {
      if (disposed || document.hidden || frame) return;
      prev = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function tick(now: number) {
      frame = 0;
      if (disposed || document.hidden) return;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (latest.current.paused) {
        keys.clear();axes[0]=axes[1]=0;
        if (!latest.current.retainMouseLook && document.pointerLockElement === canvas) document.exitPointerLock();
      }
      if (latest.current.entered && !latest.current.paused) {
        let f = Number(keys.has("forward")) - Number(keys.has("back")) - axes[1],
          s = Number(keys.has("right")) - Number(keys.has("left")) + axes[0];
        const norm = Math.max(1, Math.hypot(f, s));
        f /= norm;
        s /= norm;
        const next = camera.position.clone();
        next.x += (-Math.sin(lookYaw) * f + Math.cos(lookYaw) * s) * dt * 2.8;
        next.z += (-Math.cos(lookYaw) * f - Math.sin(lookYaw) * s) * dt * 2.8;
        const layout=latest.current.layout!;
        // Axis-separated resolution slides along dividers instead of sticking.
        if (canStand(layout,next.x,camera.position.z,latest.current.planning)) camera.position.x=next.x;
        if (canStand(layout,camera.position.x,next.z,latest.current.planning)) camera.position.z=next.z;
        {
          const work=targetAt(new THREE.Vector2());
          if ((work?.id ?? "") !== lastNear) {
            lastNear = work?.id ?? "";
            latest.current.onNear(work);
          }
        }
      }
      if (latest.current.entered && latest.current.layout) {
        const room=locationAt(latest.current.layout,camera.position.x,camera.position.z);
        if (room && room.id!==lastRoom) { lastRoom=room.id; latest.current.onRoom(room.id); }
        canvas.dataset.room=lastRoom;
        canvas.dataset.planning=String(latest.current.planning);
      }
      updateNearbyArt();
      renderer.render(scene, camera);
      canvas.dataset.look=`${lookYaw.toFixed(3)},${lookPitch.toFixed(3)}`;
      canvas.dataset.position = `${camera.position.x.toFixed(2)},${camera.position.z.toFixed(2)}`;
      if (latest.current.entered && !latest.current.paused && (keys.size || axes.some(value=>value!==0)))
        frame = requestAnimationFrame(tick);
    }
    invalidate();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerlockchange", pointerLockChanged);
      document.removeEventListener("pointerlockerror", captureError);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      textures.forEach((t) => t.dispose());
      environment.dispose();
      renderer.dispose();
      canvas.remove();
      runtime.current = undefined;
    };
  }, []);
  useEffect(() => {
    if (props.entered) {
      runtime.current?.install(props.works);
      runtime.current?.enter();
    }
  }, [props.entered, props.works, props.layout]);
  useEffect(() => { runtime.current?.setPlanning(); }, [props.planning]);
  useEffect(() => {
    if (props.paused) runtime.current?.keys.clear();
    runtime.current?.invalidate();
  }, [props.paused, props.retainMouseLook]);
  return (
    <div
      ref={host}
      className="scene"
      aria-hidden={!props.entered || props.paused}
      inert={!props.entered || props.paused}
    />
  );
});
