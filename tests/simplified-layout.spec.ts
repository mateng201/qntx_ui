import { expect, test } from "@playwright/test";

test("the simplified page removes exactly the marked groups and retains the unmarked content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  await expect(page.locator("[data-panel]")).toHaveCount(3);
  await expect(page.locator(".main-nav .nav-link")).toHaveText(["Overview", "Protocols", "About"]);
  await expect(page.locator('#build, a[href="#build"]')).toHaveCount(0);
  await expect(
    page.locator(".home-visual, .home-facts, .home-panel .eyebrow, .protocol-note"),
  ).toHaveCount(0);
  await expect(page.locator(".section-intro > .eyebrow, .standards > p")).toHaveCount(0);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The economic layerfor autonomous agents.",
  );
  await expect(page.getByRole("link", { name: "Start exploring" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Built in public/ })).toBeVisible();
  await expect(page.locator(".standard-links a")).toHaveCount(3);
  await expect(page.locator(".primitive-row")).toHaveCount(4);
  await expect(page.locator(".destination-row")).toHaveCount(3);
  await expect(page.locator(".about-signature")).toBeAttached();
  expect(errors).toEqual([]);
});

test("the three-panel progress, counter, and end controls agree", async ({ page }) => {
  await page.goto("/#protocols");
  await expect(page.locator(".progress-number")).toHaveText(["01", "02", "03"]);
  await expect(page.locator(".panel-counter")).toHaveText("02 / 03");
  await page.getByRole("button", { name: "Next section" }).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator(".panel-counter")).toHaveText("03 / 03");
  await expect(page.locator('.main-nav [aria-current="page"]')).toHaveCount(1);
  await expect(page.locator('.section-progress [aria-current="page"]')).toHaveAttribute(
    "href",
    "#about",
  );
  await expect(page.getByRole("button", { name: "Next section" })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/#protocols$/);
  await page.keyboard.press("Home");
  await expect(page.locator("[data-current-panel]")).toHaveText("01");
  await expect(page.getByRole("button", { name: "Previous section" })).toBeDisabled();
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`the single-column Overview is balanced and fits ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const bounds = await page.locator("#overview").evaluate((panel) => {
      const intro = panel.querySelector(".home-intro");
      const box = intro?.getBoundingClientRect();
      const scroller = document.scrollingElement;
      if (box === undefined || scroller === null) {
        throw new Error("Missing single-column Overview");
      }
      return {
        centerOffset: Math.abs((box.left + box.right) / 2 - innerWidth / 2),
        panelHeight: panel.clientHeight,
        panelScrollHeight: panel.scrollHeight,
        documentHeight: scroller.clientHeight,
        documentScrollHeight: scroller.scrollHeight,
      };
    });
    expect(bounds.centerOffset).toBeLessThanOrEqual(1);
    expect(bounds.panelScrollHeight).toBeLessThanOrEqual(bounds.panelHeight + 1);
    expect(bounds.documentScrollHeight).toBeLessThanOrEqual(bounds.documentHeight);
    await expect(
      page.locator("#overview").getByRole("link", { name: /ERC–8183/ }),
    ).toBeInViewport();
  });
}
