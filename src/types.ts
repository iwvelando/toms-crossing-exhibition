export type Work = {
  id: string;
  title: string;
  collection: "exhibition" | "interpretation";
  medium: string;
  description: string;
  attribution: string;
  credit: string;
  note: string;
  alt: string;
  placement?: { room: string; label: string; note: string };
  image?: string;
  wallText?: string;
  panels?: { title: string; alt: string; image: string }[];
  object?: "syrup-glass" | "diorama" | "horse-sculpture" | "wax-rider" | "boxed-gear" | "relic-case" | "film-screen" | "stump-case" | "shard-case" | "scree-relief" | "stone-boxes" | "geology" | "ropes" | "screen-installation" | "bronze-figure" | "marble-figure" | "hologram-figure" | "broken-bowl" | "scroll-case" | "bone-cliffs" | "mesh-cloth" | "ash-bin" | "plastic-bag" | "cartridge-cases" | "tin-can" | "snowball" | "revolver-case" | "audio-station";
  presentation?: "sequence" | "variants";
  referenceImage?: string;
  frame?: "gallery" | "none" | "walnut" | "aluminum" | "fence-slats";
};
export type Catalog = {
  version: 1;
  title: string;
  author: string;
  works: Work[];
};
export type GalleryHandle = {
  toggleMouseLook: () => void;
  visit: (id: string) => void;
  visitRoom: (id: string) => void;
  visitReservation: (id: string) => void;
  reset: () => void;
  steer: (x: number, y: number) => void;
  move: (direction: string, pressed: boolean) => void;
};
