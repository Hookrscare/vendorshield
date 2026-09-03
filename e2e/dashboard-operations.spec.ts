import { test, expect } from "@playwright/test";

test.describe("Dashboard & Compliance Operations", () => {
  test("dashboard renders vendor register, summary statistics, and filters", async ({ page }) => {
    await page.goto("/dashboard");

    // Header title
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Stats cards (Active Sub-Processors, Signed DPAs, High Risk, etc.)
    await expect(page.locator("text=Active Sub-Processors").first()).toBeVisible();

    // Table presence
    const vendorRows = page.locator("table tbody tr");
    await expect(vendorRows.first()).toBeVisible();

    // Search functionality in dashboard
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("AWS");
      await page.waitForTimeout(300);
      await expect(page.locator("text=Amazon Web Services").first()).toBeVisible();
    }
  });

  test("audit export center (/dashboard/audit-export) provides report downloads", async ({ page }) => {
    await page.goto("/dashboard/audit-export");

    await expect(page.locator("h1")).toContainText(/Audit Export/i);

    // Verify export action buttons exist
    const pdfButton = page.locator("button:has-text('PDF')").first();
    const csvButton = page.locator("button:has-text('CSV')").first();
    const jsonButton = page.locator("button:has-text('JSON')").first();

    await expect(pdfButton).toBeVisible();
    await expect(csvButton).toBeVisible();
    await expect(jsonButton).toBeVisible();

    // Verify compliance checklist is visible
    await expect(page.locator("text=Pre-Audit Due Diligence Checklist")).toBeVisible();
  });

  test("embed code center (/dashboard/embed-code) renders live iframe preview and copy controls", async ({ page }) => {
    await page.goto("/dashboard/embed-code");

    await expect(page.locator("h1")).toContainText(/Embed/i);

    // Customizer controls
    await expect(page.locator("text=Color Theme").first()).toBeVisible();
    await expect(page.locator("text=Widget Height").first()).toBeVisible();

    // Code snippet box
    const snippetBox = page.locator("pre").first();
    await expect(snippetBox).toBeVisible();
    await expect(snippetBox).toContainText(/iframe/i);

    // Live iframe preview
    const iframe = page.locator("iframe").first();
    await expect(iframe).toBeVisible();
  });

  test("AI scanner center (/dashboard/ai-scanner) loads contract analysis UI", async ({ page }) => {
    await page.goto("/dashboard/ai-scanner");

    await expect(page.locator("h1")).toContainText(/DPA.*Contract Scanner/i);
  });
});
