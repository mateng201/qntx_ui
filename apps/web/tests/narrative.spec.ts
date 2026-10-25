/* oxlint-disable no-await-in-loop -- Each browser action depends on the previous rendered scene. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function goToProgress(page: Page, progress: number): Promise<void> {
  await page.locator("[data-story-track]").evaluate((track, amount) => {
    scrollTo({
      top:
        track.getBoundingClientRect().top + scrollY + (track.clientHeight - innerHeight) * amount,
      behavior: "instant",
    });
  }, progress);
  await expect
    .poll(async () => Number(await page.locator("[data-narrative]").getAttribute("data-progress")))
    .toBeCloseTo(progress, 2);
}

test("desktop entry stays a static Q until scrolling starts the supplied animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  const mascot = page.locator("[data-story-mascot]");
  await expect(mascot).toHaveAttribute("data-running", "false");
  await expect(mascot).toHaveAttribute("data-playback", "static");
  await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "opening");
  const body = mascot.locator("[data-mascot-body]");
  const staticPath = await body.getAttribute("d");
  await page.mouse.move(100, 100);
  await page.waitForTimeout(350);
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await goToProgress(page, 0.08);
  await expect(mascot).toHaveAttribute("data-playback", "scroll");
  await expect(mascot).toHaveAttribute("data-running", "true");
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
  expect(requests.some((url) => url.includes("mobile-web-navigation"))).toBe(false);
  expect(errors).toEqual([]);
});

test("opening and docked Q animate only after five idle seconds and reset on mouse movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const mascot = page.locator("[data-story-mascot]");
  const body = mascot.locator("[data-mascot-body]");
  await expect(mascot).toHaveAttribute("data-running", "false");
  const staticPath = await body.getAttribute("d");
  await page.mouse.move(200, 100);
  await page.waitForTimeout(3000);
  await page.mouse.move(201, 100);
  await page.waitForTimeout(2500);
  await expect(mascot).toHaveAttribute("data-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await expect(mascot).toHaveAttribute("data-playback", "idle", { timeout: 4000 });
  await page.mouse.move(202, 100);
  await expect(mascot).toHaveAttribute("data-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");

  await goToProgress(page, 0.63);
  await expect(mascot).toHaveAttribute("data-playback", "scroll");
  await page.mouse.move(600, 300);
  await expect(mascot).toHaveAttribute("data-running", "true");
  await goToProgress(page, 1);
  await expect(mascot).toHaveAttribute("data-animation-phase", "docked");
  await expect(mascot).toHaveAttribute("data-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await expect(mascot).toHaveAttribute("data-playback", "idle", { timeout: 6500 });
  await page.mouse.move(601, 300);
  await expect(mascot).toHaveAttribute("data-running", "false");
  await expect(body).toHaveAttribute("d", staticPath ?? "");
  await goToProgress(page, 0);
  await expect(mascot).toHaveAttribute("data-animation-phase", "opening");
  await expect(mascot).toHaveAttribute("data-running", "false");
});

test("Q morphs through intermediate shapes in both directions and can reverse mid-transition", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const mascot = page.locator("[data-story-mascot]");
  await expect(mascot).toHaveAttribute("data-running", "false");
  const sample = await mascot.evaluate(async (element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Missing mascot wrapper");
    }
    const body = element.querySelector<SVGPathElement>("[data-mascot-body]");
    const svg = element.querySelector("svg");
    const track = document.querySelector<HTMLElement>("[data-story-track]");
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
        const phase = element.dataset["transition"] ?? "none";
        transitions.add(phase);
        if (phase === "entering") {
          forwardPaths.add(body.getAttribute("d") ?? "");
        }
        if (phase === "leaving") {
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
  await goToProgress(page, 0.08);
  await expect(mascot).toHaveAttribute("data-transition", "entering");
  await goToProgress(page, 0);
  await expect(mascot).toHaveAttribute("data-transition", "leaving");
  await goToProgress(page, 0.08);
  await expect(mascot).toHaveAttribute("data-transition", "entering");
  await expect(mascot).toHaveAttribute("data-transition", "none");
  await expect(mascot).toHaveAttribute("data-running", "true");
});

test("real wheel input visits both modules, reverses, and never scrolls horizontally", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-narrative]")).toHaveAttribute("data-enhanced", "true");
  await page.mouse.move(1000, 600);
  const span = await page
    .locator("[data-story-track]")
    .evaluate((track) => track.clientHeight - innerHeight);
  await page.mouse.wheel(0, span * 0.29);
  await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "origin");
  await expect(page.locator("#origin-title")).toBeVisible();
  await expect(page.locator("[data-story-mascot]")).toHaveCSS("opacity", "0.045");
  await expect(page.locator("#narrative-origin")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#narrative-connect")).toHaveAttribute("inert", "");
  for (let cycle = 0; cycle < 5; cycle += 1) {
    await page.mouse.wheel(0, span * 0.34);
    await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "protocols");
    await expect(page.locator(".protocol-feature")).toHaveCount(4);
    await expect(page.locator("#narrative-protocols a, #narrative-protocols button")).toHaveCount(
      0,
    );
    await page.mouse.wheel(0, -span * 0.34);
    await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "origin");
  }
  expect(await page.evaluate(() => scrollX)).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("with motion enabled docking interpolates through intermediate positions and ignores pointer movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("[data-narrative]")).toHaveAttribute("data-enhanced", "true");
  await goToProgress(page, 0.8);
  const mascot = page.locator("[data-story-mascot]");
  await mascot.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map(async (animation) => {
        await animation.finished;
      }),
    );
  });
  await goToProgress(page, 1);
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
  await expect(mascot).toHaveAttribute("data-running", "false");
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 600 },
  { width: 1024, height: 600 },
  { width: 761, height: 600 },
]) {
  test(`each desktop scene fits and mascot docks exactly at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("[data-narrative]")).toHaveAttribute("data-enhanced", "true");
    for (const [progress, selector] of [
      [0.29, ".origin-content"],
      [0.63, ".protocol-story-layout"],
      [1, ".merged-overview"],
    ] as const) {
      await goToProgress(page, progress);
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.y).toBeGreaterThanOrEqual(viewport.height > 700 ? 88 : 72);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      expect(
        await page
          .locator("[data-story-stage]")
          .evaluate((stage) => stage.scrollHeight <= stage.clientHeight),
      ).toBe(true);
    }
    const mascot = await page.locator("[data-story-mascot]").boundingBox();
    const slot = await page.locator("[data-mascot-dock]").boundingBox();
    expect(Math.abs((mascot?.x ?? 0) - (slot?.x ?? 0))).toBeLessThan(1);
    expect(Math.abs((mascot?.y ?? 0) - (slot?.y ?? 0))).toBeLessThan(1);
    expect(Math.abs((mascot?.width ?? 0) - (slot?.width ?? 0))).toBeLessThan(1);
    await expect(page.locator("[data-story-mascot]")).toHaveAttribute("data-docked", "true");
    await expect(page.locator(".merged-destinations .narrative-destination")).toHaveCount(3);
    await expect(page.locator(".narrative-header")).toHaveText(/QuantX.*GitHub.*Docs/);
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
  await expect(page.locator("[data-narrative]")).toHaveAttribute("data-enhanced", "true");
  await goToProgress(page, 1);
  await expect(
    page.locator(
      ".desktop-home [data-theme=dark], .desktop-home .site-footer, .desktop-home [data-panel-link]",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".desktop-home")).toHaveCSS("background-color", "rgb(250, 250, 248)");
  for (const destination of await page.locator(".narrative-destination").all()) {
    await expect(destination).toHaveAttribute("href", /^https:\/\//);
    await destination.hover();
    await expect(destination).toHaveCSS("background-color", "rgb(233, 236, 229)");
  }
  const before = await page.locator("[data-story-mascot]").boundingBox();
  await page.keyboard.press("ArrowRight");
  expect(await page.locator("[data-story-mascot]").boundingBox()).toEqual(before);
  await page.keyboard.press("Home");
  await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "opening");
});

test("resizing repeatedly unmounts the inactive controller and keeps narrow navigation working", async ({
  page,
}) => {
  await page.goto("/");
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-narrative]")).not.toHaveAttribute("data-enhanced");
    await page.getByRole("link", { name: "Protocols", exact: true }).click();
    await expect(page).toHaveURL(/#protocols$/);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "opening");
    await expect(page.locator("[data-narrative]")).toHaveAttribute("data-enhanced", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-narrative]")).toHaveAttribute("data-scene", "opening");
  }
});

test("reduced motion pauses the mascot and retains every scroll scene", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-story-mascot]")).toHaveAttribute("data-running", "false");
  await goToProgress(page, 0.63);
  await expect(page.locator("#narrative-protocols")).toHaveCSS("transform", "none");
  await goToProgress(page, 1);
  await expect(page.locator("#connect-title")).toBeVisible();
});

test("without JavaScript the desktop remains a readable vertical document", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-narrative]")).not.toHaveAttribute("data-enhanced");
  for (const id of ["narrative-origin", "narrative-protocols", "narrative-connect"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await expect(page.locator(".narrative-destination")).toHaveCount(3);
  await context.close();
});
