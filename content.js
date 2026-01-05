"use strict";

const SELECTORS = (() => {
  const primary = "ytd-watch-flexy #columns #primary",
    secondary = "ytd-watch-flexy #columns #secondary",
    description = `${primary} #description-inner`,
    expandDescriptionButton = `${description} #expand`,
    comments = `${primary} #comments`,
    related = `${secondary} #related`;

  return {
    primary,
    secondary,
    description,
    expandDescriptionButton,
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
};

const TABS = [
  {
    buttonText: "Description",
    contentId: "yt-fst-tab-content-description",
    selector: SELECTORS.description,
  },
  {
    buttonText: "Comments",
    contentId: "yt-fst-tab-content-comments",
    selector: SELECTORS.comments,
  },
  {
    buttonText: "Related",
    contentId: "yt-fst-tab-content-related",
    selector: SELECTORS.related,
  },
];

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

async function moveYouTubeElements() {
  const button = await findYouTubeElement(SELECTORS.expandDescriptionButton);
  button.click();

  TABS.forEach(async (tab) => {
    const container = document.getElementById(tab.contentId);
    const element = await findYouTubeElement(tab.selector);
    if (element.parentElement !== container) {
      container.appendChild(element);
    }
  });
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

async function changeLayout() {
  const isWatchPage = window.location.pathname === "/watch";
  const enabled = document.body.classList.contains(CLASSES.enabled);
  console.log(`changeLayout: isWatchPage=${isWatchPage}, enabled=${enabled}`);

  if (isWatchPage && !enabled) {
    document.body.classList.add(CLASSES.enabled);
    await createTabUI();
  }

  if (!isWatchPage && enabled) {
    document.body.classList.remove(CLASSES.enabled);
  }
}

window.addEventListener("yt-navigate-finish", () => changeLayout());
