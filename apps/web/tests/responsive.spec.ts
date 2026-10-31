/* oxlint-disable no-await-in-loop -- Viewport changes and scroll actions must be verified in order. */
import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 720, height: 450 },
  { width: 480, height: 300 },
]) {
  test(`zoom-equivalent document layout retains section fades at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("[data-home-page]")).toHaveAttribute(
      "data-scroll-layout",
      "document",
    );
    for (const id of ["about"]) {
      const section = page.locator(`#${id}`);
      const content = section.locator(":scope > div");
      await content.evaluate((element) => {
        scrollTo({
          top: scrollY + element.getBoundingClientRect().top - (innerHeight - 24),
          behavior: "instant",
        });
      });
      await expect
        .poll(async () => section.evaluate((element) => Number(getComputedStyle(element).opacity)))
        .toBeGreaterThan(0.01);
      await expect
        .poll(async () => section.evaluate((element) => Number(getComputedStyle(element).opacity)))
        .toBeLessThan(0.95);

      await content.evaluate((element) => {
        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        scrollTo({
          top: scrollY + element.getBoundingClientRect().top - headerBottom - 24,
          behavior: "instant",
        });
      });
      await expect(section).toHaveCSS("opacity", "1");

      await content.evaluate((element) => {
        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        scrollTo({
          top: scrollY + element.getBoundingClientRect().bottom - headerBottom - 24,
          behavior: "instant",
        });
      });
      await expect
        .poll(async () => section.evaluate((element) => Number(getComputedStyle(element).opacity)))
        .toBeLessThan(0.95);
      expect(await section.evaluate((element) => element.hasAttribute("inert"))).toBe(false);
    }
    expect(await page.evaluate(() => scrollX)).toBe(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("#about")).toHaveCSS("opacity", "1");
    await expect(page.locator("#resources")).toHaveCSS("opacity", "1");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-layout", "pinned");
    await page.locator("[data-scroll-track]").evaluate((track) => {
      scrollTo({
        top:
          track.getBoundingClientRect().top + scrollY + (track.clientHeight - innerHeight) * 0.29,
        behavior: "instant",
      });
    });
    await expect(page.locator("#about")).toHaveCSS("opacity", "1");
  });
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 760, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`one readable vertical website at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto("/");
    const root = page.locator("[data-home-page]");
    await expect(root).toHaveCount(1);
    await expect(root).toHaveAttribute("data-scroll-layout", /pinned|document/);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("navigation")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(0);
    const header = await page.locator(".site-header").boundingBox();
    expect(header?.width).toBe(viewport.width);
    await expect(page.getByRole("link", { name: "Docs", exact: true })).toBeInViewport();

    for (const selector of ["#about-title", "#resources-title", ".resource-link:last-child"]) {
      if ((await root.getAttribute("data-scroll-layout")) === "pinned") {
        const amount = selector === "#about-title" ? 0.36 : 1;
        await page.locator("[data-scroll-track]").evaluate((track, value) => {
          scrollTo({
            top:
              track.getBoundingClientRect().top +
              scrollY +
              (track.clientHeight - innerHeight) * value,
            behavior: "instant",
          });
        }, amount);
      } else {
        await page.locator(selector).scrollIntoViewIfNeeded();
      }
      await expect(page.locator(selector)).toBeInViewport();
    }
    if ((await root.getAttribute("data-scroll-layout")) === "document") {
      expect(await page.locator("[inert]").count()).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => scrollX)).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    expect(
      await root.evaluate((element) =>
        [...element.querySelectorAll("*")].every((child) => {
          const style = getComputedStyle(child);
          return style.overflowY !== "auto" && style.overflowY !== "scroll";
        }),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("device emulation and touch keep the same vertical website when its viewport changes", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("[data-home-page]").evaluate((root) => {
    root.dataset["identity"] = "original";
  });
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await expect.poll(async () => page.evaluate(() => innerWidth)).toBe(390);
  await expect(page.locator("[data-home-page]")).toHaveAttribute(
    "data-scroll-layout",
    /pinned|document/,
  );
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 180, y: 650 }],
  });
  for (const y of [580, 500, 420, 340, 260, 180]) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 180, y }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  for (const width of [320, 760, 1200, 390]) {
    await session.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await expect.poll(async () => page.evaluate(() => innerWidth)).toBe(width);
    await expect(page.locator("[data-home-page]")).toHaveCount(1);
    await expect(page.locator("[data-home-page]")).toHaveAttribute("data-identity", "original");
    expect(await page.evaluate(() => scrollX)).toBe(0);
  }
  expect(errors).toEqual([]);
  await session.detach();
});

test("larger text falls back to document layout and restores pinned scrolling when it fits again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-layout", "pinned");
  const largerText = await page.addStyleTag({
    content: ".resources-description { font-size: 88px; line-height: 2; }",
  });
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-layout", "document");
  await page.locator(".resource-link:last-child").scrollIntoViewIfNeeded();
  await expect(page.locator(".resource-link:last-child")).toBeInViewport();
  expect(await page.locator("[inert]").count()).toBe(0);
  await largerText.evaluate((style) => {
    if (style instanceof HTMLStyleElement) {
      style.remove();
    }
  });
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-scroll-layout", "pinned");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator("[data-home-page]")).toHaveAttribute("data-active-section", "opening");
  await expect(page.locator("#resources")).toHaveAttribute("inert", "");
});

test("small screens remain readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 700 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-home-page]")).toHaveCount(1);
  await page.locator(".resource-link:last-child").scrollIntoViewIfNeeded();
  await expect(page.locator(".resource-link:last-child")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
