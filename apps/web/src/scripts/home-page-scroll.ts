import {
  createMascotDockingCurve,
  easeMascotDocking,
  getMascotDockingPosition,
  getMascotDockingProgress,
  mascotDockingTiming,
} from "./mascot-docking";
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

function getDocumentSectionOpacity(bounds: DOMRect, headerBottom: number): number {
  const fadeDistance = Math.min(140, Math.max(60, (innerHeight - headerBottom) * 0.16));
  const entering = smoothStep((innerHeight - bounds.top) / fadeDistance);
  const leaving = smoothStep((bounds.bottom - headerBottom) / fadeDistance);
  return entering * leaving;
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
  let startupFrameId: number | undefined;
  let top = 0;
  let scrollDistance = 1;
  let size = 220;
  let headerBottom = 0;
  let target = { x: 0, y: 0, size: 40 };
  let previousSectionId = "";
  let docking = 0;
  let targetDocking = 0;
  let dockingCurve = createMascotDockingCurve();
  let dockingTransition: { from: number; to: number; started: number } | undefined;

  scrollTo({ top: 0, left: 0, behavior: "instant" });

  function renderScrollFrame(now = performance.now()): void {
    if (renderFrameId !== undefined) {
      cancelAnimationFrame(renderFrameId);
    }
    renderFrameId = undefined;
    // Fractional viewport sizes can leave the browser's real endpoint just below 1.
    const progress =
      top + scrollDistance - scrollY <= 2 ? 1 : clampProgress((scrollY - top) / scrollDistance);
    const desiredDocking = getMascotDockingProgress(progress);
    if (dockingTransition !== undefined) {
      const elapsed = clampProgress(
        (now - dockingTransition.started) / mascotDockingTiming.duration,
      );
      docking = dockingTransition.from + (dockingTransition.to - dockingTransition.from) * elapsed;
      if (elapsed === 1) {
        dockingTransition = undefined;
      }
    }
    if (reducedMotion.matches) {
      docking = desiredDocking;
      targetDocking = desiredDocking;
      dockingTransition = undefined;
    } else if (desiredDocking !== targetDocking) {
      if (
        (targetDocking === 0 && docking <= 0.001 && desiredDocking > 0) ||
        (targetDocking === 1 && docking >= 0.999 && desiredDocking < 1)
      ) {
        dockingCurve = createMascotDockingCurve(dockingCurve);
      }
      dockingTransition = { from: docking, to: desiredDocking, started: now };
      targetDocking = desiredDocking;
    }
    const isDocked = progress >= 0.999 && docking >= 0.999;
    animation.setPlaybackPhase(
      isDocked
        ? "docked"
        : docking > 0.6
          ? "arriving"
          : progress <= 0 && docking <= 0.001
            ? "opening"
            : "scrolling",
    );
    const receding = smoothStep(progress / 0.2);
    const backgroundScale = 1 - receding * 0.2;
    const scale = backgroundScale + (target.size / size - backgroundScale) * smoothStep(docking);
    const position = getMascotDockingPosition(
      { x: innerWidth / 2, y: innerHeight / 2 },
      target,
      docking,
      dockingCurve,
    );
    // Translate in screen coordinates; scale about the mascot's center so the dock is exact.
    mascot.style.transform = `translate3d(${position.x - size / 2}px, ${position.y - size / 2}px, 0) scale(${scale})`;
    const arrival = smoothStep((docking - 0.78) / 0.22);
    const flightLift = Math.sin(Math.PI * docking);
    const backgroundOpacity = 1 - receding * 0.955 + 0.22 * flightLift;
    mascot.style.opacity = String(Math.min(1, backgroundOpacity * (1 - arrival) + arrival));
    const flightSide = Math.sign(dockingCurve.bend);
    const flightDepth = flightLift * flightLift;
    mascot.style.setProperty("--mascot-flight-pitch", `${-12 * flightDepth}deg`);
    mascot.style.setProperty("--mascot-flight-yaw", `${flightSide * 20 * flightDepth}deg`);
    mascot.style.setProperty("--mascot-flight-roll", `${flightSide * 5 * flightDepth}deg`);
    mascot.style.setProperty("--mascot-depth", `${36 * flightDepth}px`);
    mascot.style.setProperty("--mascot-shadow-y", `${16 * flightDepth}px`);
    mascot.style.setProperty("--mascot-shadow-blur", `${12 * flightDepth}px`);
    mascot.dataset["mascotBackground"] = String(progress >= 0.12 && docking < 0.95);
    mascot.dataset["mascotTravelling"] = String(
      dockingTransition !== undefined || (docking > 0.001 && docking < 0.999),
    );
    mascot.dataset["dockingCurve"] = dockingCurve.bend.toFixed(5);
    let activeSectionId =
      progress < 0.2
        ? "opening"
        : progress < mascotDockingTiming.scrollStart
          ? "about"
          : "resources";
    const isDocumentLayout = root.dataset["scrollLayout"] === "document";
    if (isDocumentLayout) {
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= innerHeight * 0.55) {
          activeSectionId = section.dataset["pageSection"] ?? activeSectionId;
        }
      }
    }
    // Follow the rendered flight, including its easing and reversals, rather than raw scroll input.
    const resourcesOpacity = easeMascotDocking(docking);
    const sectionOpacities: Record<string, number> = {
      opening: 1 - smoothStep(progress / 0.12),
      about: Math.min(getSectionOpacity(progress, 0.18, 0.48), 1 - resourcesOpacity),
      resources: resourcesOpacity,
    };
    for (const section of sections) {
      if (isDocumentLayout) {
        section.inert = false;
        section.removeAttribute("aria-hidden");
        section.style.removeProperty("transform");
        section.style.removeProperty("pointer-events");
        const contentBounds = (section.firstElementChild ?? section).getBoundingClientRect();
        section.style.opacity = String(
          reducedMotion.matches ? 1 : getDocumentSectionOpacity(contentBounds, headerBottom),
        );
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
    mascot.dataset["logoDocked"] = String(isDocked);
    if (dockingTransition !== undefined) {
      renderFrameId = requestAnimationFrame(renderScrollFrame);
    }
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
    headerBottom = root.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
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
  root.dataset["scrollReady"] = "true";
  // Paint the prepared opening once before allowing normal section transitions.
  startupFrameId = requestAnimationFrame(() => {
    startupFrameId = requestAnimationFrame(() => {
      startupFrameId = undefined;
      delete document.documentElement.dataset["homeStarting"];
    });
  });

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
    if (startupFrameId !== undefined) {
      cancelAnimationFrame(startupFrameId);
    }
    delete document.documentElement.dataset["homeStarting"];
    for (const section of sections) {
      section.inert = false;
      section.removeAttribute("aria-hidden");
      section.removeAttribute("style");
      delete section.dataset["visible"];
    }
    mascot.removeAttribute("style");
    delete mascot.dataset["dockingCurve"];
    delete mascot.dataset["mascotTravelling"];
    delete root.dataset["scrollReady"];
    delete root.dataset["activeSection"];
    delete root.dataset["scrollProgress"];
    delete root.dataset["scrollLayout"];
  };
}
