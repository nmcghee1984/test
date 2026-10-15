const { test, expect } = require("@playwright/test");

async function openDiscover(page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Discover" }).click();
  await expect(page.getByText("Discover Glasgow", { exact: true })).toBeVisible();
}

test("discovery search, explainable recommendations and local bookmarks persist", async ({ page }) => {
  await openDiscover(page);
  await expect(page.getByText("30 indexed records")).toBeVisible();

  const search = page.getByRole("textbox", { name: "Search public research records" });
  await search.fill("climate");
  const title = page.getByText("University research example 0: Climate resilience across Glasgow campuses", { exact: true });
  await expect(title).toBeVisible();
  await expect(page.getByText("1 found · CACHED")).toBeVisible();

  await page.getByRole("button", { name: "+ climate" }).click();
  await expect(page.getByText("Recommended for you", { exact: true })).toBeVisible();
  await expect(page.getByText("Recommended because it matches: climate")).toBeVisible();

  await page.getByRole("button", { name: /Save University research example 0:/ }).first().click();
  await expect(page.getByRole("button", { name: /Remove University research example 0:.*from saved research/ })).toHaveCount(2);
  await expect(page.getByText("Saved research", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: "Discover" }).click();
  await expect(page.getByRole("button", { name: "Remove interest climate" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove University research example 0:.*from saved research/ })).toHaveCount(1);
  await expect(page.getByText("University research example 0: Climate resilience across Glasgow campuses", { exact: true }).first()).toBeVisible();
});

test("search source filters and bounded pagination show accurate results", async ({ page }) => {
  await openDiscover(page);
  const search = page.getByRole("textbox", { name: "Search public research records" });
  await search.fill("university research example");
  await expect(page.getByText("30 found · CACHED")).toBeVisible();
  await expect(page.getByText("University research example 0: Climate resilience across Glasgow campuses", { exact: true })).toBeVisible();
  await expect(page.getByText("University research example 29", { exact: true })).toHaveCount(0);

  const nextPageResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/discover"
      && url.searchParams.get("cursor") === "25"
      && response.status() === 200;
  });
  await page.getByRole("button", { name: "Load more records" }).click();
  const response = await nextPageResponse;
  const responseBody = await response.json();
  expect(responseBody.records).toHaveLength(5);
  expect(responseBody.records.some((record) => record.title === "University research example 29")).toBe(true);
  await expect(page.getByText("University research example 29", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load more records" })).toHaveCount(0);

  await page.getByRole("button", { name: "Research Data · off" }).click();
  await expect(page.getByText("0 found · UNAVAILABLE")).toBeVisible();
  await expect(page.getByText("No matching public records found.")).toBeVisible();
  await page.getByRole("button", { name: "All sources" }).click();
  await expect(page.getByText("30 found · CACHED")).toBeVisible();
});

test("cached search and source status remain available when the API goes offline", async ({ page }) => {
  await openDiscover(page);
  const title = page.getByText("University research example 0: Climate resilience across Glasgow campuses", { exact: true });
  await expect(title).toBeVisible();
  await expect(page.getByText("30 indexed records")).toBeVisible();

  await page.route("**/api/**", (route) => route.abort());
  await page.reload();
  await page.getByRole("tab", { name: "Discover" }).click();
  await expect(page.getByText("30 indexed records")).toBeVisible();
  await expect(page.getByText("University research example 0: Climate resilience across Glasgow campuses", { exact: true })).toBeVisible();
  await expect(page.getByText("30 found · CACHED")).toBeVisible();
});

test("API outage without a cache is explicit and the search can be retried", async ({ page }) => {
  await page.route("**/api/**", (route) => route.abort());
  await openDiscover(page);
  await expect(page.getByText(/Tap to retry/)).toBeVisible();
  await expect(page.getByText("Discovery service", { exact: true })).toBeVisible();

  await page.unroute("**/api/**");
  await page.getByText(/Tap to retry/).click();
  await expect(page.getByText("30 found · CACHED")).toBeVisible();
  await page.getByText("Refresh", { exact: true }).click();
  await expect(page.getByText("30 indexed records")).toBeVisible();
});
