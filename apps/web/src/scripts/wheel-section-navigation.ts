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

/** Advance on the first input, coalesce sustained input and reverse from the current position. */
export function initializeWheelSectionNavigation(
  root: HTMLElement,
  options: WheelNavigationOptions,
): () => void {
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 1100;
  const inputInterval = 120;
  let frameId: number | undefined;
  let transition: SectionTransition | undefined;
  // A destination index is a bounded queue: at most one trip per remaining scene.
  let queuedDestination: number | undefined;
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;
  let lastAcceptedDirection = 0;

  function cancelNavigation(): void {
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameId = undefined;
    }
    transition = undefined;
    queuedDestination = undefined;
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
    const progress = reducedMotion.matches
      ? 1
      : Math.min(1, (time - current.started) / current.duration);
    const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
    scrollTo({
      top: current.start + (current.destination - current.start) * eased,
      behavior: "instant",
    });
    options.renderFrame();
    // The mascot and content must settle together before the next queued trip starts.
    if (progress < 1 || options.isSettling()) {
      frameId = requestAnimationFrame(advance);
      return;
    }
    const pendingDirection = Math.sign((queuedDestination ?? current.toIndex) - current.toIndex);
    if (pendingDirection === 0) {
      cancelNavigation();
    } else {
      navigate(current.toIndex, current.toIndex + pendingDirection, time);
    }
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
        queuedDestination = fromIndex;
        lastAcceptedAt = now;
        lastAcceptedDirection = direction;
        navigate(toIndex, fromIndex, now);
        return;
      }
      // Leading-edge throttle: discarded events do not postpone the next accepted input.
      if (direction === lastAcceptedDirection && now - lastAcceptedAt < inputInterval) {
        return;
      }
      lastAcceptedAt = now;
      lastAcceptedDirection = direction;
      const stops = options.getStops();
      if (transition !== undefined) {
        queuedDestination = Math.max(
          0,
          Math.min(stops.length - 1, (queuedDestination ?? transition.toIndex) + direction),
        );
        return;
      }
      // Use position rather than the fading section's label, including after a manual cancel.
      const next =
        direction > 0
          ? stops.findIndex((stop) => stop.top > scrollY + 2)
          : stops.findLastIndex((stop) => stop.top < scrollY - 2);
      if (next !== -1) {
        queuedDestination = next;
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
