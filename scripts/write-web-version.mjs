import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";

const buildId = new Date().toISOString();
let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch {
  /* not a git repo */
}

let appVersion = "1.0.0";
try {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  appVersion = pkg.version ?? appVersion;
} catch {
  /* ignore */
}

const payload = {
  buildId,
  commit,
  version: appVersion,
  label: `${appVersion}+${commit}`,
};

mkdirSync("public", { recursive: true });
writeFileSync("public/boniface-version.json", JSON.stringify(payload, null, 2));

mkdirSync("lib/generated", { recursive: true });
writeFileSync(
  "lib/generated/webBuildId.ts",
  `/** Auto-generated before web export — do not edit. */\nexport const WEB_BUILD_ID = "${buildId}";\n`
);

console.log(`Web build version written: ${payload.label} (${buildId})`);
