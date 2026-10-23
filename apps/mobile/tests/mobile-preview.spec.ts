import { expect, test } from "@playwright/test";

test("native components render all three screens with exactly one selected tab", async ({
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
  await expect(page.getByTestId("screen-overview")).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await page.getByRole("button", { name: /Start exploring/ }).click();
  await expect(page.getByTestId("screen-protocols")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Protocols", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("link", { name: "Payments, x402", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "About", exact: true }).click();
  await expect(page.getByTestId("screen-about")).toBeVisible();
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Explore the organization", exact: true }),
  ).toBeAttached();
  await page.getByRole("button", { name: "QuantX home" }).click();
  await expect(page.getByTestId("screen-overview")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Docs destination opens separately without losing the selected native screen", async ({
  page,
  context,
}) => {
  await context.route("https://qntx.org/developers", async (route) => {
    await route.fulfill({ status: 200, body: "Documentation destination" });
  });
  await page.goto("/");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://qntx.org/developers");
  await popup.close();
  await expect(page.getByTestId("screen-overview")).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  test(`mobile navigation stays visible at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("tab", { name: "Protocols", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeInViewport();
    await expect(page.getByRole("tab", { name: "About", exact: true })).toBeInViewport();
    const widths = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    await page
      .getByRole("link", { name: "Wallets, TypeScript", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("link", { name: "Wallets, TypeScript", exact: true }),
    ).toBeInViewport();
    await expect(page.getByRole("tab", { name: "About", exact: true })).toBeInViewport();
  });
}
