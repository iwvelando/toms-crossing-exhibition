import { test, expect } from "@playwright/test";

test("foyer requires consent and does not request collection content beforehand", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enter the exhibition" }),
  ).toBeDisabled();
  await expect(page.getByText("For those who have")).toBeVisible();
  expect(requests.filter((x) => x.includes("/collection/"))).toEqual([]);
  await page.getByLabel("I understand and want to enter.").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(
    page.getByRole("heading", { name: "Chamber 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Collection/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".art-card")).toHaveCount(5);
  await page.getByRole("button", { name: /Rear View/ }).click();
  await expect(page.getByRole("heading", { name: "Rear View" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close panel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Back to collection" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close panel" })).toBeFocused();
  await expect(
    page.getByText("Thane Moon (name as transcribed)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Enter the exhibition" }),
  ).toBeDisabled();
});

test("walking, direct visits, and inspection work without pointer lock", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-position", "0.00,6.70", { timeout: 15000 });
  if (testInfo.project.name === "desktop") {
    await canvas.focus();
    await page.keyboard.down("w");
    await page.waitForTimeout(300);
    await page.keyboard.up("w");
    await expect(canvas).not.toHaveAttribute("data-position", "0.00,6.70");
  }
  await page.getByRole("button", { name: "Next artwork" }).click();
  await expect(canvas).toHaveAttribute("data-position", "0.00,3.40");
  await expect(
    page.getByRole("button", { name: /Syrup glass.*inspect work/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Syrup glass.*inspect work/i }).click();
  await expect(
    page.getByRole("heading", { name: "Syrup glass" }),
  ).toBeVisible();
  await expect(
    page.getByText("Procedural 3D model created for this exhibition."),
  ).toBeVisible();
});

test("panels trap focus, escape closes, and layout fits", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /About/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close panel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await page.getByRole("button", { name: /Collection/ }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Where the words were/ }).click();
  await expect(
    page.getByRole("heading", { name: "Where the words were" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("collection remains usable without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return (original as Function).call(this, type, ...args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(
    page.getByText("3D is unavailable on this device."),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(page.locator(".art-card")).toHaveCount(5);
});

test("failed catalog request can be retried without bypassing the gate", async ({
  page,
}) => {
  await page.route("**/collection/catalog.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await expect(
    page.getByRole("button", { name: "Enter the exhibition" }),
  ).toBeEnabled();
  await page.unroute("**/collection/catalog.json");
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(
    page.getByRole("heading", { name: "Chamber 1", exact: true }),
  ).toBeVisible();
});


test("story filters preserve access and text can be enlarged on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => {
    const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1;
  }).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width })))).toEqual([]);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await page.getByRole("button", { name: /Collection/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("Browse by story grouping").selectOption("chamber-1");
  await expect(page.locator(".art-card")).toHaveCount(3);
  await page.getByLabel("Browse by story grouping").selectOption("across-moments");
  await expect(page.locator(".art-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Where the words were/ }).click();
  await expect(page.getByText(/Landry burns her diary/)).toBeVisible();
  const widths = await page.locator(".dialog, .work-copy").evaluateAll(els => els.map(el => ({
    scroll: el.scrollWidth, client: el.clientWidth,
  })));
  for (const width of widths) expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  expect(await page.getByText(/Landry burns her diary/).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(28);
  await page.getByRole("button", { name: "Back to collection" }).click();
  await expect(page.getByLabel("Browse by story grouping")).toHaveValue("across-moments");
  await page.getByLabel("Browse by story grouping").selectOption("all");
  await expect(page.locator(".art-card")).toHaveCount(5);
});


test("the gallery stops issuing GPU draw calls at rest and resumes for movement", async ({ page }) => {
  await page.addInitScript(() => {
    const counters = { draws: 0 };
    (window as unknown as { galleryTest: typeof counters }).galleryTest = counters;
    for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      (WebGL2RenderingContext.prototype[method] as Function) = function(this: WebGL2RenderingContext, ...args: unknown[]) {
        counters.draws++;
        return (original as Function).apply(this, args);
      };
    }
  });
  const draws = () => page.evaluate(() => (window as unknown as { galleryTest: { draws: number } }).galleryTest.draws);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);
  const foyer = await draws();
  expect(foyer).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(await draws()).toBe(foyer);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-loaded-images", "4", { timeout: 15000 });
  await page.waitForTimeout(300);
  const idle = await draws();
  expect(idle).toBeGreaterThan(foyer);
  await page.waitForTimeout(500);
  expect(await draws()).toBe(idle);
  await page.locator("canvas").focus();
  await page.keyboard.down("w");
  await expect.poll(draws).toBeGreaterThan(idle);
  await page.keyboard.up("w");
  await page.waitForTimeout(200);
  const stopped = await draws();
  await page.waitForTimeout(500);
  expect(await draws()).toBe(stopped);
  await page.getByRole("button", { name: /Collection/ }).click();
  await page.waitForTimeout(200);
  const panel = await draws();
  await page.waitForTimeout(500);
  expect(await draws()).toBe(panel);
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "Route", exact: true }).click();
  await page.getByLabel("Show planning placeholders").check();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.waitForTimeout(300);
  const planned = await draws();
  await page.waitForTimeout(500);
  expect(await draws()).toBe(planned);
});


test("touch controls suppress selection and cancelled holds stop moving", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch-specific behavior");
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  const control = page.getByRole("button", { name: "Move forward", exact: true });
  await expect(control).toHaveCSS("user-select", "none");
  await expect(control).toHaveCSS("touch-action", "none");
  expect(await control.evaluate(el => !el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })))).toBe(true);
  await expect(page.locator("canvas")).toHaveAttribute("data-position", "0.00,6.70", { timeout: 15000 });
  const bounds = await control.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width/2, bounds!.y + bounds!.height/2);
  await page.mouse.down();
  await expect(page.locator("canvas")).not.toHaveAttribute("data-position", "0.00,6.70");
  await control.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch" });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const stopped = await page.locator("canvas").getAttribute("data-position");
  await page.waitForTimeout(250);
  await expect(page.locator("canvas")).toHaveAttribute("data-position", stopped!);
  await page.getByRole("button", { name: "Next artwork" }).click();
  await expect(page.getByText("Tap to inspect work", { exact: true })).toBeVisible();
  await expect(page.locator(".keyboard-inspect")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  await page.screenshot({ path: "test-results/mobile-inspection.png" });
});

test("route reaches every chamber and planning placeholders can be inspected", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-planning", "false");
  for (const n of [2,3,4,5,1]) {
    await page.getByRole("button", { name: "Route", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`^${n}.*Chamber ${n}`) }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-room", `chamber-${n}`);
    await expect(page.getByRole("heading", { name: `Chamber ${n}`, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Route", exact: true }).click();
  await page.getByLabel("Show planning placeholders").check();
  await page.getByRole("button", { name: "Close panel" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText("Review reserved positions", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close panel" })).toBeFocused();
  if (testInfo.project.name === "desktop") await page.screenshot({ path: "test-results/route-plan.png" });
  await page.getByRole("button", { name: "Close panel" }).click();
  if (testInfo.project.name === "desktop") await page.screenshot({ path: "test-results/chamber-one.png" });
  await page.getByRole("button", { name: "Route", exact: true }).click();
  await page.getByText("Review reserved positions", { exact: true }).click();
  await page.getByRole("button", { name: "Wall panel · 001", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("dimensions and position are estimates");
  await page.getByRole("button", { name: "View reserved position" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-planning", "true");
  await expect(page.locator(".inspect-hint")).toContainText("Wall panel · 001");
  await page.locator(".inspect-hint").click();
  await expect(page.getByRole("heading", { name: "Wall panel · 001" })).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "Route", exact: true }).click();
  await page.getByLabel("Show planning placeholders").uncheck();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.locator(".inspect-hint")).toHaveCount(0);
  expect(errors).toEqual([]);
});


test("every installed image decodes in the collection and inspection panels", async ({page})=>{
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await page.getByRole("button",{name:/Collection/}).click();
  const images=page.locator(".art-card img");
  await expect(images).toHaveCount(4);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  for (const title of ["Rear View","At the canyon mouth","Comfort in company","Where the words were"]) {
    await page.getByRole("button",{name:new RegExp(title)}).click();
    await expect.poll(()=>page.locator(".work-image img").evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("button",{name:"Back to collection"}).click();
  }
});

test("a failed inspection image can be retried without losing its caption",async({page})=>{
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await page.getByRole("button",{name:/Collection/}).click();
  await page.route("**/collection/assets/rear-view-*.png",r=>r.abort());
  await page.getByRole("button",{name:/Rear View/}).click();
  await expect(page.getByRole("heading",{name:"Rear View"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Retry image"})).toBeVisible();
  await page.unroute("**/collection/assets/rear-view-*.png");
  await page.getByRole("button",{name:"Retry image"}).click();
  await expect.poll(()=>page.locator(".work-image img").evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});


test("wall-end sweep remains usable while moving and turning",async({page},info)=>{
  const errors: string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-loaded-images","4",{timeout:15000});
  const {width,height}=page.viewportSize()!;
  await page.mouse.move(width*.5,height*.45);await page.mouse.down();
  await page.mouse.move(width*.5-240,height*.45+160,{steps:12});await page.mouse.up();
  await page.locator("canvas").focus();await page.keyboard.down("w");await page.waitForTimeout(900);await page.keyboard.up("w");
  await page.waitForTimeout(150);
  if(info.project.name==="desktop") await page.screenshot({path:"test-results/wall-end-fixed.png"});
  for(const key of ["a","d","s"]) {await page.keyboard.down(key);await page.waitForTimeout(250);await page.keyboard.up(key);}
  expect(errors).toEqual([]);
});
