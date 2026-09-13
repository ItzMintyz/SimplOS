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
      setPosition(windowElement, 120, 120);
    } else if (action === "close") {
      windowElement.remove();
      taskbarButton.remove();
      windows.delete(appName);
    }
  });

  restorePosition(windowElement);
  windows.set(appName, { windowElement, taskbarButton, content });
}

function createWindow(appName) {
  const windowId = `app-window-${nextWindowId}`;
  nextWindowId += 1;
  const windowElement = document.createElement("div");
  windowElement.className = "wrapper";
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
    <div class="content">${appName} is open.</div>`;
  document.body.append(windowElement);
  initializeWindow(windowElement);
  setPosition(windowElement, 160 + (nextWindowId - 2) * 20, 140 + (nextWindowId - 2) * 20);
  return windows.get(appName);
}

function openApp(appName) {
  const appWindow = windows.get(appName) || createWindow(appName);
  setWindowVisible(appWindow.windowElement, appWindow.taskbarButton, true);
  startMenu.hidden = true;
  startButton.setAttribute("aria-expanded", "false");
  appWindow.windowElement.querySelector(".window-title").focus();
}

initializeWindow(document.querySelector("#generic-window"));

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
