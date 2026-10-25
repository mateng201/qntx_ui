import contours from "./rest.json";
import type { CatalogFrame } from "./vendor/logo-catalog.js";

type Point = { x: number; y: number };

// The painter applies a 0.86 safety inset to animation geometry. Undo it only for the
// static frame, so the transition starts and ends at the exact original Q size.
const restorePoint = (point: number[]): Point => ({
  x: (point[0] ?? 0) / 0.86,
  y: (point[1] ?? 0) / 0.86,
});

export const staticMascotFrame: CatalogFrame = {
  outer: contours.outer.map(restorePoint),
  hole: contours.hole.map(restorePoint),
  left: [],
  right: [],
  colors: { body: "currentColor", eyes: "#ffffff" },
};

function ease(progress: number): number {
  const amount = Math.min(1, Math.max(0, progress));
  return amount * amount * (3 - 2 * amount);
}

function collapse(points: Point[], amount: number): Point[] {
  if (amount <= 0.001 || points.length === 0) {
    return [];
  }
  const center = { x: 0, y: 0 };
  for (const point of points) {
    center.x += point.x / points.length;
    center.y += point.y / points.length;
  }
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * amount,
    y: center.y + (point.y - center.y) * amount,
  }));
}

/** Closed paths can start at different vertices: align them once to prevent twisting. */
function align(from: Point[], to: Point[]): Point[] {
  if (from.length === 0 || from.length !== to.length) {
    return from;
  }
  let bestOffset = 0;
  let bestDirection = 1;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const direction of [1, -1]) {
    for (let offset = 0; offset < from.length; offset += 1) {
      let cost = 0;
      for (let index = 0; index < from.length; index += 1) {
        const point = from[(offset + index * direction + from.length) % from.length];
        if (point === undefined) {
          continue;
        }
        const target = to[index] ?? point;
        cost += (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
        if (cost >= bestCost) {
          break;
        }
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestOffset = offset;
        bestDirection = direction;
      }
    }
  }
  return to.map(
    (_, index) =>
      from[(bestOffset + index * bestDirection + from.length) % from.length] ?? { x: 0, y: 0 },
  );
}

function blend(from: Point[], to: Point[], progress: number): Point[] {
  if (to.length === 0) {
    return collapse(from, 1 - ease(progress / 0.55));
  }
  if (from.length === 0) {
    return collapse(to, ease((progress - 0.45) / 0.55));
  }
  const amount = ease(progress);
  return from.map((point, index) => {
    const target = to[index] ?? point;
    return {
      x: point.x + (target.x - point.x) * amount,
      y: point.y + (target.y - point.y) * amount,
    };
  });
}

export function createMascotMorph(
  from: CatalogFrame,
  target: CatalogFrame,
): (to: CatalogFrame, progress: number) => CatalogFrame {
  const start = {
    outer: align(from.outer, target.outer),
    hole: align(from.hole, target.hole),
    left: align(from.left, target.left),
    right: align(from.right, target.right),
  };
  return (to, progress) => ({
    outer: blend(start.outer, to.outer, progress),
    hole: blend(start.hole, to.hole, progress),
    left: blend(start.left, to.left, progress),
    right: blend(start.right, to.right, progress),
    // Neutral transition colors avoid an abrupt palette swap at either endpoint.
    colors: { body: "currentColor", eyes: "#ffffff" },
  });
}
