import { test, expect } from "@playwright/test";

test.describe("GDPR Sub-Processor Notifications & Directory Claiming (QA-108)", () => {
  test("public portal allows subscribing to GDPR Art. 28(2) sub-processor change alerts", async ({ page }) => {
    await page.goto("/p/acme-saas");

    // Check subscribe button is visible
    const subscribeBtn = page.getByRole("button", { name: /Subscribe to Change Alerts/i }).first();
    await expect(subscribeBtn).toBeVisible();
    await subscribeBtn.click();

    // Verify modal appears
    await expect(page.getByRole("heading", { name: /Subscribe to Change Alerts/i })).toBeVisible();
    await expect(page.getByText("GDPR Article 28(2)").first()).toBeVisible();

    // Fill email and submit
    const emailInput = page.locator("input[type='email']");
    await emailInput.fill("privacy-auditor@partner-corp.com");

    const submitBtn = page.getByRole("button", { name: /Confirm Subscription/i });
    await submitBtn.click();

    // Expect success message
    await expect(page.getByText(/Subscribed!/i).first()).toBeVisible();
  });

  test("directory profile page displays official claim button with $199/mo tier", async ({ page }) => {
    await page.goto("/directory/openai");

    // Header profile
    await expect(page.locator("h1")).toContainText(/OpenAI/i);

    // Claim CTA card & button
    await expect(page.getByText(/Are you a representative of OpenAI\?/i)).toBeVisible();
    const claimBtn = page.getByRole("button", { name: /Claim Profile \(\$199\/mo\)/i });
    await expect(claimBtn).toBeVisible();
  });
});
