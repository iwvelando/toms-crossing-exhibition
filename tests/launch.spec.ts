import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const canonical = "https://toms-crossing-exhibition.isaacvelando.com/";
const rooms: { id: string; title: string }[] = JSON.parse(readFileSync(new URL("../public/collection/layout.json", import.meta.url), "utf8")).rooms;

test("@smoke launch metadata and crawler files describe only the foyer", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
  const title = await page.title();
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description!);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${canonical}og-image.png`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
  for (const [path, width, height] of [["og-image.png", 1200, 630], ["apple-touch-icon.png", 180, 180]] as const) {
    const image = await request.get(`/${path}`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    const bytes = await image.body();
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(width);
    expect(bytes.readUInt32BE(20)).toBe(height);
  }
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain(`Sitemap: ${canonical}sitemap.xml`);
  expect(await robots.text()).toContain("Disallow: /collection/");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const parsed = await page.evaluate(xml => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return {
      errors: document.querySelectorAll("parsererror").length,
      namespace: document.documentElement.namespaceURI,
      locations: [...document.querySelectorAll("loc")].map(node => node.textContent),
    };
  }, await sitemap.text());
  expect(parsed).toEqual({ errors: 0, namespace: "http://www.sitemaps.org/schemas/sitemap/0.9", locations: [canonical] });
});

test("@smoke production CSP preserves consent, entry and artwork inspection", async ({ page }) => {
  const violations: string[] = [];
  const requests: string[] = [];
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener("securitypolicyviolation", event => {
      (window as unknown as { cspViolations: string[] }).cspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });
  page.on("pageerror", error => violations.push(error.message));
  page.on("request", request => requests.push(request.url()));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Enter the exhibition" })).toBeDisabled();
  expect(requests.filter(url => url.includes("/collection/"))).toEqual([]);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(page.getByRole("heading", { name: "Chamber 1", exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: /Collection/ }).click();
  await expect(page.locator(".art-card")).toHaveCount(188);
  await page.getByLabel("Browse by story grouping").selectOption("chamber-1");
  await expect(page.locator(".art-card").first()).toBeVisible();
  await page.getByLabel("Browse by story grouping").selectOption("all");
  await expect(page.locator(".art-card")).toHaveCount(188);
  await page.locator(".art-card").filter({ has: page.getByRole("heading", { name: "Rear View", exact: true }) }).click();
  await expect(page.locator(".dialog img").first()).toBeVisible();
  await expect.poll(() => page.locator(".dialog img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
});

test("every room remains reachable and fits the viewport under the production CSP", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-room", "chamber-1", { timeout: 30000 });
  for (const room of rooms) {
    await page.getByRole("button", { name: "Route", exact: true }).click();
    await page.locator(".room-link").filter({ hasText: room.title }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-room", room.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test("the missing-page document keeps exhibition contrast and a foyer link", async ({ page }) => {
  await page.goto("/404.html");
  await expect(page.getByRole("link", { name: "Return to the exhibition foyer" })).toHaveAttribute("href", "/");
  expect(await page.locator("body").evaluate(body => getComputedStyle(body).backgroundColor)).toBe("rgb(16, 20, 19)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
