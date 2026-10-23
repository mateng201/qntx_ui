import { expect, test } from "@playwright/test";

const contrastGroups = [
  {
    id: "overview",
    selector: ".intro-copy, .hero-actions .text-link",
  },
  {
    id: "protocols",
    selector: ".primitive-content p, .protocol-badge, .row-number",
  },
  {
    id: "about",
    selector:
      ".destination-heading, .destination-row p, .row-number, .about-signature, .intro-copy",
  },
];

for (const group of contrastGroups) {
  test(`${group.id} revised small text meets 4.5:1 on its rendered background`, async ({
    page,
  }) => {
    await page.goto(`/#${group.id}`);
    const contrast = await page.locator(`#${group.id}`).evaluate((panel, selector) => {
      function rgb(value: string): number[] {
        const channels = (value.match(/[\d.]+/g) ?? []).map(Number);
        if (channels.length < 3) {
          throw new Error(`Cannot measure RGB text in ${selector}: ${value}`);
        }
        return channels;
      }
      function luminance(color: string): number {
        const [red = 0, green = 0, blue = 0] = rgb(color)
          .slice(0, 3)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      }
      return [...panel.querySelectorAll(selector)].map((element) => {
        let ancestor: Element | undefined = element;
        let background = "rgb(255, 255, 255)";
        while (ancestor !== undefined) {
          const color = getComputedStyle(ancestor).backgroundColor;
          const channels = rgb(color);
          if ((channels[3] ?? 1) === 1) {
            background = color;
            break;
          }
          ancestor = ancestor.parentElement ?? undefined;
        }
        const foreground = luminance(getComputedStyle(element).color);
        const backdrop = luminance(background);
        return {
          text: element.textContent?.trim(),
          ratio: (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05),
        };
      });
    }, group.selector);
    expect(contrast.length).toBeGreaterThan(0);
    for (const value of contrast) {
      expect(value.ratio, `${group.id}: ${value.text}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

for (const width of [1280, 1024]) {
  for (const id of ["about"]) {
    test(`${id} fits ${width}x600 without clipping`, async ({ page }) => {
      await page.setViewportSize({ width, height: 600 });
      await page.goto(`/#${id}`);
      const bounds = await page.locator(`#${id}`).evaluate((panel) => ({
        height: panel.clientHeight,
        scrollHeight: panel.scrollHeight,
      }));
      expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height + 1);
    });
  }
}

test("About return link works beside the footer navigation", async ({ page }) => {
  await page.goto("/#about");
  const back = page.getByRole("link", { name: "Back to the beginning", exact: true });
  await expect(back).toBeVisible();
  await expect(page.locator(".footer-controls")).toContainText("Back to the beginning");
  await back.click();
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(back).toBeHidden();
});

test("About footer return remains usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4321/#about");
  const back = page.getByRole("link", { name: "Back to the beginning", exact: true });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page.locator("#overview")).toBeInViewport();
  await context.close();
});
