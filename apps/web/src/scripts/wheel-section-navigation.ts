type SectionStop = { id: string; top: number };

type WheelNavigationOptions = {
  getStops: () => SectionStop[];
  isSettling: () => boolean;
  renderFrame: () => void;
};

/** One vertical wheel gesture advances one scene, including the gesture's inertia tail. */
export function initializeWheelSectionNavigation(
  root: HTMLElement,
  options: WheelNavigationOptions,
): () => void {
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 1100;
  const gestureGap = 220;
  let frameId: number | undefined;
  let lastWheelAt = Number.NEGATIVE_INFINITY;

  function cancelNavigation(): void {
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameId = undefined;
    }
    delete root.dataset["wheelNavigating"];
  }

  root.addEventListener(
    "wheel",
    (event) => {
      if (
        root.dataset["scrollLayout"] !== "pinned" ||
        event.defaultPrevented ||
        !event.cancelable ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.deltaY === 0 ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, [contenteditable]:not([contenteditable=false])",
          ) !== null)
      ) {
        return;
      }
      event.preventDefault();
      const now = performance.now();
      const isNewGesture = now - lastWheelAt > gestureGap;
      lastWheelAt = now;
      if (!isNewGesture || frameId !== undefined || options.isSettling()) {
        return;
      }
      const stops = options.getStops();
      const current = stops.findIndex((stop) => stop.id === root.dataset["activeSection"]);
      const next = stops[current + Math.sign(event.deltaY)];
      if (current === -1 || next === undefined) {
        return;
      }
      const start = scrollY;
      const destination = next.top;
      root.dataset["wheelNavigating"] = "true";

      function advance(time: number): void {
        frameId = undefined;
        if (root.dataset["scrollLayout"] !== "pinned") {
          cancelNavigation();
          return;
        }
        const progress = reducedMotion.matches ? 1 : Math.min(1, (time - now) / duration);
        const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
        scrollTo({ top: start + (destination - start) * eased, behavior: "instant" });
        options.renderFrame();
        // Keep the gesture locked until the synchronized mascot flight has also settled.
        if (progress < 1 || options.isSettling()) {
          frameId = requestAnimationFrame(advance);
        } else {
          delete root.dataset["wheelNavigating"];
        }
      }
      frameId = requestAnimationFrame(advance);
    },
    { passive: false, signal: events.signal },
  );
  globalThis.addEventListener("resize", cancelNavigation, { signal: events.signal });
  root.addEventListener("pointerdown", cancelNavigation, { signal: events.signal });
  globalThis.addEventListener(
    "keydown",
    (event) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
        cancelNavigation();
      }
    },
    { signal: events.signal },
  );
  reducedMotion.addEventListener("change", cancelNavigation, { signal: events.signal });
  return () => {
    events.abort();
    cancelNavigation();
  };
}
