import {
  createCatalogAnimation,
  createMascotMorph,
  pathsForFrame,
  staticMascotFrame,
  staticMascotPaths,
} from "@qntx-ui/mascot";
import type { CatalogFrame, MascotPaths } from "@qntx-ui/mascot";

export type MascotPhase = "opening" | "narrative" | "docked";
export type MascotHandle = { activity: () => void };
type PlaybackOptions = { phase: MascotPhase; reducedMotion: boolean; foreground: boolean };
export type Playback = MascotHandle & {
  update: (options: PlaybackOptions) => void;
  dispose: () => void;
};

/** Keep the frame loop independent of touches: repeated input must not restart a return morph. */
export function createPlayback(
  onPaint: (paths: MascotPaths) => void,
  createAnimation = () => createCatalogAnimation(undefined, { directGeometry: true }),
): Playback {
  let options: PlaybackOptions = { phase: "opening", reducedMotion: false, foreground: true };
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

  function paint(now: number): void {
    frame = undefined;
    // Limit the expensive geometry work, not just the final React/SVG commit.
    // The small tolerance avoids accidentally halving 30fps on a 60Hz display.
    if ((playing || transition !== undefined) && now - lastPaint < 1000 / 30 - 1) {
      frame = requestAnimationFrame(paint);
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
      onPaint(pathsForFrame(current));
      frame = requestAnimationFrame(paint);
    } else {
      current = staticMascotFrame;
      onPaint(staticMascotPaths);
    }
  }

  function synchronize(): void {
    const enabled = !options.reducedMotion && options.foreground;
    const wanted = enabled && (options.phase === "narrative" || idle);
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
        frame ??= requestAnimationFrame(paint);
      }
    } else {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      playing = false;
      catalog = undefined;
      transition = undefined;
      current = staticMascotFrame;
      frame = requestAnimationFrame(paint);
    }
  }

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function checkIdle(): void {
    timer = undefined;
    if (options.phase !== "narrative" && !options.reducedMotion && options.foreground) {
      const remaining = 5000 - (performance.now() - lastActivity);
      if (remaining > 0) {
        timer = setTimeout(checkIdle, remaining);
      } else {
        idle = true;
        synchronize();
      }
    }
  }

  function restartWait(): void {
    idle = false;
    lastActivity = performance.now();
    if (options.phase !== "narrative" && !options.reducedMotion && options.foreground) {
      // Input only moves the deadline; don't cancel/create a timer on every touchmove.
      timer ??= setTimeout(checkIdle, 5000);
    }
  }

  return {
    update(next): void {
      options = next;
      clearTimer();
      restartWait();
      synchronize();
    },
    activity(): void {
      if (options.phase !== "narrative" && !options.reducedMotion && options.foreground) {
        restartWait();
        synchronize();
      }
    },
    dispose(): void {
      clearTimer();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    },
  };
}
