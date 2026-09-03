import { test, expect } from "@playwright/test";

test.describe("Responsive Design, A11y & Edge Cases", () => {
  test("homepage renders cleanly on mobile viewport (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Title and primary heading fit without breaking
    await expect(page.locator("h1")).toBeVisible();

    // Verify no horizontal document overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("dashboard adapts to mobile viewport without breaking layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("table, [role='table']").first()).toBeVisible();
  });

  test("unknown routes render custom not-found page gracefully", async ({ page }) => {
    const response = await page.goto("/non-existent-page-route-xyz");
    // Next.js custom not-found returns 404
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test("keyboard navigation: focus moves through interactive elements", async ({ page }) => {
    await page.goto("/");

    // Tab into the page and verify focused element
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "INPUT"]).toContain(focusedTag);
  });
});
