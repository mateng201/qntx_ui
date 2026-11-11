import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { initializeWheelSectionNavigation as WheelInitializer } from "../src/scripts/wheel-section-navigation";

declare global {
  var disposeWheelFixture: () => void;
  var wheelFixtureVisits: number[];
  var wheelFixtureSettlingUntil: number;
}

/** Exercise long journeys without adding artificial screens to the actual three-scene site. */
async function installNavigationFixture(page: Page, stopCount = 6): Promise<void> {
  await page.locator("[data-home-page]").evaluate(() => {
    document.dispatchEvent(new Event("astro:before-swap"));
  });
  await page.evaluate(async (count) => {
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
    root.style.height = `${innerHeight * count}px`;
    document.body.replaceChildren(root);
    scrollTo({ top: 0, behavior: "instant" });
    globalThis.wheelFixtureVisits = [0];
    globalThis.wheelFixtureSettlingUntil = 0;
    globalThis.disposeWheelFixture = initializeWheelSectionNavigation(root, {
      getStops: () =>
        Array.from({ length: count }, (_, index) => ({
          id: String(index),
          top: innerHeight * index,
        })),
      isSettling: () => performance.now() < globalThis.wheelFixtureSettlingUntil,
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
  }, stopCount);
}

async function pauseFixtureTime(page: Page): Promise<void> {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 60000));
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

test("continuous fresh input advances adjacent scenes without needing a quiet gap", async ({
  page,
}) => {
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

test("five rapid steps expire after release instead of playing five historical trips", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page);
  await pauseFixtureTime(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.evaluate((element) => {
    for (const delay of [0, 140, 280, 420, 560]) {
      setTimeout(() => {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, cancelable: true }));
      }, delay);
    }
  });
  await page.clock.runFor(600);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await page.clock.runFor(3000);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits)).toEqual([0, 1]);
  await page.clock.runFor(5000);
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(1);
  await root.dispatchEvent("wheel", { deltaY: -1, cancelable: true });
  await page.clock.runFor(1200);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(0);
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

test("sustained fresh input visits five adjacent scenes in order", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page);
  await pauseFixtureTime(page);
  await page.locator("[data-wheel-fixture]").evaluate((element) => {
    const until = performance.now() + 5800;
    const emit = (): void => {
      element.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, cancelable: true }));
      if (performance.now() < until) {
        setTimeout(emit, 35);
      }
    };
    emit();
  });
  await page.clock.runFor(7000);
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits)).toEqual([0, 1, 2, 3, 4, 5]);
  await expect(page.locator("[data-wheel-fixture]")).not.toHaveAttribute(
    "data-wheel-navigating",
    "true",
  );
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

for (const [inputAt, expectedStop] of [
  [700, 1],
  [1000, 2],
] as const) {
  test(`continuation at ${inputAt}ms is checked for freshness when the trip finishes`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await installNavigationFixture(page);
    await pauseFixtureTime(page);
    const root = page.locator("[data-wheel-fixture]");
    await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
    await page.clock.runFor(inputAt);
    await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
    await page.clock.runFor(4000);
    expect(await page.evaluate(() => scrollY / innerHeight)).toBe(expectedStop);
    await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
    await page.evaluate(() => globalThis.disposeWheelFixture());
  });
}

test("continuation can expire while waiting for mascot settling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page);
  await pauseFixtureTime(page);
  await page.evaluate(() => {
    globalThis.wheelFixtureSettlingUntil = performance.now() + 2000;
  });
  const root = page.locator("[data-wheel-fixture]");
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.runFor(1000);
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.runFor(500);
  await expect(root).toHaveAttribute("data-wheel-navigating", "true");
  await page.clock.runFor(3000);
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits)).toEqual([0, 1]);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

test("a suspended frame cannot revive old continuation input", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page);
  await pauseFixtureTime(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.runFor(500);
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.fastForward(10000);
  await page.clock.runFor(100);
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits)).toEqual([0, 1]);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

test("ten seconds of input across twenty stops leaves no historical backlog after release", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page, 20);
  await pauseFixtureTime(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.evaluate((element) => {
    const until = performance.now() + 10000;
    const emit = (): void => {
      element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, cancelable: true }));
      if (performance.now() < until) {
        setTimeout(emit, 10);
      }
    };
    emit();
  });
  await page.clock.runFor(10350);
  const visitedAfterExpiry = await page.evaluate(() => globalThis.wheelFixtureVisits.length);
  expect(visitedAfterExpiry).toBeGreaterThan(5);
  expect(visitedAfterExpiry).toBeLessThan(20);
  await page.clock.runFor(5000);
  // Only the already-running trip may finish after the continuation deadline.
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits.length)).toBeLessThanOrEqual(
    visitedAfterExpiry + 1,
  );
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  const stoppedAt = await page.evaluate(() => scrollY);
  await page.clock.runFor(5000);
  expect(await page.evaluate(() => scrollY)).toBe(stoppedAt);
  await root.dispatchEvent("wheel", { deltaY: -1, cancelable: true });
  await page.clock.runFor(1200);
  expect(await page.evaluate(() => scrollY)).toBe(stoppedAt - (page.viewportSize()?.height ?? 0));
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

test("an input storm is coalesced into one fresh continuation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page);
  await pauseFixtureTime(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.runFor(950);
  await root.evaluate((element) => {
    for (let count = 0; count < 10000; count += 1) {
      element.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, cancelable: true }));
    }
  });
  await page.clock.runFor(5000);
  expect(await page.evaluate(() => globalThis.wheelFixtureVisits)).toEqual([0, 1, 2]);
  await expect(root).not.toHaveAttribute("data-wheel-navigating", "true");
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

test("the leading 100ms window keeps reduced-motion input immediate and reversals unblocked", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await installNavigationFixture(page);
  await pauseFixtureTime(page);
  const root = page.locator("[data-wheel-fixture]");
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.runFor(32);
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(1);
  await root.dispatchEvent("wheel", { deltaY: 1, cancelable: true });
  await page.clock.runFor(32);
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(1);
  await root.dispatchEvent("wheel", { deltaY: -1, cancelable: true });
  await page.clock.runFor(32);
  expect(await page.evaluate(() => scrollY / innerHeight)).toBe(0);
  await page.evaluate(() => globalThis.disposeWheelFixture());
});

for (const action of ["pointerdown", "resize", "keydown", "dispose"] as const) {
  test(`${action} cancels both the running trip and continuation intent`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await installNavigationFixture(page);
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

test("reduced-motion changes cancel continuation and still accept the next input", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await installNavigationFixture(page);
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

test("opposite input immediately reverses the trip and discards forward continuation", async ({
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
    element.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, cancelable: true }));
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
