"use strict";

const SELECTORS = (() => {
  const watchFlexy = "ytd-watch-flexy",
    columns = `${watchFlexy} #columns`,
    primary = `${columns} #primary`,
    secondary = `${columns} #secondary`,
    description = `${primary} #description-inner`,
    descriptionExpander = `${description} #description-inline-expander`,
    descriptionExpanded = `${description} #expanded`,
    descriptionExpandButton = `${description} #expand`,
    comments = `${primary} #comments`,
    related = `${secondary} #related`;

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

const ATTRIBUTES = {
  isSingleColumn: "is-single-column",
  theater: "theater",
  fullscreen: "fullscreen",
};

const cleanups = [];

class YouTubeElementNotFoundError extends Error {
  constructor(selector) {
    super("YouTube element not found: " + selector);
    this.name = YouTubeElementNotFoundError.name;
  }
}

function findYouTubeElement(selector) {
  return new Promise((resolve, reject) => {
    const id = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(id);
        resolve(element);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(id);
      reject(new YouTubeElementNotFoundError(selector));
    }, 1000);
  });
}

async function createTabUI() {
  if (document.querySelector(`.${CLASSES.tabContainer}`)) return;

  document.body.classList.add(CLASSES.enabled);

  await createResizeBar();

  const container = document.createElement("div");
  container.className = CLASSES.tabContainer;

  const header = document.createElement("div");
  header.className = CLASSES.tabHeader;

  const body = document.createElement("div");
  body.className = CLASSES.tabBody;

  TABS.forEach((tab, i) => {
    const button = document.createElement("button");
    button.className = CLASSES.tabButton;
    button.textContent = tab.buttonText;
    button.dataset.tabContentId = tab.contentId;
    if (i === 0) {
      button.classList.add(CLASSES.activeTab);
    }

    button.onclick = () => switchTab(tab.contentId);
    header.appendChild(button);

    const content = document.createElement("div");
    content.id = tab.contentId;
    content.className = CLASSES.tabContent;
    if (i === 0) {
      content.classList.add(CLASSES.activeTab);
    }

    body.appendChild(content);
  });

  container.appendChild(header);
  container.appendChild(body);

  const secondary = await findYouTubeElement(SELECTORS.secondary);
  secondary.appendChild(container);
  await moveYouTubeElements();
}

async function expandDescription() {
  const expander = await findYouTubeElement(SELECTORS.descriptionExpander);
  const expanded = await findYouTubeElement(SELECTORS.descriptionExpanded);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        expander.hasAttribute("is-expanded") &&
        mutation.target instanceof Element
      ) {
        mutation.target.removeAttribute("hidden");
      }
    });
  });
  observer.observe(expanded, {
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
  cleanups.push(() => observer.disconnect());

  const button = await findYouTubeElement(SELECTORS.descriptionExpandButton);
  button.click();
}

async function moveYouTubeElements() {
  await expandDescription();

  for (const tab of TABS) {
    const container = document.getElementById(tab.contentId);
    const element = await findYouTubeElement(tab.selector);
    if (container) {
      tab.originalParent = element.parentElement;
      container.appendChild(element);
    }
  }
}

function switchTab(contentId) {
  document.querySelectorAll(`.${CLASSES.tabButton}`).forEach((button) => {
    if (button.dataset.tabContentId === contentId) {
      button.classList.add(CLASSES.activeTab);
    } else {
      button.classList.remove(CLASSES.activeTab);
    }
  });

  document.querySelectorAll(`.${CLASSES.tabContent}`).forEach((content) => {
    if (content.id === contentId) {
      content.classList.add(CLASSES.activeTab);
    } else {
      content.classList.remove(CLASSES.activeTab);
    }
  });

  const tabBody = document.querySelector(`.${CLASSES.tabBody}`);
  if (tabBody) {
    tabBody.scrollTo(0, 0);
  }
}

async function createResizeBar() {
  if (document.querySelector(`.${CLASSES.resizeBar}`)) return;

  const columns = await findYouTubeElement(SELECTORS.columns);
  const primary = await findYouTubeElement(SELECTORS.primary);
  const secondary = await findYouTubeElement(SELECTORS.secondary);

  const resizeBar = document.createElement("div");
  resizeBar.className = CLASSES.resizeBar;
  columns.insertBefore(resizeBar, secondary);

  const resizeColumns = (primaryRatio) => {
    primaryRatio = Math.max(Math.min(primaryRatio, 90), 30);

    primary.style.flex = `${primaryRatio}%`;
    secondary.style.flex = `${100 - primaryRatio}%`;
    window.dispatchEvent(new Event("resize"));
  };

  chrome.storage.local.get(["primaryRatio"], (result) => {
    if (result.primaryRatio) {
      resizeColumns(result.primaryRatio);
    }
  });

  resizeBar.addEventListener("mousedown", (e) => {
    resizeBar.classList.add(CLASSES.resizing);
    e.preventDefault();
  });

  let isAnimationDone = true;
  let primaryRatio = null;

  document.addEventListener("mousemove", (e) => {
    if (!resizeBar.classList.contains(CLASSES.resizing) || !isAnimationDone)
      return;

    isAnimationDone = false;
    requestAnimationFrame(() => {
      const containerRect = columns.getBoundingClientRect();
      primaryRatio =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;
      resizeColumns(primaryRatio);
      isAnimationDone = true;
    });
  });

  document.addEventListener("mouseup", () => {
    if (!resizeBar.classList.contains(CLASSES.resizing)) return;

    resizeBar.classList.remove(CLASSES.resizing);

    if (primaryRatio === null) return;

    chrome.storage.local.set({ primaryRatio });
    primaryRatio = null;
  });
}

async function restoreLayout() {
  if (!document.body.classList.contains(CLASSES.enabled)) return;

  document.body.classList.remove(CLASSES.enabled);

  const container = document.querySelector(`.${CLASSES.tabContainer}`);
  if (container) {
    for (const tab of TABS) {
      if (tab.originalParent) {
        const elements = document.querySelectorAll(`#${tab.contentId} > *`);
        for (const element of elements) {
          tab.originalParent.appendChild(element);
        }
        tab.originalParent = null;
      }
    }
    container.remove();
  }

  const resizeBar = document.querySelector(`.${CLASSES.resizeBar}`);
  if (resizeBar) {
    resizeBar.remove();
  }

  const primary = await findYouTubeElement(SELECTORS.primary);
  const secondary = await findYouTubeElement(SELECTORS.secondary);
  primary.style.flex = "";
  secondary.style.flex = "";

  window.dispatchEvent(new Event("resize"));

  while (cleanups.length > 0) {
    const cleanup = cleanups.shift();
    if (cleanup instanceof Function) cleanup();
  }
}

async function changeLayout() {
  const watchFlexy = await findYouTubeElement(SELECTORS.watchFlexy);
  const isWatchPage = window.location.pathname === "/watch";
  const enabled = document.body.classList.contains(CLASSES.enabled);
  const isSingleColumn = watchFlexy.hasAttribute(ATTRIBUTES.isSingleColumn);
  const theater = watchFlexy.hasAttribute(ATTRIBUTES.theater);
  const fullscreen = watchFlexy.hasAttribute(ATTRIBUTES.fullscreen);

  if (isWatchPage && !enabled && !isSingleColumn && !theater && !fullscreen) {
    createTabUI();
  }

  if (!isWatchPage && enabled) {
    restoreLayout();
  }
}

async function init() {
  window.addEventListener("yt-navigate-finish", changeLayout);

  const watchFlexy = await findYouTubeElement(SELECTORS.watchFlexy);
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (watchFlexy.hasAttribute(mutation.attributeName)) {
        restoreLayout();
      } else {
        changeLayout();
      }
    }
  });
  observer.observe(watchFlexy, {
    attributes: true,
    attributeFilter: [
      ATTRIBUTES.isSingleColumn,
      ATTRIBUTES.theater,
      ATTRIBUTES.fullscreen,
    ],
  });
}

init();
