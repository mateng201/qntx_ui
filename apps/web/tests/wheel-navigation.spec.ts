import { expect, test } from "@playwright/test";

test("one small wheel step animates to the next scene without further input", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 1);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await page.waitForTimeout(250);
  const during = Number(await root.getAttribute("data-scroll-progress"));
  expect(during).toBeGreaterThan(0);
  expect(during).toBeLessThan(0.3);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-active-section", "about");
  await expect(page.locator("#about")).toHaveCSS("opacity", "1");
  expect(Number(await root.getAttribute("data-scroll-progress"))).toBeCloseTo(0.36, 2);
  await page.mouse.wheel(0, -1);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-scroll-progress", "0.0000");
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(100);
  await expect(root).toHaveAttribute("data-scroll-progress", "0.0000");
});

test("a long trackpad inertia tail cannot queue or skip scenes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await root.evaluate(async (element) => {
    const started = performance.now();
    // Keep emitting after the first animation finishes, as a trackpad can do.
    await new Promise<void>((resolve) => {
      const emit = (): void => {
        element.dispatchEvent(
          new WheelEvent("wheel", { deltaY: 3, bubbles: true, cancelable: true }),
        );
        if (performance.now() - started < 1500) {
          setTimeout(emit, 35);
        } else {
          resolve();
        }
      };
      emit();
    });
  });
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-active-section", "about");
  await page.waitForTimeout(260);
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 5000);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-scroll-progress", "1.0000");
  await expect(page.locator("#resources")).toHaveCSS("opacity", "1");
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(100);
  await expect(root).toHaveAttribute("data-scroll-progress", "1.0000");
});

test("zoom gestures and document-layout wheel input remain native", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  const ignored = await root.evaluate((element) => {
    const ctrl = new WheelEvent("wheel", { deltaY: 100, ctrlKey: true, cancelable: true });
    const horizontal = new WheelEvent("wheel", { deltaX: 100, deltaY: 1, cancelable: true });
    element.dispatchEvent(ctrl);
    element.dispatchEvent(horizontal);
    return [ctrl.defaultPrevented, horizontal.defaultPrevented];
  });
  expect(ignored).toEqual([false, false]);
  await page.setViewportSize({ width: 480, height: 300 });
  await expect(root).toHaveAttribute("data-scroll-layout", "document");
  await page.mouse.move(230, 200);
  await page.mouse.wheel(0, 80);
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(200);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
});

test("disposing the controller cancels an unfinished wheel animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 1);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await page.waitForTimeout(200);
  const stoppedAt = await page.evaluate(() => {
    document.dispatchEvent(new Event("astro:before-swap"));
    return scrollY;
  });
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => scrollY)).toBe(stoppedAt);
});
