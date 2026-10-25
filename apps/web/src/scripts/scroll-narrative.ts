import { initializeMascotAnimation } from "./mascot-animation";

function bounded(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ease(value: number): number {
  const amount = bounded(value);
  return amount * amount * (3 - 2 * amount);
}

function envelope(progress: number, start: number, end: number): number {
  return ease((progress - start) / 0.1) * (1 - ease((progress - end) / 0.1));
}

/** A viewport-scoped native scroll enhancement. Nothing intercepts wheel/touch/keyboard input. */
export function initializeScrollNarrative(root: HTMLElement): () => void {
  const foundTrack = root.querySelector<HTMLElement>("[data-story-track]");
  const foundMascot = root.querySelector<HTMLElement>("[data-story-mascot]");
  const foundDock = root.querySelector<HTMLElement>("[data-mascot-dock]");
  const scenes = [...root.querySelectorAll<HTMLElement>("[data-story-scene]")];
  if (foundTrack === null || foundMascot === null || foundDock === null) {
    return () => undefined;
  }
  const track = foundTrack;
  const mascot = foundMascot;
  const dock = foundDock;
  const events = new AbortController();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame: number | undefined;
  let top = 0;
  let span = 1;
  let size = 220;
  let target = { x: 0, y: 0, size: 40 };
  let currentScene = "";

  root.dataset["enhanced"] = "true";

  function render(): void {
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
    frame = undefined;
    const progress = bounded((scrollY - top) / span);
    animation.setPhase(progress >= 0.999 ? "docked" : progress > 0 ? "narrative" : "opening");
    const docking = ease((progress - 0.8) / 0.2);
    const receding = ease(progress / 0.2);
    const backgroundScale = 1 - receding * 0.2;
    const scale = backgroundScale + (target.size / size - backgroundScale) * docking;
    const x = innerWidth / 2 + (target.x - innerWidth / 2) * docking;
    const y = innerHeight / 2 + (target.y - innerHeight / 2) * docking;
    // Translate in screen coordinates; scale about the mascot's center so the dock is exact.
    mascot.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(${scale})`;
    mascot.style.opacity = String((1 - receding * 0.955) * (1 - docking) + docking);
    mascot.dataset["background"] = String(progress >= 0.12 && progress < 0.82);
    const active =
      progress < 0.16
        ? "opening"
        : progress < 0.49
          ? "origin"
          : progress < 0.82
            ? "protocols"
            : "connect";
    const opacity: Record<string, number> = {
      opening: 1 - ease(progress / 0.12),
      origin: envelope(progress, 0.12, 0.4),
      protocols: envelope(progress, 0.46, 0.72),
      connect: ease((progress - 0.82) / 0.12),
    };
    for (const scene of scenes) {
      const name = scene.dataset["storyScene"] ?? "";
      const alpha = opacity[name] ?? 0;
      scene.style.opacity = String(alpha);
      scene.dataset["visible"] = String(alpha > 0.001);
      scene.style.transform = reducedMotion.matches ? "none" : `translateY(${(1 - alpha) * 18}px)`;
      scene.style.pointerEvents = name === active ? "auto" : "none";
      if (currentScene !== active) {
        scene.inert = name !== active;
        scene.setAttribute("aria-hidden", String(name !== active));
      }
    }
    currentScene = active;
    root.dataset["scene"] = active;
    root.dataset["progress"] = progress.toFixed(4);
    mascot.dataset["docked"] = String(progress >= 0.999);
  }

  function requestRender(): void {
    frame ??= requestAnimationFrame(render);
  }

  function measure(): void {
    const box = track.getBoundingClientRect();
    const slot = dock.getBoundingClientRect();
    top = box.top + scrollY;
    span = Math.max(1, track.offsetHeight - innerHeight);
    size = Math.min(260, Math.max(200, innerWidth * 0.18));
    target = { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2, size: slot.width };
    mascot.style.setProperty("--mascot-size", `${size}px`);
    requestRender();
  }

  root.querySelector("[data-story-skip]")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      scrollTo({ top: top + span * 0.29, behavior: "instant" });
      render();
      root.querySelector<HTMLElement>("#narrative-origin")?.focus({ preventScroll: true });
    },
    { signal: events.signal },
  );
  globalThis.addEventListener("scroll", requestRender, { passive: true, signal: events.signal });
  globalThis.addEventListener("resize", measure, { signal: events.signal });
  reducedMotion.addEventListener("change", requestRender, { signal: events.signal });
  const observer = new ResizeObserver(measure);
  observer.observe(track);
  observer.observe(dock);
  const animation = initializeMascotAnimation(mascot);
  measure();
  render();

  return () => {
    events.abort();
    observer.disconnect();
    animation.dispose();
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
    for (const scene of scenes) {
      scene.inert = false;
      scene.removeAttribute("aria-hidden");
      scene.removeAttribute("style");
      delete scene.dataset["visible"];
    }
    mascot.removeAttribute("style");
    delete root.dataset["enhanced"];
    delete root.dataset["scene"];
    delete root.dataset["progress"];
  };
}
