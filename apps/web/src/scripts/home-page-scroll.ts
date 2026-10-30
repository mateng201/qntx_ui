import { initializeMascotPlayback } from "./mascot-playback";

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number): number {
  const amount = clampProgress(value);
  return amount * amount * (3 - 2 * amount);
}

function getSectionOpacity(progress: number, start: number, end: number): number {
  return smoothStep((progress - start) / 0.1) * (1 - smoothStep((progress - end) / 0.1));
}

/** One scroll controller for all viewports; long sections use ordinary document flow. */
export function initializeHomePageScroll(root: HTMLElement): () => void {
  const foundTrack = root.querySelector<HTMLElement>("[data-scroll-track]");
  const foundMascot = root.querySelector<HTMLElement>("[data-mascot]");
  const foundDock = root.querySelector<HTMLElement>("[data-mascot-dock]");
  const sections = [...root.querySelectorAll<HTMLElement>("[data-page-section]")];
  if (foundTrack === null || foundMascot === null || foundDock === null) {
    return () => undefined;
  }
  const track = foundTrack;
  const mascot = foundMascot;
  const dock = foundDock;
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let renderFrameId: number | undefined;
  let measureFrameId: number | undefined;
  let top = 0;
  let scrollDistance = 1;
  let size = 220;
  let target = { x: 0, y: 0, size: 40 };
  let previousSectionId = "";

  root.dataset["scrollReady"] = "true";

  function renderScrollFrame(): void {
    if (renderFrameId !== undefined) {
      cancelAnimationFrame(renderFrameId);
    }
    renderFrameId = undefined;
    const progress = clampProgress((scrollY - top) / scrollDistance);
    animation.setPlaybackPhase(
      progress >= 0.999 ? "docked" : progress > 0 ? "scrolling" : "opening",
    );
    const docking = smoothStep((progress - 0.8) / 0.2);
    const receding = smoothStep(progress / 0.2);
    const backgroundScale = 1 - receding * 0.2;
    const scale = backgroundScale + (target.size / size - backgroundScale) * docking;
    const x = innerWidth / 2 + (target.x - innerWidth / 2) * docking;
    const y = innerHeight / 2 + (target.y - innerHeight / 2) * docking;
    // Translate in screen coordinates; scale about the mascot's center so the dock is exact.
    mascot.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(${scale})`;
    mascot.style.opacity = String((1 - receding * 0.955) * (1 - docking) + docking);
    mascot.dataset["mascotBackground"] = String(progress >= 0.12 && progress < 0.82);
    let activeSectionId =
      progress < 0.16
        ? "opening"
        : progress < 0.49
          ? "about"
          : progress < 0.82
            ? "protocols"
            : "resources";
    const isDocumentLayout = root.dataset["scrollLayout"] === "document";
    if (isDocumentLayout) {
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= innerHeight * 0.55) {
          activeSectionId = section.dataset["pageSection"] ?? activeSectionId;
        }
      }
    }
    const sectionOpacities: Record<string, number> = {
      opening: 1 - smoothStep(progress / 0.12),
      about: getSectionOpacity(progress, 0.12, 0.4),
      protocols: getSectionOpacity(progress, 0.46, 0.72),
      resources: smoothStep((progress - 0.82) / 0.12),
    };
    for (const section of sections) {
      if (isDocumentLayout) {
        section.inert = false;
        section.removeAttribute("aria-hidden");
        section.removeAttribute("style");
        delete section.dataset["visible"];
        continue;
      }
      const sectionId = section.dataset["pageSection"] ?? "";
      const sectionOpacity = sectionOpacities[sectionId] ?? 0;
      section.style.opacity = String(sectionOpacity);
      section.dataset["visible"] = String(sectionOpacity > 0.001);
      section.style.transform = reducedMotion.matches
        ? "none"
        : `translateY(${(1 - sectionOpacity) * 18}px)`;
      section.style.pointerEvents = sectionId === activeSectionId ? "auto" : "none";
      if (
        previousSectionId !== activeSectionId ||
        section.inert !== (sectionId !== activeSectionId)
      ) {
        section.inert = sectionId !== activeSectionId;
        section.setAttribute("aria-hidden", String(sectionId !== activeSectionId));
      }
    }
    previousSectionId = activeSectionId;
    root.dataset["activeSection"] = activeSectionId;
    root.dataset["scrollProgress"] = progress.toFixed(4);
    mascot.dataset["logoDocked"] = String(progress >= 0.999);
  }

  function scheduleScrollRender(): void {
    renderFrameId ??= requestAnimationFrame(renderScrollFrame);
  }

  function measureScrollLayout(): void {
    // Measure the actual content, including text wrapping and browser font scaling.
    // A section that cannot fit must remain readable in the document, without nested scrolling.
    root.dataset["scrollLayout"] = sections.every((section) => {
      const content = section.firstElementChild;
      if (content === null) {
        return true;
      }
      const style = getComputedStyle(section);
      const padding =
        Number(style.paddingTop.replace("px", "")) + Number(style.paddingBottom.replace("px", ""));
      return (
        Math.max(content.scrollHeight, content.getBoundingClientRect().height) + padding <=
        innerHeight + 1
      );
    })
      ? "pinned"
      : "document";
    const box = track.getBoundingClientRect();
    const slot = dock.getBoundingClientRect();
    top = box.top + scrollY;
    scrollDistance = Math.max(1, track.offsetHeight - innerHeight);
    size = Number(getComputedStyle(mascot).width.replace("px", ""));
    target = { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2, size: slot.width };
    scheduleScrollRender();
  }

  function scheduleLayoutMeasurement(): void {
    measureFrameId ??= requestAnimationFrame(() => {
      measureFrameId = undefined;
      measureScrollLayout();
    });
  }

  root.querySelector("[data-skip-to-about]")?.addEventListener(
    "click",
    (event) => {
      if (root.dataset["scrollLayout"] === "document") {
        return;
      }
      event.preventDefault();
      scrollTo({ top: top + scrollDistance * 0.29, behavior: "instant" });
      renderScrollFrame();
      root.querySelector<HTMLElement>("#about")?.focus({ preventScroll: true });
    },
    { signal: events.signal },
  );
  globalThis.addEventListener("scroll", scheduleScrollRender, {
    passive: true,
    signal: events.signal,
  });
  globalThis.addEventListener("resize", scheduleLayoutMeasurement, { signal: events.signal });
  reducedMotion.addEventListener("change", scheduleScrollRender, { signal: events.signal });
  const observer = new ResizeObserver(scheduleLayoutMeasurement);
  observer.observe(track);
  observer.observe(dock);
  for (const section of sections) {
    observer.observe(section);
    if (section.firstElementChild !== null) {
      observer.observe(section.firstElementChild);
    }
  }
  const animation = initializeMascotPlayback(mascot);
  measureScrollLayout();
  renderScrollFrame();

  return () => {
    events.abort();
    observer.disconnect();
    animation.dispose();
    if (renderFrameId !== undefined) {
      cancelAnimationFrame(renderFrameId);
    }
    if (measureFrameId !== undefined) {
      cancelAnimationFrame(measureFrameId);
    }
    for (const section of sections) {
      section.inert = false;
      section.removeAttribute("aria-hidden");
      section.removeAttribute("style");
      delete section.dataset["visible"];
    }
    mascot.removeAttribute("style");
    delete root.dataset["scrollReady"];
    delete root.dataset["activeSection"];
    delete root.dataset["scrollProgress"];
    delete root.dataset["scrollLayout"];
  };
}
