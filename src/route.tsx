import { reservationTitle, type Layout, type Reservation } from "./layout";

type Props = { layout: Layout; current: string; planning: boolean; onPlanning: (value: boolean) => void; onVisit: (id: string) => void; onReview: (r: Reservation) => void };
export function RoutePanel({ layout, current, planning, onPlanning, onVisit, onReview }: Props) {
  return <>
    <p className="eyebrow">FIVE DAYS / SOME OF WHAT COMES AFTER</p>
    <h2 id="dialog-title">Find your way.</h2>
    <p>Follow the five days counterclockwise, then continue into Some of what comes after. Scene interpretations join the day in which the story tells them, including memories and imagined possibilities. The room shapes and partitions are an interpretation.</p>
    <RouteMap layout={layout} current={current} />
    <label className="planning-toggle">
      <input type="checkbox" checked={planning} onChange={e => onPlanning(e.target.checked)} />
      <span>Show planning placeholders</span>
    </label>
    <p className="quiet">{layout.reservations.length} reserved positions · {layout.reservations.filter(r => r.assetStatus === "ready").length} installed works · {layout.reservations.filter(r => r.group).length} group bays. Group bays can expand into several works. Placeholder sizes and candidate placements remain provisional.</p>
    <div className="room-list">
      {layout.rooms.map(r => <button key={r.id} className="room-link" onClick={() => onVisit(r.id)}>
        <span className="room-number">{r.number}</span>
        <span><strong>{r.title}</strong><small>{r.subtitle}</small></span><span aria-hidden="true">↗</span>
      </button>)}
    </div>
    <p className="quiet">Sunday extends through two connected bays. The closing chapter follows directly. Recollections and the exhibition intermission remain distinct from the closing chapter; the in-book artworks retain their described chamber groupings.</p>
    {planning && <details className="position-list">
      <summary>Review reserved positions</summary>
      <p>These neutral studies reserve space; they are not reconstructions of the missing art.</p>
      <div>{layout.reservations.filter(r => r.assetStatus === "planned").map(r => <button key={r.id} onClick={() => onReview(r)}>{reservationTitle(r)}</button>)}</div>
    </details>}
  </>;
}
function RouteMap({ layout, current }: { layout: Layout; current: string }) {
  const minX=Math.min(...layout.floors.map(f=>f.bounds[0]))-4;
  const maxX=Math.max(...layout.floors.map(f=>f.bounds[1]))+4;
  const minZ=Math.min(...layout.floors.map(f=>f.bounds[2]))-4;
  const maxZ=Math.max(...layout.floors.map(f=>f.bounds[3]))+4;
  return <svg className="route-map" viewBox={`${minX} ${minZ} ${maxX-minX} ${maxZ-minZ}`} role="img" aria-label={`Complete gallery plan: ${layout.rooms.map(r=>r.title).join(", ")}. Choose a room in the list below.`}>
    {layout.floors.map(f => <rect key={f.id} x={f.bounds[0]} y={f.bounds[2]} width={f.bounds[1]-f.bounds[0]} height={f.bounds[3]-f.bounds[2]} fill="#303d34" />)}
    {layout.rooms.map(r => <rect key={r.id} x={r.bounds[0]} y={r.bounds[2]} width={r.bounds[1]-r.bounds[0]} height={r.bounds[3]-r.bounds[2]} fill={r.id === current ? "#606b4f" : r.tone === "light" ? "#475345" : "#303d34"} />)}
    {layout.walls.map((w,i) => <line key={i} x1={w.a[0]} y1={w.a[1]} x2={w.b[0]} y2={w.b[1]} stroke="#a5aa91" strokeWidth={w.partition ? .35 : .5} />)}
    <path d="M 3 -6 H 28 V -15 H 33 V -39 H -53 V -28 H -63 V -7" fill="none" stroke="#e2c394" strokeWidth=".55" strokeDasharray="1 1" />
    <path d="M 17 -7 L 19 -6 L 17 -5 M 32 -22 L 33 -24 L 34 -22 M 18 -40 L 16 -39 L 18 -38 M -15 -40 L -17 -39 L -15 -38 M -64 -23 L -63 -21 L -62 -23" fill="none" stroke="#e2c394" strokeWidth=".7" />
    {layout.rooms.map(r => <g key={r.id}><title>{r.title}</title>
      <circle cx={(r.bounds[0]+r.bounds[1])/2} cy={(r.bounds[2]+r.bounds[3])/2} r="4.4" fill="#131e18" />
      <text x={(r.bounds[0]+r.bounds[1])/2} y={(r.bounds[2]+r.bounds[3])/2+.1} textAnchor="middle" dominantBaseline="middle" fill="#f5e4c7" fontSize="5.8" fontFamily="Georgia">{r.number}</text>
    </g>)}
  </svg>;
}
