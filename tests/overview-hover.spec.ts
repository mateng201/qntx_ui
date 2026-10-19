import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, expect, test } from "@playwright/test";

for (const scenario of [
  { zoom: 0.8, width: 1280, height: 600 },
  { zoom: 0.9, width: 1280, height: 600 },
  { zoom: 1, width: 1280, height: 600 },
  { zoom: 1.1, width: 1280, height: 600 },
  { zoom: 1, width: 1024, height: 600 },
  { zoom: 1.1, width: 1024, height: 600 },
]) {
  test(`Overview fits ${scenario.width}x${scenario.height} at Chrome ${Math.round(scenario.zoom * 100)}% zoom`, async ({
    browserName,
  }, testInfo) => {
    expect(browserName).toBe("chromium");
    const profile = testInfo.outputPath("chrome-profile");
    mkdirSync(path.join(profile, "Default"), { recursive: true });
    // Chrome's native page zoom, not CSS zoom or pinch-zoom emulation.
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
      const metrics = await page.locator("#overview").evaluate((panel) => {
        const label = panel.querySelector(".action-collaborate");
        const center = panel.querySelector(".network-center");
        const logo = panel.querySelector(".network-mark");
        const documentScroller = document.scrollingElement;
        if (label === null || center === null || logo === null || documentScroller === null) {
          throw new Error("Missing Overview geometry");
        }
        const text = label.getBoundingClientRect();
        const panelBounds = panel.getBoundingClientRect();
        return {
          zoom: devicePixelRatio,
          panelHeight: panel.clientHeight,
          panelScrollHeight: panel.scrollHeight,
          documentHeight: documentScroller.clientHeight,
          documentScrollHeight: documentScroller.scrollHeight,
          collision: [center, logo].some((element) => {
            const box = element.getBoundingClientRect();
            return (
              text.left < box.right &&
              text.right > box.left &&
              text.top < box.bottom &&
              text.bottom > box.top
            );
          }),
          contentFits: [
            ...panel.querySelectorAll(
              "h1,p,a,dt,dd,.network-action,.field-coordinate,.visual-label,.visual-caption",
            ),
          ].every((element) => {
            if (element.getClientRects().length === 0) {
              return true;
            }
            const box = element.getBoundingClientRect();
            return box.top >= panelBounds.top - 1 && box.bottom <= panelBounds.bottom + 1;
          }),
        };
      });
      expect(metrics.zoom).toBeCloseTo(scenario.zoom, 2);
      expect(metrics.collision).toBe(false);
      expect(metrics.panelScrollHeight).toBeLessThanOrEqual(metrics.panelHeight);
      expect(metrics.documentScrollHeight).toBeLessThanOrEqual(metrics.documentHeight);
      expect(metrics.contentFits).toBe(true);
    } finally {
      await context.close();
    }
  });
}

for (const panel of [
  { id: "protocols", count: 5, label: "Protocols" },
  { id: "build", count: 6, label: "Build" },
]) {
  for (let index = 0; index < panel.count; index += 1) {
    test(`${panel.label} link ${index + 1} has About-style hover feedback`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(`/#${panel.id}`);
      await expect(page.getByRole("link", { name: panel.label, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      const links = page.locator(`#${panel.id} a`);
      await expect(links).toHaveCount(panel.count);
      const link = links.nth(index);
      const isButton = await link.evaluate((element) => element.classList.contains("button"));
      const before = await link.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        highlight: getComputedStyle(element, "::before").backgroundColor,
      }));
      await link.hover();
      await expect(link.locator(".icon")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 2, -2)");
      await expect
        .poll(async () =>
          link.evaluate(
            (element, button) =>
              button
                ? getComputedStyle(element).backgroundColor
                : getComputedStyle(element, "::before").backgroundColor,
            isButton,
          ),
        )
        .toBe(isButton ? "rgb(35, 38, 32)" : "rgb(233, 236, 229)");
      await page.mouse.move(0, 0);
      await expect
        .poll(async () =>
          link.evaluate((element) => ({
            background: getComputedStyle(element).backgroundColor,
            highlight: getComputedStyle(element, "::before").backgroundColor,
          })),
        )
        .toEqual(before);
    });
  }
}
