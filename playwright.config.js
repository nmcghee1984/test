const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:8093",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node server/e2e-api.js",
      url: "http://127.0.0.1:8789/api/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "npx expo start --web --port 8093",
      url: "http://127.0.0.1:8093",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        CI: "1",
        EXPO_PUBLIC_DISCOVERY_API_URL: "http://127.0.0.1:8789",
      },
    },
  ],
});
