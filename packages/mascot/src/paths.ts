import { brandMarkPath } from "@qntx-ui/content";

import type { CatalogFrame } from "./vendor/logo-catalog.js";

type Point = { x: number; y: number };

function coordinate(value: number): string {
  return String(Math.round(value * 8600) / 10_000);
}

// Both renderers retain the original 0.86 safety inset and spline geometry.
export function contourPath(points: Point[]): string {
  const [first] = points;
  if (first === undefined) {
    return "";
  }
  let path = `M${coordinate(first.x)} ${coordinate(first.y)}`;
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length] ?? first;
    const point = points[index] ?? first;
    const next = points[(index + 1) % points.length] ?? first;
    const following = points[(index + 2) % points.length] ?? first;
    path += `C${coordinate(point.x + (next.x - previous.x) / 6)} ${coordinate(point.y + (next.y - previous.y) / 6)} ${coordinate(next.x - (following.x - point.x) / 6)} ${coordinate(next.y - (following.y - point.y) / 6)} ${coordinate(next.x)} ${coordinate(next.y)}`;
  }
  return `${path}Z`;
}

export type MascotPaths = { body: string; left: string; right: string };

export const staticMascotPaths: MascotPaths = {
  body: brandMarkPath,
  left: "M0 0Z",
  right: "M0 0Z",
};

export function pathsForFrame(frame: CatalogFrame): MascotPaths {
  return {
    body: `${contourPath(frame.outer)}${contourPath(frame.hole)}`,
    left: contourPath(frame.left) || "M0 0Z",
    right: contourPath(frame.right) || "M0 0Z",
  };
}
