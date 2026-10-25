import { brandMarkPath } from "@qntx-ui/content";
import {
  contourPath,
  createCatalogAnimation,
  createMascotMorph,
  staticMascotFrame,
} from "@qntx-ui/mascot";
import type { CatalogFrame } from "@qntx-ui/mascot";

type Point = { x: number; y: number };

export function createMascotPainter(
  body: SVGPathElement,
  left: SVGPathElement,
  right: SVGPathElement,
): {
  paint: (sample: CatalogFrame) => void;
  reset: () => void;
} {
  return {
    paint(sample): void {
      body.setAttribute("d", `${contourPath(sample.outer)}${contourPath(sample.hole)}`);
      body.setAttribute("fill", sample.colors.body);
      for (const [eye, points] of [
        [left, sample.left],
        [right, sample.right],
      ] as const) {
        eye.setAttribute("d", contourPath(points) || "M0 0Z");
        eye.setAttribute("fill", sample.colors.eyes);
        eye.setAttribute("display", points.length > 0 ? "inline" : "none");
      }
    },
    reset(): void {
      body.setAttribute("d", brandMarkPath);
      body.setAttribute("fill", "currentColor");
      left.setAttribute("display", "none");
      right.setAttribute("display", "none");
    },
  };
}

type MascotPhase = "opening" | "narrative" | "docked";

type MascotController = {
  setPhase: (next: MascotPhase) => void;
  dispose: () => void;
};

/** Scroll playback takes priority; the two static endpoints have independent five-second idle waits. */
export function initializeMascotAnimation(root: HTMLElement): MascotController {
  const body = root.querySelector<SVGPathElement>("[data-mascot-body]");
  const left = root.querySelector<SVGPathElement>('[data-mascot-eye="left"]');
  const right = root.querySelector<SVGPathElement>('[data-mascot-eye="right"]');
  if (body === null || left === null || right === null) {
    return { setPhase: () => undefined, dispose: () => undefined };
  }
  const painter = createMascotPainter(body, left, right);
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let frame: number | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let phase: MascotPhase = "opening";
  let idle = false;
  let disposed = false;
  let lastPointer: Point | undefined;
  let current = staticMascotFrame;
  let playing = false;
  let transition:
    | {
        sample: ReturnType<typeof createMascotMorph>;
        started: number;
        duration: number;
      }
    | undefined;

  function tick(now: number): void {
    frame = undefined;
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
      painter.paint(current);
    } else {
      current = staticMascotFrame;
      painter.reset();
      root.dataset["running"] = "false";
    }
    root.dataset["transition"] =
      transition === undefined ? "none" : playing ? "entering" : "leaving";
    if (playing || transition !== undefined) {
      frame = requestAnimationFrame(tick);
    }
  }

  function synchronize(): void {
    const enabled = !document.hidden && !reducedMotion.matches;
    const wanted = enabled && (phase === "narrative" || idle);
    root.dataset["animationPhase"] = phase;
    root.dataset["playback"] = wanted ? (phase === "narrative" ? "scroll" : "idle") : "static";
    if (enabled) {
      if (playing !== wanted) {
        playing = wanted;
        catalog = wanted ? createCatalogAnimation() : undefined;
        const now = performance.now();
        transition = {
          sample: createMascotMorph(current, catalog?.sample(now) ?? staticMascotFrame),
          started: now,
          duration: wanted ? 360 : 320,
        };
      }
      root.dataset["running"] = String(playing || transition !== undefined);
      if (frame === undefined && (playing || transition !== undefined)) {
        tick(performance.now());
      }
      return;
    }
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    playing = false;
    transition = undefined;
    catalog = undefined;
    current = staticMascotFrame;
    painter.reset();
    root.dataset["running"] = "false";
    root.dataset["transition"] = "none";
  }

  function clearIdleTimer(): void {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  }

  function restartIdleTimer(): void {
    clearIdleTimer();
    if (phase !== "narrative" && !document.hidden && !reducedMotion.matches) {
      idleTimer = setTimeout(() => {
        idleTimer = undefined;
        idle = true;
        synchronize();
      }, 5000);
    }
  }

  function restart(): void {
    idle = false;
    restartIdleTimer();
    synchronize();
  }

  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        event.pointerType !== "mouse" ||
        (lastPointer?.x === event.clientX && lastPointer.y === event.clientY)
      ) {
        return;
      }
      lastPointer = { x: event.clientX, y: event.clientY };
      if (phase !== "narrative") {
        const wasIdle = idle;
        idle = false;
        restartIdleTimer();
        if (wasIdle) {
          synchronize();
        }
      }
    },
    { passive: true, signal: events.signal },
  );
  document.addEventListener("visibilitychange", restart, { signal: events.signal });
  reducedMotion.addEventListener("change", restart, { signal: events.signal });
  painter.reset();
  root.dataset["transition"] = "none";
  restart();
  return {
    setPhase(next): void {
      if (!disposed && phase !== next) {
        phase = next;
        restart();
      }
    },
    dispose(): void {
      disposed = true;
      events.abort();
      clearIdleTimer();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      painter.reset();
      root.dataset["running"] = "false";
      root.dataset["playback"] = "static";
      root.dataset["transition"] = "none";
    },
  };
}
