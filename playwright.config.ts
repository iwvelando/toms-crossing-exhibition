import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4187",
    channel: process.env.EXHIBITION_BROWSER_CHANNEL || undefined,
    trace: "retain-on-failure",
    launchOptions: { args: ["--use-angle=swiftshader"] },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4187 --strictPort",
    url: "http://127.0.0.1:4187",
    reuseExistingServer: false,
  },
});
