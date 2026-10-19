import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Catalog } from "../src/types";
const catalog: Catalog = JSON.parse(readFileSync(new URL("../public/collection/catalog.json", import.meta.url),"utf8"));
const illustrated = catalog.works.filter(w => w.image || w.referenceImage);


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
  ).toBeVisible({timeout:process.env.CI ? 45000 : 15000});
  await page.getByRole("button", { name: /Collection/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".art-card")).toHaveCount(catalog.works.length);
  await page.locator(".art-card").filter({has:page.getByRole("heading",{name:"Rear View",exact:true})}).click();
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
  await expect(canvas).toHaveAttribute("data-position", "0.00,6.70", { timeout: process.env.CI ? 45000 : 15000 });
  if (testInfo.project.name === "desktop") {
    await canvas.focus();
    await page.keyboard.down("w");
    try {
      await expect(canvas).not.toHaveAttribute("data-position", "0.00,6.70");
    } finally {
      await page.keyboard.up("w");
    }
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
    page.getByText(/Procedural 3D model created for this exhibition/),
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
  await expect(page.locator(".art-card")).toHaveCount(catalog.works.length);
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
  ).toBeVisible({ timeout: 15000 });
});


test("story filters preserve access and text can be enlarged on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
  expect(await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => {
    const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1;
  }).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width })))).toEqual([]);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter the exhibition" }).click();
  await page.getByRole("button", { name: /Collection/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("Browse by story grouping").selectOption("chamber-1");
  await expect(page.locator(".art-card")).toHaveCount(catalog.works.filter(w=>w.placement?.room==="chamber-1").length);
  await page.getByLabel("Browse by story grouping").selectOption("across-moments");
  await expect(page.locator(".art-card")).toHaveCount(catalog.works.filter(w=>w.placement?.room==="across-moments").length);
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
  await expect(page.locator(".art-card")).toHaveCount(catalog.works.length);
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
  await expect(page.locator("canvas")).toHaveAttribute("data-pending-images", "0", { timeout: 30000 });
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
  const control = page.getByRole("group", { name: "Movement joystick", exact: true });
  await expect(control).toBeVisible({timeout:15000});
  await expect(control).toHaveCSS("user-select", "none");
  await expect(control).toHaveCSS("touch-action", "none");
  expect(await control.evaluate(el => !el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })))).toBe(true);
  await expect(page.locator("canvas")).toHaveAttribute("data-position", "0.00,6.70", { timeout: 15000 });
  const bounds = await control.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width/2, bounds!.y + bounds!.height/2 - 35);
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
  await expect(page.locator("canvas")).toHaveAttribute("data-planning", "false",{timeout:15000});
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
  await page.getByRole("button", { name: "Wall panel · 043", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("dimensions and position are estimates");
  await page.getByRole("button", { name: "View reserved position" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-planning", "true");
  await expect(page.locator(".inspect-hint")).toContainText("Wall panel · 043");
  await page.locator(".inspect-hint").click();
  await expect(page.getByRole("heading", { name: "Wall panel · 043" })).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "Route", exact: true }).click();
  await page.getByLabel("Show planning placeholders").uncheck();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.locator(".inspect-hint")).toHaveCount(0);
  expect(errors).toEqual([]);
});


test("every installed image decodes in the collection and inspection panels", async ({page})=>{
  // The complete tour grows with the catalog; hosted macOS needs more time per work.
  test.setTimeout(Math.max(180000, illustrated.length * (process.env.CI ? 2000 : 500)));
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await page.getByRole("button",{name:/Collection/}).click();
  const images=page.locator(".art-card img");
  await expect(images).toHaveCount(illustrated.length);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  for (const work of illustrated) {
    await page.locator(".art-card").filter({has:page.getByRole("heading",{name:work.title,exact:true})}).click();
    await expect.poll(()=>page.locator(".work-image img").first().evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("button",{name:"Back to collection"}).click();
  }
});

test("a failed inspection image can be retried without losing its caption",async({page})=>{
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await page.getByRole("button",{name:/Collection/}).click();
  await page.route("**/collection/assets/rear-view-*.png",r=>r.abort());
  await page.locator(".art-card").filter({has:page.getByRole("heading",{name:"Rear View",exact:true})}).click();
  await expect(page.getByRole("heading",{name:"Rear View"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Retry image"})).toBeVisible();
  await page.unroute("**/collection/assets/rear-view-*.png");
  await page.getByRole("button",{name:"Retry image"}).click();
  await expect.poll(()=>page.locator(".work-image img").first().evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});


test("wall-end sweep remains usable while moving and turning",async({page},info)=>{
  const errors: string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-pending-images","0",{timeout:30000});
  const {width,height}=page.viewportSize()!;
  await page.mouse.move(width*.5,height*.45);await page.mouse.down();
  await page.mouse.move(width*.5-240,height*.45+160,{steps:12});await page.mouse.up();
  await page.locator("canvas").focus();await page.keyboard.down("w");await page.waitForTimeout(900);await page.keyboard.up("w");
  await page.waitForTimeout(150);
  if(info.project.name==="desktop") await page.screenshot({path:"test-results/wall-end-fixed.png"});
  for(const key of ["a","d","s"]) {await page.keyboard.down(key);await page.waitForTimeout(250);await page.keyboard.up(key);}
  expect(errors).toEqual([]);
});

 test("object references stay off the walls and art loading has a fixed graphics budget",async({page})=>{
  const requests: string[]=[]; page.on("request",r=>requests.push(r.url()));
  await page.goto("/");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  const canvas=page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-modeled-objects",String(catalog.works.filter(w=>w.object).length),{timeout:15000});
  await expect(canvas).toHaveAttribute("data-pending-images","0",{timeout:30000});
  expect(Number(await canvas.getAttribute("data-art-lights"))).toBeGreaterThan(100);
  expect(Number(await canvas.getAttribute("data-wall-lightmaps"))).toBeGreaterThan(10);
  expect(Number(await canvas.getAttribute("data-max-art-texture"))).toBeLessThanOrEqual(1024);
  const reference=catalog.works.find(w=>w.object)!.referenceImage!;
  expect(requests.some(url=>url.includes(reference))).toBe(false);
  const distant=catalog.works.find(w=>w.id==="comfort-in-company")!;
  expect(requests.some(url=>url.includes(distant.image!))).toBe(false);
  const initialCount=await canvas.getAttribute("data-loaded-images");
  await expect(canvas).toHaveAttribute("data-lighting","static");
  await page.getByRole("button",{name:/Collection/}).click();
  await page.locator(".art-card").filter({has:page.getByRole("heading",{name:"Syrup glass",exact:true})}).click();
  await expect(page.getByText(/Image reference ·/)).toBeVisible();
  await expect.poll(()=>page.locator(".work-image img").first().evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button",{name:"Back to collection"}).click();
  await page.locator(".art-card").filter({has:page.getByRole("heading",{name:distant.title,exact:true})}).click();
  await page.getByRole("button",{name:"View in the room"}).click();
  await expect(canvas).toHaveAttribute("data-room","chamber-2");
  await expect(canvas).toHaveAttribute("data-pending-images","0",{timeout:30000});
  await expect(page.locator(".inspect-hint")).toContainText(distant.title);
  expect(await canvas.getAttribute("data-loaded-images")).toBe(initialCount);
 });

 test("the montage retains panel order, boundaries and its nearby companion",async({page},info)=>{
  test.setTimeout(180000);
  const montage=catalog.works.find(w=>w.panels)!;
  const plan=JSON.parse(readFileSync(new URL("../public/collection/layout.json",import.meta.url),"utf8"));
  const first=plan.reservations.find((r:{workId:string})=>r.workId===montage.id);
  const companion=plan.reservations.find((r:{workId:string})=>r.workId==="wings-were-always-there");
  expect(first.room).toBe(companion.room);
  expect(Math.hypot(first.position[0]-companion.position[0],first.position[2]-companion.position[2])).toBeLessThanOrEqual(5);
  await page.goto("/");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await page.getByRole("button",{name:/Collection/}).click();
  await page.getByRole("button",{name:/12-image montage/}).click();
  await expect(page.getByRole("button",{name:"Previous montage image"})).toBeDisabled();
  await expect(page.locator(".sequence-thumbnails li")).toHaveCount(12);
  for (let i=0;i<montage.panels!.length;i++) {
    const panel=montage.panels![i];
    await expect(page.locator(".sequence-main img")).toHaveAttribute("src",`/collection/${panel.image}`);
    await expect.poll(()=>page.locator(".sequence-main img").evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("button",{name:`Image ${i+1}: ${panel.title}`,exact:true})).toHaveAttribute("aria-pressed","true");
    if(i<11) await page.getByRole("button",{name:"Next montage image"}).click();
  }
  await expect(page.getByRole("button",{name:"Next montage image"})).toBeDisabled();
  await page.getByRole("button",{name:"Image 1: Her Mother’s Soft Nose",exact:true}).click();
  await expect(page.getByRole("button",{name:"Previous montage image"})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if (info.project.name === "mobile") {
    expect(await page.locator(".work-image").evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    for (const thumb of await page.locator(".sequence-thumbnails button").all()) {
      const box=await thumb.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.screenshot({path:`test-results/montage-${info.project.name}.png`});
  await page.getByRole("button",{name:"View in the room"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-room","across-moments");
  await expect(page.locator(".inspect-hint")).toContainText(montage.title);
  await expect(page.locator("canvas")).toHaveAttribute("data-pending-images","0",{timeout:30000});
  await page.screenshot({path:`test-results/montage-wall-${info.project.name}.png`});
 });

 test("wall inscriptions use lettering in the passage and images only as references",async({page})=>{
  const inscriptions=catalog.works.filter(w=>w.wallText);
  expect(inscriptions.length).toBeGreaterThan(0);
  const requests: string[]=[];page.on("request",r=>requests.push(r.url()));
  await page.goto("/");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-wall-inscriptions",String(inscriptions.length),{timeout:15000});
  await expect(page.locator("canvas")).toHaveAttribute("data-pending-images","0",{timeout:30000});
  for (const work of inscriptions) expect(requests.some(url=>url.includes(work.image!))).toBe(false);
  for (const work of inscriptions) {
    await page.getByRole("button",{name:/Collection/}).click();
    await page.locator(".art-card").filter({has:page.getByRole("heading",{name:work.title,exact:true})}).click();
    await expect(page.getByText(/The passage displays the wording directly/)).toBeVisible();
    await expect.poll(()=>page.locator(".work-image img").evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("button",{name:"View in the room"}).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-room",work.placement!.room);
    const roomName=work.placement!.room.startsWith("passage-") ? "Passage" : "Afterimages";
    await expect(page.getByRole("heading",{name:roomName,exact:true})).toBeVisible();
    await expect(page.locator(".inspect-hint")).toContainText(work.title);
    await page.locator(".inspect-hint").click();
    await expect(page.getByRole("heading",{name:work.title,exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Close panel"}).click();
  }
 });


test("M captures and releases the pointer with unlimited relative movement",async({page},info)=>{
  test.skip(info.project.name!=="desktop","Desktop control");
  if (!process.env.EXHIBITION_NATIVE_POINTER_LOCK) {
    // Chromium's headless shell rejects native capture. Exercise the event contract
    // here; EXHIBITION_NATIVE_POINTER_LOCK=1 runs these same assertions in a real window.
    await page.addInitScript(()=>{
      let locked: Element | null = null;
      Object.defineProperty(document,"pointerLockElement",{get:()=>locked});
      Element.prototype.requestPointerLock=function(){
        locked=this;queueMicrotask(()=>document.dispatchEvent(new Event("pointerlockchange")));
        return Promise.resolve();
      };
      document.exitPointerLock=()=>{locked=null;queueMicrotask(()=>document.dispatchEvent(new Event("pointerlockchange")));};
    });
  }
  await page.goto("/");
  await page.keyboard.press("m");
  await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Enter the exhibition"}).click();
  const canvas=page.locator("canvas"),status=page.locator(".mouse-look-status");
  await expect(canvas).toHaveAttribute("data-position","0.00,6.70",{timeout:20000});
  await expect(status).toHaveText("Mouse look off · M to capture");
  await expect(page.getByRole("button",{name:/Mouse look/})).toHaveCount(0);
  await page.bringToFront();
  await page.mouse.move(650,480);const initial=await canvas.getAttribute("data-look");
  await page.mouse.move(750,480);await expect(canvas).toHaveAttribute("data-look",initial!);
  await page.keyboard.down("m");
  await expect(status).toHaveText("Mouse look on · M to release · Esc also releases");
  await page.keyboard.down("m"); // Holding the shortcut must not repeatedly toggle it.
  await page.keyboard.up("m");
  await expect(status).toContainText("Mouse look on");
  await expect(canvas).toHaveAttribute("data-look",initial!);
  await expect.poll(()=>canvas.evaluate(el=>document.pointerLockElement===el)).toBe(true);
  // Repeated relative movement still turns even when absolute coordinates never move.
  await canvas.evaluate(el=>{
    for(let i=0;i<20;i++)el.dispatchEvent(new PointerEvent("pointermove",{pointerType:"mouse",clientX:1439,clientY:480,movementX:100,movementY:0}));
  });
  await expect.poll(async()=>Number((await canvas.getAttribute("data-look"))!.split(",")[0])).toBeCloseTo(Number(initial!.split(",")[0])-5.2,2);
  await page.keyboard.press("m");await expect(status).toHaveText("Mouse look off · M to capture");
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
  const stopped=await canvas.getAttribute("data-look");await page.mouse.move(650,480);await expect(canvas).toHaveAttribute("data-look",stopped!);
  await page.keyboard.press("Control+m");await expect(status).toContainText("Mouse look off");
  await page.getByRole("button",{name:"How to explore"}).click();
  await page.keyboard.press("m");await page.keyboard.press("Escape");
  await expect(status).toContainText("Mouse look off");
  await page.locator("canvas").evaluate(el=>{el.setAttribute("contenteditable","true");el.focus();});
  await page.keyboard.press("m");await expect(status).toContainText("Mouse look off");
  await page.locator("canvas").evaluate(el=>el.removeAttribute("contenteditable"));
  await page.keyboard.press("m");await expect(status).toContainText("Mouse look on");
  // Browser-driven release (Escape, tab switching) must update the UI too.
  await page.evaluate(()=>document.exitPointerLock());await expect(status).toContainText("Mouse look off");
  await page.keyboard.press("m");await expect(status).toContainText("Mouse look on");
  await page.getByRole("button",{name:"How to explore"}).evaluate(el=>(el as HTMLButtonElement).click());
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
  await page.keyboard.press("Escape");await expect(status).toContainText("Mouse look off");
  await page.getByRole("button",{name:"Next artwork"}).click();
  await expect(page.locator(".inspect-hint")).toContainText("Syrup glass");
  await page.keyboard.press("m");await expect(status).toContainText("Mouse look on");
  // Captured clicks inspect the crosshair target, not stale absolute cursor coordinates.
  await canvas.dispatchEvent("pointerdown",{pointerType:"mouse",pointerId:1,clientX:1,clientY:1});
  await canvas.dispatchEvent("pointerup",{pointerType:"mouse",pointerId:1,clientX:1,clientY:1});
  await expect(page.getByRole("heading",{name:"Syrup glass",exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
});

test("rejected mouse capture stays off and preserves drag mode",async({page},info)=>{
  test.skip(info.project.name!=="desktop","Desktop control");
  await page.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.reject(new Error("Capture blocked"));});
  await page.goto("/");await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Enter the exhibition"}).click();
  const canvas=page.locator("canvas");await expect(canvas).toHaveAttribute("data-position","0.00,6.70",{timeout:20000});
  await page.keyboard.press("m");await expect(page.locator(".mouse-look-status")).toContainText("Mouse capture unavailable");
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
  const initial=await canvas.getAttribute("data-look");
  await page.mouse.move(650,480);await page.mouse.down();await page.mouse.move(750,480);await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-look",initial!);
});

test("route map contains every room and the open mesh is inspectable from its viewpoint",async({page})=>{
  await page.goto("/");await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await page.getByRole("button",{name:"Route",exact:true}).click();
  expect(await page.locator(".route-map").evaluate(svg=>{
    const box=(svg as SVGSVGElement).viewBox.baseVal;
    return [...svg.querySelectorAll("rect")].every(rect=>rect.x.baseVal.value>=box.x && rect.y.baseVal.value>=box.y && rect.x.baseVal.value+rect.width.baseVal.value<=box.x+box.width && rect.y.baseVal.value+rect.height.baseVal.value<=box.y+box.height);
  })).toBe(true);
  await expect(page.locator(".route-map title")).toHaveCount(10);
  await page.getByRole("button",{name:"Close panel"}).click();
  await page.getByRole("button",{name:/Collection/}).click();
  await page.locator(".art-card").filter({has:page.getByRole("heading",{name:"Mesh",exact:true})}).click();
  await page.getByRole("button",{name:"View in the room"}).click();
  await expect(page.locator(".inspect-hint")).toContainText("Mesh");
  await page.locator(".inspect-hint").click();await expect(page.getByRole("heading",{name:"Mesh",exact:true})).toBeVisible();
});

test("failed scene preparation keeps the foyer closed and can be retried",async({page})=>{
  await page.route("**/collection/previews/*.webp",route=>route.abort());
  await page.goto("/");await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await expect(page.getByRole("alert")).toContainText("preview could not be loaded");
  await expect(page.getByRole("heading",{name:"Chamber 1",exact:true})).toHaveCount(0);
  await page.unroute("**/collection/previews/*.webp");await page.getByRole("button",{name:"Enter the exhibition"}).click();
  await expect(page.getByRole("heading",{name:"Chamber 1",exact:true})).toBeVisible({timeout:20000});
});
