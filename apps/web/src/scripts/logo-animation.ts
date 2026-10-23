import poseData from "../data/logo-poses.json";
import { createCatalogAnimation } from "../vendor/logo-catalog.js";

type Point = {
  x: number;
  y: number;
};
type Shape = {
  outer: Point[];
  hole: Point[];
  left: Point[];
  right: Point[];
};
type LogoElements = {
  trigger: HTMLElement;
  body: SVGPathElement;
  left: SVGPathElement;
  right: SVGPathElement;
  gazeGroup: SVGGElement;
};

function contour(value: unknown): Point[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected a logo contour");
  }
  return value.map((pair: unknown) => {
    if (!Array.isArray(pair) || typeof pair[0] !== "number" || typeof pair[1] !== "number") {
      throw new TypeError("Invalid logo point");
    }
    return { x: pair[0], y: pair[1] };
  });
}

function shape(value: { outer: unknown; hole: unknown; left: unknown; right: unknown }): Shape {
  return {
    outer: contour(value.outer),
    hole: contour(value.hole),
    left: contour(value.left),
    right: contour(value.right),
  };
}

const rest = shape(poseData.rest);
const awake = shape(poseData.awake);

function ease(value: number): number {
  const bounded = Math.min(1, Math.max(0, value));
  return bounded * bounded * (3 - 2 * bounded);
}

function collapse(points: Point[], amount: number): Point[] {
  if (amount < 0.001 || points.length === 0) {
    return [];
  }
  const center = { x: 0, y: 0 };
  for (const point of points) {
    center.x += point.x / points.length;
    center.y += point.y / points.length;
  }
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * amount,
    y: center.y + (point.y - center.y) * amount,
  }));
}

function blend(from: Point[], to: Point[], progress: number): Point[] {
  if (to.length === 0) {
    return collapse(from, 1 - ease(progress / 0.55));
  }
  if (from.length === 0) {
    return collapse(to, ease((progress - 0.45) / 0.55));
  }
  const amount = ease(progress);
  return from.map((point, index) => {
    const destination = to[index] ?? point;
    return {
      x: point.x + (destination.x - point.x) * amount,
      y: point.y + (destination.y - point.y) * amount,
    };
  });
}

function interpolate(from: Shape, to: Shape, progress: number): Shape {
  return {
    outer: blend(from.outer, to.outer, progress),
    hole: blend(from.hole, to.hole, progress),
    left: blend(from.left, to.left, progress),
    right: blend(from.right, to.right, progress),
  };
}

function coordinate(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

function pathFor(points: Point[]): string {
  const [first] = points;
  if (first === undefined) {
    return "";
  }
  const parts = [`M${coordinate(first.x)} ${coordinate(first.y)}`];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length] ?? first;
    const point = points[index] ?? first;
    const next = points[(index + 1) % points.length] ?? first;
    const following = points[(index + 2) % points.length] ?? first;
    parts.push(
      `C${coordinate(point.x + (next.x - previous.x) / 6)} ${coordinate(point.y + (next.y - previous.y) / 6)} ${coordinate(next.x - (following.x - point.x) / 6)} ${coordinate(next.y - (following.y - point.y) / 6)} ${coordinate(next.x)} ${coordinate(next.y)}`,
    );
  }
  return `${parts.join("")}Z`;
}

function translated(points: Point[], offset: Point): Point[] {
  return points.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));
}

function smilingEye(points: Point[]): Point[] {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const halfWidth = (maxX - minX) / 2;
  const halfHeight = (maxY - minY) / 2;
  // Bend the existing closed eye contour into a soft upward arch: no extra facial paths.
  return points.map((point) => {
    const x = (point.x - centerX) / halfWidth;
    const y = (point.y - centerY) / halfHeight;
    return {
      x: centerX + x * halfWidth * 1.2,
      y: centerY - (1 - x * x) * 14 + y * 13,
    };
  });
}

const happy: Shape = {
  ...awake,
  left: smilingEye(awake.left),
  right: smilingEye(awake.right),
};

function animateLogo(svg: SVGSVGElement): () => void {
  const trigger = svg.closest<HTMLElement>("[data-logo-trigger]");
  const body = svg.querySelector<SVGPathElement>('[data-q-id="body"]');
  const left = svg.querySelector<SVGPathElement>('[data-q-eye="left"]');
  const right = svg.querySelector<SVGPathElement>('[data-q-eye="right"]');
  const gazeGroup = svg.querySelector<SVGGElement>("[data-q-gaze]");
  if (trigger === null || body === null || left === null || right === null || gazeGroup === null) {
    return () => undefined;
  }
  return createLogoAnimation(svg, { trigger, body, left, right, gazeGroup });
}

type Morph = {
  from: Shape;
  to: Shape;
  started: number;
  duration: number;
};

function createLogoAnimation(
  svg: SVGSVGElement,
  { trigger, body, left, right, gazeGroup }: LogoElements,
): () => void {
  const staticPath = body.getAttribute("d") ?? "";
  const staticOuter = `${staticPath.split("ZM")[0] ?? ""}Z`;
  const region = trigger.closest<HTMLElement>("[data-logo-region]");
  const reducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  const hover = globalThis.matchMedia("(hover: hover)");
  const events = new AbortController();
  let frame: number | undefined;
  let smileTimer: ReturnType<typeof setTimeout> | undefined;
  let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  let morph: Morph | undefined;
  let catalogEntry: { from: Shape; started: number } | undefined;
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let colors = { body: "currentColor", eyes: "#ffffff" };
  let current = rest;
  let target = rest;
  let insideRegion = false;
  let hoveringLogo = false;
  let focusedLogo = false;
  let smiling = false;
  let idle = false;
  let inactive = false;
  let visible = true;
  let gaze = { x: 0, y: 0 };
  let gazeTarget = { x: 0, y: 0 };
  let lastFrame = performance.now();
  let lastPointer: Point | undefined;

  // Preserve the source animation's proportions while keeping its tilted poses in the viewBox.
  const catalogScale = 0.86;

  function clearInactivityTimer(): void {
    if (inactivityTimer !== undefined) {
      clearTimeout(inactivityTimer);
      inactivityTimer = undefined;
    }
  }

  function restartInactivityTimer(): void {
    clearInactivityTimer();
    inactive = false;
    if (region !== null && visible && !document.hidden && !reducedMotion.matches && hover.matches) {
      inactivityTimer = setTimeout(() => {
        inactivityTimer = undefined;
        inactive = true;
        synchronize();
      }, 5000);
    }
  }

  function faceWanted(): boolean {
    return region === null
      ? !reducedMotion.matches && (hoveringLogo || focusedLogo || smiling)
      : insideRegion || smiling || (inactive && !reducedMotion.matches);
  }

  function paint(): void {
    const neutral = current === rest && gaze.x === 0 && gaze.y === 0;
    const outer = current === rest ? staticOuter : pathFor(current.outer);
    body.setAttribute(
      "d",
      neutral ? staticPath : `${outer}${pathFor(translated(current.hole, gaze))}`,
    );
    body.setAttribute("fill-rule", current.hole.length > 0 ? "evenodd" : "nonzero");
    body.setAttribute("fill", colors.body);
    for (const [element, points] of [
      [left, current.left],
      [right, current.right],
    ] as const) {
      element.setAttribute("d", pathFor(points) || "M0 0Z");
      element.setAttribute("fill", colors.eyes);
      element.setAttribute("display", points.length > 0 ? "inline" : "none");
    }
    gazeGroup.setAttribute("transform", `translate(${gaze.x} ${gaze.y})`);
    trigger.dataset["gazeX"] = String(Math.round(gaze.x * 1000) / 1000);
    trigger.dataset["gazeY"] = String(Math.round(gaze.y * 1000) / 1000);
    trigger.dataset["morphing"] = String(morph !== undefined || catalogEntry !== undefined);
  }

  function pause(): void {
    clearInactivityTimer();
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    trigger.dataset["running"] = "false";
  }

  function queue(): void {
    if (frame === undefined && visible && !document.hidden) {
      trigger.dataset["running"] = "true";
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now: number): void {
    frame = undefined;
    const delta = Math.min(32, Math.max(1, now - lastFrame));
    lastFrame = now;
    if (!visible || document.hidden) {
      pause();
      return;
    }
    if (idle && catalog !== undefined) {
      const sampled = catalog.sample(now);
      const scale = (points: Point[]): Point[] =>
        points.map((point) => ({ x: point.x * catalogScale, y: point.y * catalogScale }));
      const next = {
        outer: scale(sampled.outer),
        hole: scale(sampled.hole),
        left: scale(sampled.left),
        right: scale(sampled.right),
      };
      ({ colors } = sampled);
      const progress =
        catalogEntry === undefined ? 1 : Math.min(1, (now - catalogEntry.started) / 300);
      current = catalogEntry === undefined ? next : interpolate(catalogEntry.from, next, progress);
      if (progress === 1) {
        catalogEntry = undefined;
        trigger.dataset["phase"] = "live";
      }
    } else if (morph !== undefined) {
      const progress = Math.min(1, (now - morph.started) / morph.duration);
      current = interpolate(morph.from, morph.to, progress);
      if (progress === 1) {
        current = morph.to;
        morph = undefined;
        trigger.dataset["phase"] = faceWanted() ? "live" : "rest";
      }
    }
    const amount = 1 - Math.exp(-delta / 55);
    gaze.x += (gazeTarget.x - gaze.x) * amount;
    gaze.y += (gazeTarget.y - gaze.y) * amount;
    const gazeMoving = Math.hypot(gazeTarget.x - gaze.x, gazeTarget.y - gaze.y) > 0.01;
    if (!gazeMoving) {
      gaze = { ...gazeTarget };
    }
    paint();
    if (morph !== undefined || gazeMoving || idle) {
      queue();
    } else {
      trigger.dataset["running"] = "false";
    }
  }

  function synchronize(): void {
    const wanted = faceWanted();
    const next = wanted ? (smiling ? happy : awake) : rest;
    const nextIdle =
      !smiling &&
      !reducedMotion.matches &&
      (region === null ? hoveringLogo || focusedLogo : inactive);
    const wasIdle = idle;
    if (nextIdle && !idle) {
      catalog = createCatalogAnimation();
      catalogEntry = { from: current, started: performance.now() };
      morph = undefined;
      gazeTarget = { x: 0, y: 0 };
      trigger.dataset["tracking"] = "false";
    } else if (!nextIdle && idle) {
      catalog = undefined;
      catalogEntry = undefined;
      colors = { body: "currentColor", eyes: "#ffffff" };
    }
    idle = nextIdle;
    trigger.dataset["idle"] = String(idle);
    trigger.dataset["regionActive"] = String(insideRegion);
    trigger.dataset["smiling"] = String(smiling);
    trigger.dataset["face"] = wanted ? (smiling ? "smiling" : "awake") : "q";
    if (reducedMotion.matches) {
      gaze = { x: 0, y: 0 };
      gazeTarget = { x: 0, y: 0 };
      morph = undefined;
      current = next;
      target = next;
      pause();
      trigger.dataset["phase"] = wanted ? "live" : "rest";
      paint();
      return;
    }
    if (idle) {
      target = next;
    } else if (target !== next || wasIdle) {
      target = next;
      morph = {
        from: current,
        to: next,
        started: performance.now(),
        duration: smiling ? 180 : wanted ? 280 : 320,
      };
      trigger.dataset["phase"] = wanted ? (current === rest ? "entering" : "live") : "leaving";
    }
    queue();
  }

  function resetSmile(): void {
    if (smileTimer !== undefined) {
      clearTimeout(smileTimer);
      smileTimer = undefined;
    }
    smiling = false;
  }

  function enterRegion(event: PointerEvent): void {
    if (event.pointerType === "mouse" && hover.matches && !insideRegion) {
      insideRegion = true;
      synchronize();
    }
  }

  if (region !== null) {
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
        restartInactivityTimer();
        synchronize();
      },
      { signal: events.signal },
    );
  }

  trigger.addEventListener(
    "pointerenter",
    (event) => {
      if (event.pointerType === "mouse" && hover.matches) {
        hoveringLogo = true;
        synchronize();
      }
    },
    { signal: events.signal },
  );
  trigger.addEventListener(
    "pointerleave",
    () => {
      hoveringLogo = false;
      synchronize();
    },
    { signal: events.signal },
  );
  trigger.addEventListener(
    "focusin",
    () => {
      focusedLogo = trigger.matches(":focus-visible");
      synchronize();
    },
    { signal: events.signal },
  );
  trigger.addEventListener(
    "focusout",
    () => {
      focusedLogo = false;
      synchronize();
    },
    { signal: events.signal },
  );
  region?.addEventListener("pointerenter", enterRegion, { signal: events.signal });
  region?.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      enterRegion(event);
      if (reducedMotion.matches) {
        return;
      }
      const regionBox = region.getBoundingClientRect();
      const logoBox = svg.getBoundingClientRect();
      const x =
        (event.clientX - logoBox.left - logoBox.width / 2) / Math.max(1, regionBox.width / 2);
      const y =
        (event.clientY - logoBox.top - logoBox.height / 2) / Math.max(1, regionBox.height / 2);
      const magnitude = Math.max(1, Math.hypot(x, y));
      gazeTarget = { x: (x / magnitude) * 14, y: (y / magnitude) * 14 };
      trigger.dataset["tracking"] = "true";
      queue();
    },
    { signal: events.signal },
  );
  region?.addEventListener(
    "pointerleave",
    (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      insideRegion = false;
      hoveringLogo = false;
      resetSmile();
      gazeTarget = { x: 0, y: 0 };
      trigger.dataset["tracking"] = "false";
      synchronize();
    },
    { signal: events.signal },
  );
  svg.addEventListener(
    "qntx:logo-smile",
    () => {
      resetSmile();
      restartInactivityTimer();
      smiling = true;
      synchronize();
      smileTimer = setTimeout(() => {
        smiling = false;
        synchronize();
      }, 1600);
    },
    { signal: events.signal },
  );

  function resume(): void {
    if (morph !== undefined) {
      morph = { from: current, to: target, started: performance.now(), duration: 240 };
    }
    lastFrame = performance.now();
    restartInactivityTimer();
    synchronize();
  }

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    },
    { signal: events.signal },
  );
  reducedMotion.addEventListener(
    "change",
    () => {
      gazeTarget = { x: 0, y: 0 };
      trigger.dataset["tracking"] = "false";
      restartInactivityTimer();
      synchronize();
    },
    { signal: events.signal },
  );
  const observer = new IntersectionObserver((entries) => {
    const [entry] = entries;
    if (entry !== undefined) {
      visible = entry.isIntersecting;
      if (visible) {
        resume();
      } else {
        pause();
      }
    }
  });
  observer.observe(svg);
  trigger.dataset["tracking"] = "false";
  trigger.dataset["phase"] = "rest";
  restartInactivityTimer();
  synchronize();
  trigger.dataset["ready"] = "true";
  return () => {
    events.abort();
    observer.disconnect();
    resetSmile();
    pause();
    current = rest;
    morph = undefined;
    catalogEntry = undefined;
    catalog = undefined;
    colors = { body: "currentColor", eyes: "#ffffff" };
    idle = false;
    gaze = { x: 0, y: 0 };
    paint();
    delete trigger.dataset["ready"];
  };
}

export function initializeLogoAnimations(): () => void {
  const cleanup = [...document.querySelectorAll<SVGSVGElement>("[data-q-logo]")].map(animateLogo);
  return () => {
    for (const dispose of cleanup) {
      dispose();
    }
  };
}
