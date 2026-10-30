/* oxlint-disable no-await-in-loop -- Each browser action depends on the previous rendered section. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type StartupFrame = {
  time: number;
  ready: boolean;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  sections: Array<{ opacity: number; visibility: string }>;
};

declare global {
  var startupFrames: StartupFrame[];
}

async function scrollToProgress(page: Page, progress: number): Promise<void> {
  await page.locator("[data-scroll-track]").evaluate((track, amount) => {
    scrollTo({
      top:
        track.getBoundingClientRect().top + scrollY + (track.clientHeight - innerHeight) * amount,
      behavior: "instant",
    });
  }, progress);
  await expect
    .poll(async () =>
      Number(await page.locator("[data-home-page]").getAttribute("data-scroll-progress")),
    )
    .toBeCloseTo(progress, 2);
}

test("desktop entry stays a static Q until scrolling starts the supplied animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const mascot = page.locator("[data-mascot]");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  await expect(mascot).toHaveAttribute("data-playback-mode", "static");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-active-section", "opening");
  const body = mascot.locator("[data-mascot-body]");
  const staticPath = await body.getAttribute("d");
  await page.mouse.move(100, 100);
  await page.waitForTimeout(350);
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await scrollToProgress(page, 0.08);
  await expect(mascot).toHaveAttribute("data-playback-mode", "scroll");
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
  const samples = await mascot.evaluate(async (element) => {
    const body = element.querySelector("[data-mascot-body]");
    const paths = new Set<string>();
    const started = performance.now();
    return new Promise<{ poses: number; maxBound: number }>((resolve) => {
      let maxBound = 0;
      const sample = (time: number): void => {
        paths.add(body?.getAttribute("d") ?? "");
        const svg = element.querySelector("svg");
        if (svg !== null) {
          const box = svg.getBBox();
          maxBound = Math.max(
            maxBound,
            Math.abs(box.x),
            Math.abs(box.y),
            Math.abs(box.x + box.width),
            Math.abs(box.y + box.height),
          );
        }
        if (time - started < 2400) {
          requestAnimationFrame(sample);
        } else {
          resolve({ poses: paths.size, maxBound });
        }
      };
      requestAnimationFrame(sample);
    });
  });
  expect(samples.poses).toBeGreaterThan(15);
  expect(samples.maxBound).toBeLessThanOrEqual(150);
  const box = await mascot.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - (viewport?.width ?? 0) / 2)).toBeLessThan(
    1,
  );
  expect(
    Math.abs((box?.y ?? 0) + (box?.height ?? 0) / 2 - (viewport?.height ?? 0) / 2),
  ).toBeLessThan(1);
  await expect(page.locator("[data-home-page]")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("endpoints wait five static seconds, then keep directional playback active during mouse movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const mascot = page.locator("[data-mascot]");
  const body = mascot.locator("[data-mascot-body]");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  const staticPath = await body.getAttribute("d");
  await page.mouse.move(200, 100);
  await page.waitForTimeout(3000);
  await page.mouse.move(201, 100);
  await page.waitForTimeout(2500);
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await expect(mascot).toHaveAttribute("data-playback-mode", "idle", { timeout: 4000 });
  await page.mouse.move(202, 100);
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
  await expect(mascot).toHaveAttribute("data-look-expression", /^expression-/);

  await scrollToProgress(page, 0.63);
  await expect(mascot).toHaveAttribute("data-playback-mode", "scroll");
  await page.mouse.move(600, 300);
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
  await scrollToProgress(page, 1);
  await expect(mascot).toHaveAttribute("data-playback-phase", "docked");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await page.waitForTimeout(4200);
  await expect(mascot).toHaveAttribute("data-playback-mode", "static");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await expect(mascot).toHaveAttribute("data-playback-mode", "idle", { timeout: 2200 });
  await page.mouse.move(601, 300);
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
  await expect(mascot).toHaveAttribute("data-playback-mode", "idle");
  await scrollToProgress(page, 0);
  await expect(mascot).toHaveAttribute("data-playback-phase", "opening");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
});

test("Q morphs through intermediate shapes in both directions and can reverse mid-transition", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const mascot = page.locator("[data-mascot]");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  const sample = await mascot.evaluate(async (element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Missing mascot wrapper");
    }
    const body = element.querySelector<SVGPathElement>("[data-mascot-body]");
    const svg = element.querySelector("svg");
    const track = document.querySelector<HTMLElement>("[data-scroll-track]");
    if (body === null || svg === null || track === null) {
      throw new Error("Missing animation geometry");
    }
    const original = body.getAttribute("d");
    const forwardPaths = new Set<string>();
    const reversePaths = new Set<string>();
    const transitions = new Set<string>();
    let maximum = 0;
    let maximumStep = 0;
    let previous: DOMRect | undefined;
    const started = performance.now();
    let state = "forward";
    scrollTo(0, (track.clientHeight - innerHeight) * 0.08);
    return new Promise<{
      forward: number;
      reverse: number;
      maximum: number;
      maximumStep: number;
      transitions: string[];
      restored: boolean;
    }>((resolve) => {
      const collect = (now: number): void => {
        const elapsed = now - started;
        if (elapsed >= 600 && state === "forward") {
          state = "reverse";
          scrollTo(0, 0);
          previous = undefined;
        }
        const playbackPhase = element.dataset["morphState"] ?? "none";
        transitions.add(playbackPhase);
        if (playbackPhase === "entering") {
          forwardPaths.add(body.getAttribute("d") ?? "");
        }
        if (playbackPhase === "leaving") {
          reversePaths.add(body.getAttribute("d") ?? "");
        }
        const box = svg.getBBox();
        maximum = Math.max(
          maximum,
          Math.abs(box.x),
          Math.abs(box.y),
          Math.abs(box.x + box.width),
          Math.abs(box.y + box.height),
        );
        if (previous !== undefined) {
          maximumStep = Math.max(
            maximumStep,
            Math.abs(box.x - previous.x),
            Math.abs(box.y - previous.y),
            Math.abs(box.width - previous.width),
            Math.abs(box.height - previous.height),
          );
        }
        previous = box;
        if (elapsed < 1300) {
          requestAnimationFrame(collect);
        } else {
          resolve({
            forward: forwardPaths.size,
            reverse: reversePaths.size,
            maximum,
            maximumStep,
            transitions: [...transitions],
            restored: body.getAttribute("d") === original,
          });
        }
      };
      requestAnimationFrame(collect);
    });
  });
  expect(sample.forward).toBeGreaterThan(5);
  expect(sample.reverse).toBeGreaterThan(5);
  expect(sample.transitions).toEqual(expect.arrayContaining(["entering", "leaving", "none"]));
  expect(sample.maximum).toBeLessThanOrEqual(150);
  expect(sample.maximumStep).toBeLessThan(18);
  expect(sample.restored).toBe(true);
  await scrollToProgress(page, 0.08);
  await expect(mascot).toHaveAttribute("data-morph-state", "entering");
  await scrollToProgress(page, 0);
  await expect(mascot).toHaveAttribute("data-morph-state", "leaving");
  await scrollToProgress(page, 0.08);
  await expect(mascot).toHaveAttribute("data-morph-state", "entering");
  await expect(mascot).toHaveAttribute("data-morph-state", "none");
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
});

test("wheel input switches between about and resources without the deleted protocol screen", async ({
  page,
}) => {
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  const span = await page
    .locator("[data-scroll-track]")
    .evaluate((track) => track.clientHeight - innerHeight);
  await page.mouse.move(1000, 600);
  await page.mouse.wheel(0, span * 0.36);
  await expect(root).toHaveAttribute("data-active-section", "about");
  await expect(page.locator("#about-title")).toBeVisible();
  for (let cycle = 0; cycle < 5; cycle += 1) {
    await page.mouse.wheel(0, span * 0.4);
    await expect(root).toHaveAttribute("data-active-section", "resources");
    await expect(page.locator(".resource-link")).toHaveCount(3);
    await page.mouse.wheel(0, -span * 0.4);
    await expect(root).toHaveAttribute("data-active-section", "about");
  }
  await expect(page.locator("#protocols, .standards-list")).toHaveCount(0);
  expect(await page.evaluate(() => scrollX)).toBe(0);
});

test("mouse gaze selects original directional expressions without interrupting scroll playback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await scrollToProgress(page, 0.08);
  const mascot = page.locator("[data-mascot]");
  await page.mouse.move(1330, 500);
  await expect
    .poll(async () => Number(await mascot.getAttribute("data-gaze-x")))
    .toBeGreaterThan(0.9);
  await expect(mascot).toHaveAttribute("data-look-expression", /^expression-/);
  const rightExpression = await mascot.getAttribute("data-look-expression");
  const rightEye = await mascot.locator('[data-mascot-eye="left"]').getAttribute("d");
  await page.mouse.move(1250, 510);
  await expect(mascot).toHaveAttribute("data-look-expression", rightExpression ?? "");
  await page.mouse.move(100, 500);
  await expect
    .poll(async () => Number(await mascot.getAttribute("data-gaze-x")))
    .toBeLessThan(-0.9);
  await expect(mascot).not.toHaveAttribute("data-look-expression", rightExpression ?? "");
  await expect(mascot.locator('[data-mascot-eye="left"]')).not.toHaveAttribute("d", rightEye ?? "");
  await expect(mascot).toHaveAttribute("data-playback-mode", "scroll");
  await expect(mascot).toHaveAttribute("data-look-expression", "catalog", { timeout: 3500 });
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
  await page.mouse.move(1500, 500);
  await expect(mascot).toHaveAttribute("data-look-expression", "catalog");
  await expect
    .poll(async () => Math.abs(Number(await mascot.getAttribute("data-gaze-x"))))
    .toBeLessThan(0.02);
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
});

test("the downward heat expression keeps white eyes and a neutral body", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await scrollToProgress(page, 0.08);
  await page.mouse.move(970, 860);
  const mascot = page.locator("[data-mascot]");
  await expect(mascot).toHaveAttribute("data-look-expression", "expression-heat");
  await expect(mascot).toHaveAttribute("data-morph-state", "none");
  await expect(mascot.locator("[data-mascot-body]")).toHaveAttribute("fill", "currentColor");
  for (const eye of await mascot.locator("[data-mascot-eye]").all()) {
    await expect(eye).toHaveCSS("fill", "rgb(255, 255, 255)");
  }
});

test("smooth perspective flight stays above the header and fractional scroll endpoints become static", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1107, height: 617 });
  await page.goto("/");
  await page.addStyleTag({
    content:
      '.home-page[data-scroll-layout="pinned"] .scroll-track { height: calc(380svh + .7px); }',
  });
  await scrollToProgress(page, 0.89);
  await page.evaluate(() =>
    scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
  );
  const mascot = page.locator("[data-mascot]");
  await expect(mascot).toHaveAttribute("data-mascot-travelling", "true");
  await page.waitForTimeout(400);
  await expect(mascot).toHaveAttribute("data-logo-docked", "false");
  expect(
    await mascot.evaluate((element) =>
      Number(element.style.getPropertyValue("--mascot-depth").replace("px", "")),
    ),
  ).toBeGreaterThan(8);
  const occlusion = await mascot.evaluate(async (element) => {
    const header = document.querySelector("header");
    if (header === null) {
      throw new Error("Missing header");
    }
    const headerBottom = header.getBoundingClientRect().bottom;
    const headerLayer = Number(getComputedStyle(header).zIndex);
    let crossed = false;
    let hidden = false;
    const started = performance.now();
    return new Promise<{ crossed: boolean; hidden: boolean }>((resolve) => {
      function sample(now: number): void {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < headerBottom && element.dataset["mascotTravelling"] === "true") {
          crossed = true;
          hidden ||= Number(getComputedStyle(element).zIndex) <= headerLayer;
        }
        if (now - started < 1300) {
          requestAnimationFrame(sample);
        } else {
          resolve({ crossed, hidden });
        }
      }
      requestAnimationFrame(sample);
    });
  });
  expect(occlusion).toEqual({ crossed: true, hidden: false });
  await expect(mascot).toHaveAttribute("data-logo-docked", "true");
  await expect(mascot).toHaveAttribute("data-playback-phase", "docked");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
});

test("docking starts after 90 percent, follows a varied arc and lands exactly without blocking content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await scrollToProgress(page, 0.89);
  const mascot = page.locator("[data-mascot]");
  const start = await mascot.boundingBox();
  const dock = await page.locator("[data-mascot-dock]").boundingBox();
  expect(Math.abs((start?.x ?? 0) + (start?.width ?? 0) / 2 - 720)).toBeLessThan(1);
  await expect(mascot).toHaveAttribute("data-mascot-background", "true");
  await scrollToProgress(page, 1);
  const samples = await mascot.evaluate(async (element) => {
    const started = performance.now();
    const positions: Array<{ x: number; y: number }> = [];
    return new Promise<Array<{ x: number; y: number }>>((resolve) => {
      function sample(now: number): void {
        const box = element.getBoundingClientRect();
        positions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
        if (now - started < 2000) {
          requestAnimationFrame(sample);
        } else {
          resolve(positions);
        }
      }
      requestAnimationFrame(sample);
    });
  });
  const sx = (start?.x ?? 0) + (start?.width ?? 0) / 2;
  const sy = (start?.y ?? 0) + (start?.height ?? 0) / 2;
  const ex = (dock?.x ?? 0) + (dock?.width ?? 0) / 2;
  const ey = (dock?.y ?? 0) + (dock?.height ?? 0) / 2;
  const length = Math.hypot(ex - sx, ey - sy);
  const deviations = samples.map(
    (p) => Math.abs((ex - sx) * (p.y - sy) - (ey - sy) * (p.x - sx)) / length,
  );
  expect(Math.max(...deviations)).toBeGreaterThan(8);
  await expect(mascot).toHaveAttribute("data-logo-docked", "true");
  const before = await mascot.boundingBox();
  const forwardCurve = await mascot.getAttribute("data-docking-curve");
  await page.mouse.move(1200, 700);
  expect(await mascot.boundingBox()).toEqual(before);
  await scrollToProgress(page, 0.89);
  await expect(mascot).not.toHaveAttribute("data-docking-curve", forwardCurve ?? "");
  await expect
    .poll(async () => {
      const box = await mascot.boundingBox();
      return Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - 720);
    })
    .toBeLessThan(1);
  await scrollToProgress(page, 1);
  await page.waitForTimeout(140);
  const inFlightCurve = await mascot.getAttribute("data-docking-curve");
  await scrollToProgress(page, 0.89);
  await expect(mascot).toHaveAttribute("data-docking-curve", inFlightCurve ?? "");
});

test("cold loading and repeated refreshes never paint later sections or shift the opening mascot", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/src/scripts/home-page-scroll.ts*", async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    await route.continue();
  });
  await page.route("**/fonts/*.woff2", async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
    await route.continue();
  });
  await page.addInitScript(() => {
    const frames: StartupFrame[] = [];
    globalThis.startupFrames = frames;
    function sample(): void {
      const root = document.querySelector<HTMLElement>("[data-home-page]");
      const mascot = root?.querySelector("[data-mascot]");
      if (root !== null && mascot !== undefined && mascot !== null) {
        const bounds = mascot.getBoundingClientRect();
        frames.push({
          time: performance.now(),
          ready: root.dataset["scrollReady"] === "true",
          centerX: bounds.x + bounds.width / 2,
          centerY: bounds.y + bounds.height / 2,
          width: innerWidth,
          height: innerHeight,
          sections: [...root.querySelectorAll("[data-page-section]:not(.welcome-section)")].map(
            (section) => {
              const style = getComputedStyle(section);
              return { opacity: Number(style.opacity), visibility: style.visibility };
            },
          ),
        });
      }
      if (performance.now() < 1600) {
        requestAnimationFrame(sample);
      }
    }
    requestAnimationFrame(sample);
  });
  await page.goto("/");
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-ready", "true");
    await expect(page.locator("html")).not.toHaveAttribute("data-home-starting");
    await page.waitForTimeout(250);
    const painted = await page.evaluate(() => {
      const firstPaint = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
      return {
        firstPaint,
        frames: globalThis.startupFrames.filter((frame) => frame.time >= firstPaint),
      };
    });
    expect(painted.firstPaint).toBeGreaterThan(0);
    expect(painted.frames.some((frame) => !frame.ready)).toBe(true);
    expect(painted.frames.some((frame) => frame.ready)).toBe(true);
    for (const frame of painted.frames) {
      expect(Math.abs(frame.centerX - frame.width / 2)).toBeLessThan(0.2);
      expect(Math.abs(frame.centerY - frame.height / 2)).toBeLessThan(0.2);
      for (const section of frame.sections) {
        expect(section.opacity).toBe(0);
        expect(section.visibility).toBe("hidden");
      }
    }
    await expect(page.locator("#about")).toHaveCSS(
      "transition-property",
      "opacity, transform, visibility",
    );
    if (cycle < 2) {
      await scrollToProgress(page, 1);
      await expect(page.locator("[data-mascot]")).toHaveAttribute("data-logo-docked", "true");
      await page.reload();
    }
  }
});

test("refresh always reopens on the centered mission screen without a duplicate header logo", async ({
  page,
}) => {
  await page.goto("/");
  await scrollToProgress(page, 1);
  await expect(page.locator("[data-mascot]")).toHaveAttribute("data-logo-docked", "true");
  await page.reload();
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-active-section", "opening");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-progress", "0.0000");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator(".site-brand svg")).toHaveCount(0);
  await expect(page.locator("[data-mascot]")).toHaveCount(1);
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(
        (font) => font.family === "DM Sans" && font.status === "loaded",
      );
    }),
  ).toBe(true);
  await expect(page.locator(".welcome-caption h1")).toHaveText(/Building open protocols/);
  await expect(page.getByText("Scroll to discover", { exact: false })).toHaveCount(0);
  const docs = page.getByRole("link", { name: "Docs", exact: true });
  const icon = await docs.locator("svg").boundingBox();
  const label = await docs.locator("span").boundingBox();
  expect((icon?.x ?? 0) + (icon?.width ?? 0)).toBeLessThan(label?.x ?? 0);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 600 },
  { width: 1024, height: 600 },
  { width: 761, height: 600 },
]) {
  test(`each desktop section fits and mascot docks exactly at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-ready", "true");
    for (const [progress, selector] of [
      [0.36, ".about-content"],
      [1, ".resources-layout"],
    ] as const) {
      await scrollToProgress(page, progress);
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.y).toBeGreaterThanOrEqual(viewport.height > 700 ? 88 : 72);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      expect(
        await page
          .locator("[data-scroll-viewport]")
          .evaluate((stage) => stage.scrollHeight <= stage.clientHeight),
      ).toBe(true);
    }
    const mascot = await page.locator("[data-mascot]").boundingBox();
    const slot = await page.locator("[data-mascot-dock]").boundingBox();
    expect(Math.abs((mascot?.x ?? 0) - (slot?.x ?? 0))).toBeLessThan(1);
    expect(Math.abs((mascot?.y ?? 0) - (slot?.y ?? 0))).toBeLessThan(1);
    expect(Math.abs((mascot?.width ?? 0) - (slot?.width ?? 0))).toBeLessThan(1);
    await expect(page.locator("[data-mascot]")).toHaveAttribute("data-logo-docked", "true");
    await expect(page.locator(".resources-links .resource-link")).toHaveCount(3);
    await expect(page.locator(".site-header")).toHaveText(/QuantX.*GitHub.*Docs/);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
    await expect(page.locator(".site-footer")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("merged destinations retain restrained hover, a single light theme and working links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-ready", "true");
  await scrollToProgress(page, 1);
  await expect(
    page.locator(
      ".home-page [data-theme=dark], .home-page .site-footer, .home-page [data-panel-link]",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".home-page")).toHaveCSS("background-color", "rgb(250, 250, 248)");
  for (const destination of await page.locator(".resource-link").all()) {
    await expect(destination).toHaveAttribute("href", /^https:\/\//);
    await expect(destination).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(destination).toHaveCSS("border-top-width", "0px");
    await destination.hover();
    await expect(destination).toHaveCSS("background-color", "rgb(233, 236, 229)");
  }
  const before = await page.locator("[data-mascot]").boundingBox();
  await page.keyboard.press("ArrowRight");
  expect(await page.locator("[data-mascot]").boundingBox()).toEqual(before);
  await page.keyboard.press("Home");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-active-section", "opening");
});

test("resizing repeatedly keeps one structure and a working vertical scroll controller", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-home-page]").evaluate((root) => {
    root.dataset["identity"] = "original";
  });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-home-page]")).toHaveCount(1);
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-ready", "true");
    await expect(page.locator("[data-home-page]")).toHaveAttribute(
      "data-scroll-layout",
      /pinned|document/,
    );
    await page.locator("#resources").scrollIntoViewIfNeeded();
    await expect(page.locator(".resource-link")).toHaveCount(3);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-layout", "pinned");
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-identity", "original");
    await scrollToProgress(page, 0);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-home-page]")).toHaveAttribute(
      "data-active-section",
      "opening",
    );
    await scrollToProgress(page, 0.75);
    await expect(page.locator("#resources")).toHaveAttribute("aria-hidden", "false");
  }
});

test("reduced motion pauses the mascot and retains every content section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-mascot]")).toHaveAttribute("data-animation-running", "false");
  await scrollToProgress(page, 0.75);
  await expect(page.locator("#resources")).toHaveCSS("transform", "none");
  await scrollToProgress(page, 1);
  await expect(page.locator("#resources-title")).toBeVisible();
});

test("without JavaScript the desktop remains a readable vertical document", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-home-page]")).not.toHaveAttribute("data-scroll-ready");
  for (const id of ["about", "resources"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await expect(page.locator(".resource-link")).toHaveCount(3);
  await context.close();
});
