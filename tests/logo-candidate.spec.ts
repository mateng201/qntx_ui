import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

test("candidate renders a complete static logo without SVG or runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  await page.goto("/logo-check/");
  const logos = page.locator("[data-logo-trigger]");
  await expect(logos).toHaveCount(3);
  await expect(logos.first()).toHaveAttribute("data-ready", "true");
  const bounds = await logos
    .first()
    .locator("svg")
    .evaluate((svg) => {
      if (!(svg instanceof SVGSVGElement)) {
        throw new Error("Missing candidate SVG");
      }
      const box = svg.getBBox();
      return { width: box.width, height: box.height };
    });
  expect(bounds.width).toBeGreaterThan(270);
  expect(bounds.height).toBeGreaterThan(270);
  expect(bounds.width).toBeLessThan(272);
  expect(bounds.height).toBeLessThan(272);
  expect(errors).toEqual([]);
});

test("idle blinking stays bounded through repeated cycles and returns cleanly", async ({
  page,
}) => {
  await page.goto("/logo-check/");
  const logo = page.locator("[data-logo-trigger]").first();
  const body = logo.locator('[data-q-id="body"]');
  const originalPath = await body.getAttribute("d");
  await expect(logo).toHaveAttribute("data-ready", "true");
  await logo.hover();
  await expect(logo).toHaveAttribute("data-phase", "live");
  const samples = await logo.evaluate(async (element) => {
    const svg = element.querySelector("svg");
    const body = element.querySelector('[data-q-id="body"]');
    const eye = element.querySelector('[data-q-eye="left"]');
    if (svg === null || body === null || eye === null) {
      throw new Error("Missing candidate SVG");
    }
    return new Promise<{ maximum: number; frames: number; poses: number; othersResting: boolean }>(
      (resolve) => {
        const started = performance.now();
        let maximum = 0;
        let frames = 0;
        let othersResting = true;
        const paths = new Set<string>();
        const sample = (now: number): void => {
          const box = svg.getBBox();
          maximum = Math.max(
            maximum,
            Math.abs(box.x),
            Math.abs(box.y),
            Math.abs(box.x + box.width),
            Math.abs(box.y + box.height),
          );
          frames += 1;
          paths.add(eye.getAttribute("d") ?? "");
          othersResting &&= [...document.querySelectorAll<HTMLElement>("[data-logo-trigger]")]
            .filter((other) => other !== element)
            .every((other) => other.dataset["phase"] === "rest");
          if (now - started < 12_000) {
            requestAnimationFrame(sample);
          } else {
            resolve({ maximum, frames, poses: paths.size, othersResting });
          }
        };
        requestAnimationFrame(sample);
      },
    );
  });
  expect(samples.frames).toBeGreaterThan(100);
  expect(samples.poses).toBeGreaterThan(20);
  expect(samples.maximum).toBeLessThan(150);
  expect(samples.othersResting).toBe(true);
  await page.mouse.move(0, 0);
  await expect(logo).toHaveAttribute("data-phase", "rest");
  await expect(logo).toHaveAttribute("data-running", "false");
  await expect(body).toHaveAttribute("d", originalPath ?? "");
});

test("keyboard focus starts and stops each independent instance", async ({ page }) => {
  await page.goto("/logo-check/");
  const logos = page.locator("[data-logo-trigger]");
  await page.locator(".preview-link").focus();
  await page.keyboard.press("Tab");
  await expect(logos.nth(0)).toBeFocused();
  await expect(logos.nth(0)).toHaveAttribute("data-phase", "live");
  await page.keyboard.press("Tab");
  await expect(logos.nth(1)).toBeFocused();
  await expect(logos.nth(1)).toHaveAttribute("data-phase", "live");
  await expect(logos.nth(0)).toHaveAttribute("data-phase", "rest");
});

test("reduced motion retains the complete static mark", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/logo-check/");
  const logo = page.locator("[data-logo-trigger]").first();
  await expect(logo).toHaveAttribute("data-ready", "true");
  const body = logo.locator('[data-q-id="body"]');
  const originalPath = await body.getAttribute("d");
  await logo.hover();
  await expect(logo).toHaveAttribute("data-phase", "rest");
  await expect(logo).toHaveAttribute("data-running", "false");
  await expect(body).toHaveAttribute("d", originalPath ?? "");
});

test("offscreen animation pauses and resumes without leaking a frame loop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto("/logo-check/");
  const logo = page.locator("[data-logo-trigger]").first();
  await page.locator(".preview-link").focus();
  await page.keyboard.press("Tab");
  await expect(logo).toHaveAttribute("data-phase", "live");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(logo).toHaveAttribute("data-running", "false");
  await logo.scrollIntoViewIfNeeded();
  await expect(logo).toHaveAttribute("data-running", "true");
});
