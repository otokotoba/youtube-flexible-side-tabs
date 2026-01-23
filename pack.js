import path from "node:path";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import webExt from "web-ext";

const ROOT = "dest";

async function rmrf(path) {
  await fs.rm(path, { recursive: true, force: true });
}

async function packForChromium() {
  const artifactsDir = path.join(ROOT, "chromium");
  const filename = "chromium.zip";

  if (!existsSync(artifactsDir)) {
    await fs.mkdir(artifactsDir);
  }
  await rmrf(path.join(artifactsDir, filename));

  await webExt.cmd.build({ sourceDir: "src", artifactsDir, filename });
}

async function packForFirefox() {
  const artifactsDir = path.join(ROOT, "firefox");
  const filename = "firefox.zip";

  if (!existsSync(artifactsDir)) {
    await fs.mkdir(artifactsDir);
  }
  await rmrf(path.join(artifactsDir, filename));

  const sourceDir = path.join(artifactsDir, "src");
  await fs.cp("src", sourceDir, { recursive: true });

  const manifestPath = path.join(sourceDir, "manifest.json");
  const manifest = JSON.parse(
    await fs.readFile(manifestPath, { encoding: "utf8" })
  );
  manifest["browser_specific_settings"] = {
    gecko: {
      id: "youtube-flexible-side-tabs@otokotoba",
      data_collection_permissions: {
        required: ["none"],
      },
    },
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  await webExt.cmd.build({ sourceDir, artifactsDir, filename });
  await rmrf(sourceDir);
}

if (!existsSync(ROOT)) {
  await fs.mkdir(ROOT);
}

packForChromium();
packForFirefox();
