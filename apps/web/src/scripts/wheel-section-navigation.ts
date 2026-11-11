type SectionStop = { id: string; top: number };

type WheelNavigationOptions = {
  getStops: () => SectionStop[];
  isSettling: () => boolean;
  renderFrame: () => void;
};

type SectionTransition = {
  fromIndex: number;
  toIndex: number;
  start: number;
  destination: number;
  started: number;
  duration: number;
};

type ContinuationIntent = { direction: number; updatedAt: number };

/** Complete the current step, then continue only while the user's input is still fresh. */
export function initializeWheelSectionNavigation(
  root: HTMLElement,
  options: WheelNavigationOptions,
): () => void {
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 1100;
  const inputWindowMs = 100;
  const continuationTimeoutMs = 300;
  let frameId: number | undefined;
  let transition: SectionTransition | undefined;
  // Capacity is structurally one: repeated input refreshes this slot, never a backlog.
  let continuation: ContinuationIntent | undefined;
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;
  let lastAcceptedDirection = 0;

  function cancelNavigation(): void {
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameId = undefined;
    }
    transition = undefined;
    continuation = undefined;
    lastAcceptedAt = Number.NEGATIVE_INFINITY;
    lastAcceptedDirection = 0;
    delete root.dataset["wheelNavigating"];
  }

  function navigate(fromIndex: number, toIndex: number, now: number): void {
    const stops = options.getStops();
    const from = stops[fromIndex];
    const to = stops[toIndex];
    if (from === undefined || to === undefined) {
      cancelNavigation();
      return;
    }
    const remaining = Math.min(
      1,
      Math.abs(to.top - scrollY) / Math.max(1, Math.abs(to.top - from.top)),
    );
    transition = {
      fromIndex,
      toIndex,
      start: scrollY,
      destination: to.top,
      started: now,
      // A partial reversal should not take another full-length trip.
      duration: duration * Math.max(0.35, remaining),
    };
    root.dataset["wheelNavigating"] = "true";
    frameId = requestAnimationFrame(advance);
  }

  function advance(time: number): void {
    frameId = undefined;
    const current = transition;
    if (current === undefined || root.dataset["scrollLayout"] !== "pinned") {
      cancelNavigation();
      return;
    }
    // Use the existing RAF clock: no debounce timer or per-event queue allocation.
    if (continuation !== undefined && time - continuation.updatedAt >= continuationTimeoutMs) {
      continuation = undefined;
    }
    const progress = reducedMotion.matches
      ? 1
      : Math.min(1, (time - current.started) / current.duration);
    const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
    scrollTo({
      top: current.start + (current.destination - current.start) * eased,
      behavior: "instant",
    });
    options.renderFrame();
    // Finish the accepted step and its mascot flight, even when the user has released the wheel.
    if (progress < 1 || options.isSettling()) {
      frameId = requestAnimationFrame(advance);
      return;
    }
    const pending = continuation;
    continuation = undefined;
    if (pending === undefined) {
      transition = undefined;
      delete root.dataset["wheelNavigating"];
      return;
    }
    lastAcceptedAt = time;
    lastAcceptedDirection = pending.direction;
    navigate(current.toIndex, current.toIndex + pending.direction, time);
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
      const direction = Math.sign(event.deltaY);
      if (
        transition !== undefined &&
        direction !== Math.sign(transition.toIndex - transition.fromIndex)
      ) {
        const { fromIndex, toIndex } = transition;
        cancelNavigation();
        lastAcceptedAt = now;
        lastAcceptedDirection = direction;
        navigate(toIndex, fromIndex, now);
        return;
      }
      if (transition !== undefined) {
        continuation ??= { direction, updatedAt: now };
        continuation.updatedAt = now;
        return;
      }
      // Leading-edge window: the first input is immediate, including with reduced motion.
      if (direction === lastAcceptedDirection && now - lastAcceptedAt < inputWindowMs) {
        return;
      }
      lastAcceptedAt = now;
      lastAcceptedDirection = direction;
      const stops = options.getStops();
      // Use position rather than the fading section's label, including after a manual cancel.
      const next =
        direction > 0
          ? stops.findIndex((stop) => stop.top > scrollY + 2)
          : stops.findLastIndex((stop) => stop.top < scrollY - 2);
      if (next !== -1) {
        navigate(next - direction, next, now);
      }
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
