import { palette } from "@qntx-ui/design-tokens";
import { createMascotPlayback, pathsForFrame, staticMascotPaths } from "@qntx-ui/mascot";
import type {
  CatalogFrame,
  MascotGaze,
  MascotPlaybackPhase,
  MascotPlaybackState,
} from "@qntx-ui/mascot";

type PointerPosition = { x: number; y: number };

function createSvgMascotRenderer(
  body: SVGPathElement,
  left: SVGPathElement,
  right: SVGPathElement,
) {
  return {
    renderFrame(sample: CatalogFrame): void {
      const paths = pathsForFrame(sample);
      body.setAttribute("d", paths.body);
      for (const [eye, points, path] of [
        [left, sample.left, paths.left],
        [right, sample.right, paths.right],
      ] as const) {
        eye.setAttribute("d", path);
        eye.setAttribute("display", points.length > 0 ? "inline" : "none");
      }
    },
    resetToStaticLogo(): void {
      body.setAttribute("d", staticMascotPaths.body);
      body.setAttribute("fill", "currentColor");
      left.setAttribute("fill", palette.white);
      right.setAttribute("fill", palette.white);
      left.setAttribute("display", "none");
      right.setAttribute("display", "none");
    },
  };
}

/** Browser events and SVG attributes adapt the shared playback lifecycle. */
export function initializeMascotPlayback(
  root: HTMLElement,
  getCenter: () => PointerPosition,
): { setPlaybackPhase: (phase: MascotPlaybackPhase) => void; dispose: () => void } {
  const body = root.querySelector<SVGPathElement>("[data-mascot-body]");
  const left = root.querySelector<SVGPathElement>('[data-mascot-eye="left"]');
  const right = root.querySelector<SVGPathElement>('[data-mascot-eye="right"]');
  if (body === null || left === null || right === null) {
    return {
      setPlaybackPhase: (_phase: MascotPlaybackPhase) => undefined,
      dispose: () => undefined,
    };
  }
  const renderer = createSvgMascotRenderer(body, left, right);
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let phase: MascotPlaybackPhase = "opening";
  let pointer: PointerPosition | undefined;
  function readGaze(): MascotGaze | undefined {
    if (pointer === undefined) {
      return undefined;
    }
    const center = getCenter();
    return {
      x: Math.max(-1, Math.min(1, (pointer.x - center.x) / Math.max(260, innerWidth * 0.4))),
      y: Math.max(-1, Math.min(1, (pointer.y - center.y) / Math.max(220, innerHeight * 0.4))),
    };
  }
  function writeState(state: MascotPlaybackState): void {
    const values = {
      playbackPhase: state.phase,
      playbackMode: state.mode,
      animationRunning: String(state.running),
      morphState: state.morph,
      lookExpression: state.expression ?? "catalog",
      gazeX: state.gaze.x.toFixed(3),
      gazeY: state.gaze.y.toFixed(3),
    };
    for (const [key, value] of Object.entries(values)) {
      if (root.dataset[key] !== value) {
        root.dataset[key] = value;
      }
    }
  }
  const player = createMascotPlayback({
    scheduler: {
      now: () => performance.now(),
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id),
      delay: (callback, milliseconds) => {
        const id = setTimeout(callback, milliseconds);
        return () => clearTimeout(id);
      },
    },
    renderFrame: (sample) => renderer.renderFrame(sample),
    renderStatic: () => renderer.resetToStaticLogo(),
    onState: writeState,
    readGaze,
    maxElapsed: 64,
  });
  function refreshOptions(): void {
    player.updateOptions({
      playbackPhase: phase,
      foreground: !document.hidden,
      reducedMotion: reducedMotion.matches,
    });
  }
  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        event.pointerType !== "mouse" ||
        (pointer?.x === event.clientX && pointer.y === event.clientY)
      ) {
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      player.setGaze(readGaze());
      player.notifyActivity();
    },
    { passive: true, signal: events.signal },
  );
  function clearPointer(): void {
    pointer = undefined;
    player.setGaze(undefined);
  }
  document.documentElement.addEventListener("pointerleave", clearPointer, {
    signal: events.signal,
  });
  globalThis.addEventListener("blur", clearPointer, { signal: events.signal });
  document.addEventListener("visibilitychange", refreshOptions, { signal: events.signal });
  reducedMotion.addEventListener("change", refreshOptions, { signal: events.signal });
  refreshOptions();
  return {
    setPlaybackPhase(next: MascotPlaybackPhase): void {
      if (phase !== next) {
        phase = next;
        refreshOptions();
      }
    },
    dispose(): void {
      events.abort();
      player.dispose();
      renderer.resetToStaticLogo();
      root.dataset["animationRunning"] = "false";
      root.dataset["playbackMode"] = "static";
      root.dataset["morphState"] = "none";
      delete root.dataset["lookExpression"];
      delete root.dataset["gazeX"];
      delete root.dataset["gazeY"];
    },
  };
}
