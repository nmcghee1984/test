const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("@playwright/test");

const screens = [
  { tab: "Home" },
  { tab: "Timetable" },
  { tab: "Map" },
  { tab: "Study" },
  { tab: "Discover" },
  { tab: "Events" },
];

async function scanCurrentScreen(page, name) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      elements: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
    `Accessibility violations on ${name}`,
  ).toEqual([]);
}

test("all primary screens pass automated WCAG 2.2 A/AA accessibility checks", async ({ page }) => {
  await page.goto("/");
  for (const screen of screens) {
    if (screen.tab !== "Home") {
      await page.getByRole("tab", { name: screen.tab }).click();
    }
    await expect(page.getByRole("tab", { name: screen.tab })).toHaveAttribute("aria-selected", "true");
    await scanCurrentScreen(page, screen.tab);
  }

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await scanCurrentScreen(page, "Settings");
});

test("campus map pins and directory can be selected with a keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Map" }).click();

  const marker = page.locator("path.leaflet-interactive[role='button']").nth(1);
  await expect(marker).toHaveAttribute("tabindex", "0");
  await expect(marker).toHaveAttribute("aria-pressed", "false");
  await marker.focus();
  await page.keyboard.press("Enter");
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await expect(marker).toBeFocused();

  const library = page.getByRole("button", { name: /University Library/ }).last();
  await library.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("University Library", { exact: true }).first()).toBeVisible();
});

test("text-size and high-contrast preferences affect the whole app and persist", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  const nameField = page.getByRole("textbox", { name: "Name shown on the home screen" });
  await expect(nameField).toHaveCSS("font-size", "16px");
  await page.getByRole("switch", { name: "Larger text" }).click();
  await expect(nameField).toHaveCSS("font-size", "18.88px");

  await page.getByRole("switch", { name: "Higher contrast" }).click();
  await expect(page.getByText("Increase text size across the app.")).toHaveCSS("color", "rgb(23, 48, 71)");
  await page.reload();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("switch", { name: "Larger text" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("switch", { name: "Higher contrast" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("tab", { name: "Discover" }).click();
  await expect(page.getByRole("textbox", { name: "Search public research records" })).toHaveCSS("font-size", "18.88px");
});

test("Ask UofG prototype clearly discloses its limits and passes automated accessibility checks", async ({ page }) => {
  await page.route("**/api/assistant/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, provider: "OpenAI", model: "gpt-4.1-mini" }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Ask UofG AI assistant" }).click();
  await expect(page.getByRole("heading", { name: "Ask UofG" })).toBeVisible();
  await expect(page.getByText("AI prototype · setup required")).toBeVisible();
  await scanCurrentScreen(page, "Ask UofG");
});
