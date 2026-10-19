import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1280, height: 600 },
  { width: 390, height: 844 },
]) {
  test(`diagram typography stays legible at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const sizes = await page.locator(".home-visual").evaluate((visual) => {
      const actions = [...visual.querySelectorAll(".network-action")];
      const field = visual.querySelector(".agent-field")?.getBoundingClientRect();
      const caption = visual.querySelector(".visual-caption");
      const metadata = visual.querySelector(".visual-label");
      if (caption === null || metadata === null) {
        throw new Error("Missing diagram typography roles");
      }
      return {
        actions: actions.map((element) =>
          Number(getComputedStyle(element).fontSize.replace("px", "")),
        ),
        caption: Number(getComputedStyle(caption).fontSize.replace("px", "")),
        metadata: Number(getComputedStyle(metadata).fontSize.replace("px", "")),
        labelsFit: actions.every((element) => {
          const box = element.getBoundingClientRect();
          return field !== undefined && box.left >= field.left && box.right <= field.right;
        }),
      };
    });
    expect(sizes.actions).toHaveLength(4);
    expect(sizes.actions.every((size) => size >= 14)).toBe(true);
    expect(sizes.caption).toBeGreaterThanOrEqual(13);
    expect(sizes.metadata).toBeGreaterThanOrEqual(11);
    expect(sizes.labelsFit).toBe(true);
  });
}

const contrastGroups = [
  {
    id: "overview",
    selector: ".visual-label span, .network-action, .field-coordinate, .visual-caption span",
  },
  {
    id: "protocols",
    selector:
      ".primitive-content p, .protocol-badge, .row-number, .protocol-note span, .protocol-note p",
  },
  {
    id: "build",
    selector:
      ".list-heading span, .list-heading a, .repository-row p, .repo-prefix, .repo-language, .repository-footnote",
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
  for (const id of ["build", "about"]) {
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
