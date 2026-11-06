export { createCatalogAnimation } from "./vendor/logo-catalog.js";
export type { CatalogFrame, MascotGaze } from "./vendor/logo-catalog.js";
export { createMascotMorph, staticMascotFrame } from "./morph";
export { pathsForFrame, staticMascotPaths } from "./paths";
export type { MascotPaths } from "./paths";
export {
  createMascotDockingCurve,
  easeMascotDocking,
  getMascotDockingPosition,
  getMascotDockingProgress,
  mascotDockingTiming,
} from "./docking";
export type { MascotDockingCurve } from "./docking";
export { createMascotPlayback } from "./playback";
export type {
  MascotActivityHandle,
  MascotPlaybackController,
  MascotPlaybackPhase,
  MascotPlaybackState,
} from "./playback";
