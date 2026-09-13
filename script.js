const wrapper = document.querySelector(".wrapper");
const header = wrapper.querySelector("header");
const title = wrapper.querySelector(".window-title");
const content = wrapper.querySelector(".content");
const controls = wrapper.querySelector(".window-controls");
const taskbarWindow = document.querySelector(".taskbar-window");
const startButton = document.querySelector(".start-button");
const startMenu = document.querySelector(".start-menu");
const storageKey = "simplos-window-position";
let dragOffsetX = 0;
let dragOffsetY = 0;

function keepInViewport(left, top) {
  const maxLeft = Math.max(0, window.innerWidth - wrapper.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - wrapper.offsetHeight);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop)
  };
}

function setPosition(left, top, save = true) {
  const position = keepInViewport(left, top);
  wrapper.style.left = `${position.left}px`;
  wrapper.style.top = `${position.top}px`;

  if (save) {
    localStorage.setItem(storageKey, JSON.stringify(position));
  }
}

function restorePosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      setPosition(saved.left, saved.top, false);
      return;
    }
  } catch {
    localStorage.removeItem(storageKey);
  }

  setPosition(wrapper.offsetLeft, wrapper.offsetTop, false);
}

function startDrag(event) {
  if (event.target.closest(".window-controls")) return;

  const bounds = wrapper.getBoundingClientRect();
  dragOffsetX = event.clientX - bounds.left;
  dragOffsetY = event.clientY - bounds.top;
  header.classList.add("active");
  title.setPointerCapture(event.pointerId);
}

function drag(event) {
  if (!header.classList.contains("active")) return;
  setPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
}

function stopDrag(event) {
  if (!header.classList.contains("active")) return;
  header.classList.remove("active");
  if (title.hasPointerCapture(event.pointerId)) {
    title.releasePointerCapture(event.pointerId);
  }
}

function setWindowVisible(visible) {
  wrapper.hidden = !visible;
  taskbarWindow.setAttribute("aria-pressed", String(visible));
}

title.addEventListener("pointerdown", startDrag);
title.addEventListener("pointermove", drag);
title.addEventListener("pointerup", stopDrag);
title.addEventListener("pointercancel", stopDrag);

controls.addEventListener("click", (event) => {
  const action = event.target.dataset.action;

  if (action === "minimize") {
    setWindowVisible(false);
  } else if (action === "reset") {
    localStorage.removeItem(storageKey);
    setPosition(120, 120);
  } else if (action === "close") {
    setWindowVisible(false);
  }
});

taskbarWindow.addEventListener("click", () => {
  setWindowVisible(wrapper.hidden);
});

startButton.addEventListener("click", () => {
  const isOpening = startMenu.hidden;
  startMenu.hidden = !isOpening;
  startButton.setAttribute("aria-expanded", String(isOpening));
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
  if (!wrapper.hidden) {
    setPosition(wrapper.offsetLeft, wrapper.offsetTop);
  }
});

restorePosition();
