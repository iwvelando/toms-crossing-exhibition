import { useState } from "react";
export function ArtImage({ image, alt, lazy=false }: { image: string; alt: string; lazy?: boolean }) {
  const [failed,setFailed]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const url=`/collection/${image}${attempt ? `?retry=${attempt}` : ""}`;
  if (failed) return <div className="image-error" role="status">
    <p>The artwork image could not be loaded.</p>
    <p className="quiet">{alt}</p>
    <button type="button" className="text-action" onClick={e=>{e.stopPropagation();setFailed(false);setAttempt(n=>n+1);}}>Retry image <span>↻</span></button>
  </div>;
  return <img key={url} src={url} alt={alt} loading={lazy?"lazy":"eager"} onError={()=>setFailed(true)} />;
}
