import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: process.env.CI ? "list" : undefined,
  maxFailures: process.env.CI ? 3 : 0,
  // Hosted macOS renders this texture-heavy scene much more slowly than a local
  // GPU. Keep WebKit galleries sequential and budget for the complete room tour.
  workers: process.env.WEBKIT ? 1 : 2,
  timeout: process.env.WEBKIT ? 90000 : 30000,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4187",
    channel: process.env.EXHIBITION_BROWSER_CHANNEL || (process.env.WEBKIT ? undefined : "chromium"),
    trace: "retain-on-failure",
    launchOptions: { args: process.platform === "linux" ? ["--use-angle=swiftshader"] : [] },
  },
  projects: process.env.WEBKIT ? [{
    name: "webkit",
    testMatch: /launch\.spec\.ts/,
    use: { ...devices["iPhone 15"] },
  }] : [
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
  webServer: process.env.BASE_URL ? undefined : {
    command: "npm run preview -- --port 4187 --strictPort",
    url: "http://127.0.0.1:4187",
    reuseExistingServer: false,
  },
});
