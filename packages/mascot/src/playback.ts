import { createMascotMorph, staticMascotFrame } from "./morph";
import { createCatalogAnimation } from "./vendor/logo-catalog.js";
import type { CatalogFrame, MascotGaze } from "./vendor/logo-catalog.js";

export type MascotPlaybackPhase = "opening" | "scrolling" | "arriving" | "docked";
export type MascotActivityHandle = {
  notifyActivity: () => void;
  setGaze: (gaze: MascotGaze | undefined) => void;
};
export type MascotPlaybackState = {
  phase: MascotPlaybackPhase;
  mode: "static" | "scroll" | "idle";
  running: boolean;
  morph: "none" | "entering" | "leaving";
  gaze: MascotGaze;
  expression: string | undefined;
};
type PlaybackOptions = {
  playbackPhase: MascotPlaybackPhase;
  reducedMotion: boolean;
  foreground: boolean;
};
type Scheduler = {
  now: () => number;
  requestFrame: (callback: (now: number) => void) => number;
  cancelFrame: (id: number) => void;
  delay: (callback: () => void, milliseconds: number) => () => void;
};
type PlaybackConfiguration = {
  scheduler: Scheduler;
  renderFrame: (frame: CatalogFrame) => void;
  renderStatic: () => void;
  onState?: (state: MascotPlaybackState) => void;
  readGaze?: () => MascotGaze | undefined;
  maxFps?: number;
  maxElapsed?: number;
  createAnimation?: (now: () => number) => ReturnType<typeof createCatalogAnimation>;
};
export type MascotPlaybackController = MascotActivityHandle & {
  updateOptions: (options: PlaybackOptions) => void;
  dispose: () => void;
};

const timing = { enter: 360, leave: 320, idle: 5000, direction: 2200, follow: 180 } as const;

/** Platform-neutral lifecycle; clocks, frame scheduling and drawing are injected. */
export function createMascotPlayback(
  configuration: PlaybackConfiguration,
): MascotPlaybackController {
  const { scheduler } = configuration;
  let options: PlaybackOptions = {
    playbackPhase: "opening",
    reducedMotion: false,
    foreground: true,
  };
  let current = staticMascotFrame;
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let transition:
    | { sample: ReturnType<typeof createMascotMorph>; started: number; duration: number }
    | undefined;
  let frame: number | undefined;
  let cancelTimer: (() => void) | undefined;
  let playing = false;
  let idle = false;
  let disposed = false;
  let lastPaint = Number.NEGATIVE_INFINITY;
  let lastActivity = 0;
  let animationTime = 0;
  let previousTime = 0;
  let pointer: MascotGaze | undefined;
  let pointerTime = Number.NEGATIVE_INFINITY;
  let expression: string | undefined;
  const gaze: MascotGaze = { x: 0, y: 0 };

  function enabled(): boolean {
    return !options.reducedMotion && options.foreground;
  }
  function atEndpoint(): boolean {
    return options.playbackPhase === "opening" || options.playbackPhase === "docked";
  }
  function publish(): void {
    configuration.onState?.({
      phase: options.playbackPhase,
      mode: playing ? (options.playbackPhase === "scrolling" ? "scroll" : "idle") : "static",
      running: playing || transition !== undefined,
      morph: transition === undefined ? "none" : playing ? "entering" : "leaving",
      gaze,
      expression,
    });
  }
  function clearTimer(): void {
    cancelTimer?.();
    cancelTimer = undefined;
  }
  function checkIdle(): void {
    cancelTimer = undefined;
    if (disposed || !enabled() || !atEndpoint()) {
      return;
    }
    const remaining = timing.idle - (scheduler.now() - lastActivity);
    if (remaining > 0) {
      cancelTimer = scheduler.delay(checkIdle, remaining);
    } else {
      idle = true;
      updatePlayback();
    }
  }
  function extendIdle(): void {
    idle = false;
    lastActivity = scheduler.now();
    if (enabled() && atEndpoint() && !playing && transition === undefined) {
      cancelTimer ??= scheduler.delay(checkIdle, timing.idle);
    }
  }
  function render(now: number): void {
    frame = undefined;
    if (disposed) {
      return;
    }
    if (configuration.maxFps !== undefined && now - lastPaint < 1000 / configuration.maxFps - 1) {
      frame = scheduler.requestFrame(render);
      return;
    }
    const elapsed = Math.min(configuration.maxElapsed ?? 100, Math.max(0, now - previousTime));
    previousTime = now;
    lastPaint = now;
    animationTime += elapsed;
    const direction =
      options.playbackPhase === "arriving" ? undefined : (configuration.readGaze?.() ?? pointer);
    const follow = 1 - Math.exp(-elapsed / timing.follow);
    gaze.x += ((direction?.x ?? 0) - gaze.x) * follow;
    gaze.y += ((direction?.y ?? 0) - gaze.y) * follow;
    expression = catalog?.setLookDirection(
      now - pointerTime < timing.direction ? direction : undefined,
    );
    const target = catalog?.sample(animationTime, gaze) ?? staticMascotFrame;
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
      configuration.renderFrame(current);
    } else {
      current = staticMascotFrame;
      gaze.x = 0;
      gaze.y = 0;
      configuration.renderStatic();
      extendIdle();
    }
    publish();
    if (playing || transition !== undefined) {
      frame = scheduler.requestFrame(render);
    }
  }
  function updatePlayback(): void {
    const wanted = enabled() && (options.playbackPhase === "scrolling" || idle);
    if (!enabled()) {
      if (frame !== undefined) {
        scheduler.cancelFrame(frame);
      }
      frame = undefined;
      playing = false;
      transition = undefined;
      catalog = undefined;
      current = staticMascotFrame;
      gaze.x = 0;
      gaze.y = 0;
      configuration.renderStatic();
    } else if (playing !== wanted) {
      playing = wanted;
      const now = scheduler.now();
      animationTime = 0;
      previousTime = now;
      catalog = wanted
        ? (
            configuration.createAnimation ??
            ((clock) => createCatalogAnimation(clock, { directGeometry: true }))
          )(() => animationTime)
        : undefined;
      transition = {
        sample: createMascotMorph(current, catalog?.sample(animationTime) ?? staticMascotFrame),
        started: now,
        duration: wanted ? timing.enter : timing.leave,
      };
    }
    if (playing || transition !== undefined) {
      frame ??= scheduler.requestFrame(render);
    }
    publish();
  }
  configuration.renderStatic();
  publish();
  return {
    updateOptions(next): void {
      if (disposed) {
        return;
      }
      options = next;
      clearTimer();
      extendIdle();
      updatePlayback();
    },
    notifyActivity(): void {
      if (!disposed && !idle && atEndpoint() && enabled()) {
        extendIdle();
        updatePlayback();
      }
    },
    setGaze(next): void {
      if (!disposed) {
        pointer = next;
        pointerTime = scheduler.now();
      }
    },
    dispose(): void {
      disposed = true;
      clearTimer();
      if (frame !== undefined) {
        scheduler.cancelFrame(frame);
      }
      frame = undefined;
    },
  };
}
