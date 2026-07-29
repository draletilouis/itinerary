import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const runId = process.env.E2E_RUN_ID ?? Date.now().toString();
const customerName = `E2E Customer ${runId}`;
const tourName = `E2E Uganda Journey ${runId}`;
const supplierName = `E2E Supplier ${runId}`;
const categoryName = `E2E Category ${runId}`;

async function assertHealthyPage(page: Page) {
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  await expect(page.locator("body")).not.toContainText("Application error");
}

async function login(page: Page) {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to an active test account.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe.serial("Hineni complete operational journey", () => {
  test("login and verify production currency configuration", async ({ page }) => {
    await login(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByLabel("Reporting currency").locator("option")).toHaveCount(7);
    await expect(page.getByLabel("From")).toContainText("USD");
    await expect(page.getByLabel("To")).toContainText("UGX");
    await assertHealthyPage(page);
  });

  test("manage internal accounts", async ({ page }) => {
    await login(page);
    await page.goto("/settings");
    await page.getByLabel("Full name").last().fill(`E2E User ${runId}`);
    await page.getByLabel("Email").last().fill(`e2e-user-${runId}@hineni.test`);
    await page.getByLabel("Temporary password").fill("Hineni-E2E-2026!");
    await page.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByText(`e2e-user-${runId}@hineni.test`)).toBeVisible();
  });

  test("configure supplier category, supplier, and rate", async ({ page }) => {
    await login(page);
    await page.goto("/suppliers");
    await page.getByPlaceholder("Category name, e.g. Accommodation").fill(categoryName);
    await page.getByPlaceholder("What suppliers in this category provide").fill("Automated E2E services");
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText(categoryName, { exact: false })).toBeVisible();

    const supplierForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Create supplier" }) });
    await supplierForm.locator('[name="name"]').fill(supplierName);
    await supplierForm.locator('[name="categoryId"]').selectOption({ label: categoryName });
    await supplierForm.locator('[name="phone"]').fill("+256700000999");
    await supplierForm.locator('[name="preferredCurrencyCode"]').selectOption("USD");
    await supplierForm.getByRole("button", { name: "Create supplier" }).click();
    await expect(page.getByRole("heading", { name: supplierName })).toBeVisible();

    const card = page.locator("article").filter({ hasText: supplierName });
    await card.getByText("Add service rate").click();
    await card.locator('[name="service"]').fill("E2E airport transfer");
    await card.locator('[name="unit"]').fill("vehicle");
    await card.locator('[name="amount"]').fill("75");
    await card.locator('[name="currencyCode"]').selectOption("USD");
    await card.locator('[name="startDate"]').fill("2026-01-01");
    await card.getByRole("button", { name: "Save rate" }).click();
    await expect(card.getByText("E2E airport transfer")).toBeVisible();
  });

  test("create customer and enquiry", async ({ page }) => {
    await login(page);
    await page.goto("/customers/new");
    await page.getByLabel("Full name").fill(customerName);
    await page.getByLabel("Phone").fill("+256700001111");
    await page.getByLabel("Email").fill(`customer-${runId}@example.test`);
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page.getByRole("heading", { name: customerName })).toBeVisible();

    await page.goto("/enquiries/new");
    const customerOption = page.getByLabel("Customer").locator("option").filter({ hasText: customerName });
    await page.getByLabel("Customer").selectOption((await customerOption.getAttribute("value"))!);
    await page.getByLabel("Proposed start").fill("2026-10-10");
    await page.getByLabel("Proposed end").fill("2026-10-12");
    await page.getByLabel("Adults").fill("2");
    await page.getByLabel("Destinations of interest").fill("Bwindi");
    await page.getByLabel("Customer budget").fill("3000");
    await page.getByLabel("Budget currency").selectOption("USD");
    await page.getByRole("button", { name: "Create enquiry" }).click();
    await expect(page.getByText(customerName, { exact: false })).toBeVisible();
  });

  test("create tour, publish itinerary, cost, quote, accept, and book", async ({ page }) => {
    await login(page);
    await page.goto("/tours/new?mode=direct");
    const existingCustomerOption = page.getByLabel("Existing customer").locator("option").filter({ hasText: customerName });
    await page.getByLabel("Existing customer").selectOption((await existingCustomerOption.getAttribute("value"))!);
    await page.getByLabel("Tour name").fill(tourName);
    await page.getByLabel("Start date").fill("2026-10-10");
    await page.getByLabel("End date").fill("2026-10-12");
    await page.getByLabel("Adults").fill("2");
    await page.getByLabel("Children").fill("0");
    await page.getByLabel("Costing currency").selectOption("USD");
    await page.getByLabel("Quotation currency").selectOption("USD");
    await page.getByRole("button", { name: "Create tour and open workspace" }).click();
    await expect(page.getByRole("heading", { name: tourName })).toBeVisible();
    const tourId = new URL(page.url()).pathname.split("/")[2];

    await page.getByRole("link", { name: /Complete and publish itinerary/ }).click();
    await page.getByLabel("Introduction").fill("Automated end-to-end itinerary");
    await page.getByLabel("Inclusions, one per line").fill("Transport\nAccommodation");
    await page.getByRole("button", { name: "Save itinerary details" }).click();
    await page.getByRole("button", { name: /Publish version/ }).click();
    await expect(page.getByText("published", { exact: true })).toBeVisible();


    await page.goto(`/tours/${tourId}/costing`);
    await page.getByText("Add cost item").click();
    await page.getByLabel("Description").fill("E2E ground services");
    await page.getByLabel("Rate per room/night").fill("1000");
    await page.getByLabel("Rooms").fill("1");
    await page.getByLabel("Nights").fill("1");
    await page.getByLabel("Currency").selectOption("USD");
    await page.getByRole("button", { name: "Add cost item" }).click();
    await expect(page.getByText("E2E ground services")).toBeVisible();
    await page.getByLabel("Markup method").selectOption("PERCENTAGE");
    await page.getByLabel("Markup or target value").fill("20");
    await page.getByRole("button", { name: "Save pricing revision" }).click();

    await page.goto(`/tours/${tourId}/quotation`);
    await page.getByRole("button", { name: "Generate immutable quotation" }).click();
    await expect(page).toHaveURL(/\/quotations\//);
    await page.getByRole("button", { name: "Mark sent" }).click();
    await page.getByRole("button", { name: "Accept quotation" }).click();
    await expect(page).toHaveURL(/\/bookings\//);
    await expect(page.getByText("Accepted quotation")).toBeVisible();
  });

  test("all operational and reporting workspaces render", async ({ page }) => {
    await login(page);
    for (const route of ["/dashboard", "/operations", "/resources", "/documents", "/finance", "/reports", "/notifications", "/settings/audit"]) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/login/);
      await assertHealthyPage(page);
    }
  });
});