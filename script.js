const startButton = document.querySelector(".start-button");
const startMenu = document.querySelector(".start-menu");
const appButtons = startMenu.querySelectorAll("[data-app]");
const taskbarWindows = document.querySelector("#taskbar-windows");
const windows = new Map();
let nextWindowId = 1;
let nextZIndex = 11;

function keepInViewport(windowElement, left, top) {
  const maxLeft = Math.max(0, window.innerWidth - windowElement.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - windowElement.offsetHeight);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop)
  };
}

function setPosition(windowElement, left, top, save = true) {
  const position = keepInViewport(windowElement, left, top);
  windowElement.style.left = `${position.left}px`;
  windowElement.style.top = `${position.top}px`;

  if (save) {
    localStorage.setItem(`simplos-window-position-${windowElement.id}`, JSON.stringify(position));
  }
}

function saveSize(windowElement) {
  localStorage.setItem(`simplos-window-size-v2-${windowElement.id}`, JSON.stringify({
    width: windowElement.offsetWidth,
    height: windowElement.offsetHeight
  }));
}

function restoreSize(windowElement) {
  try {
    const saved = JSON.parse(localStorage.getItem(`simplos-window-size-v2-${windowElement.id}`));
    if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
      windowElement.style.width = `${saved.width}px`;
      windowElement.style.height = `${saved.height}px`;
    }
  } catch {
    localStorage.removeItem(`simplos-window-size-${windowElement.id}`);
  }
}

function restorePosition(windowElement) {
  try {
    const saved = JSON.parse(localStorage.getItem(`simplos-window-position-${windowElement.id}`));
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      setPosition(windowElement, saved.left, saved.top, false);
      return;
    }
  } catch {
    localStorage.removeItem(`simplos-window-position-${windowElement.id}`);
  }

  setPosition(windowElement, windowElement.offsetLeft, windowElement.offsetTop, false);
}

function focusWindow(windowElement) {
  nextZIndex += 1;
  windowElement.style.zIndex = nextZIndex;
}

function setWindowVisible(windowElement, taskbarButton, visible) {
  windowElement.hidden = !visible;
  taskbarButton.setAttribute("aria-pressed", String(visible));
  if (visible) focusWindow(windowElement);
}

function createTaskbarButton(windowElement, appName) {
  const taskbarButton = document.createElement("button");
  taskbarButton.type = "button";
  taskbarButton.className = "taskbar-window";
  taskbarButton.dataset.windowId = windowElement.id;
  taskbarButton.setAttribute("aria-pressed", "true");
  taskbarButton.textContent = appName;
  taskbarButton.addEventListener("click", () => {
    setWindowVisible(windowElement, taskbarButton, windowElement.hidden);
  });
  taskbarWindows.append(taskbarButton);
  return taskbarButton;
}

function initializeWindow(windowElement) {
  const title = windowElement.querySelector(".window-title");
  const header = windowElement.querySelector("header");
  const content = windowElement.querySelector(".content");
  const controls = windowElement.querySelector(".window-controls");
  const appName = windowElement.dataset.app;
  const taskbarButton = document.querySelector(`[data-window-id="${windowElement.id}"]`)
    || createTaskbarButton(windowElement, appName);
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function startDrag(event) {
    const bounds = windowElement.getBoundingClientRect();
    dragOffsetX = event.clientX - bounds.left;
    dragOffsetY = event.clientY - bounds.top;
    header.classList.add("active");
    focusWindow(windowElement);
    title.setPointerCapture(event.pointerId);
  }

  function drag(event) {
    if (header.classList.contains("active")) {
      setPosition(windowElement, event.clientX - dragOffsetX, event.clientY - dragOffsetY);
    }
  }

  function stopDrag(event) {
    if (!header.classList.contains("active")) return;
    header.classList.remove("active");
    if (title.hasPointerCapture(event.pointerId)) {
      title.releasePointerCapture(event.pointerId);
    }
  }

  title.addEventListener("pointerdown", startDrag);
  title.addEventListener("pointermove", drag);
  title.addEventListener("pointerup", stopDrag);
  title.addEventListener("pointercancel", stopDrag);
  windowElement.addEventListener("pointerdown", () => focusWindow(windowElement));

  controls.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (action === "minimize") {
      setWindowVisible(windowElement, taskbarButton, false);
    } else if (action === "reset") {
      localStorage.removeItem(`simplos-window-position-${windowElement.id}`);
      localStorage.removeItem(`simplos-window-size-v2-${windowElement.id}`);
      windowElement.style.width = appName === "Web Browser" ? "560px" : "260px";
      windowElement.style.height = appName === "Web Browser" ? "420px" : "";
      setPosition(windowElement, 120, 120);
    } else if (action === "close") {
      windowElement.remove();
      taskbarButton.remove();
      windows.delete(appName);
    }
  });

  const browserForm = windowElement.querySelector(".browser-toolbar");
  const browserFrame = windowElement.querySelector(".browser-frame");
  if (browserForm && browserFrame) {
    browserForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const address = browserForm.querySelector("input").value.trim();
      if (!address) return;
      try {
        const url = new URL(address);
        if (url.protocol === "http:" || url.protocol === "https:") {
          browserFrame.src = url.href;
        }
      } catch {
        browserFrame.src = `https://www.bing.com/search?q=${encodeURIComponent(address)}`;
      }
    });
  }

  const notes = windowElement.querySelector(".notes");
  if (notes) {
    notes.value = localStorage.getItem("simplos-notes") || "";
    notes.addEventListener("input", () => localStorage.setItem("simplos-notes", notes.value));
  }

  const calculator = windowElement.querySelector(".calculator");
  if (calculator) {
    const display = calculator.querySelector("input");
    calculator.addEventListener("click", (event) => {
      if (event.target.dataset.value) display.value += event.target.dataset.value;
      if (event.target.dataset.action === "clear") display.value = "";
      if (event.target.dataset.action === "equals") {
        try {
          display.value = Function(`"use strict"; return (${display.value})`)();
        } catch {
          display.value = "Error";
        }
      }
    });
  }

  const settings = windowElement.querySelector(".settings-list");
  if (settings) {
    settings.addEventListener("click", (event) => {
      if (event.target.dataset.theme === "dark") document.body.classList.add("dark");
      if (event.target.dataset.theme === "light") document.body.classList.remove("dark");
      if (event.target.dataset.wallpaper) {
        document.body.classList.remove("wallpaper-blue", "wallpaper-green");
        if (event.target.dataset.wallpaper !== "gray") {
          document.body.classList.add(`wallpaper-${event.target.dataset.wallpaper}`);
        }
        localStorage.setItem("simplos-wallpaper", event.target.dataset.wallpaper);
      }
      localStorage.setItem("simplos-theme", document.body.classList.contains("dark") ? "dark" : "light");
    });
  }

  const resizeObserver = new ResizeObserver(() => saveSize(windowElement));
  resizeObserver.observe(windowElement);
  restoreSize(windowElement);
  restorePosition(windowElement);
  windows.set(appName, { windowElement, taskbarButton, content });
}

function createWindow(appName) {
  const windowId = `app-window-${nextWindowId}`;
  nextWindowId += 1;
  const windowElement = document.createElement("div");
  windowElement.className = `wrapper${appName === "Web Browser" ? " browser-window" : ""}`;
  windowElement.id = windowId;
  windowElement.dataset.app = appName;
  windowElement.innerHTML = `
    <header>
      <span class="window-title" tabindex="0">${appName}</span>
      <div class="window-controls" aria-label="Window controls">
        <button type="button" data-action="minimize" aria-label="Minimize window">_</button>
        <button type="button" data-action="reset" aria-label="Reset window position">R</button>
        <button type="button" data-action="close" aria-label="Close window">X</button>
      </div>
    </header>
    <div class="content">${getAppContent(appName)}</div>`;
  document.body.append(windowElement);
  initializeWindow(windowElement);
  setPosition(windowElement, 160 + (nextWindowId - 2) * 20, 140 + (nextWindowId - 2) * 20);
  return windows.get(appName);
}

function getAppContent(appName) {
  if (appName === "File Manager") {
    return `<h3>Home</h3><ul class="file-list"><li>Documents</li><li>Downloads</li><li>Pictures</li><li>Projects</li></ul>`;
  }
  if (appName === "Settings") {
    return `<div class="settings-list"><strong>Appearance</strong><div class="settings-group"><span>Theme</span><button type="button" data-theme="light">Light background</button><button type="button" data-theme="dark">Dark background</button></div><div class="settings-group"><span>Wallpaper</span><button type="button" data-wallpaper="gray">Gray</button><button type="button" data-wallpaper="blue">Blue</button><button type="button" data-wallpaper="green">Green</button></div></div>`;
  }
  if (appName === "Notes") {
    return `<form class="app-form"><label for="notes-area">Notes</label><textarea class="notes" id="notes-area" placeholder="Type a note..."></textarea></form>`;
  }
  if (appName === "Calculator") {
    return `<div class="calculator"><input type="text" aria-label="Calculator display" readonly><div class="calculator-keys"><button type="button" data-value="7">7</button><button type="button" data-value="8">8</button><button type="button" data-value="9">9</button><button type="button" data-value="/">/</button><button type="button" data-value="4">4</button><button type="button" data-value="5">5</button><button type="button" data-value="6">6</button><button type="button" data-value="*">*</button><button type="button" data-value="1">1</button><button type="button" data-value="2">2</button><button type="button" data-value="3">3</button><button type="button" data-value="-">-</button><button type="button" data-value="0">0</button><button type="button" data-value=".">.</button><button type="button" data-action="equals">=</button><button type="button" data-value="+">+</button><button type="button" data-action="clear">Clear</button></div></div>`;
  }
  if (appName === "About SimplOS") {
    return `<h3>SimplOS</h3><p>A small, plain desktop interface built with HTML, CSS, and JavaScript.</p><p>Windows can be moved, resized, minimized, and reopened from the taskbar.</p>`;
  }
  if (appName !== "Web Browser") return `${appName} is open.`;

  return `
    <div class="browser-content">
      <form class="browser-toolbar">
        <input type="search" value="https://www.bing.com" aria-label="Search Bing">
        <button type="submit">Go</button>
      </form>
      <iframe class="browser-frame" src="https://www.bing.com" title="Bing"></iframe>
      <p class="browser-fallback">If Bing does not load here, <a href="https://www.bing.com" target="_blank" rel="noopener">open Bing in a new tab</a>.</p>
    </div>`;
}

function openApp(appName) {
  const appWindow = windows.get(appName) || createWindow(appName);
  setWindowVisible(appWindow.windowElement, appWindow.taskbarButton, true);
  startMenu.hidden = true;
  startButton.setAttribute("aria-expanded", "false");
  appWindow.windowElement.querySelector(".window-title").focus();
}

initializeWindow(document.querySelector("#generic-window"));
if (localStorage.getItem("simplos-theme") === "dark") document.body.classList.add("dark");
const savedWallpaper = localStorage.getItem("simplos-wallpaper");
if (savedWallpaper === "blue" || savedWallpaper === "green") {
  document.body.classList.add(`wallpaper-${savedWallpaper}`);
}

startButton.addEventListener("click", () => {
  const isOpening = startMenu.hidden;
  startMenu.hidden = !isOpening;
  startButton.setAttribute("aria-expanded", String(isOpening));
});

appButtons.forEach((button) => {
  button.addEventListener("click", () => openApp(button.dataset.app));
});

document.addEventListener("click", (event) => {
  if (!startMenu.hidden && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
    startMenu.hidden = true;
    startButton.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !startMenu.hidden) {
    startMenu.hidden = true;
    startButton.setAttribute("aria-expanded", "false");
    startButton.focus();
  }
});

window.addEventListener("resize", () => {
  windows.forEach(({ windowElement }) => {
    if (!windowElement.hidden) {
      setPosition(windowElement, windowElement.offsetLeft, windowElement.offsetTop);
    }
  });
});
