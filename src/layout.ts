export type Point = [number, number];
export type Vector = [number, number, number];
export type Bounds = [number, number, number, number];
export type Room = {
  id: string; title: string; subtitle: string; bounds: Bounds;
  spawn: Vector; look: Vector; tone: string; number: string;
  headingWall?: "north" | "east";
  headingHeight?: number;
};
export type Reservation = {
  id: string; room: string; kind: "panel" | "object" | "installation";
  group: boolean; assetStatus: "ready" | "planned";
  placementStatus: "candidate" | "verified";
  position: Vector; camera: Vector; angle: number; footprint: Vector;
  workId?: string;
  displaySize?: [number, number];
};
export type Layout = {
  version: 1;
  rooms: Room[];
  floors: { id: string; bounds: Bounds; tone: string; ceilingHeight?: number }[];
  walls: { a: Point; b: Point; room: string; tone: string; partition: boolean; height?: number }[];
  reservations: Reservation[];
};
export const reservationTitle = (r: Reservation) =>
  `${r.group ? "Group bay" : r.kind === "panel" ? "Wall panel" : r.kind === "object" ? "Object study" : "Installation area"} · ${r.id.slice(-3)}`;
export function contains(b: Bounds, x: number, z: number) {
  return x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3];
}
export function roomAt(layout: Layout, x: number, z: number) {
  return layout.rooms.find(r => contains(r.bounds, x, z)) ??
    (contains([15,20,-34.5,-28.5], x,z) ? layout.rooms.find(r => r.id === "chamber-3") : undefined);
}
export function locationLabel(layout: Layout, id: string) {
  const room=layout.rooms.find(r=>r.id===id);
  if (room) return room;
  const passage=/^passage-(\d)-(\d)$/.exec(id);
  return {title: id==="foyer" ? "Foyer" : "Passage", subtitle: passage
    ? `Between Chambers ${passage[1]} and ${passage[2]}`
    : id==="passage-annex" ? "To Recollections"
    : id==="passage-memory" ? "Sunday’s connected bays"
    : id==="passage-return" ? "Sunday to Some of what comes after"
    : id==="passage-response" ? "To the exhibition intermission"
    : "The exhibition"};
}
export function locationAt(layout: Layout, x: number, z: number) {
  const room=roomAt(layout,x,z);
  if (room) return room;
  const floor=layout.floors.find(f=>contains(f.bounds,x,z));
  return floor ? {id:floor.id,...locationLabel(layout,floor.id)} : undefined;
}
export function segmentDistance(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x-a[0])*dx + (z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-t*dx, z-a[1]-t*dz);
}
export function canStand(layout: Layout, x: number, z: number, planning: boolean) {
  // Test a walking radius against the union of floors; portals remain connected.
  for (const [dx,dz] of [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3],[.22,.22],[-.22,.22],[.22,-.22],[-.22,-.22]])
    if (!layout.floors.some(f => contains(f.bounds,x+dx,z+dz))) return false;
  if (layout.walls.some(w => segmentDistance(x,z,w.a,w.b) < .43)) return false;
  return !layout.reservations.some(r => r.kind === "object" &&
    (planning || r.assetStatus === "ready") &&
    Math.abs(x-r.position[0]) < r.footprint[0]/2+.3 &&
    Math.abs(z-r.position[2]) < r.footprint[2]/2+.3);
}
export function validateLayout(layout: Layout, workIds: string[]) {
  if (layout.version !== 1 || !Array.isArray(layout.rooms) || !Array.isArray(layout.reservations))
    throw new Error("The room plan could not be loaded.");
  const ids = new Set(layout.reservations.map(r => r.id));
  if (ids.size !== layout.reservations.length) throw new Error("Duplicate display positions.");
  for (const id of workIds)
    if (layout.reservations.filter(r => r.workId === id && r.assetStatus === "ready").length !== 1)
      throw new Error("An artwork needs exactly one ready display position.");
}
