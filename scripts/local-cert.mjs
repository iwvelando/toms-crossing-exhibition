import { networkInterfaces } from "node:os";
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../.local/tls/", import.meta.url));
const ips = [...new Set(["127.0.0.1", "::1", ...Object.values(networkInterfaces())
  .flat().filter(x => x && !x.internal && x.family === "IPv4").map(x => x.address)])].sort();
mkdirSync(dir, { recursive: true, mode: 0o700 });
const addresses = JSON.stringify(ips);
let reuse = false;
try {
  const cert = new X509Certificate(readFileSync(dir + "cert.pem"));
  reuse = readFileSync(dir + "addresses.json", "utf8") === addresses
    && Date.parse(cert.validTo) > Date.now() + 86400000
    && cert.checkPrivateKey((await import("node:crypto")).createPrivateKey(readFileSync(dir + "key.pem")));
} catch { /* Missing, changed or expired local certificate: create a replacement. */ }
if (!reuse) {
  const config = `[req]
prompt = no
distinguished_name = subject
x509_extensions = ext
[subject]
CN = Exhibition local preview
[ext]
subjectAltName = @names
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
[names]
DNS.1 = localhost
${ips.map((ip, i) => `IP.${i + 1} = ${ip}`).join("\n")}
`;
  writeFileSync(dir + "openssl.cnf", config, { mode: 0o600 });
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-sha256", "-days", "30", "-config", dir + "openssl.cnf",
    "-keyout", dir + "key.pem", "-out", dir + "cert.pem"], { stdio: "pipe" });
  chmodSync(dir + "key.pem", 0o600);
  writeFileSync(dir + "addresses.json", addresses, { mode: 0o600 });
}
console.log(`Local self-signed HTTPS certificate ${reuse ? "reused" : "created"}.`);
console.log("On the same Wi-Fi, open one of these addresses (use 4173 for preview-lan):");
for (const ip of ips.filter(x => x !== "127.0.0.1" && x !== "::1")) console.log(`  https://${ip}:5173`);
console.log("Your browser will ask you to accept this local certificate. No system trust settings were changed.");
