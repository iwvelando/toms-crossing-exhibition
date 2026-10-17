import { chromium } from "@playwright/test";
import { preview } from "vite";
import { readFileSync } from "node:fs";

const server = await preview({ preview: { host: "127.0.0.1", port: 4174, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:4174/");
  const icon = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
  await page.evaluate((svg) => {
    const title = document.title;
    document.body.replaceChildren();
    const card = document.createElement("main");
    card.style.cssText = "width:1200px;height:630px;background:radial-gradient(ellipse at 50% 40%,#30372f,#101413 70%);color:#e8dfc9;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;font-family:Georgia,serif;box-sizing:border-box;border:1px solid #716b56";
    card.innerHTML = svg;
    const drawing = card.querySelector("svg");
    drawing.style.cssText = "width:260px;height:260px;margin:0 0 24px";
    drawing.querySelector("rect").setAttribute("fill", "none");
    const heading = document.createElement("h1");
    heading.textContent = title.split(" — ")[0];
    heading.style.cssText = "font-size:58px;font-weight:400;letter-spacing:4px;margin:0 0 18px";
    const subtitle = document.createElement("p");
    subtitle.textContent = title.split(" — ")[1];
    subtitle.style.cssText = "font:16px system-ui;letter-spacing:5px;text-transform:uppercase;margin:0";
    card.append(heading, subtitle);
    document.body.append(card);
    document.body.style.cssText = "margin:0";
  }, icon);
  await page.screenshot({ path: "public/og-image.png" });
  await page.setViewportSize({ width: 180, height: 180 });
  await page.evaluate(svg => {
    document.body.innerHTML = svg;
    document.body.style.cssText = "margin:0;background:#101413;width:180px;height:180px";
    document.querySelector("svg").style.cssText = "width:180px;height:180px;display:block";
  }, icon);
  await page.screenshot({ path: "public/apple-touch-icon.png" });
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
