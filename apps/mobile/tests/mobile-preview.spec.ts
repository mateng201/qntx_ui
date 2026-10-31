/* oxlint-disable no-await-in-loop -- Gestures and viewports are verified in order. */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function scrollToProgress(page: Page, amount: number): Promise<void> {
  await page.getByTestId("mobile-scroll-view").evaluate((element, value) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) * value;
  }, amount);
}

test("mobile has the current shared mission, system font and no deleted sections", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  await page.goto("/");
  await expect(page.getByTestId("mobile-section-opening")).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("mobile-opening-content")).toHaveText(
    /Building open protocols.*autonomous AI agents.*To transact/s,
  );
  await expect(
    page.getByText(
      /Swipe to discover|A SHARED STARTING POINT|THE NEXT CHAPTER STARTS WITH YOU|Small primitives/,
    ),
  ).toHaveCount(0);
  await expect(page.getByTestId("mobile-protocol-content")).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveCount(0);
  const mascot = await page.getByTestId("mobile-mascot").boundingBox();
  expect(Math.abs((mascot?.x ?? 0) + (mascot?.width ?? 0) / 2 - 195)).toBeLessThan(1);
  expect(Math.abs((mascot?.y ?? 0) + (mascot?.height ?? 0) / 2 - 422)).toBeLessThan(1);
  const body = page.getByTestId("mobile-mascot-body");
  const original = await body.getAttribute("d");
  await page.waitForTimeout(350);
  await expect(body).toHaveAttribute("d", original ?? "");
  await expect(page.getByTestId("mobile-opening-content").getByRole("heading")).toHaveCSS(
    "font-family",
    /Segoe UI/,
  );
  expect(errors).toEqual([]);
});

test("native scrolling switches only three scenes and reaches the true dock", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const distance = await page
    .getByTestId("mobile-scroll-view")
    .evaluate((e) => e.scrollHeight - e.clientHeight);
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, distance * 0.36);
  await expect(page.getByTestId("mobile-section-about")).toHaveCSS("opacity", "1");
  await page.mouse.wheel(0, distance * 0.64);
  await expect(page.getByTestId("mobile-section-resources")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("link", { name: "Follow the work", exact: true })).toBeVisible();
  await page.mouse.wheel(0, -distance * 0.64);
  await expect(page.getByTestId("mobile-section-about")).toHaveCSS("opacity", "1");
  await scrollToProgress(page, 1);
  const slot = await page.getByTestId("mobile-mascot-dock").boundingBox();
  await expect
    .poll(async () => {
      const b = await page.getByTestId("mobile-mascot").boundingBox();
      return (
        Math.abs((b?.x ?? 0) - (slot?.x ?? 0)) +
        Math.abs((b?.y ?? 0) - (slot?.y ?? 0)) +
        Math.abs((b?.width ?? 0) - (slot?.width ?? 0))
      );
    })
    .toBeLessThan(1);
  await page.getByRole("button", { name: "QuantX home" }).click();
  await expect(page.getByTestId("mobile-section-opening")).toHaveCSS("opacity", "1");
});

test("native endpoints wait five seconds, gaze keeps playback active and docking returns to static", async ({
  page,
}) => {
  await page.goto("/");
  const body = page.getByTestId("mobile-mascot-body");
  const original = await body.getAttribute("d");
  await page.mouse.move(100, 100);
  await page.waitForTimeout(3000);
  await page.mouse.move(101, 100);
  await page.waitForTimeout(2500);
  await expect(body).toHaveAttribute("d", original ?? "");
  await expect.poll(async () => body.getAttribute("d"), { timeout: 4000 }).not.toBe(original);
  await page.mouse.move(320, 620);
  await page.waitForTimeout(400);
  await expect(body).not.toHaveAttribute("d", original ?? "");
  await scrollToProgress(page, 0.08);
  await expect(body).not.toHaveAttribute("d", original ?? "");
  await scrollToProgress(page, 1);
  await expect(body).toHaveAttribute("d", original ?? "");
  await page.waitForTimeout(4200);
  await expect(body).toHaveAttribute("d", original ?? "");
  await expect.poll(async () => body.getAttribute("d"), { timeout: 2500 }).not.toBe(original);
});

test("native resources share the flight clock in both directions and during reversal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByTestId("mobile-home-screen").waitFor();
  const trips = await page.evaluate(async () => {
    const mascot = document.querySelector<HTMLElement>('[data-testid="mobile-mascot"]');
    const dock = document.querySelector<HTMLElement>('[data-testid="mobile-mascot-dock"]');
    const frame = document.querySelector<HTMLElement>('[data-testid="mobile-home-screen"]');
    const resources = document.querySelector<HTMLElement>(
      '[data-testid="mobile-section-resources"]',
    );
    const scroll = document.querySelector<HTMLElement>('[data-testid="mobile-scroll-view"]');
    if (
      mascot === null ||
      dock === null ||
      frame === null ||
      resources === null ||
      scroll === null
    ) {
      throw new Error("Missing native scene or flight geometry");
    }
    const viewport = frame.getBoundingClientRect();
    const slot = dock.getBoundingClientRect();
    const x = viewport.x + viewport.width / 2;
    const y = viewport.y + viewport.height / 2;
    const dx = slot.x + slot.width / 2 - x;
    const dy = slot.y + slot.height / 2 - y;
    const distance = dx * dx + dy * dy;
    const trips: Array<Array<{ opacity: number; position: number }>> = [];
    for (const destination of [1, 0.5, 1, 0.5]) {
      scroll.scrollTop = (scroll.scrollHeight - scroll.clientHeight) * destination;
      const started = performance.now();
      trips.push(
        await new Promise<Array<{ opacity: number; position: number }>>((resolve) => {
          const samples: Array<{ opacity: number; position: number }> = [];
          const sample = (now: number): void => {
            const box = mascot.getBoundingClientRect();
            samples.push({
              opacity: Number(getComputedStyle(resources).opacity),
              position:
                ((box.x + box.width / 2 - x) * dx + (box.y + box.height / 2 - y) * dy) / distance,
            });
            if (now - started > 1200) {
              resolve(samples);
            } else {
              requestAnimationFrame(sample);
            }
          };
          requestAnimationFrame(sample);
        }),
      );
    }
    return trips;
  });
  for (const [index, frames] of trips.entries()) {
    expect(
      frames.filter(({ position }) => position > 0.05 && position < 0.95).length,
    ).toBeGreaterThan(8);
    expect(
      Math.max(...frames.map(({ opacity, position }) => Math.abs(opacity - position))),
    ).toBeLessThan(0.025);
    expect(frames.at(-1)?.opacity).toBeCloseTo(index % 2 === 0 ? 1 : 0, 3);
  }
  await scrollToProgress(page, 1);
  await page.waitForTimeout(350);
  await scrollToProgress(page, 0.5);
  await expect(page.getByTestId("mobile-section-resources")).toHaveCSS("opacity", "0");
});

for (const viewport of [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  test(`current content and destinations stay readable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await (viewport.width < 360
      ? page.getByTestId("mobile-document-about").scrollIntoViewIfNeeded()
      : scrollToProgress(page, 0.36));
    await expect(page.getByTestId("mobile-about-content")).toBeInViewport();
    await (viewport.width < 360
      ? page.getByTestId("mobile-document-resources").scrollIntoViewIfNeeded()
      : scrollToProgress(page, 1));
    const destination = page.getByRole("link", { name: "Follow the work", exact: true });
    await destination.scrollIntoViewIfNeeded();
    await expect(destination).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("landscape uses one readable document and rotation resets the opening", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await expect(page.getByTestId("mobile-scroll-track")).toHaveCount(0);
  await page.getByTestId("mobile-document-about").scrollIntoViewIfNeeded();
  await page.getByRole("link", { name: "Follow the work", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByTestId("mobile-protocol-content")).toHaveCount(0);
  await scrollToProgress(page, 1);
  await expect
    .poll(async () => {
      const mascot = await page.getByTestId("mobile-mascot").boundingBox();
      const dock = await page.getByTestId("mobile-mascot-dock").boundingBox();
      return Math.abs((mascot?.y ?? 0) - (dock?.y ?? 0));
    })
    .toBeLessThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("mobile-scroll-track")).toBeAttached();
  await expect(page.getByTestId("mobile-section-opening")).toHaveCSS("opacity", "1");
  await expect
    .poll(async () => {
      const mascot = await page.getByTestId("mobile-mascot").boundingBox();
      return (
        Math.abs((mascot?.x ?? 0) + (mascot?.width ?? 0) / 2 - 195) +
        Math.abs((mascot?.y ?? 0) + (mascot?.height ?? 0) / 2 - 422)
      );
    })
    .toBeLessThan(1);
});

test("touch swipes scroll the native content, including the interactive last scene", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8082/");
  await page.getByTestId("mobile-home-screen").waitFor();
  const session = await context.newCDPSession(page);
  for (const progress of [0, 0.8]) {
    await scrollToProgress(page, progress);
    const before = await page.getByTestId("mobile-scroll-view").evaluate((e) => e.scrollTop);
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
      .poll(async () => page.getByTestId("mobile-scroll-view").evaluate((e) => e.scrollTop))
      .toBeGreaterThan(before);
  }
  await context.close();
});

test("Docs opens separately and the shared blue/olive/warm palette remains on mobile", async ({
  page,
  context,
}) => {
  await context.route("https://qntx.org/developers", async (route) =>
    route.fulfill({ status: 200, body: "Documentation destination" }),
  );
  await page.goto("/");
  await expect(page.getByTestId("mobile-opening-content").getByRole("heading")).toHaveCSS(
    "color",
    "rgb(38, 61, 75)",
  );
  await scrollToProgress(page, 0.36);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://qntx.org/developers");
  await popup.close();
  await expect(page.getByTestId("mobile-section-about")).toHaveCSS("opacity", "1");
  await scrollToProgress(page, 0.8);
  await expect(page.getByTestId("mobile-resources-content").getByRole("heading").first()).toHaveCSS(
    "color",
    "rgb(64, 56, 50)",
  );
});
