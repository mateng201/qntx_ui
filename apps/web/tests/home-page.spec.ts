/* oxlint-disable no-await-in-loop -- Each browser action depends on the previous rendered section. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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

test("opening and docked Q animate only after five idle seconds and reset on mouse movement", async ({
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
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");

  await scrollToProgress(page, 0.63);
  await expect(mascot).toHaveAttribute("data-playback-mode", "scroll");
  await page.mouse.move(600, 300);
  await expect(mascot).toHaveAttribute("data-animation-running", "true");
  await scrollToProgress(page, 1);
  await expect(mascot).toHaveAttribute("data-playback-phase", "docked");
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await expect(mascot).toHaveAttribute("data-playback-mode", "idle", { timeout: 6500 });
  await page.mouse.move(601, 300);
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
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
        if (elapsed < 1100) {
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

test("real wheel input visits both modules, reverses, and never scrolls horizontally", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-ready", "true");
  await page.mouse.move(1000, 600);
  const span = await page
    .locator("[data-scroll-track]")
    .evaluate((track) => track.clientHeight - innerHeight);
  await page.mouse.wheel(0, span * 0.29);
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-active-section", "about");
  await expect(page.locator("#about-title")).toBeVisible();
  await expect(page.locator("[data-mascot]")).toHaveCSS("opacity", "0.045");
  await expect(page.locator("#about")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#resources")).toHaveAttribute("inert", "");
  for (let cycle = 0; cycle < 5; cycle += 1) {
    await page.mouse.wheel(0, span * 0.34);
    await expect(page.locator("[data-home-page]")).toHaveAttribute(
      "data-active-section",
      "protocols",
    );
    await expect(page.locator(".protocol-card")).toHaveCount(4);
    await expect(page.locator("#protocols a, #protocols button")).toHaveCount(0);
    await page.mouse.wheel(0, -span * 0.34);
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-active-section", "about");
  }
  expect(await page.evaluate(() => scrollX)).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("with motion enabled docking interpolates through intermediate positions and ignores pointer movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-ready", "true");
  await scrollToProgress(page, 0.8);
  const mascot = page.locator("[data-mascot]");
  await mascot.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map(async (animation) => {
        await animation.finished;
      }),
    );
  });
  await scrollToProgress(page, 1);
  const positions = await mascot.evaluate(async (element) => {
    const started = performance.now();
    const samples: number[] = [];
    return new Promise<number[]>((resolve) => {
      const sample = (time: number): void => {
        const box = element.getBoundingClientRect();
        samples.push(box.x + box.width / 2);
        if (time - started < 320) {
          requestAnimationFrame(sample);
        } else {
          resolve(samples);
        }
      };
      requestAnimationFrame(sample);
    });
  });
  expect(new Set(positions.map(Math.round)).size).toBeGreaterThan(2);
  expect(
    positions.every(
      (position, index) => index === 0 || position <= (positions[index - 1] ?? position) + 0.5,
    ),
  ).toBe(true);
  const before = await mascot.boundingBox();
  await page.mouse.move(700, 200);
  await page.mouse.move(1200, 700);
  expect(await mascot.boundingBox()).toEqual(before);
  await expect(mascot).toHaveAttribute("data-animation-running", "false");
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
      [0.29, ".about-content"],
      [0.63, ".protocols-layout"],
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
      "document",
    );
    await page.locator("#protocols").scrollIntoViewIfNeeded();
    await expect(page.locator(".protocol-card")).toHaveCount(4);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-layout", "pinned");
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-identity", "original");
    await scrollToProgress(page, 0);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-home-page]")).toHaveAttribute(
      "data-active-section",
      "opening",
    );
    await scrollToProgress(page, 0.63);
    await expect(page.locator("#protocols")).toHaveAttribute("aria-hidden", "false");
  }
});

test("reduced motion pauses the mascot and retains every content section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-mascot]")).toHaveAttribute("data-animation-running", "false");
  await scrollToProgress(page, 0.63);
  await expect(page.locator("#protocols")).toHaveCSS("transform", "none");
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
  for (const id of ["about", "protocols", "resources"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await expect(page.locator(".resource-link")).toHaveCount(3);
  await context.close();
});
