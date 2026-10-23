import { overviewNodes } from "../data/overview-nodes";

type Direction = "top" | "right" | "bottom" | "left";
type Box = { left: number; top: number; right: number; bottom: number };
type Placement = {
  left: number;
  top: number;
  width: number;
  height: number;
  direction: Direction;
  score: number;
};

const preferredDirections: Record<string, Direction[]> = {
  transact: ["top", "right", "left", "bottom"],
  collaborate: ["right", "top", "bottom", "left"],
  govern: ["bottom", "right", "left", "top"],
  evolve: ["left", "bottom", "top", "right"],
};

function overlaps(a: Box, b: Box, gap = 0): boolean {
  return (
    a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function positionPopover(
  region: HTMLElement,
  details: HTMLElement,
  anchor: HTMLButtonElement,
  buttons: HTMLButtonElement[],
): boolean {
  const regionBox = region.getBoundingClientRect();
  const panel = region.closest("[data-panel]")?.getBoundingClientRect();
  const logo = region.querySelector(".overview-logo")?.getBoundingClientRect();
  if (panel === undefined || logo === undefined) {
    return false;
  }
  const bounds = {
    left: Math.max(10, panel.left + 10),
    top: Math.max(10, panel.top + 10),
    right: Math.min(innerWidth - 12, panel.right - 12),
    bottom: Math.min(innerHeight - 10, panel.bottom - 10),
  };
  const node = anchor.getBoundingClientRect();
  const nodeX = (node.left + node.right) / 2;
  const nodeY = (node.top + node.bottom) / 2;
  const priorities = preferredDirections[anchor.dataset["overviewNode"] ?? ""] ?? [
    "top",
    "right",
    "bottom",
    "left",
  ];
  const otherButtons = buttons
    .filter((button) => button !== anchor)
    .map((button) => button.getBoundingClientRect());
  let best: Placement | undefined;
  const available = bounds.right - bounds.left;
  for (const width of new Set([
    ...(innerWidth <= 760 ? [Math.min(300, available)] : []),
    Math.min(260, bounds.right - logo.right - 10),
    Math.min(260, logo.left - bounds.left - 10),
    Math.min(260, available),
    Math.min(224, available),
    Math.min(180, available),
  ])) {
    if (width < 160) {
      continue;
    }
    details.style.setProperty("--popover-width", `${width}px`);
    const height = details.offsetHeight;
    if (height > bounds.bottom - bounds.top) {
      continue;
    }
    const xs = [
      node.left - width - 12,
      nodeX - width / 2,
      node.right + 12,
      bounds.left,
      bounds.right - width,
      logo.left - width - 10,
      logo.right + 10,
    ];
    const ys = [
      node.top - height - 12,
      nodeY - height / 2,
      node.bottom + 12,
      bounds.top,
      bounds.bottom - height,
      logo.top - height - 10,
      logo.bottom + 10,
    ];
    for (const rawX of xs) {
      for (const rawY of ys) {
        const left = clamp(rawX, bounds.left, bounds.right - width);
        const top = clamp(rawY, bounds.top, bounds.bottom - height);
        const box = { left, top, right: left + width, bottom: top + height };
        if (overlaps(box, logo, 8) || overlaps(box, node, 6)) {
          continue;
        }
        const possible: Direction[] = [];
        if (box.bottom <= node.top) {
          possible.push("top");
        }
        if (box.left >= node.right) {
          possible.push("right");
        }
        if (box.top >= node.bottom) {
          possible.push("bottom");
        }
        if (box.right <= node.left) {
          possible.push("left");
        }
        const direction = priorities.find((side) => possible.includes(side));
        if (direction === undefined) {
          continue;
        }
        const distanceX = Math.max(node.left - box.right, box.left - node.right, 0);
        const distanceY = Math.max(node.top - box.bottom, box.top - node.bottom, 0);
        const alignment =
          direction === "top" || direction === "bottom"
            ? Math.abs(left + width / 2 - nodeX)
            : Math.abs(top + height / 2 - nodeY);
        const conflicts = otherButtons.filter((button) => overlaps(box, button, 4)).length;
        const score =
          Math.hypot(distanceX, distanceY) * 2 +
          alignment * 0.08 +
          priorities.indexOf(direction) * 12 +
          (260 - width) * 0.12 +
          conflicts * 10_000;
        if (best === undefined || score < best.score) {
          best = { left, top, width, height, direction, score };
        }
      }
    }
  }
  if (best === undefined) {
    return false;
  }
  details.style.setProperty("--popover-width", `${best.width}px`);
  details.style.setProperty("--popover-left", `${best.left - regionBox.left}px`);
  details.style.setProperty("--popover-top", `${best.top - regionBox.top}px`);
  const arrowX = clamp(nodeX - best.left, 16, best.width - 16);
  const arrowY = clamp(nodeY - best.top, 16, best.height - 16);
  details.style.setProperty("--popover-arrow-x", `${arrowX - 4}px`);
  details.style.setProperty("--popover-arrow-y", `${arrowY - 4}px`);
  const horizontal = best.direction === "left" || best.direction === "right";
  details.style.setProperty(
    "--popover-shift-x",
    horizontal ? (best.direction === "left" ? "8px" : "-8px") : "0px",
  );
  details.style.setProperty(
    "--popover-shift-y",
    horizontal ? "0px" : best.direction === "top" ? "8px" : "-8px",
  );
  const origin = horizontal
    ? `${best.direction === "left" ? "right" : "left"} ${arrowY}px`
    : `${arrowX}px ${best.direction === "top" ? "bottom" : "top"}`;
  details.style.setProperty("--popover-origin", origin);
  details.dataset["direction"] = best.direction;
  return true;
}

function bindOverview(
  region: HTMLElement,
  details: HTMLElement,
  title: HTMLElement,
  description: HTMLElement,
  closeButton: HTMLButtonElement,
): () => void {
  const events = new AbortController();
  const buttons = [...region.querySelectorAll<HTMLButtonElement>("[data-overview-node]")];
  const reducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  let selected: HTMLButtonElement | undefined;
  let displayed: HTMLButtonElement | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let openingFrame: number | undefined;
  let positionFrame: number | undefined;

  function updateButtons(): void {
    for (const button of buttons) {
      button.setAttribute("aria-expanded", String(button === selected));
    }
    if (selected === undefined) {
      delete region.dataset["activeNode"];
    } else {
      region.dataset["activeNode"] = selected.dataset["overviewNode"] ?? "";
    }
  }

  function cancelOpening(): void {
    if (openingFrame !== undefined) {
      cancelAnimationFrame(openingFrame);
      openingFrame = undefined;
    }
  }

  function show(button: HTMLButtonElement): void {
    const node = overviewNodes.find((item) => item.id === button.dataset["overviewNode"]);
    if (node === undefined) {
      return;
    }
    displayed = button;
    title.textContent = `${node.label} · ${node.code}`;
    description.textContent = node.description;
    details.dataset["state"] = "opening";
    details.hidden = false;
    details.inert = true;
    details.setAttribute("aria-hidden", "true");
    if (!positionPopover(region, details, button, buttons)) {
      selected = undefined;
      details.hidden = true;
      details.dataset["state"] = "closed";
      updateButtons();
      return;
    }
    // Position and measure at opacity zero before starting the CSS entrance transition.
    details.getBoundingClientRect();
    openingFrame = requestAnimationFrame(() => {
      openingFrame = undefined;
      if (selected === button) {
        details.dataset["state"] = "open";
        details.inert = false;
        details.removeAttribute("aria-hidden");
      }
    });
  }

  function finishClose(): void {
    if (details.dataset["state"] !== "closing") {
      return;
    }
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
    if (selected === undefined) {
      details.hidden = true;
      details.dataset["state"] = "closed";
      displayed = undefined;
    } else {
      show(selected);
    }
  }

  function beginClose(): void {
    cancelOpening();
    if (details.dataset["state"] === "closing") {
      return;
    }
    details.dataset["state"] = "closing";
    details.inert = true;
    details.setAttribute("aria-hidden", "true");
    if (reducedMotion.matches) {
      finishClose();
    } else {
      closeTimer = setTimeout(finishClose, 220);
    }
  }

  function close(restoreFocus: boolean): void {
    const previous = selected ?? displayed;
    selected = undefined;
    updateButtons();
    if (restoreFocus) {
      previous?.focus({ preventScroll: true });
    }
    if (details.hidden === false) {
      beginClose();
    }
  }

  function selectNode(event: MouseEvent): void {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    region.querySelector("[data-q-logo]")?.dispatchEvent(new Event("qntx:logo-smile"));
    if (selected === button) {
      close(false);
      return;
    }
    selected = button;
    updateButtons();
    if (details.hidden === true) {
      show(button);
    } else {
      beginClose();
    }
  }

  function reposition(): void {
    positionFrame = undefined;
    if (
      details.hidden === false &&
      displayed !== undefined &&
      !positionPopover(region, details, displayed, buttons)
    ) {
      close(false);
    }
  }

  function requestPosition(): void {
    if (details.hidden === false && positionFrame === undefined) {
      positionFrame = requestAnimationFrame(reposition);
    }
  }

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener("click", selectNode, { signal: events.signal });
  }
  closeButton.addEventListener("click", () => close(true), { signal: events.signal });
  details.addEventListener(
    "transitionend",
    (event) => {
      if (event.target === details && event.propertyName === "opacity") {
        finishClose();
      }
    },
    { signal: events.signal },
  );
  region.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && details.hidden === false) {
        event.preventDefault();
        close(true);
      }
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const nodeButton =
        event.target instanceof Element ? event.target.closest("[data-overview-node]") : null;
      if (
        !details.contains(event.target) &&
        (nodeButton === null || !region.contains(nodeButton))
      ) {
        close(false);
      }
    },
    { signal: events.signal },
  );
  document.addEventListener("scroll", requestPosition, {
    capture: true,
    passive: true,
    signal: events.signal,
  });
  globalThis.addEventListener("resize", requestPosition, { signal: events.signal });
  const observer = new ResizeObserver(requestPosition);
  observer.observe(region);
  observer.observe(details);
  details.inert = true;
  region.dataset["interactive"] = "true";
  return () => {
    selected = undefined;
    updateButtons();
    events.abort();
    observer.disconnect();
    cancelOpening();
    if (positionFrame !== undefined) {
      cancelAnimationFrame(positionFrame);
    }
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer);
    }
    details.hidden = true;
    for (const button of buttons) {
      button.disabled = true;
    }
    delete region.dataset["interactive"];
  };
}

export function initializeOverviewInteractions(): () => void {
  const cleanup: Array<() => void> = [];
  for (const region of document.querySelectorAll<HTMLElement>("[data-overview-visual]")) {
    const details = region.querySelector<HTMLElement>("#overview-node-details");
    const title = region.querySelector<HTMLElement>("[data-node-title]");
    const description = region.querySelector<HTMLElement>("[data-node-description]");
    const closeButton = region.querySelector<HTMLButtonElement>("[data-node-close]");
    if (details !== null && title !== null && description !== null && closeButton !== null) {
      cleanup.push(bindOverview(region, details, title, description, closeButton));
    }
  }
  return () => {
    for (const dispose of cleanup) {
      dispose();
    }
  };
}
