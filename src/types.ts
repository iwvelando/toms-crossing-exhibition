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
  object?: "syrup-glass";
};
export type Catalog = {
  version: 1;
  title: string;
  author: string;
  works: Work[];
};
export type GalleryHandle = {
  visit: (id: string) => void;
  visitRoom: (id: string) => void;
  visitReservation: (id: string) => void;
  reset: () => void;
  move: (direction: string, pressed: boolean) => void;
};
