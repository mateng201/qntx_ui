/* oxlint-disable no-await-in-loop -- Each gesture depends on the previous rendered native scene. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function progress(page: Page, amount: number): Promise<void> {
  await page.getByTestId("mobile-story-scroll").evaluate((element, value) => {
    const track = document.querySelector('[data-testid="mobile-story-track"]');
    if (track === null) {
      throw new Error("Missing story track");
    }
    element.scrollTop = track.getBoundingClientRect().height * value;
  }, amount);
}

test("mobile starts with a centered static Q, light header, and no old tabs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("mobile-narrative")).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "QuantX home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub", exact: true })).toBeVisible();
  await expect(page.getByTestId("mobile-scene-opening")).toHaveCSS("opacity", "1");
  const mascot = await page.getByTestId("mobile-mascot").boundingBox();
  expect(Math.abs((mascot?.x ?? 0) + (mascot?.width ?? 0) / 2 - 195)).toBeLessThan(1);
  expect(
    Math.abs((mascot?.y ?? 0) + (mascot?.height ?? 0) / 2 - (64 + (844 - 64) / 2)),
  ).toBeLessThan(1);
  const body = page.getByTestId("mobile-mascot-body");
  const path = await body.getAttribute("d");
  await page.waitForTimeout(350);
  await expect(body).toHaveAttribute("d", path ?? "");
  expect(errors).toEqual([]);
});

test("real scrolling changes scenes, pure-text protocols, and docks the mascot", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const span = await page.getByTestId("mobile-story-track").evaluate((track) => track.clientHeight);
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, span * 0.29);
  await expect(page.getByTestId("mobile-scene-origin")).toHaveCSS("opacity", "1");
  await page.mouse.wheel(0, span * 0.34);
  await expect(page.getByTestId("mobile-scene-protocols")).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("mobile-protocol-content").getByRole("link")).toHaveCount(0);
  await expect(page.locator('[data-testid^="mobile-feature-"]')).toHaveCount(4);
  await page.mouse.wheel(0, span * 0.37);
  await expect(page.getByTestId("mobile-scene-protocols")).toHaveCSS("opacity", "0");
  const mascot = page.getByTestId("mobile-mascot");
  await expect(mascot).toHaveCSS("opacity", "1");
  const box = await mascot.boundingBox();
  const slot = await page.getByTestId("mobile-mascot-dock").boundingBox();
  expect(Math.abs((box?.x ?? 0) - (slot?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((box?.y ?? 0) - (slot?.y ?? 0))).toBeLessThan(1);
  expect(Math.abs((box?.width ?? 0) - (slot?.width ?? 0))).toBeLessThan(1);
  await expect(page.getByRole("link", { name: "Start exploring", exact: true })).toBeInViewport();
  await page.getByRole("link", { name: "Follow the work", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Follow the work", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "QuantX home" })).toBeInViewport();
  await page.getByRole("button", { name: "QuantX home" }).click();
  await expect(page.getByTestId("mobile-scene-opening")).toHaveCSS("opacity", "1");
});

test("native SVG preserves five-second idle, mouse reset, and bidirectional morphing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const body = page.getByTestId("mobile-mascot-body");
  const original = await body.getAttribute("d");
  await page.mouse.move(100, 100);
  await page.waitForTimeout(3000);
  await page.mouse.move(101, 100);
  await page.waitForTimeout(2500);
  await expect(body).toHaveAttribute("d", original ?? "");
  await expect.poll(async () => body.getAttribute("d"), { timeout: 4000 }).not.toBe(original);
  const returnedAt = await page.getByTestId("mobile-narrative").evaluate(async (element, path) => {
    const body = element.querySelector('[data-testid="mobile-mascot-body"]');
    const started = performance.now();
    let settled = -1;
    return new Promise<number>((resolve) => {
      const move = (now: number): void => {
        element.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            pointerType: "mouse",
            clientX: 102 + (now - started) / 10,
            clientY: 100,
          }),
        );
        if (settled < 0 && body?.getAttribute("d") === path) {
          settled = now - started;
        }
        if (now - started < 650) {
          requestAnimationFrame(move);
        } else {
          resolve(settled);
        }
      };
      requestAnimationFrame(move);
    });
  }, original);
  expect(returnedAt).toBeGreaterThan(0);
  expect(returnedAt).toBeLessThan(600);
  await expect(body).toHaveAttribute("d", original ?? "");
  await progress(page, 0.08);
  await expect.poll(async () => body.getAttribute("d")).not.toBe(original);
  const poses = await body.evaluate(async (element) => {
    const paths = new Set<string>();
    const start = performance.now();
    return new Promise<number>((resolve) => {
      const sample = (now: number): void => {
        paths.add(element.getAttribute("d") ?? "");
        if (now - start < 500) {
          requestAnimationFrame(sample);
        } else {
          resolve(paths.size);
        }
      };
      requestAnimationFrame(sample);
    });
  });
  expect(poses).toBeGreaterThan(5);
  await progress(page, 1);
  await expect(body).toHaveAttribute("d", original ?? "");
  await expect.poll(async () => body.getAttribute("d"), { timeout: 6500 }).not.toBe(original);
  await page.mouse.move(103, 100);
  await expect(body).toHaveAttribute("d", original ?? "");
});

for (const viewport of [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  test(`protocol content fits and resources remain readable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await progress(page, 0.29);
    const origin = await page.getByTestId("mobile-origin-content").boundingBox();
    expect(origin?.y).toBeGreaterThanOrEqual(64);
    expect((origin?.y ?? 0) + (origin?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    await progress(page, 0.63);
    const protocols = await page.getByTestId("mobile-protocol-content").boundingBox();
    expect(protocols?.y).toBeGreaterThanOrEqual(64);
    expect((protocols?.y ?? 0) + (protocols?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    await progress(page, 1);
    await page.getByRole("link", { name: "Follow the work", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: "Follow the work", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("landscape uses a normal readable document and resize restores the opening", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await expect(page.getByTestId("mobile-story-track")).toHaveCount(0);
  await page.getByTestId("mobile-flow-protocols").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("mobile-feature-04")).toBeAttached();
  await page.getByTestId("mobile-feature-04").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("mobile-feature-04")).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("mobile-story-track")).toBeAttached();
  await expect(page.getByTestId("mobile-scene-opening")).toHaveCSS("opacity", "1");
});

test("touch swipes reach the next story on a phone viewport", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8082/");
  await page.getByTestId("mobile-narrative").waitFor();
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 180, y: 650 }],
  });
  for (const y of [600, 530, 460, 390, 320, 250]) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 180, y }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect
    .poll(async () =>
      page.getByTestId("mobile-story-scroll").evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  await context.close();
});

test("Docs opens separately while the native narrative keeps its position", async ({
  page,
  context,
}) => {
  await context.route("https://qntx.org/developers", async (route) => {
    await route.fulfill({ status: 200, body: "Documentation destination" });
  });
  await page.goto("/");
  await progress(page, 0.29);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://qntx.org/developers");
  await popup.close();
  await expect(page.getByTestId("mobile-scene-origin")).toHaveCSS("opacity", "1");
});
