import { readFileSync, writeFileSync } from "node:fs";
const packages = ["react", "react-dom", "scheduler", "three"];
const notices = packages.map(name => {
  const root = new URL(`../node_modules/${name}/`, import.meta.url);
  const { version } = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  return `${name} ${version}\n${readFileSync(new URL("LICENSE", root), "utf8")}`;
});
writeFileSync(new URL("../dist/THIRD_PARTY_NOTICES.txt", import.meta.url), notices.join("\n\n--------------------\n\n"));
