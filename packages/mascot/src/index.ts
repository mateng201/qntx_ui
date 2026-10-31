export { createCatalogAnimation } from "./vendor/logo-catalog.js";
export type { CatalogFrame, MascotGaze } from "./vendor/logo-catalog.js";
export { createMascotMorph, staticMascotFrame } from "./morph";
export { contourPath, pathsForFrame, staticMascotPaths } from "./paths";
export type { MascotPaths } from "./paths";
export {
  createMascotDockingCurve,
  easeMascotDocking,
  getMascotDockingPosition,
  getMascotDockingProgress,
  mascotDockingTiming,
} from "./docking";
export type { MascotDockingCurve } from "./docking";
