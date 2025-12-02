import { highestZ, windowStates } from '../../os/manage_data.js';
import { bringToFront, minimizeWindow, toggleFullScreen, closeWindow } from './state.js';

export function showTaskbarContextMenu(e, windowId, win) {
  const menu = document.getElementById('context-menu');

  // Clear old entries
  menu.replaceChildren();
  // Ensure z-index is above scrollbars (9999) and windows
  menu.style.zIndex = Math.max((highestZ || 1000) + 100, 10000);

  const addItem = (text, disabled, onclick) => {
    const item = document.createElement('div');
    item.className = `px-4 py-2 ${
      disabled ? 'text-gray-400' : 'hover:bg-gray-50 cursor-pointer'
    }`;
    item.textContent = text;
    if (!disabled && onclick) {
      item.addEventListener('click', onclick);
    }
    menu.appendChild(item);
    return item;
  };

  // Determine current window state
  const isMinimized = win.style.display === 'none';
  const isFullScreen = windowStates[windowId] && windowStates[windowId].fullScreen;

  // Add context menu items
  if (isMinimized) {
    addItem('Restore', false, () => {
      bringToFront(win);
      if (typeof hideContextMenu === 'function') hideContextMenu();
    });
  } else {
    addItem('Minimize', false, () => {
      minimizeWindow(windowId);
      if (typeof hideContextMenu === 'function') hideContextMenu();
    });
  }

  if (!isFullScreen) {
    addItem('Maximize', false, () => {
      toggleFullScreen(windowId);
      if (typeof hideContextMenu === 'function') hideContextMenu();
    });
  }

  addItem('Close', false, () => {
    closeWindow(windowId);
    if (typeof hideContextMenu === 'function') hideContextMenu();
  });

  // Position the menu
  // First, show the menu to get its dimensions
  menu.classList.remove('hidden');

  const menuRect = menu.getBoundingClientRect();
  const taskbarHeight = 48; // Taskbar height (h-12 = 3rem = 48px)

  // Position horizontally
  let leftPos = e.pageX;
  if (leftPos + menuRect.width > window.innerWidth) {
    leftPos = window.innerWidth - menuRect.width - 10;
  }

  // Position vertically (above the taskbar)
  let topPos = window.innerHeight - taskbarHeight - menuRect.height - 5;

  menu.style.left = leftPos + 'px';
  menu.style.top = topPos + 'px';

  // Hide menu on next click
  setTimeout(() => {
    if (typeof hideContextMenu === 'function') {
      document.addEventListener('click', hideContextMenu, { once: true });
    }
  }, 0);
}
