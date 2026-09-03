import { test, expect } from "@playwright/test";

test.describe("Team & Seat Management (QA-107)", () => {
  test("team management page renders member roster and role permissions", async ({ page }) => {
    await page.goto("/dashboard/team");

    // Header & breadcrumbs
    await expect(page.locator("h1")).toContainText(/Team Members & Roles/i);
    await expect(page.locator("text=Active Members").first()).toBeVisible();

    // Table presence
    const table = page.locator("table");
    await expect(table.first()).toBeVisible();

    // Sample members rendered
    await expect(page.getByText("Sarah Jenkins").first()).toBeVisible();
    await expect(page.getByText("Owner").first()).toBeVisible();

    // Role permissions reference card
    await expect(page.locator("text=Role Permissions Summary")).toBeVisible();
    await expect(page.locator("text=Admin / Owner").first()).toBeVisible();
  });

  test("dashboard links directly to team management center", async ({ page }) => {
    await page.goto("/dashboard");

    // Click Team link in navigation
    const teamLink = page.locator("a[href='/dashboard/team']").first();
    await expect(teamLink).toBeVisible();
    await teamLink.click();

    // Verifies navigation to /dashboard/team
    await expect(page).toHaveURL(/\/dashboard\/team/);
    await expect(page.locator("h1")).toContainText(/Team Members & Roles/i);
  });
});
