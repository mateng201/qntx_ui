import { createCatalogAnimation } from "@qntx-ui/mascot";

import { createMascotPainter } from "./mascot-animation";

/** Hover/focus demonstration only. Homepage autoplay has its own pointer-free lifecycle. */
function animateLogo(svg: SVGSVGElement): () => void {
  const foundTrigger = svg.closest<HTMLElement>("[data-logo-trigger]");
  const body = svg.querySelector<SVGPathElement>('[data-q-id="body"]');
  const left = svg.querySelector<SVGPathElement>('[data-q-eye="left"]');
  const right = svg.querySelector<SVGPathElement>('[data-q-eye="right"]');
  if (foundTrigger === null || body === null || left === null || right === null) {
    return () => undefined;
  }
  const trigger = foundTrigger;
  const painter = createMascotPainter(body, left, right);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let frame: number | undefined;
  let hovered = false;
  let focused = false;
  let visible = true;

  function tick(now: number): void {
    if (catalog !== undefined) {
      painter.paint(catalog.sample(now));
      frame = requestAnimationFrame(tick);
    }
  }

  function synchronize(): void {
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    const active = (hovered || focused) && !reducedMotion.matches;
    const running = active && visible && !document.hidden;
    trigger.dataset["phase"] = active ? "live" : "rest";
    trigger.dataset["running"] = String(running);
    if (!active) {
      catalog = undefined;
      painter.reset();
    } else if (running) {
      catalog ??= createCatalogAnimation();
      tick(performance.now());
    }
  }

  trigger.addEventListener(
    "pointerenter",
    () => {
      hovered = true;
      synchronize();
    },
    { signal: events.signal },
  );
  trigger.addEventListener(
    "pointerleave",
    () => {
      hovered = false;
      synchronize();
    },
    { signal: events.signal },
  );
  trigger.addEventListener(
    "focusin",
    () => {
      focused = trigger.matches(":focus-visible");
      synchronize();
    },
    { signal: events.signal },
  );
  trigger.addEventListener(
    "focusout",
    () => {
      focused = false;
      synchronize();
    },
    { signal: events.signal },
  );
  reducedMotion.addEventListener("change", synchronize, { signal: events.signal });
  document.addEventListener("visibilitychange", synchronize, { signal: events.signal });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    synchronize();
  });
  observer.observe(svg);
  painter.reset();
  trigger.dataset["ready"] = "true";
  synchronize();
  return () => {
    events.abort();
    observer.disconnect();
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
    painter.reset();
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
