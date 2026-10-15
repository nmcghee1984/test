const { test, expect } = require("@playwright/test");

test("Ask UofG sends only the question to its API and does not persist chat", async ({ page }) => {
  let sentPayload;
  await page.route("**/api/assistant/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: true, provider: "OpenAI", model: "gpt-4.1-mini" }),
  }));
  await page.route("**/api/assistant", async (route) => {
    sentPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "The University support page explains where to find help.",
        status: "cited",
        sources: [{ title: "Student support", url: "https://www.gla.ac.uk/myglasgow/students/support/" }],
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Ask UofG AI assistant" }).click();
  await expect(page.getByText("AI connected · OpenAI")).toBeVisible();

  const question = page.getByRole("textbox", { name: "Type a question for the UofG website assistant" });
  await question.fill("Where can I find a quiet place to read?");

  await page.getByRole("button", { name: "Send question" }).click();

  await expect(page.getByText("Where can I find a quiet place to read?", { exact: true })).toBeVisible();
  await expect(page.getByText("The University support page explains where to find help.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open UofG source: Student support" })).toBeVisible();
  expect(sentPayload).toEqual({ question: "Where can I find a quiet place to read?" });

  await page.reload();
  await page.getByRole("button", { name: "Ask UofG AI assistant" }).click();
  await expect(page.getByText("Where can I find a quiet place to read?", { exact: true })).toHaveCount(0);
  await expect(question).toHaveValue("");
});

test("starter prompts are disabled until AI is configured and empty questions cannot be sent", async ({ page }) => {
  await page.route("**/api/assistant/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ configured: false, provider: "OpenAI", model: "gpt-4.1-mini" }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Ask UofG AI assistant" }).click();
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Where can I find wellbeing help?" })).toBeDisabled();
  await expect(page.getByText("AI prototype · setup required")).toBeVisible();
});

for (const bad of [
  { answer: 'UNSUPPORTED: tuition is free', sources: [] },
  { status: 'cited', answer: 'UNSUPPORTED: tuition is free', sources: [{ title: 'Verified', url: 'https://gla.ac.uk.evil.example/policy/' }] },
  { status: 'unverified', answer: 'UNSUPPORTED: tuition is free', sources: [{ title: 'Verified', url: 'https://www.gla.ac.uk/' }] },
]) test(`withholds unsupported response ${JSON.stringify(bad.sources)}`, async ({ page }) => {
  await page.route('**/api/assistant/status', route => route.fulfill({ json: { configured: true, provider: 'OpenAI' } }));
  await page.route('**/api/assistant', route => route.fulfill({ json: bad }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask UofG AI assistant' }).click();
  await page.getByRole('textbox', { name: 'Type a question for the UofG website assistant' }).fill('Are tuition fees waived?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Answer unverified · service signposting')).toBeVisible();
  await expect(page.getByText('UNSUPPORTED: tuition is free')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open University student services', exact: true })).toBeVisible();
});
