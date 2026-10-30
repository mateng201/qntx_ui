import { brandMarkPath } from "@qntx-ui/content";
import {
  contourPath,
  createCatalogAnimation,
  createMascotMorph,
  staticMascotFrame,
} from "@qntx-ui/mascot";
import type { CatalogFrame, MascotGaze } from "@qntx-ui/mascot";

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
      body.setAttribute("fill", "currentColor");
      for (const [eye, points] of [
        [left, sample.left],
        [right, sample.right],
      ] as const) {
        eye.setAttribute("d", contourPath(points) || "M0 0Z");
        eye.setAttribute("fill", "#ffffff");
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

type MascotPlaybackPhase = "opening" | "scrolling" | "arriving" | "docked";

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
  let lastPointerMovedAt = Number.NEGATIVE_INFINITY;
  let current = staticMascotFrame;
  let playing = false;
  let animationTime = 0;
  let previousFrameTime = 0;
  const gaze: MascotGaze = { x: 0, y: 0 };
  let transition:
    | {
        sample: ReturnType<typeof createMascotMorph>;
        started: number;
        duration: number;
      }
    | undefined;

  function renderAnimationFrame(now: number): void {
    frame = undefined;
    const elapsed = Math.min(64, Math.max(0, now - previousFrameTime));
    previousFrameTime = now;
    animationTime += elapsed;
    const bounds = root.getBoundingClientRect();
    const pointerGaze =
      lastPointer === undefined || playbackPhase === "arriving"
        ? { x: 0, y: 0 }
        : {
            x: Math.max(
              -1,
              Math.min(
                1,
                (lastPointer.x - bounds.x - bounds.width / 2) / Math.max(260, innerWidth * 0.4),
              ),
            ),
            y: Math.max(
              -1,
              Math.min(
                1,
                (lastPointer.y - bounds.y - bounds.height / 2) / Math.max(220, innerHeight * 0.4),
              ),
            ),
          };
    const follow = 1 - Math.exp(-elapsed / 180);
    gaze.x += (pointerGaze.x - gaze.x) * follow;
    gaze.y += (pointerGaze.y - gaze.y) * follow;
    const expression = catalog?.setLookDirection(
      lastPointer !== undefined && now - lastPointerMovedAt < 2200 ? pointerGaze : undefined,
    );
    root.dataset["lookExpression"] = expression ?? "catalog";
    root.dataset["gazeX"] = gaze.x.toFixed(3);
    root.dataset["gazeY"] = gaze.y.toFixed(3);
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
      svgRenderer.renderFrame(current);
    } else {
      current = staticMascotFrame;
      svgRenderer.resetToStaticLogo();
      root.dataset["animationRunning"] = "false";
      gaze.x = 0;
      gaze.y = 0;
      root.dataset["gazeX"] = "0.000";
      root.dataset["gazeY"] = "0.000";
      // Count five full static seconds, after the return morph has finished.
      scheduleIdlePlayback();
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
        const now = performance.now();
        animationTime = 0;
        previousFrameTime = now;
        catalog = wanted
          ? createCatalogAnimation(() => animationTime, { directGeometry: true })
          : undefined;
        transition = {
          sample: createMascotMorph(current, catalog?.sample(animationTime) ?? staticMascotFrame),
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
    if (
      (playbackPhase === "opening" || playbackPhase === "docked") &&
      !playing &&
      transition === undefined &&
      !document.hidden &&
      !reducedMotion.matches
    ) {
      idleTimer = setTimeout(() => {
        idleTimer = undefined;
        idle = true;
        updatePlaybackState();
      }, 5000);
    }
  }

  function resetIdlePlayback(): void {
    idle = false;
    clearIdlePlaybackTimer();
    updatePlaybackState();
    scheduleIdlePlayback();
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
      lastPointerMovedAt = performance.now();
      // Once idle playback has started, movement drives gaze instead of cancelling the face.
      if (!idle && (playbackPhase === "opening" || playbackPhase === "docked")) {
        resetIdlePlayback();
      }
    },
    { passive: true, signal: events.signal },
  );
  document.documentElement.addEventListener(
    "pointerleave",
    () => {
      lastPointer = undefined;
    },
    { signal: events.signal },
  );
  globalThis.addEventListener(
    "blur",
    () => {
      lastPointer = undefined;
    },
    { signal: events.signal },
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
      delete root.dataset["lookExpression"];
      delete root.dataset["gazeX"];
      delete root.dataset["gazeY"];
    },
  };
}
