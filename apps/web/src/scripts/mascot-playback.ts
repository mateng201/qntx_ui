import { brandMarkPath } from "@qntx-ui/content";
import {
  contourPath,
  createCatalogAnimation,
  createMascotMorph,
  staticMascotFrame,
} from "@qntx-ui/mascot";
import type { CatalogFrame } from "@qntx-ui/mascot";

type PointerPosition = { x: number; y: number };

type SvgMascotRenderer = {
  renderFrame: (frame: CatalogFrame) => void;
  resetToStaticLogo: () => void;
};

export function createSvgMascotRenderer(
  body: SVGPathElement,
  left: SVGPathElement,
  right: SVGPathElement,
): SvgMascotRenderer {
  return {
    renderFrame(sample): void {
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
    resetToStaticLogo(): void {
      body.setAttribute("d", brandMarkPath);
      body.setAttribute("fill", "currentColor");
      left.setAttribute("display", "none");
      right.setAttribute("display", "none");
    },
  };
}

type MascotPlaybackPhase = "opening" | "scrolling" | "docked";

type MascotPlaybackController = {
  setPlaybackPhase: (next: MascotPlaybackPhase) => void;
  dispose: () => void;
};

/** Scroll playback takes priority; the two static endpoints have independent five-second idle waits. */
export function initializeMascotPlayback(root: HTMLElement): MascotPlaybackController {
  const body = root.querySelector<SVGPathElement>("[data-mascot-body]");
  const left = root.querySelector<SVGPathElement>('[data-mascot-eye="left"]');
  const right = root.querySelector<SVGPathElement>('[data-mascot-eye="right"]');
  if (body === null || left === null || right === null) {
    return { setPlaybackPhase: () => undefined, dispose: () => undefined };
  }
  const svgRenderer = createSvgMascotRenderer(body, left, right);
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let frame: number | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let playbackPhase: MascotPlaybackPhase = "opening";
  let idle = false;
  let disposed = false;
  let lastPointer: PointerPosition | undefined;
  let current = staticMascotFrame;
  let playing = false;
  let transition:
    | {
        sample: ReturnType<typeof createMascotMorph>;
        started: number;
        duration: number;
      }
    | undefined;

  function renderAnimationFrame(now: number): void {
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
      svgRenderer.renderFrame(current);
    } else {
      current = staticMascotFrame;
      svgRenderer.resetToStaticLogo();
      root.dataset["animationRunning"] = "false";
    }
    root.dataset["morphState"] =
      transition === undefined ? "none" : playing ? "entering" : "leaving";
    if (playing || transition !== undefined) {
      frame = requestAnimationFrame(renderAnimationFrame);
    }
  }

  function updatePlaybackState(): void {
    const enabled = !document.hidden && !reducedMotion.matches;
    const wanted = enabled && (playbackPhase === "scrolling" || idle);
    root.dataset["playbackPhase"] = playbackPhase;
    root.dataset["playbackMode"] = wanted
      ? playbackPhase === "scrolling"
        ? "scroll"
        : "idle"
      : "static";
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
      root.dataset["animationRunning"] = String(playing || transition !== undefined);
      if (frame === undefined && (playing || transition !== undefined)) {
        renderAnimationFrame(performance.now());
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
    svgRenderer.resetToStaticLogo();
    root.dataset["animationRunning"] = "false";
    root.dataset["morphState"] = "none";
  }

  function clearIdlePlaybackTimer(): void {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  }

  function scheduleIdlePlayback(): void {
    clearIdlePlaybackTimer();
    if (playbackPhase !== "scrolling" && !document.hidden && !reducedMotion.matches) {
      idleTimer = setTimeout(() => {
        idleTimer = undefined;
        idle = true;
        updatePlaybackState();
      }, 5000);
    }
  }

  function resetIdlePlayback(): void {
    idle = false;
    scheduleIdlePlayback();
    updatePlaybackState();
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
      if (playbackPhase !== "scrolling") {
        const wasIdle = idle;
        idle = false;
        scheduleIdlePlayback();
        if (wasIdle) {
          updatePlaybackState();
        }
      }
    },
    { passive: true, signal: events.signal },
  );
  document.addEventListener("visibilitychange", resetIdlePlayback, { signal: events.signal });
  reducedMotion.addEventListener("change", resetIdlePlayback, { signal: events.signal });
  svgRenderer.resetToStaticLogo();
  root.dataset["morphState"] = "none";
  resetIdlePlayback();
  return {
    setPlaybackPhase(next): void {
      if (!disposed && playbackPhase !== next) {
        playbackPhase = next;
        resetIdlePlayback();
      }
    },
    dispose(): void {
      disposed = true;
      events.abort();
      clearIdlePlaybackTimer();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      svgRenderer.resetToStaticLogo();
      root.dataset["animationRunning"] = "false";
      root.dataset["playbackMode"] = "static";
      root.dataset["morphState"] = "none";
    },
  };
}
