import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
const https = process.env.EXHIBITION_LAN === "1" ? {
  key: readFileSync(new URL("./.local/tls/key.pem", import.meta.url)),
  cert: readFileSync(new URL("./.local/tls/cert.pem", import.meta.url)),
} : undefined;
const headers = {
  "Content-Security-Policy": readFileSync(new URL("./deploy/content-security-policy.txt", import.meta.url), "utf8").trim(),
};
export default defineConfig({
  server: { https },
  preview: { https, headers },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
