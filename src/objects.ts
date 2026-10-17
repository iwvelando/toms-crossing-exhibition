import * as T from "three";
import type { Work } from "./types";

/** Small, static spatial studies. Detailed references remain separate inspection images. */
export function createObjectStudy(kind: NonNullable<Work["object"]>) {
  const root=new T.Group();
  const material=(color:string,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:.65});
  const wood=material("#705039"), dark=material("#252b29"), stone=material("#9b9684"), brass=material("#ac8c4b",.65), silver=material("#a8b3b5",.65);
  const cloth=material("#d3c4a0"), bronze=material("#85704d",.65);
  const glass=new T.MeshStandardMaterial({color:"#b9d1d4",transparent:true,opacity:.13,roughness:.25,depthWrite:false,side:T.DoubleSide});
  const mesh=(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Group=root)=>{
    const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;
  };
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=wood,parent=root)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
  const ball=(r:number,x:number,y:number,z:number,m:T.Material=stone,parent=root)=>mesh(new T.IcosahedronGeometry(r,1),m,x,y,z,parent);
  const rod=(a:number[],b:number[],r:number,m:T.Material=wood,parent=root)=>{
    const from=new T.Vector3(...a),to=new T.Vector3(...b),v=to.clone().sub(from);
    const o=mesh(new T.CylinderGeometry(r,r,v.length(),12),m,...from.clone().add(to).multiplyScalar(.5).toArray() as [number,number,number],parent);
    o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
  };
  const ring=(r:number,t:number,x:number,y:number,z:number,m:T.Material=brass)=>mesh(new T.TorusGeometry(r,t,8,36),m,x,y,z);
  const caseBox=()=>{
    box(1,.06,.8,0,.03,0,dark);
    for(const x of [-.48,.48])for(const z of [-.38,.38])rod([x,.06,z],[x,1.1,z],.016,silver);
    for(const y of [.06,1.1]){rod([-.48,y,-.38],[.48,y,-.38],.016,silver);rod([-.48,y,.38],[.48,y,.38],.016,silver);rod([-.48,y,-.38],[-.48,y,.38],.016,silver);rod([.48,y,-.38],[.48,y,.38],.016,silver);}
    box(.94,1,.74,0,.58,0,glass);
  };
  function figure(x:number,y:number,z:number,m:T.Material,reach=false,scale=1){
    const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);root.add(g);
    const body=ball(.22,0,.63,0,m,g);body.scale.set(.8,1.5,.65);
    ball(.12,.02,.99,0,m,g);
    rod([0,.43,0],[-.17,.08,.05],.075,m,g);rod([0,.43,0],[.18,.12,-.09],.075,m,g);
    rod([-.09,.83,0],[-.25,.56,.14],.055,m,g);rod([.1,.83,0],[reach?.39:.25,reach?1.2:.57,.1],.055,m,g);
    if(reach)mesh(new T.CylinderGeometry(.085,.075,.12,16),brass,-.18,.53,.17,g);
    return g;
  }
  function horse(x:number,y:number,z:number,m:T.Material,rider=false,scale=.7){
    const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);root.add(g);
    const torso=ball(.25,0,.5,0,m,g);torso.scale.set(1.5,.85,.65);
    rod([.25,.55,0],[.4,.92,0],.13,m,g);const head=ball(.15,.46,.92,0,m,g);head.scale.set(1.35,.85,.8);
    for(const sx of [-.23,.23])for(const sz of [-.12,.12])rod([sx,.46,sz],[sx+.07,.04,sz],.04,m,g);
    rod([-.3,.6,0],[-.49,.18,0],.035,m,g);
    for(const z of [-.065,.065])rod([.4,1,z],[.39,1.13,z],.025,m,g);
    if(rider){box(.17,.29,.2,0,.83,0,cloth,g);ball(.09,0,1.07,0,cloth,g);mesh(new T.CylinderGeometry(.15,.15,.025,20),cloth,0,1.15,0,g);}
    return g;
  }
  const rockField=(count=24,raised=false)=>{
    for(let i=0;i<count;i++){
      const x=((i*37)%97)/97-.5,z=((i*53)%89)/89-.5;
      const r=.06+((i*19)%11)/90;
      const a=ball(r,x,.08+(raised?(x+.5)*.7:0),z,stone);a.rotation.set(i*.7,i*.3,0);
    }
  };
  switch(kind){
    case "diorama":
      box(1.4,.07,.8,0,.035,0);horse(-.4,.08,0,dark,true,.4);horse(0,.08,0,wood,false,.4);horse(.4,.08,0,material("#617882"),true,.4);
      rod([-.4,.11,.28],[.36,.11,.28],.06);for(let i=0;i<6;i++)rod([-.3+i*.04,.1,-.28],[-.25+i*.04,.14,-.18],.025,material(i%2?"#ae4b27":"#e4a653"));break;
    case "horse-sculpture":case "wax-rider": {
      const wax=kind==="wax-rider",m=wax?material("#bfa052"):bronze;
      for(let i=0;i<5;i++)box(.24,.1+i*.14,.7,-.48+i*.24,(.1+i*.14)/2,0,wood);
      const h=horse(wax?0:.05,wax?.45:.5,0,m,true,.7);h.rotation.z=wax?-.35:.35;break;
    }
    case "boxed-gear":
      box(1.2,1,.08,0,.5,-.12);for(let i=0;i<4;i++)box(.025,1,.32,-.6+i*.4,.5,0);for(let i=0;i<4;i++)box(1.2,.025,.32,0,i/3,0);
      for(let i=0;i<9;i++) {const x=(i%3-1)*.4,y=Math.floor(i/3)/3+.16;if(i%3===0)ring(.09,.022,x,y,.05,cloth);else if(i%3===1)box(.21,.21,.12,x,y,.02,stone);else mesh(new T.CylinderGeometry(.06,.065,.22,16),silver,x,y,.04);}break;
    case "relic-case":caseBox();{const n=mesh(new T.SphereGeometry(.15,20,12,0,Math.PI*1.5,0,Math.PI/2),material("#b9a08c"),0,.14,0);n.rotation.z=.4;ball(.05,-.08,.14,.06,material("#4c2220"));}break;
    case "film-screen":box(.95,.64,.1,0,.57,0,dark);rod([0,0,0],[0,.3,0],.035,silver);box(.5,.04,.3,0,.02,0,dark);break;
    case "stump-case":caseBox();mesh(new T.CylinderGeometry(.2,.3,.58,11),wood,0,.36,0);for(let i=0;i<9;i++)ball(.1,Math.cos(i)*.2,.1,Math.sin(i)*.2,cloth);rod([0,1.1,0],[0,.94,0],.022,silver);box(.66,.035,.53,0,.09,0,silver);break;
    case "shard-case":caseBox();for(let i=0;i<25;i++){const s=mesh(new T.ConeGeometry(.065,.25,3),material(["#c1d9d2","#d8c8a1","#829ab1"][i%3],.4),Math.sin(i*7)*.34,.15+(i%5)*.12,Math.cos(i*3)*.28);s.rotation.set(i,i*.2,0);}break;
    case "scree-relief":box(1.1,.06,1.1,0,.03,0);rockField();break;
    case "stone-boxes":
      for(let i=0;i<3;i++){const x=(i-1)*.45;box(.43,.035,.6,x,.02,0);for(const z of [-.3,.3])box(.43,.16,.025,x,.1,z);for(const dx of [-.21,.21])box(.025,.16,.6,x+dx,.1,0);for(let k=0;k<12;k++)ball(.028+i*.013,x+Math.sin(k*4)*.14,.09+(k%3)*.025,Math.cos(k*2)*.21,i?stone:silver);}break;
    case "geology":rockField(40,true);for(let i=0;i<6;i++){const m=box(.3,.025,.2,Math.sin(i)*.3,.2+i*.1,Math.cos(i)*.3,i%2?wood:silver);m.rotation.z=i*.4;}break;
    case "ropes":
      box(1.15,1.15,.05,0,.575,-.1,dark);for(let i=0;i<3;i++)for(let j=0;j<5;j++){const o=ring(.19+j*.012,.012,(i-1)*.36,.67,.02+j*.009,material(["#b7a666","#68846a","#89718c"][i]));o.scale.x=.55;}break;
    case "screen-installation":
      for(let i=0;i<3;i++){const screen=box(.55,.95,.015,(i-1)*.28,.55+i*.04,(i-1)*.22,glass);screen.rotation.y=(i-1)*.35;rod([(i-1)*.28,0,(i-1)*.22],[(i-1)*.28,1.1,(i-1)*.22],.008,silver);}box(1.15,.03,1,0,.015,0,dark);break;
    case "bronze-figure":case "marble-figure":case "hologram-figure": {
      const m=kind==="bronze-figure"?bronze:kind==="marble-figure"?material("#d8d0ba"):new T.MeshStandardMaterial({color:"#91d5d8",emissive:"#487b84",emissiveIntensity:.4,transparent:true,opacity:.45,depthWrite:false});
      const f=figure(0,0,0,m,true);f.rotation.z=-.15;
      if(kind==="marble-figure"){rod([-.4,0,-.2],[-.4,.85,-.2],.04,stone);rod([.4,0,-.2],[.4,.85,-.2],.04,stone);mesh(new T.TorusGeometry(.4,.04,8,24,Math.PI),stone,0,.85,-.2);}
      box(.7,.05,.55,0,.025,0,dark);break;
    }
    case "broken-bowl": {
      const points=[new T.Vector2(.05,0),new T.Vector2(.2,.02),new T.Vector2(.34,.3),new T.Vector2(.325,.31),new T.Vector2(.18,.05)];
      mesh(new T.LatheGeometry(points,40,.3,Math.PI*1.7),cloth,0,.02,0);break;
    }
    case "scroll-case":caseBox();{const tube=mesh(new T.CylinderGeometry(.1,.1,.42,24,1,true),brass,-.2,.2,0);tube.rotation.z=Math.PI/2;box(.46,.015,.23,.14,.15,.03,cloth);ring(.15,.018,.28,.4,.16);rod([.28,.1,.16],[.28,.25,.16],.015,brass);}break;
    case "bone-cliffs":
      for(let i=0;i<22;i++){const x=(i%11-5)*.08,z=Math.floor(i/11)*.23-.1,h=.4+.25*Math.sin(i*.8)**2;rod([x,.02,z],[x,h,z],.025,cloth);ball(.044,x,.04,z,cloth);ball(.044,x,h,z,cloth);ball(.1,x,h+.04,z,material("#deded5"));}break;
    case "mesh-cloth":
      for(const x of [-.5,.5])rod([x,0,0],[x,1.1,0],.012,silver);rod([-.5,1.1,0],[.5,1.1,0],.006,silver);
      for(let i=0;i<10;i++)for(let j=0;j<5;j++){const x=-.45+i*.1,y=.95-j*.13-.15*Math.sin(i/9*Math.PI);rod([x,y,0],[x+.06,y-.1,0],.008,cloth);rod([x,y,0],[x+.08,y,0],.008,cloth);}break;
    case "ash-bin":case "tin-can": {
      const h=kind==="ash-bin"?.7:.4,r=kind==="ash-bin"?.3:.2;
      mesh(new T.CylinderGeometry(r,r*.92,h,32,1,true),silver,0,h/2,0);const rim=ring(r,.014,0,h,0,silver);rim.rotation.x=Math.PI/2;
      mesh(new T.CylinderGeometry(r*.9,r*.9,.02,32),kind==="ash-bin"?stone:dark,0,kind==="ash-bin"?h-.06:.02,0);
      if(kind==="ash-bin")for(let i=0;i<20;i++)ball(.035,Math.sin(i*5)*.23,h-.025,Math.cos(i*7)*.23,stone);break;
    }
    case "plastic-bag": {
      box(.65,.8,.13,0,.42,0,glass);rod([-.33,.83,0],[.33,.83,0],.008,material("#a56f67"));
      for(let i=0;i<18;i++){const b=ball(.035,Math.sin(i*4)*.25,.09+Math.abs(Math.sin(i))* .6,.065,material("#493628"));b.scale.set(.4,1.5,.2);}break;
    }
    case "cartridge-cases":
      for(let i=0;i<2;i++){const c=new T.Group();root.add(c);c.position.set((i-.5)*.32,.12,0);if(i)c.rotation.z=Math.PI/2;mesh(new T.CylinderGeometry(.075,.085,.32,24,1,true),brass,0,.16,0,c);mesh(new T.CylinderGeometry(.092,.092,.025,24),brass,0,.015,0,c);}break;
    case "snowball":
      ball(.22,0,.25,0,stone);for(let i=0;i<12;i++){const p=mesh(new T.ConeGeometry(.055,.22,3),silver,Math.sin(i*5)*.19,.25+Math.cos(i*5)*.19,Math.sin(i*2)*.15);p.rotation.set(i,i*2,i*.3);}break;
    case "revolver-case":
      caseBox();box(.78,.025,.45,0,.1,0,material("#36233e"));rod([-.02,.27,0],[.37,.27,0],.035,silver);box(.21,.12,.07,-.12,.25,0,silver);mesh(new T.CylinderGeometry(.07,.07,.13,14),silver,-.1,.26,0).rotation.z=Math.PI/2;box(.075,.22,.07,-.23,.17,0,wood).rotation.z=-.3;ring(.055,.009,-.15,.18,.03,silver);break;
    case "audio-station":
      for(const x of [-.32,.32]){box(.22,.42,.2,x,.21,0,dark);for(const y of [.13,.3]){const speaker=mesh(new T.CylinderGeometry(.065,.065,.01,24),silver,x,y,.106);speaker.rotation.x=Math.PI/2;}}
      box(.3,.16,.23,0,.08,0,dark);break;
    default: throw new Error(`No spatial study for ${kind}`);
  }
  // Every freestanding study fits the shared one-metre plinth and collision footprint.
  root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const scale=Math.min(.9/Math.max(size.x,.01),.9/Math.max(size.z,.01),1.1/Math.max(size.y,.01));
  for(const child of root.children){child.position.x-=center.x;child.position.y-=bounds.min.y;child.position.z-=center.z;}
  root.scale.setScalar(scale);
  return root;
}
