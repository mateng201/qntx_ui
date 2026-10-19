import { expect, test } from "@playwright/test";

test("vertical wheel input advances horizontal CSS snap panels in both directions", async ({
  page,
}) => {
  await page.goto("/");
  const deck = page.locator("[data-deck]");
  await expect(deck).toHaveCSS("scroll-snap-type", "x mandatory");
  await deck.hover();
  await page.mouse.wheel(0, 500);
  await expect(page.getByRole("link", { name: "Protocols", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page).toHaveURL(/#protocols$/);
  await expect
    .poll(async () =>
      deck.evaluate((element) => Math.round(element.scrollLeft / element.clientWidth)),
    )
    .toBe(1);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -500);
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect.poll(async () => deck.evaluate((element) => element.scrollLeft)).toBe(0);
});

test("one continuous wheel gesture stays on the adjacent panel", async ({ page }) => {
  await page.goto("/");
  const deck = page.locator("[data-deck]");
  await deck.hover();
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await expect
    .poll(async () =>
      deck.evaluate((element) => Math.round(element.scrollLeft / element.clientWidth)),
    )
    .toBe(1);
  await expect(page).toHaveURL(/#protocols$/);
});

test("navigation, deep links, keyboard, and end controls stay synchronized", async ({ page }) => {
  await page.goto("/#about");
  await expect(page.getByRole("link", { name: "About", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("[data-site-shell]")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Next section" })).toBeDisabled();
  await page.keyboard.press("Home");
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("button", { name: "Previous section" })).toBeDisabled();
  await page.getByRole("link", { name: "Build", exact: true }).click();
  await expect(page).toHaveURL(/#build$/);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#about$/);
});

test("small viewports retain all content with panel-local scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.width);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  const home = page.locator("#overview");
  expect(await home.evaluate((element) => element.scrollHeight)).toBeGreaterThan(
    await home.evaluate((element) => element.clientHeight),
  );
  await page.getByRole("link", { name: "Protocols", exact: true }).click();
  await expect(page).toHaveURL(/#protocols$/);
  await page.locator("#protocols").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator("#protocols").getByRole("link", { name: /Wallets/ })).toBeInViewport();
});

for (const viewport of [
  { width: 1280, height: 600 },
  { width: 1024, height: 600 },
  { width: 1280, height: 680 },
]) {
  test(`Protocols fits ${viewport.width}x${viewport.height} without consuming the first wheel`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/#protocols");
    await expect(page.getByRole("link", { name: "Protocols", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const protocol = page.locator("#protocols");
    const bounds = await protocol.evaluate((panel) => {
      const rectangle = panel.getBoundingClientRect();
      return {
        height: panel.clientHeight,
        scrollHeight: panel.scrollHeight,
        gridHeight: panel.querySelector(".panel-grid")?.getBoundingClientRect().height,
        bodyHeight: document.body.scrollHeight,
        viewportHeight: document.documentElement.clientHeight,
        contentFits: [...panel.querySelectorAll(".section-intro, .primitive-row")].every(
          (element) => {
            const box = element.getBoundingClientRect();
            return box.top >= rectangle.top - 1 && box.bottom <= rectangle.bottom + 1;
          },
        ),
      };
    });
    expect(bounds.bodyHeight).toBeLessThanOrEqual(bounds.viewportHeight);
    expect(bounds.gridHeight).toBeLessThanOrEqual(bounds.height + 1);
    expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height + 1);
    expect(bounds.contentFits).toBe(true);
    await expect(protocol).toHaveCSS("overflow-y", "auto");
    await protocol.hover();
    await page.mouse.wheel(0, 120);
    await expect(page).toHaveURL(/#build$/);
    expect(await protocol.evaluate((panel) => panel.scrollTop)).toBe(0);
  });
}

test("the static page has working section anchors without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4321/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("economic layer");
  await page.getByRole("link", { name: "Protocols", exact: true }).click();
  await expect(page.locator("#protocols")).toBeInViewport();
  await context.close();
});
