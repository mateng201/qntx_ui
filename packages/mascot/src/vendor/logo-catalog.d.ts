type Point = { x: number; y: number };

export type CatalogFrame = {
  outer: Point[];
  hole: Point[];
  left: Point[];
  right: Point[];
  colors: { body: string; eyes: string };
};

/** Pure animation engine extracted from the supplied second logo component. */
export function createCatalogAnimation(now?: () => number): {
  sample: (time: number) => CatalogFrame;
};
