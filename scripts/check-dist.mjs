import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

export function checkDist(directory) {
  const root = directory instanceof URL ? fileURLToPath(directory) : directory;
  function inspect(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || /^(?:AGENTS\.md|CLAUDE\.md|.*\.(?:zip|pem|key|map))$/i.test(entry.name)) {
        throw new Error(`Private or source artifact in distribution: ${entry.name}`);
      }
      if (entry.isDirectory()) inspect(join(path, entry.name));
    }
  }
  inspect(root);
  for (const file of ["index.html", "404.html", "404.css", "robots.txt", "sitemap.xml", "favicon.svg", "og-image.png", "apple-touch-icon.png", "THIRD_PARTY_NOTICES.txt", "collection/catalog.json", "collection/layout.json", "collection/scene-assets.json"]) {
    if (!existsSync(join(root, file)) || !statSync(join(root, file)).size) throw new Error(`Missing distribution file: ${file}`);
  }
  if (!readdirSync(join(root, "assets")).some(name => name.endsWith(".js"))) throw new Error("Missing built scripts");
  const catalog = JSON.parse(readFileSync(join(root, "collection/catalog.json"), "utf8"));
  const previews = JSON.parse(readFileSync(join(root, "collection/scene-assets.json"), "utf8"));
  const paths = catalog.works.flatMap(work => [work.image, work.referenceImage, ...(work.panels ?? []).map(panel => panel.image)]).filter(Boolean);
  for (const path of [...paths, ...Object.values(previews).map(preview => preview.image)]) {
    if (!existsSync(join(root, "collection", path))) throw new Error(`Missing collection asset: ${path}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkDist(new URL("../dist/", import.meta.url));
  console.log("Distribution includes launch files and complete public collection; no private artifacts.");
}
