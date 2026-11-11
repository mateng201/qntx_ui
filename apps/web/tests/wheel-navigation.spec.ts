import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { initializeWheelSectionNavigation as WheelInitializer } from "../src/scripts/wheel-section-navigation";

declare global {
  var disposeWheelFixture: () => void;
  var wheelFixtureVisits: number[];
}

/** Exercise five queued trips without adding artificial screens to the actual three-scene site. */
async function installSixSceneFixture(page: Page): Promise<void> {
  await page.locator("[data-home-page]").evaluate(() => {
    document.dispatchEvent(new Event("astro:before-swap"));
  });
  await page.evaluate(async () => {
    const moduleUrl = "/src/scripts/wheel-section-navigation.ts";
    const navigationModule: unknown = await import(moduleUrl);
    function assertNavigationModule(
      value: unknown,
    ): asserts value is { initializeWheelSectionNavigation: typeof WheelInitializer } {
      if (
        typeof value !== "object" ||
        value === null ||
        !("initializeWheelSectionNavigation" in value) ||
        typeof value.initializeWheelSectionNavigation !== "function"
      ) {
        throw new Error(`Missing wheel navigation module: ${moduleUrl}`);
      }
    }
    assertNavigationModule(navigationModule);
    const { initializeWheelSectionNavigation } = navigationModule;
    const root = document.createElement("main");
    root.dataset["wheelFixture"] = "true";
    root.dataset["scrollLayout"] = "pinned";
    root.style.height = `${innerHeight * 6}px`;
    document.body.replaceChildren(root);
    scrollTo({ top: 0, behavior: "instant" });
    globalThis.wheelFixtureVisits = [0];
    globalThis.disposeWheelFixture = initializeWheelSectionNavigation(root, {
      getStops: () =>
        Array.from({ length: 6 }, (_, index) => ({ id: String(index), top: innerHeight * index })),
      isSettling: () => false,
      renderFrame: () => {
        const stop = Math.round(scrollY / innerHeight);
        if (
          Math.abs(scrollY - stop * innerHeight) < 1 &&
          globalThis.wheelFixtureVisits.at(-1) !== stop
        ) {
          globalThis.wheelFixtureVisits.push(stop);
        }
      },
    });
  });
}

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

test("continuous input queues adjacent scenes without needing a quiet gap", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await root.evaluate(async (element) => {
    const started = performance.now();
    // No gap exceeds the old 220ms threshold, including after the first trip finishes.
    await new Promise<void>((resolve) => {
      const emit = (): void => {
        element.dispatchEvent(
          new WheelEvent("wheel", { deltaY: 3, bubbles: true, cancelable: true }),
        );
        if (performance.now() - started < 1800) {
          setTimeout(emit, 35);
        } else {
          resolve();
        }
      };
      emit();
    });
  });
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-scroll-progress", "1.0000");
  await expect(root).toHaveAttribute("data-active-section", "resources");
  await expect(page.locator("#resources")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-mascot]")).toHaveAttribute("data-logo-docked", "true");
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(100);
  await expect(root).toHaveAttribute("data-scroll-progress", "1.0000");
  await page.mouse.wheel(0, -1);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-active-section", "about");
});

test("five rapid wheel steps visit five adjacent stops and drain the bounded queue", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installSixSceneFixture(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.evaluate(async (element) => {
    await new Promise<void>((resolve) => {
      let count = 0;
      const emit = (): void => {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, cancelable: true }));
        count += 1;
        if (count < 5) {
          setTimeout(emit, 140);
        } else {
          resolve();
        }
      };
      emit();
    });
  });
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true", { timeout: 8000 });
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits)).toEqual([0, 1, 2, 3, 4, 5]);
  await root.dispatchEvent("wheel", { deltaY: -1, cancelable: true });
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(4);
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

for (const action of ["pointerdown", "resize", "keydown", "dispose"] as const) {
  test(`${action} cancels both the running trip and pending queue`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await installSixSceneFixture(page);
    const root = page.locator("[data-wheel-fixture]");
    await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
    await page.waitForTimeout(160);
    await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
    const stoppedAt = await root.evaluate((element, cancelAction) => {
      if (cancelAction === "pointerdown") {
        element.dispatchEvent(new PointerEvent("pointerdown"));
      } else if (cancelAction === "resize") {
        globalThis.dispatchEvent(new Event("resize"));
      } else if (cancelAction === "keydown") {
        globalThis.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      } else {
        globalThis.disposeWheelFixture();
      }
      return scrollY;
    }, action);
    await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
    await page.waitForTimeout(1300);
    expect(await page.evaluate(() => scrollY)).toBe(stoppedAt);
    if (action === "dispose") {
      expect(
        await root.evaluate((element) => {
          const wheel = new WheelEvent("wheel", { deltaY: 1, cancelable: true });
          element.dispatchEvent(wheel);
          return wheel.defaultPrevented;
        }),
      ).toBe(false);
    } else {
      await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
      await expect(root).toHaveAttribute("data-wheel-navigating", "true");
      await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
      expect(await page.evaluate(() => scrollY / innerHeight)).toBe(1);
    }
    await page.evaluate(() => globalThis.disposeWheelFixture());
  });
}

test("reduced-motion changes cancel queued work and still accept the next input", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installSixSceneFixture(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.waitForTimeout(160);
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await expect.poll(async () => page.evaluate(() => scrollY / innerHeight)).toBe(1);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await page.waitForTimeout(1300);
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(1);
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

test("opposite input immediately reverses the trip and discards the forward queue", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(160);
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(340);
  const turningPoint = await root.evaluate((element) => {
    // Sample at event delivery, not before a potentially delayed browser mouse command.
    const position = scrollY;
    element.dispatchEvent(new WheelEvent("wheel", { deltaY: -1, cancelable: true }));
    return position;
  });
  expect(turningPoint).toBeGreaterThan(0);
  await expect
    .poll(async () => page.evaluate(() => scrollY), { timeout: 450 })
    .toBeLessThan(turningPoint);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-scroll-progress", "0.0000");
  await page.waitForTimeout(1200);
  await expect(root).toHaveAttribute("data-scroll-progress", "0.0000");
});

test("reversing during the resources flight also returns the content and mascot together", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  const mascot = page.locator("[data-mascot]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 1);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await page.mouse.wheel(0, 1);
  await expect(mascot).toHaveAttribute("data-mascot-travelling", "true");
  await page.mouse.wheel(0, -1);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-active-section", "about");
  await expect(page.locator("#about")).toHaveCSS("opacity", "1");
  await expect(page.locator("#resources")).toHaveCSS("opacity", "0");
  await expect(mascot).toHaveAttribute("data-mascot-travelling", "false");
  await expect(mascot).toHaveAttribute("data-logo-docked", "false");
});

test("ten seconds of rapid input cannot accumulate work beyond the last scene or lock reversal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const root = page.locator("[data-home-page]");
  await expect(root).toHaveAttribute("data-scroll-ready", "true");
  await root.evaluate(async (element) => {
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const emit = (): void => {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, cancelable: true }));
        if (performance.now() - started < 10000) {
          setTimeout(emit, 10);
        } else {
          resolve();
        }
      };
      emit();
    });
  });
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-scroll-progress", "1.0000");
  await root.evaluate((element) => {
    // A boundary event must not throttle a reversal arriving in the very same task.
    element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, cancelable: true }));
    element.dispatchEvent(new WheelEvent("wheel", { deltaY: -1, cancelable: true }));
  });
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await expect(root).toHaveAttribute("data-active-section", "about");
  expect(errors).toEqual([]);
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
