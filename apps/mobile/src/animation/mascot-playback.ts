import { createMascotPlayback, pathsForFrame, staticMascotPaths } from "@qntx-ui/mascot";
import type { MascotPlaybackController, MascotPaths } from "@qntx-ui/mascot";

export type {
  MascotActivityHandle,
  MascotPlaybackController,
  MascotPlaybackPhase,
} from "@qntx-ui/mascot";

/** Native scheduling adapter; shared playback limits geometry before sampling. */
export function createMascotPlaybackController(
  onRenderFrame: (paths: MascotPaths) => void,
  createAnimation?: Parameters<typeof createMascotPlayback>[0]["createAnimation"],
): MascotPlaybackController {
  return createMascotPlayback({
    scheduler: {
      now: () => performance.now(),
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id),
      delay: (callback, milliseconds) => {
        const id = setTimeout(callback, milliseconds);
        return () => clearTimeout(id);
      },
    },
    renderFrame: (frame) => onRenderFrame(pathsForFrame(frame)),
    renderStatic: () => onRenderFrame(staticMascotPaths),
    maxFps: 30,
    ...(createAnimation === undefined ? {} : { createAnimation }),
  });
}
