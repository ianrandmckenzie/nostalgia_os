import { windowStates, activeMediaWindow, navWindows, desktopSettings } from '../os/manage_data.js';
import { createWindow, minimizeWindow, bringToFront } from './window.js';
import { toggleButtonActiveState } from './main.js';
import { showCustomScrollbars } from '../os/custom_scrollbars.js';

// Function to update focusability of Start menu items
export function updateStartMenuFocusability(isVisible) {
  const menu = document.getElementById('start-menu');
  if (!menu) return;

  // Get all focusable elements in the Start menu
  const focusableElements = menu.querySelectorAll('[role="menuitem"], a[data-submenu-trigger]');

  focusableElements.forEach(element => {
    if (isVisible) {
      // When menu is visible, allow keyboard focus (but start with -1)
      element.setAttribute('tabindex', '-1');
    } else {
      // When menu is hidden, completely prevent focus
      element.setAttribute('tabindex', '-1');
      element.blur(); // Remove any existing focus
    }
  });
}

export function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  const isHidden = menu.classList.contains('hidden');

  menu.classList.toggle('hidden');

  // Update ARIA attributes
  startButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');

  // Fix accessibility: aria-hidden should be "true" when menu is hidden, "false" when visible
  if (isHidden) {
    // Menu is becoming visible
    menu.setAttribute('aria-hidden', 'false');
    // Enable focus for menu items when visible
    updateStartMenuFocusability(true);
  } else {
    // Menu is becoming hidden
    menu.setAttribute('aria-hidden', 'true');
    // Disable focus for menu items when hidden
    updateStartMenuFocusability(false);
  }

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
  
  // Show scrollbars when all windows are minimized
  if (typeof showCustomScrollbars === 'function') {
    showCustomScrollbars();
  }
  const stage = document.getElementById('desktop-stage');
  if (stage) {
    stage.style.overflow = 'scroll';
  }
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
    mediaControl.setAttribute('aria-label', mediaEl.paused ? 'Play media' : 'Pause media');
    mediaControl.style.display = 'inline-block';
  } else {
    mediaControl.textContent = "";
    mediaControl.setAttribute('aria-label', 'No media playing');
    mediaControl.style.display = 'none';
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


document.getElementById('start-button').addEventListener('click', (e) => {
  e.preventDefault(); // Prevent any default behavior
  e.stopPropagation(); // Stop bubbling
  toggleStartMenu();
});

// Add touchstart listener for better mobile responsiveness
document.getElementById('start-button').addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent ghost clicks
  e.stopPropagation();
  toggleStartMenu();
}, { passive: false });

function toggleStartIcon() {
  const btnIcon = document.getElementById('start-button').querySelector('img');
  if (btnIcon.src.includes('image/door-closed.webp')) {
    btnIcon.src = btnIcon.src.replace('door-closed', 'door-open');
  } else {
    btnIcon.src = btnIcon.src.replace('door-open', 'door-closed');
  }
}
