import {
  createCatalogAnimation,
  createMascotMorph,
  pathsForFrame,
  staticMascotFrame,
  staticMascotPaths,
} from "@qntx-ui/mascot";
import type { CatalogFrame, MascotGaze, MascotPaths } from "@qntx-ui/mascot";

export type MascotPlaybackPhase = "opening" | "scrolling" | "arriving" | "docked";
export type MascotActivityHandle = {
  notifyActivity: () => void;
  setGaze: (gaze: MascotGaze | undefined) => void;
};
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
  let pointer: MascotGaze | undefined;
  let lastPointerTime = Number.NEGATIVE_INFINITY;
  const gaze: MascotGaze = { x: 0, y: 0 };

  function renderAnimationFrame(now: number): void {
    frame = undefined;
    // Limit the expensive geometry work, not just the final React/SVG commit.
    // The small tolerance avoids accidentally halving 30fps on a 60Hz display.
    if ((playing || transition !== undefined) && now - lastPaint < 1000 / 30 - 1) {
      frame = requestAnimationFrame(renderAnimationFrame);
      return;
    }
    const elapsed = Math.min(100, Math.max(0, now - lastPaint));
    lastPaint = now;
    const follow = 1 - Math.exp(-elapsed / 180);
    gaze.x += ((pointer?.x ?? 0) - gaze.x) * follow;
    gaze.y += ((pointer?.y ?? 0) - gaze.y) * follow;
    catalog?.setLookDirection(
      pointer !== undefined && now - lastPointerTime < 2200 ? pointer : undefined,
    );
    const target = catalog?.sample(now, gaze) ?? staticMascotFrame;
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
      // The five-second wait starts after the return morph, not during it.
      if (timer === undefined) {
        extendIdleDeadline();
      }
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
    if (
      (options.playbackPhase === "opening" || options.playbackPhase === "docked") &&
      !options.reducedMotion &&
      options.foreground
    ) {
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
    if (
      (options.playbackPhase === "opening" || options.playbackPhase === "docked") &&
      !playing &&
      transition === undefined &&
      !options.reducedMotion &&
      options.foreground
    ) {
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
      if (
        !idle &&
        (options.playbackPhase === "opening" || options.playbackPhase === "docked") &&
        !options.reducedMotion &&
        options.foreground
      ) {
        extendIdleDeadline();
        updatePlaybackState();
      }
    },
    setGaze(next): void {
      pointer = next;
      lastPointerTime = performance.now();
    },
    dispose(): void {
      clearIdlePlaybackTimer();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    },
  };
}
