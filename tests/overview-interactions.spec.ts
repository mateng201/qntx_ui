/* eslint-disable no-await-in-loop -- These selections share one card and must run in order. */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const nodes = ["transact", "collaborate", "govern", "evolve"] as const;

function overviewGeometry(panel: Element): {
  panelFits: boolean;
  documentFits: boolean;
  collide: boolean;
  contentFits: boolean;
  popoverSafe: boolean;
} {
  const scroller = document.scrollingElement;
  const logo = panel.querySelector(".network-center");
  const label = panel.querySelector(".action-collaborate");
  if (scroller === null || logo === null || label === null) {
    throw new Error("Missing Overview geometry");
  }
  const panelBox = panel.getBoundingClientRect();
  const center = logo.getBoundingClientRect();
  const popup = panel.querySelector(".network-details");
  const selected = panel.querySelector('[data-overview-node][aria-expanded="true"]');
  const logoMark = panel.querySelector(".overview-logo");
  if (popup === null || selected === null || logoMark === null) {
    throw new Error("Missing popover geometry");
  }
  const windowBox = popup.getBoundingClientRect();
  const anchorBox = selected.getBoundingClientRect();
  const markBox = logoMark.getBoundingClientRect();
  const distance = Math.hypot(
    Math.max(anchorBox.left - windowBox.right, windowBox.left - anchorBox.right, 0),
    Math.max(anchorBox.top - windowBox.bottom, windowBox.top - anchorBox.bottom, 0),
  );
  return {
    panelFits: panel.scrollHeight <= panel.clientHeight,
    documentFits: scroller.scrollHeight <= scroller.clientHeight,
    popoverSafe:
      distance < 64 &&
      windowBox.left >= 0 &&
      windowBox.right <= innerWidth &&
      windowBox.top >= 0 &&
      windowBox.bottom <= innerHeight &&
      !(
        windowBox.left < markBox.right &&
        windowBox.right > markBox.left &&
        windowBox.top < markBox.bottom &&
        windowBox.bottom > markBox.top
      ),
    collide: [...panel.querySelectorAll(".network-action")].some((element) => {
      const text = element.getBoundingClientRect();
      return (
        text.left < center.right &&
        text.right > center.left &&
        text.top < center.bottom &&
        text.bottom > center.top
      );
    }),
    contentFits: [
      ...panel.querySelectorAll(
        ".network-action,.field-coordinate,.network-details,.visual-caption",
      ),
    ]
      .filter((element) => element.getClientRects().length > 0)
      .every((element) => {
        const box = element.getBoundingClientRect();
        return box.top >= panelBox.top - 1 && box.bottom <= panelBox.bottom + 1;
      }),
  };
}

for (const id of nodes) {
  test(`${id} node has restrained About-style hover feedback`, async ({ page }) => {
    await page.goto("/");
    const button = page.locator(`[data-overview-node="${id}"]`);
    const label = button.locator(".network-action");
    await expect(button).toBeEnabled();
    await expect(label).toHaveCSS("transform", "none");
    await button.hover();
    await expect(label).toHaveCSS("transform", "matrix(1, 0, 0, 1, 2, -2)");
    await expect(button.locator(".node-target")).toHaveCSS(
      "border-top-color",
      "rgb(154, 163, 145)",
    );
    await expect
      .poll(async () =>
        label.evaluate((element) => getComputedStyle(element, "::before").backgroundColor),
      )
      .toBe("rgb(233, 236, 229)");
    await page.mouse.move(0, 0);
    await expect(label).toHaveCSS("transform", "none");
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
}

test("node clicks replace one in-place description, smile, and toggle closed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const details = page.locator("#overview-node-details");
  const logo = page.locator(".overview-logo");
  await expect(details).toBeHidden();
  for (const id of nodes) {
    const button = page.locator(`[data-overview-node="${id}"]`);
    await button.click();
    await expect(details).toBeVisible();
    await expect(page.locator("[data-node-title]")).toContainText(id.toUpperCase());
    const description = await page.locator("[data-node-description]").textContent();
    expect(description?.length).toBeGreaterThan(50);
    await expect(page.locator('[data-overview-node][aria-expanded="true"]')).toHaveCount(1);
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(logo).toHaveAttribute("data-smiling", "true");
    await expect(logo.locator("[data-q-smile]")).toHaveCount(0);
    await expect(details).toHaveAttribute("data-state", "open");
    await expect(details).toHaveCSS("opacity", "1");
    expect(await page.locator("#overview").evaluate(overviewGeometry)).toEqual({
      panelFits: true,
      documentFits: true,
      collide: false,
      contentFits: true,
      popoverSafe: true,
    });
  }
  await page.locator('[data-overview-node="evolve"]').click();
  await expect(details).toBeHidden();
  await expect(page.locator('[data-overview-node][aria-expanded="true"]')).toHaveCount(0);
  await expect(logo).toHaveAttribute("data-smiling", "false");
  await expect(logo).toHaveAttribute("data-face", "awake");
  expect(errors).toEqual([]);
});

test("only the inner square follows the mouse, stays bounded, and stops outside the region", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator(".overview-logo");
  await expect(logo).toHaveAttribute("data-ready", "true");
  const body = logo.locator('[data-q-id="body"]');
  const initial = await body.getAttribute("d");
  const initialBox = await logo.boundingBox();
  const region = await page.locator("[data-overview-visual]").boundingBox();
  if (initial === null || initialBox === null || region === null) {
    throw new Error("Missing Logo");
  }
  await page.mouse.move(region.x + 10, region.y + 30);
  await expect(logo).toHaveAttribute("data-face", "awake");
  await expect(logo).toHaveAttribute("data-idle", "false");
  await expect(logo).toHaveAttribute("data-morphing", "false");
  await expect.poll(async () => Number(await logo.getAttribute("data-gaze-x"))).toBeLessThan(0);
  const leftPath = await body.getAttribute("d");
  expect(leftPath).not.toEqual(initial);
  await page.mouse.move(region.x + region.width - 10, region.y + region.height - 10);
  await expect.poll(async () => Number(await logo.getAttribute("data-gaze-x"))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await logo.getAttribute("data-gaze-y"))).toBeGreaterThan(0);
  const offset = await logo.evaluate((element) =>
    Math.hypot(Number(element.dataset["gazeX"]), Number(element.dataset["gazeY"])),
  );
  expect(offset).toBeLessThanOrEqual(14.002);
  expect(await logo.boundingBox()).toEqual(initialBox);
  await expect(logo).toHaveAttribute("data-phase", "live");
  await expect(body).toHaveAttribute("d", leftPath ?? "");
  await page.mouse.move(30, 30);
  await expect(logo).toHaveAttribute("data-phase", "rest");
  await expect(logo).toHaveAttribute("data-tracking", "false");
  await expect(logo).toHaveAttribute("data-gaze-x", "0");
  await expect(logo).toHaveAttribute("data-gaze-y", "0");
  await expect(body).toHaveAttribute("d", initial);
  await page.mouse.move(400, 250);
  await expect(body).toHaveAttribute("d", initial);
});

test("gaze still updates during the expression hold without moving the outer body", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator(".overview-logo");
  await page.locator('[data-overview-node="transact"]').click();
  await expect(logo).toHaveAttribute("data-phase", "live");
  await expect(logo).toHaveAttribute("data-morphing", "false");
  const body = logo.locator('[data-q-id="body"]');
  const originalPath = await body.getAttribute("d");
  const eyePosition = await logo
    .locator('[data-q-eye="left"]')
    .evaluate((element) => element.getBoundingClientRect().x);
  const region = await page.locator("[data-overview-visual]").boundingBox();
  if (region === null) {
    throw new Error("Missing region");
  }
  await page.mouse.move(region.x + region.width - 10, region.y + 10);
  await expect
    .poll(async () =>
      logo.locator('[data-q-eye="left"]').evaluate((element) => element.getBoundingClientRect().x),
    )
    .toBeGreaterThan(eyePosition + 1);
  expect(await body.getAttribute("d")).toEqual(originalPath);
});

test("keyboard selection, Escape, and close button preserve focus", async ({ page }) => {
  await page.goto("/");
  const button = page.locator('[data-overview-node="collaborate"]');
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#overview-node-details")).toBeHidden();
  await expect(button).toBeFocused();
  await page.keyboard.press("Space");
  const close = page.getByRole("button", { name: "Close node description" });
  await expect(page.locator("#overview-node-details")).toHaveAttribute("data-state", "open");
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(button).toBeFocused();
  await expect(page.locator("#overview-node-details")).toBeHidden();
});

test("reduced motion keeps click feedback and descriptions without tracking or animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const logo = page.locator(".overview-logo");
  const body = logo.locator('[data-q-id="body"]');
  const initial = await body.getAttribute("d");
  const region = await page.locator("[data-overview-visual]").boundingBox();
  if (region === null) {
    throw new Error("Missing region");
  }
  await page.mouse.move(region.x + 10, region.y + 10);
  await expect(logo).toHaveAttribute("data-face", "awake");
  const eye = logo.locator('[data-q-eye="left"]');
  const normalEye = await eye.getAttribute("d");
  await page.locator('[data-overview-node="govern"]').click();
  await expect(logo).toHaveAttribute("data-smiling", "true");
  await expect(body).not.toHaveAttribute("d", initial ?? "");
  await expect(eye).not.toHaveAttribute("d", normalEye ?? "");
  await expect(logo).toHaveAttribute("data-phase", "live");
  await expect(logo).toHaveAttribute("data-running", "false");
  await expect(logo).toHaveAttribute("data-tracking", "false");
  await expect(page.locator("#overview-node-details")).toBeVisible();
  await expect(logo).toHaveAttribute("data-smiling", "false");
  await expect(eye).toHaveAttribute("d", normalEye ?? "");
  await page.mouse.move(20, 20);
  await expect(body).toHaveAttribute("d", initial ?? "");
});

test("touch can select and close nodes without enabling mouse tracking", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4321/");
    await page.locator('[data-overview-node="evolve"]').tap();
    await expect(page.locator("#overview-node-details")).toBeVisible();
    await expect(page.locator(".overview-logo")).toHaveAttribute("data-smiling", "true");
    await expect(page.locator(".overview-logo")).toHaveAttribute("data-tracking", "false");
    await page.getByRole("button", { name: "Close node description" }).tap();
    await expect(page.locator("#overview-node-details")).toBeHidden();
  } finally {
    await context.close();
  }
});

test("the supplied idle catalog starts after five motionless seconds and movement interrupts it", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("/");
  const logo = page.locator(".overview-logo");
  await expect(logo).toHaveAttribute("data-ready", "true");
  await page.clock.pauseAt(new Date("2026-01-01T00:00:10Z"));
  const region = await page.locator("[data-overview-visual]").boundingBox();
  if (region === null) {
    throw new Error("Missing region");
  }
  await page.mouse.move(region.x + 20, region.y + 30);
  await page.clock.runFor(400);
  await expect(logo).toHaveAttribute("data-face", "awake");
  await expect(logo).toHaveAttribute("data-morphing", "false");
  await expect(logo).toHaveAttribute("data-idle", "false");
  await expect(logo.locator('[data-q-eye="left"]')).toHaveAttribute("display", "inline");
  const neutral = await logo.locator('[data-q-eye="left"]').getAttribute("d");
  await logo.hover();
  await page.clock.runFor(4999);
  await expect(logo).toHaveAttribute("data-idle", "false");
  await page.clock.runFor(1);
  await expect(logo).toHaveAttribute("data-idle", "true");
  await page.clock.runFor(600);
  await expect(logo.locator('[data-q-eye="left"]')).not.toHaveAttribute("d", neutral ?? "");
  const body = logo.locator('[data-q-id="body"]');
  const firstPose = await body.getAttribute("d");
  await page.clock.runFor(2400);
  expect(await body.getAttribute("d")).not.toEqual(firstPose);
  await page.mouse.move(region.x + 20, region.y + 30);
  await page.clock.runFor(400);
  await expect(logo).toHaveAttribute("data-idle", "false");
  await expect(logo).toHaveAttribute("data-face", "awake");
  await expect(logo.locator('[data-q-eye="left"]')).toHaveAttribute("d", neutral ?? "");
  await page.mouse.move(20, 20);
  await page.clock.runFor(400);
  await expect(logo).toHaveAttribute("data-phase", "rest");
  await expect(logo).toHaveAttribute("data-face", "q");
  await expect(logo).toHaveAttribute("data-gaze-x", "0");
  await expect(logo).toHaveAttribute("data-running", "false");
  // Inactivity is page-wide: hovering the logo or its region is not required.
  await page.clock.runFor(4599);
  await expect(logo).toHaveAttribute("data-idle", "false");
  await page.clock.runFor(351);
  await expect(logo).toHaveAttribute("data-idle", "true");
  await page.mouse.move(21, 20);
  await page.clock.runFor(400);
  await expect(logo).toHaveAttribute("data-face", "q");
  await expect(logo).toHaveAttribute("data-idle", "false");
});

test("the complete supplied catalog stays inside the logo canvas through a full loop", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("/");
  const logo = page.locator(".overview-logo");
  await expect(logo).toHaveAttribute("data-ready", "true");
  await page.clock.pauseAt(new Date("2026-01-01T00:00:10Z"));
  await page.mouse.move(20, 20);
  await page.clock.runFor(5350);
  await expect(logo).toHaveAttribute("data-idle", "true");
  const bodyPaths = new Set<string>();
  const colors = new Set<string>();
  for (let index = 0; index < 28; index += 1) {
    await page.clock.runFor(2050);
    const sample = await logo.evaluate((element) => {
      const svg = element.querySelector("svg");
      const body = element.querySelector('[data-q-id="body"]');
      if (svg === null || body === null) {
        throw new Error("Missing catalog SVG");
      }
      const box = svg.getBBox();
      return {
        bound: Math.max(
          Math.abs(box.x),
          Math.abs(box.y),
          Math.abs(box.x + box.width),
          Math.abs(box.y + box.height),
        ),
        path: body.getAttribute("d") ?? "",
        color: body.getAttribute("fill") ?? "",
      };
    });
    expect(sample.bound).toBeLessThan(150);
    bodyPaths.add(sample.path);
    colors.add(sample.color);
  }
  expect(bodyPaths.size).toBeGreaterThan(20);
  expect([...colors]).toEqual(expect.arrayContaining(["#000000", "#ba3636", "#adc3ff"]));
  expect(
    await page.locator("#overview").evaluate((panel) => panel.scrollHeight <= panel.clientHeight),
  ).toBe(true);
});

test("success feedback consists only of two upward curved smiling eyes", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator(".overview-logo");
  await logo.hover();
  await expect(logo).toHaveAttribute("data-morphing", "false");
  const normal = await logo.locator('[data-q-eye="left"]').evaluate((element) => {
    if (!(element instanceof SVGPathElement)) {
      throw new Error("Missing awake eye");
    }
    const box = element.getBBox();
    return { width: box.width, height: box.height };
  });
  await page.locator('[data-overview-node="transact"]').click();
  await expect(logo).toHaveAttribute("data-face", "smiling");
  await expect(logo).toHaveAttribute("data-morphing", "false");
  await expect(logo.locator("path")).toHaveCount(3);
  await expect(logo.locator("[data-q-smile]")).toHaveCount(0);
  const eyes = await logo.locator("[data-q-eye]").evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof SVGPathElement)) {
        throw new Error("Missing eye path");
      }
      const box = element.getBBox();
      const length = element.getTotalLength();
      const points = Array.from({ length: 200 }, (_, index) =>
        element.getPointAtLength((length * index) / 200),
      );
      const middle = box.x + box.width / 2;
      const centers = points.filter((point) => Math.abs(point.x - middle) < box.width * 0.1);
      const edges = points.filter((point) => Math.abs(point.x - middle) > box.width * 0.4);
      const centerY = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;
      const edgeY = edges.reduce((sum, point) => sum + point.y, 0) / edges.length;
      const thickness =
        Math.max(...centers.map((point) => point.y)) - Math.min(...centers.map((point) => point.y));
      return {
        aspect: box.height / box.width,
        arch: edgeY - centerY,
        thickness,
        height: box.height,
      };
    }),
  );
  for (const eye of eyes) {
    expect(eye.aspect).toBeLessThan(1);
    expect(eye.arch).toBeGreaterThan(3);
    expect(eye.thickness).toBeGreaterThan(normal.width * 0.7);
    expect(eye.height).toBeGreaterThan(normal.height * 0.35);
  }
  await expect(logo).toHaveAttribute("data-face", "awake");
  await expect(logo).toHaveAttribute("data-idle", "false");
});

test("popover entrance, switching, and dismissal have visible transition frames", async ({
  page,
}) => {
  await page.goto("/");
  const details = page.locator("#overview-node-details");
  const recordFrames = async (): Promise<Array<{ opacity: number; title: string }>> =>
    details.evaluate(
      async (element) =>
        new Promise((resolve) => {
          const frames: Array<{ opacity: number; title: string }> = [];
          const started = performance.now();
          const sample = (now: number): void => {
            frames.push({
              opacity: Number(getComputedStyle(element).opacity),
              title: element.querySelector("h2")?.textContent ?? "",
            });
            if (now - started < 600) {
              requestAnimationFrame(sample);
            } else {
              resolve(frames);
            }
          };
          requestAnimationFrame(sample);
        }),
    );
  await page.locator('[data-overview-node="transact"]').click();
  const entrance = await recordFrames();
  expect(entrance.some((frame) => frame.opacity > 0 && frame.opacity < 0.95)).toBe(true);
  await expect(details).toHaveCSS("opacity", "1");
  await page.locator('[data-overview-node="govern"]').click();
  const switching = await recordFrames();
  const firstNew = switching.find((frame) => frame.title.startsWith("GOVERN"));
  expect(firstNew).toBeDefined();
  expect(firstNew?.opacity).toBeLessThan(0.2);
  expect(switching.some((frame) => frame.opacity < 0.05)).toBe(true);
  await expect(details).toHaveCSS("opacity", "1");
  await page.locator('[data-overview-node="govern"]').click();
  const dismissal = await recordFrames();
  expect(dismissal.some((frame) => frame.opacity > 0 && frame.opacity < 0.95)).toBe(true);
  await expect(details).toBeHidden();
});

test("rapid node changes settle on the last request without duplicate windows", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-overview-node="transact"]').click();
  await page.locator('[data-overview-node="govern"]').click();
  await page.locator('[data-overview-node="collaborate"]').click();
  await page.locator('[data-overview-node="collaborate"]').click();
  await page.locator('[data-overview-node="evolve"]').click();
  await expect(page.locator(".network-details")).toHaveCount(1);
  await expect(page.locator("[data-node-title]")).toContainText("EVOLVE");
  await expect(page.locator("#overview-node-details")).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-overview-node][aria-expanded="true"]')).toHaveCount(1);
  await page.locator(".home-panel h1").click();
  await expect(page.locator("#overview-node-details")).toBeHidden();
  await expect(page.locator('[data-overview-node][aria-expanded="true"]')).toHaveCount(0);
});

for (const scenario of [
  { zoom: 0.9, width: 1280, height: 600 },
  { zoom: 1, width: 1280, height: 600 },
  { zoom: 1.1, width: 1280, height: 600 },
  { zoom: 1.1, width: 1024, height: 600 },
]) {
  test(`expanded nodes fit ${scenario.width}x${scenario.height} at Chrome ${Math.round(scenario.zoom * 100)}% zoom`, async ({
    browserName,
  }, testInfo) => {
    expect(browserName).toBe("chromium");
    const profile = testInfo.outputPath("chrome-profile");
    mkdirSync(path.join(profile, "Default"), { recursive: true });
    writeFileSync(
      path.join(profile, "Default", "Preferences"),
      JSON.stringify({
        partition: { default_zoom_level: { x: Math.log(scenario.zoom) / Math.log(1.2) } },
      }),
    );
    const context = await chromium.launchPersistentContext(profile, {
      channel: "chrome",
      headless: true,
      viewport: { width: scenario.width, height: scenario.height },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:4321/");
      expect(await page.evaluate(() => devicePixelRatio)).toBeCloseTo(scenario.zoom, 2);
      for (const id of nodes) {
        await page.locator(`[data-overview-node="${id}"]`).click();
        await expect(page.locator("#overview-node-details")).toHaveAttribute("data-state", "open");
        await expect(page.locator("#overview-node-details")).toHaveCSS("opacity", "1");
        expect(await page.locator("#overview").evaluate(overviewGeometry)).toEqual({
          panelFits: true,
          documentFits: true,
          collide: false,
          contentFits: true,
          popoverSafe: true,
        });
      }
      await page.mouse.wheel(0, 500);
      await expect(page.getByRole("link", { name: "Protocols", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
    } finally {
      await context.close();
    }
  });
}
