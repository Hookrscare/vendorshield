import { test, expect } from "@playwright/test";

test.describe("Core Public Journeys", () => {
  test("homepage loads and displays hero, value propositions, and pricing", async ({ page }) => {
    await page.goto("/");

    // Verify main page title and hero presence
    await expect(page).toHaveTitle(/VendorShield/i);
    await expect(page.locator("h1")).toBeVisible();

    // Verify CTA to directory or dashboard
    const exploreCta = page.locator("a[href*='/dashboard'], a[href*='/directory']").first();
    await expect(exploreCta).toBeVisible();

    // Verify Pricing tiers are present
    const pricingSection = page.locator("#pricing").or(page.getByRole("heading", { name: /pricing/i })).first();
    await expect(pricingSection).toBeVisible();
  });

  test("programmatic SEO directory allows searching and filtering vendors", async ({ page }) => {
    await page.goto("/directory");

    // Header and search bar exist
    await expect(page.locator("h1")).toContainText(/Sub-Processor/i);
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await expect(searchInput).toBeVisible();

    // Type a query and verify filtering
    await searchInput.fill("OpenAI");
    await expect(page.locator("text=OpenAI").first()).toBeVisible();

    // Click through to OpenAI profile
    const openAiLink = page.locator("a[href='/directory/openai']").first();
    await expect(openAiLink).toBeVisible();
    await openAiLink.click();

    // Verify profile page loaded
    await expect(page).toHaveURL(/\/directory\/openai/);
    await expect(page.locator("h1")).toContainText(/OpenAI/i);
    await expect(page.locator("text=SOC 2").first()).toBeVisible();
  });

  test("public sub-processor disclosure page (/p/[slug]) renders verified register", async ({ page }) => {
    await page.goto("/p/acme-saas");

    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("text=Sub-Processor").first()).toBeVisible();

    // Verify vendor cards appear
    await expect(page.locator("h3, .font-bold").first()).toBeVisible();
    await expect(page.locator("text=Data Scope Processed").first()).toBeVisible();
  });

  test("public iframe embed widget (/embed/[slug]) renders cleanly", async ({ page }) => {
    await page.goto("/embed/acme-saas");

    // Verify clean embed view without main site navbars
    await expect(page.locator("nav").first()).not.toBeVisible();
    await expect(page.locator("text=Sub-Processor").first()).toBeVisible();
    await expect(page.locator("table, [role='table']").first()).toBeVisible();
  });
});
