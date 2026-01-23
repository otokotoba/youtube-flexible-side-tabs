import {
  test as base,
  chromium,
  firefox,
  type BrowserContext,
} from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import {
  connect,
  findFreeTcpPort,
} from "../node_modules/web-ext/lib/firefox/remote.js";

export const test = base.extend<{
  context: BrowserContext;
}>({
  context: async ({ browserName, context }, use) => {
    const pathToExtension = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../src"
    );

    if (browserName == "chromium") {
      context = await chromium.launchPersistentContext("", {
        channel: "chromium",
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
      });
    } else if (browserName == "firefox") {
      const port = await findFreeTcpPort();
      context = await firefox.launchPersistentContext("", {
        args: ["-start-debugger-server", String(port)],
        firefoxUserPrefs: {
          "devtools.debugger.remote-enabled": true,
          "devtools.debugger.prompt-connection": false,
        },
      });

      const client = await connect(port);
      await client.installTemporaryAddon(pathToExtension);
    }

    await use(context);
    await context.close();
  },
});
export const expect = test.expect;
