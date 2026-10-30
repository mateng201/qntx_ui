type Point = { x: number; y: number };
/** Pointer offsets normalized to -1..1; geometry remains independent of browser APIs. */
export type MascotGaze = { x: number; y: number };

export type CatalogFrame = {
  outer: Point[];
  hole: Point[];
  left: Point[];
  right: Point[];
  colors: { body: string; eyes: string };
};

/** Pure animation engine extracted from the supplied second logo component. */
export function createCatalogAnimation(
  now?: () => number,
  options?: { directGeometry?: boolean },
): {
  sample: (time: number, gaze?: MascotGaze) => CatalogFrame;
  setLookDirection: (direction: MascotGaze | undefined) => string | undefined;
};
