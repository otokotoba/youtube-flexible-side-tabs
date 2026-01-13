import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

export const test = base.extend<{
  context: BrowserContext;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../src"
    );
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
});
export const expect = test.expect;
