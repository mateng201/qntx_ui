import { expect, test } from "@playwright/test";

for (const width of [390, 760]) {
  test(`preserved narrow website keeps all three panels and controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".desktop-home")).toBeHidden();
    await expect(page.locator("[data-panel]")).toHaveCount(3);
    await expect(page.locator(".main-nav .nav-link")).toHaveText([
      "Overview",
      "Protocols",
      "About",
    ]);
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(page.locator("[data-deck]")).toHaveCSS("scroll-snap-type", "x mandatory");
    await page.getByRole("link", { name: "Protocols", exact: true }).click();
    await expect(page).toHaveURL(/#protocols$/);
    await expect(page.locator(".primitive-row")).toHaveCount(4);
    await page.locator("#protocols").evaluate((panel) => {
      panel.scrollTop = panel.scrollHeight;
    });
    await expect(
      page.locator("#protocols").getByRole("link", { name: /Wallets/ }),
    ).toBeInViewport();
    await page.getByRole("link", { name: "About", exact: true }).click();
    await expect(page.locator("[data-site-shell]")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".destination-row")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Next section" })).toBeDisabled();
    await page.keyboard.press("Home");
    await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
  });
}
