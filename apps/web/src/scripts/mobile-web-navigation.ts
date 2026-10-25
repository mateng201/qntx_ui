import { sections } from "../data/site";

/** Compatibility controller only for the unchanged <=760px website. */
export function initializeMobileWebNavigation(): () => void {
  const deck = document.querySelector<HTMLElement>("[data-deck]");
  const shell = document.querySelector<HTMLElement>("[data-site-shell]");
  if (deck === null || shell === null) {
    return () => undefined;
  }

  const events = new AbortController();
  const panels = [...deck.querySelectorAll<HTMLElement>("[data-panel]")];
  const panelLinks = [...shell.querySelectorAll<HTMLAnchorElement>("[data-panel-link]")];
  const previous = document.querySelector<HTMLButtonElement>("[data-previous]");
  const next = document.querySelector<HTMLButtonElement>("[data-next]");
  const counter = document.querySelector<HTMLElement>("[data-current-panel]");
  const announcement = document.querySelector<HTMLElement>("[data-section-announcement]");
  const reducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = -1;
  let scrollFrame = 0;
  let lastWheelAt = -1000;

  function updateActivePanel(): void {
    if (deck === null || shell === null) {
      return;
    }
    const index = Math.min(
      panels.length - 1,
      Math.max(0, Math.round(deck.scrollLeft / deck.clientWidth)),
    );
    if (index === activeIndex) {
      return;
    }
    const section = sections[index];
    if (section === undefined) {
      return;
    }

    activeIndex = index;
    shell.dataset["theme"] = section.theme;
    if (counter !== null) {
      counter.textContent = section.number;
    }
    if (previous !== null) {
      previous.disabled = index === 0;
    }
    if (next !== null) {
      next.disabled = index === panels.length - 1;
    }
    if (announcement !== null) {
      announcement.textContent = `${section.label}, section ${index + 1} of ${panels.length}`;
    }
    for (const link of panelLinks) {
      if (link.hash === `#${section.id}`) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
    const hash = index === 0 ? "" : `#${section.id}`;
    if (globalThis.location.hash !== hash) {
      globalThis.history.replaceState(
        null,
        "",
        `${globalThis.location.pathname}${globalThis.location.search}${hash}`,
      );
    }
  }

  function navigateTo(index: number, moveFocus = false): void {
    const panel = panels[index];
    if (panel === undefined) {
      return;
    }
    panel.scrollIntoView({
      behavior: reducedMotion.matches ? "instant" : "smooth",
      block: "nearest",
      inline: "start",
    });
    if (moveFocus) {
      panel.setAttribute("tabindex", "-1");
      panel.focus({ preventScroll: true });
    }
  }

  function navigateToHash(): void {
    const index = sections.findIndex((section) => `#${section.id}` === globalThis.location.hash);
    if (index !== -1) {
      navigateTo(index);
    }
  }

  function handleWheel(event: WheelEvent): void {
    if (deck === null || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
      return;
    }
    // Let a tall panel consume vertical scrolling before navigating away on short/mobile viewports.
    const panel = panels[Math.max(0, activeIndex)];
    if (panel !== undefined && panel.scrollHeight > panel.clientHeight + 1) {
      const canScrollDown =
        event.deltaY > 0 && panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1;
      const canScrollUp = event.deltaY < 0 && panel.scrollTop > 0;
      if (canScrollDown || canScrollUp) {
        return;
      }
    }
    if (event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    const now = performance.now();
    const sameGesture = now - lastWheelAt < 220;
    lastWheelAt = now;
    // A wheel gesture often contains many events; keep it on one adjacent snap point.
    if (sameGesture) {
      return;
    }
    const delta =
      event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? deck.clientWidth : 1);
    deck.scrollBy({ left: delta, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  function handleScroll(): void {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(updateActivePanel);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const { target } = event;
    if (
      target instanceof HTMLElement &&
      target.closest("input, textarea, select, [contenteditable='true']") !== null
    ) {
      return;
    }
    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowLeft" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      event.preventDefault();
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? panels.length - 1
            : activeIndex + (event.key === "ArrowRight" ? 1 : -1);
      navigateTo(Math.min(panels.length - 1, Math.max(0, index)), true);
    }
  }

  for (const link of panelLinks) {
    link.addEventListener(
      "click",
      (event: MouseEvent) => {
        if (
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        const index = sections.findIndex((section) => `#${section.id}` === link.hash);
        if (index === -1) {
          return;
        }
        event.preventDefault();
        navigateTo(index, true);
      },
      { signal: events.signal },
    );
  }
  previous?.addEventListener("click", () => navigateTo(activeIndex - 1, true), {
    signal: events.signal,
  });
  next?.addEventListener("click", () => navigateTo(activeIndex + 1, true), {
    signal: events.signal,
  });
  deck.addEventListener("wheel", handleWheel, { passive: false, signal: events.signal });
  deck.addEventListener("scroll", handleScroll, { passive: true, signal: events.signal });
  globalThis.addEventListener("keydown", handleKeydown, { signal: events.signal });
  globalThis.addEventListener("hashchange", navigateToHash, { signal: events.signal });
  const observer = new ResizeObserver(handleScroll);
  observer.observe(deck);

  const initialIndex = sections.findIndex(
    (section) => `#${section.id}` === globalThis.location.hash,
  );
  if (initialIndex !== -1) {
    const panel = panels[initialIndex];
    if (panel !== undefined) {
      deck.scrollTo({ left: panel.offsetLeft, behavior: "instant" });
    }
  }
  updateActivePanel();
  return () => {
    events.abort();
    observer.disconnect();
    cancelAnimationFrame(scrollFrame);
  };
}
