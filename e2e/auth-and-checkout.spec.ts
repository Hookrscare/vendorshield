import { test, expect } from "@playwright/test";

test.describe("Auth, Onboarding & Ecosystem Tools", () => {
  test("passwordless login (/login) displays authentication form with email validation", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("h1")).toContainText(/workspace/i);

    const emailInput = page.locator("input[type='email']");
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeVisible();

    // Verify invalid email submission is handled cleanly
    await emailInput.fill("invalid-email");
    await submitBtn.click();
    // HTML5 or app-level validation prevents submission or shows error
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test("tenant onboarding (/onboarding) renders organization setup form", async ({ page }) => {
    await page.goto("/onboarding");

    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("input").first()).toBeVisible();
  });

  test("free conversion tools render interactively", async ({ page }) => {
    // 1. Widget Generator
    await page.goto("/tools/widget-generator");
    await expect(page.locator("h1")).toContainText(/Sub-Processor Register/i);
    await expect(page.getByText("Dark Mode").first()).toBeVisible();

    // 2. SOC 2 Readiness Scorecard
    await page.goto("/tools/soc2-readiness");
    await expect(page.locator("h1")).toContainText(/SOC 2/i);

    // 3. Inspection Fee Calculator
    await page.goto("/tools/inspector-calculator");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // 4. Free Deepfake Scanner
    await page.goto("/tools/deepfake-scanner");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("multi-product portals (SnapInspect & Dispel) load correctly", async ({ page }) => {
    // SnapInspect
    await page.goto("/snapinspect");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Dispel Lens
    await page.goto("/dispel");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
