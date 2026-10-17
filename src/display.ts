import type { Layout, Reservation } from "./layout";
import type { Work } from "./types";

export function frameMargin(work: Work) {
  return work.frame === "none" ? 0 : 2 * (work.frame === "fence-slats" ? .11 : .04) + .02;
}

export function imageDimensions(work: Work, ratio: number, slot: Reservation, layout: Layout) {
  let maxWidth = slot.displaySize?.[0] ?? 3.45;
  const [x, , z] = slot.position;
  const tx = Math.cos(slot.angle), tz = -Math.sin(slot.angle);
  for (const wall of layout.walls) {
    const dx = wall.b[0] - wall.a[0], dz = wall.b[1] - wall.a[1];
    const length = Math.hypot(dx, dz);
    if (!length || Math.abs((tx * dx + tz * dz) / length) < .999) continue;
    const along = ((x-wall.a[0])*dx + (z-wall.a[1])*dz) / length;
    const distance = Math.abs((x-wall.a[0])*dz - (z-wall.a[1])*dx) / length;
    if (distance > .3 || along < 0 || along > length) continue;
    // Keep the whole frame clear of a perpendicular display's projecting face.
    const available = 2 * (Math.min(along, length-along) - .3) - frameMargin(work);
    maxWidth = Math.min(maxWidth, Math.max(.1, available));
  }
  const height = Math.min(slot.displaySize?.[1] ?? 2.18, maxWidth / ratio);
  return { width: height * ratio, height };
}
