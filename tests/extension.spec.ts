import { test, expect } from "./extension.fixture";
import assert from "node:assert";

const SELECTORS = (() => {
  const watchFlexy = "ytd-watch-flexy",
    columns = `${watchFlexy} #columns`,
    primary = `${columns} #primary`,
    secondary = `${columns} #secondary`,
    description = `${columns} #description-inner`,
    descriptionExpander = `${description} #description-inline-expander`,
    descriptionExpanded = `${description} #expanded`,
    descriptionExpandButton = `${description} #expand`,
    comments = `${columns} #comments`,
    related = `${columns} #related`;

  return {
    watchFlexy,
    columns,
    primary,
    secondary,
    description,
    descriptionExpander,
    descriptionExpanded,
    descriptionExpandButton,
    comments,
    related,
  };
})();

const CLASSES = {
  enabled: "yt-fst-enabled",
  tabContainer: "yt-fst-tab-container",
  activeTab: "yt-fst-active-tab",
  tabHeader: "yt-fst-tab-header",
  tabButton: "yt-fst-tab-button",
  tabBody: "yt-fst-tab-body",
  tabContent: "yt-fst-tab-content",
  resizeBar: "yt-fst-resize-bar",
  resizing: "yt-fst-resizing",
};

const CONTENT_IDS = {
  description: "yt-fst-tab-content-description",
  comments: "yt-fst-tab-content-comments",
  related: "yt-fst-tab-content-related",
};

const TABS = [
  {
    buttonText: "Description",
    contentId: CONTENT_IDS.description,
    selector: SELECTORS.description,
    originalParent: null,
  },
  {
    buttonText: "Comments",
    contentId: CONTENT_IDS.comments,
    selector: SELECTORS.comments,
    originalParent: null,
  },
  {
    buttonText: "Related",
    contentId: CONTENT_IDS.related,
    selector: SELECTORS.related,
    originalParent: null,
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto("/@YouTube/videos");

  const links = await page.locator('a[href^="/watch?v="]');
  const random = Math.ceil(Math.random() * (await links.count()));
  const href = await links.nth(random).getAttribute("href");

  await page.goto(href!);
  await page.locator(SELECTORS.watchFlexy).waitFor();
  await page.keyboard.press("M");
  await page.locator(`.${CLASSES.tabContainer}`).waitFor();
});

test.describe("feature to change layout", () => {
  test("should create tabs and resize bar", async ({ page }) => {
    const tabContainer = page.locator(`.${CLASSES.tabContainer}`);
    await expect(tabContainer).toBeVisible();

    const buttons = page.locator(`.${CLASSES.tabButton}`);
    await expect(buttons).toHaveCount(TABS.length);

    for (const [i, tab] of TABS.entries()) {
      await expect(buttons.nth(i)).toHaveText(tab.buttonText);
    }

    const resizeBar = page.locator(`.${CLASSES.resizeBar}`);
    await expect(resizeBar).toBeVisible();
  });

  test("should move YouTube elements into tabs", async ({ page }) => {
    for (const tab of TABS) {
      const content = page.locator(`#${tab.contentId} > *`);
      await expect(content).toHaveCount(1);
      await expect(content.innerHTML).toEqual(
        page.locator(tab.selector).innerHTML
      );
    }
  });

  test("should expand description automatically", async ({ page }) => {
    const expander = page.locator(SELECTORS.descriptionExpander);
    await expect(expander).toHaveAttribute("is-expanded", "");
  });

  test("should switch tabs on click", async ({ page }) => {
    const contents = page.locator(`.${CLASSES.tabBody} > *`);

    for (const [i, tab] of TABS.entries()) {
      const button = page.locator(`.${CLASSES.tabButton}`, {
        hasText: tab.buttonText,
      });
      button.click();

      for (const [j, content] of (await contents.all()).entries()) {
        if (i === j) {
          await expect(content).toContainClass(CLASSES.activeTab);
          await expect(content).toBeVisible();
        } else {
          await expect(content).not.toContainClass(CLASSES.activeTab);
          await expect(content).toBeHidden();
        }
      }
    }
  });
});

test.describe("feature to resize columns", () => {
  type BoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  let defaultSecondaryBox: BoundingBox = null;
  let resizedSecondaryBox: BoundingBox = null;

  test.beforeEach(async ({ page }) => {
    const secondary = page.locator(SELECTORS.secondary);
    defaultSecondaryBox = await secondary.boundingBox();
    assert(defaultSecondaryBox);

    const resizeBar = page.locator(`.${CLASSES.resizeBar}`);
    const resizeBarBox = await resizeBar.boundingBox();
    assert(resizeBarBox);

    await page.mouse.move(
      resizeBarBox.x + resizeBarBox.width / 2,
      resizeBarBox.y + resizeBarBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      resizeBarBox.x + resizeBarBox.width / 2 - 100,
      resizeBarBox.y + resizeBarBox.height / 2
    );
    await page.mouse.up();

    resizedSecondaryBox = await secondary.boundingBox();
    assert(resizedSecondaryBox);
  });

  test.afterEach(() => {
    defaultSecondaryBox = null;
    resizedSecondaryBox = null;
  });

  test("should resize columns when dragging the resize bar", () => {
    expect(resizedSecondaryBox!.width).toBeGreaterThan(
      defaultSecondaryBox!.width
    );
  });

  test("should persist resized columns ratio after reloading", async ({
    page,
  }) => {
    await page.reload();
    await page.locator(`.${CLASSES.tabContainer}`).waitFor();

    const resizeBar = page.locator(`.${CLASSES.resizeBar}`);
    await resizeBar.hover();

    const secondary = page.locator(SELECTORS.secondary);
    const persistedSecondaryBox = await secondary.boundingBox();
    assert(persistedSecondaryBox);

    expect(resizedSecondaryBox!.width).toEqual(persistedSecondaryBox.width);
  });
});

test.describe("feature to restore layout", () => {
  test("during theater mode", async ({ page }) => {
    await page.keyboard.press("t");
    await expect(page.locator(`.${CLASSES.tabContainer}`)).toBeHidden();
    await expect(page.locator("body")).not.toContainClass(CLASSES.enabled);
  });

  test("during fullscreen mode", async ({ page }) => {
    await page.keyboard.press("f");
    await expect(page.locator(`.${CLASSES.tabContainer}`)).toBeHidden();
    await expect(page.locator("body")).not.toContainClass(CLASSES.enabled);
  });

  test("during single column mode", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 });
    await expect(page.locator(`.${CLASSES.tabContainer}`)).toBeHidden();
    await expect(page.locator("body")).not.toContainClass(CLASSES.enabled);
  });

  test("when leaving watch page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(`.${CLASSES.tabContainer}`)).toBeHidden();
    await expect(page.locator("body")).not.toContainClass(CLASSES.enabled);
  });
});
