const { test, expect } = require("@playwright/test");

test("unconnected events never present demo cards and link to the official source", async ({ page }) => {
  const universityRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("gla.ac.uk")) universityRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Events" }).click();
  await expect(page.getByRole("heading", { name: "Event data unavailable" })).toBeVisible();
  await expect(page.getByText("No event data is cached.", { exact: false })).toBeVisible();
  await expect(page.getByText("0 EVENTS", { exact: true })).toBeVisible();
  for (const title of ["Gilmorehill After Hours", "Tech & Innovation Careers Fair", "Mindful Campus Walk"]) {
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
  await page.getByRole("textbox", { name: "Search events" }).fill("careers");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("button", { name: "♥ Saved only" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "All upcoming", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next 7 days" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Event data unavailable" })).toBeVisible();
  expect(universityRequests.filter((url) => url.includes("/events/"))).toEqual([]);
  await page.context().route("https://www.gla.ac.uk/events/listings/", (route) => route.fulfill({ body: "Official listings" }));
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Browse official University events" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://www.gla.ac.uk/events/listings/");
  await popup.close();
  await page.reload();
  await page.getByRole("tab", { name: "Events" }).click();
  await expect(page.getByRole("heading", { name: "Event data unavailable" })).toBeVisible();
  await expect(page.getByText("0 EVENTS", { exact: true })).toBeVisible();
});
