import {
  createCatalogAnimation,
  createMascotMorph,
  pathsForFrame,
  staticMascotFrame,
  staticMascotPaths,
} from "@qntx-ui/mascot";
import type { CatalogFrame, MascotPaths } from "@qntx-ui/mascot";

export type MascotPlaybackPhase = "opening" | "scrolling" | "docked";
export type MascotActivityHandle = { notifyActivity: () => void };
type MascotPlaybackOptions = {
  playbackPhase: MascotPlaybackPhase;
  reducedMotion: boolean;
  foreground: boolean;
};
export type MascotPlaybackController = MascotActivityHandle & {
  updateOptions: (options: MascotPlaybackOptions) => void;
  dispose: () => void;
};

/** Keep the frame loop independent of touches: repeated input must not restart a return morph. */
export function createMascotPlaybackController(
  onRenderFrame: (paths: MascotPaths) => void,
  createAnimation = () => createCatalogAnimation(undefined, { directGeometry: true }),
): MascotPlaybackController {
  let options: MascotPlaybackOptions = {
    playbackPhase: "opening",
    reducedMotion: false,
    foreground: true,
  };
  let current: CatalogFrame = staticMascotFrame;
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let transition:
    | { sample: ReturnType<typeof createMascotMorph>; started: number; duration: number }
    | undefined;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let playing = false;
  let idle = false;
  let lastPaint = -1000;
  let lastActivity = 0;

  function renderAnimationFrame(now: number): void {
    frame = undefined;
    // Limit the expensive geometry work, not just the final React/SVG commit.
    // The small tolerance avoids accidentally halving 30fps on a 60Hz display.
    if ((playing || transition !== undefined) && now - lastPaint < 1000 / 30 - 1) {
      frame = requestAnimationFrame(renderAnimationFrame);
      return;
    }
    lastPaint = now;
    const target = catalog?.sample(now) ?? staticMascotFrame;
    if (transition === undefined) {
      current = target;
    } else {
      const progress = Math.min(1, (now - transition.started) / transition.duration);
      current = transition.sample(target, progress);
      if (progress === 1) {
        transition = undefined;
      }
    }
    if (playing || transition !== undefined) {
      onRenderFrame(pathsForFrame(current));
      frame = requestAnimationFrame(renderAnimationFrame);
    } else {
      current = staticMascotFrame;
      onRenderFrame(staticMascotPaths);
    }
  }

  function updatePlaybackState(): void {
    const enabled = !options.reducedMotion && options.foreground;
    const wanted = enabled && (options.playbackPhase === "scrolling" || idle);
    if (enabled) {
      if (playing !== wanted) {
        playing = wanted;
        catalog = wanted ? createAnimation() : undefined;
        const now = performance.now();
        transition = {
          sample: createMascotMorph(current, catalog?.sample(now) ?? staticMascotFrame),
          started: now,
          duration: wanted ? 360 : 320,
        };
      }
      if (playing || transition !== undefined) {
        frame ??= requestAnimationFrame(renderAnimationFrame);
      }
    } else {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      playing = false;
      catalog = undefined;
      transition = undefined;
      current = staticMascotFrame;
      frame = requestAnimationFrame(renderAnimationFrame);
    }
  }

  function clearIdlePlaybackTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function checkIdleDeadline(): void {
    timer = undefined;
    if (options.playbackPhase !== "scrolling" && !options.reducedMotion && options.foreground) {
      const remaining = 5000 - (performance.now() - lastActivity);
      if (remaining > 0) {
        timer = setTimeout(checkIdleDeadline, remaining);
      } else {
        idle = true;
        updatePlaybackState();
      }
    }
  }

  function extendIdleDeadline(): void {
    idle = false;
    lastActivity = performance.now();
    if (options.playbackPhase !== "scrolling" && !options.reducedMotion && options.foreground) {
      // Input only moves the deadline; don't cancel/create a timer on every touchmove.
      timer ??= setTimeout(checkIdleDeadline, 5000);
    }
  }

  return {
    updateOptions(next): void {
      options = next;
      clearIdlePlaybackTimer();
      extendIdleDeadline();
      updatePlaybackState();
    },
    notifyActivity(): void {
      if (options.playbackPhase !== "scrolling" && !options.reducedMotion && options.foreground) {
        extendIdleDeadline();
        updatePlaybackState();
      }
    },
    dispose(): void {
      clearIdlePlaybackTimer();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    },
  };
}
