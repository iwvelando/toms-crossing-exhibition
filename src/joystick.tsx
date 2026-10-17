import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
export function Joystick({onMove}:{onMove:(x:number,y:number)=>void}) {
  const [point,setPoint]=useState([0,0]);const active=useRef<number | undefined>(undefined);
  const callback=useRef(onMove);callback.current=onMove;
  const reset=()=>{active.current=undefined;setPoint([0,0]);callback.current(0,0);};
  useEffect(()=>{
    const clear=()=>reset();window.addEventListener("blur",clear);document.addEventListener("visibilitychange",clear);
    return()=>{window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",clear);callback.current(0,0);};
  },[]);
  function move(e:PointerEvent<HTMLDivElement>){
    if(active.current!==e.pointerId)return;
    const rect=e.currentTarget.getBoundingClientRect(),radius=rect.width*.34;
    let x=(e.clientX-rect.left-rect.width/2)/radius,y=(e.clientY-rect.top-rect.height/2)/radius;
    const magnitude=Math.hypot(x,y);if(magnitude>1){x/=magnitude;y/=magnitude;}
    setPoint([x*radius,y*radius]);
    const amount=Math.max(0,(Math.min(1,magnitude)-.12)/.88);
    callback.current(magnitude?x/Math.min(1,magnitude)*amount:0,magnitude?y/Math.min(1,magnitude)*amount:0);
  }
  return <div className="movement-joystick" role="group" aria-label="Movement joystick" tabIndex={0}
    aria-description="Drag to walk. Release to stop. Use your other thumb to look around. Keyboard users can use W A S D or arrow keys."
    onContextMenu={e=>e.preventDefault()} onBlur={reset}
    onPointerDown={e=>{if(active.current!==undefined)return;e.preventDefault();active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}}
    onPointerMove={move} onPointerUp={e=>{reset();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
    onPointerCancel={reset} onLostPointerCapture={reset}>
    <span className="joystick-directions" aria-hidden="true">✦</span>
    <span className="joystick-knob" style={{transform:`translate(${point[0]}px, ${point[1]}px)`}} aria-hidden="true" />
  </div>;
}
