import { windowStates, activeMediaWindow, navWindows, desktopSettings } from '../os/manage_data.js';
import { createWindow, minimizeWindow, bringToFront } from './window.js';
import { toggleButtonActiveState } from './main.js';

export function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  menu.classList.toggle('hidden');
  toggleButtonActiveState('start-button');

  toggleStartIcon();

  // Initialize drag and drop when menu is opened
  if (!menu.classList.contains('hidden')) {
    setTimeout(() => {
      if (typeof safeInitializeStartMenuDragDrop === 'function') {
        safeInitializeStartMenuDragDrop();
      } else if (typeof initializeStartMenuDragDrop === 'function') {
        initializeStartMenuDragDrop();
      } else {
        console.warn('Start menu drag and drop initialization functions not available');
      }
    }, 10);
  }
}

export function minimizeAllWindows() {
  for (const id in windowStates) {
    minimizeWindow(id);
  }
  document.querySelectorAll('#window-tabs > div').forEach(tab => {
    tab.classList.remove('bg-gray-50');
  });
}

export function openNav(title, content = '', dimensions = { type: 'default' }, windowType = 'default') {
  if (navWindows[title]) {
    const existingWindow = document.getElementById(navWindows[title]);
    if (existingWindow) { bringToFront(existingWindow); return; }
    else { delete navWindows[title]; }
  }
  createWindow(title, content, true, null, false, false, dimensions, windowType);
}

export function updateClock() {
  const clockEl = document.getElementById('clock');
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  // Check if desktopSettings is available and initialized
  const showSeconds = (typeof desktopSettings !== 'undefined' && desktopSettings && desktopSettings.clockSeconds) || false;
  let timeStr = showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  clockEl.textContent = timeStr;
}

export function toggleMediaPlayback() {
  const mediaEl = getActiveMediaElement();
  if (mediaEl) {
    mediaEl.paused ? mediaEl.play() : mediaEl.pause();
    updateMediaControl();
  }
}

export function updateMediaControl() {
  const mediaEl = getActiveMediaElement();
  const mediaControl = document.getElementById('media-control');
  if (mediaEl) {
    mediaControl.textContent = mediaEl.paused ? "▶" : "⏸";
  } else {
    mediaControl.textContent = "";
  }
}

export function getActiveMediaElement() {
  if (activeMediaWindow) {
    const win = document.getElementById(activeMediaWindow);
    if (win) {
      return win.querySelector("video, audio");
    }
  }
  return null;
}

setInterval(updateClock, 1000);
updateClock();

document.addEventListener('DOMContentLoaded', () => {
  // Find all the links that are meant to trigger a submenu
  const submenuTriggers = document.querySelectorAll('[data-submenu-trigger]');

  // Check if the screen is "mobile" size (matches Tailwind's 'lg' breakpoint)
  const isMobile = window.innerWidth < 1024;

  if (isMobile) {
    submenuTriggers.forEach(trigger => {
      const submenu = trigger.nextElementSibling; // The <ul> is right after the <a>
      const arrow = trigger.querySelector('span');

      // When a trigger is clicked...
      trigger.addEventListener('click', (event) => {
        // Prevent the link from trying to navigate
        event.preventDefault();

        // Toggle the 'block' and 'hidden' classes on the submenu
        if (submenu.classList.contains('hidden')) {
          submenu.classList.remove('hidden');
          submenu.classList.add('block');
          arrow.classList.add('rotate-90');
        } else {
          submenu.classList.remove('block');
          submenu.classList.add('hidden');
          arrow.classList.remove('rotate-90');
        }
      });
    });
  }
});

document.getElementById('media-control').addEventListener('click', () => {
  toggleMediaPlayback()
});

document.getElementById('min-all-btn').addEventListener('click', () => {
  toggleStartMenu();
  minimizeAllWindows()
});


document.getElementById('start-button').addEventListener('click', () => {
  toggleStartMenu();
});

function toggleStartIcon() {
  const btnIcon = document.getElementById('start-button').querySelector('img');
  if (btnIcon.src.includes('image/door-closed.png')) {
    btnIcon.src = btnIcon.src.replace('door-closed', 'door-open');
  } else {
    btnIcon.src = btnIcon.src.replace('door-open', 'door-closed');
  }
}
