import { bringToFront } from './state.js';
import { getAppIcon } from './utils.js';

// Global variable to track current window in cycle
let windowCycleIndex = -1;
let isWindowCycling = false;
let cycleTimeout = null;

export function cycleWindows() {
  // Get all visible windows (not minimized)
  const allWindows = Array.from(document.querySelectorAll('#windows-container > div'))
    .filter(win => win.style.display !== 'none' && win.id !== 'taskbar');

  if (allWindows.length === 0) {
    return; // No windows to cycle through
  }

  if (allWindows.length === 1) {
    // Only one window, just bring it to front
    bringToFront(allWindows[0]);
    return;
  }

  // Sort windows by current z-index to maintain consistent cycling order
  allWindows.sort((a, b) => {
    const aZ = parseInt(a.style.zIndex) || 0;
    const bZ = parseInt(b.style.zIndex) || 0;
    return bZ - aZ; // Highest z-index first
  });

  // Show popup if not already cycling
  if (!isWindowCycling) {
    showWindowCyclePopup(allWindows);
    isWindowCycling = true;
    windowCycleIndex = 0;
  } else {
    // Increment cycle index
    windowCycleIndex = (windowCycleIndex + 1) % allWindows.length;
  }

  // Update popup selection
  updateWindowCycleSelection(windowCycleIndex);

  // Clear existing timeout (no longer auto-completing on timeout)
  if (cycleTimeout) {
    clearTimeout(cycleTimeout);
    cycleTimeout = null;
  }
}

function showWindowCyclePopup(windows) {
  const popup = document.getElementById('window-cycle-popup');
  const list = document.getElementById('window-cycle-list');

  if (!popup || !list) return;

  // Clear existing items
  list.innerHTML = '';

  // Create window items
  windows.forEach((win, index) => {
    const windowTitle = win.querySelector('.window-title')?.textContent || 'Unknown Window';
    const windowId = win.id;
    const appIcon = getAppIcon(windowId, windowTitle);

    const item = document.createElement('div');
    item.className = 'flex flex-col items-center p-3 border-2 border-transparent rounded-lg min-w-16 cursor-pointer hover:bg-gray-100 transition-all duration-200';
    item.setAttribute('data-window-index', index);

    // Add icon
    if (appIcon) {
      const iconImg = document.createElement('img');
      iconImg.src = appIcon;
      iconImg.className = 'h-8 w-8 mb-1';
      iconImg.alt = '';
      item.appendChild(iconImg);
    } else {
      // Fallback icon
      const iconDiv = document.createElement('div');
      iconDiv.className = 'h-8 w-8 mb-1 bg-gray-400 rounded flex items-center justify-center text-white text-sm';
      iconDiv.textContent = windowTitle.charAt(0);
      item.appendChild(iconDiv);
    }

    // Add title
    const titleSpan = document.createElement('span');
    titleSpan.className = 'text-xs text-center break-words max-w-16';
    titleSpan.textContent = windowTitle.length > 10 ? windowTitle.substring(0, 10) + '...' : windowTitle;
    item.appendChild(titleSpan);

    // Add click handler
    item.addEventListener('click', () => {
      windowCycleIndex = index;
      completeWindowCycle(windows[index]);
    });

    list.appendChild(item);
  });

  // Add click outside handler
  const handleClickOutside = (e) => {
    if (!list.contains(e.target)) {
      completeCurrentWindowCycle();
      popup.removeEventListener('click', handleClickOutside);
    }
  };
  popup.addEventListener('click', handleClickOutside);

  // Show popup with flex display
  popup.classList.remove('hidden');
  popup.style.display = 'flex';

  // Set initial selection
  updateWindowCycleSelection(0);
}

function updateWindowCycleSelection(index) {
  const items = document.querySelectorAll('#window-cycle-list > div');

  // Remove selection from all items
  items.forEach(item => {
    item.classList.remove('border-blue-500', 'bg-blue-100');
    item.classList.add('border-transparent');
    item.style.transform = 'translateY(0)';
    item.style.boxShadow = 'none';
  });

  // Highlight selected item
  if (items[index]) {
    items[index].classList.remove('border-transparent');
    items[index].classList.add('border-blue-500', 'bg-blue-100');
    items[index].style.transform = 'translateY(-2px)';
    items[index].style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
  }
}

function completeWindowCycle(selectedWindow) {
  if (!selectedWindow) return;

  // Bring the selected window to front
  bringToFront(selectedWindow);

  // Focus the window for screen reader accessibility
  selectedWindow.focus();

  // Hide popup
  const popup = document.getElementById('window-cycle-popup');
  if (popup) {
    popup.classList.add('hidden');
    popup.style.display = 'none';
  }

  // Reset cycling state
  isWindowCycling = false;
  windowCycleIndex = -1;

  if (cycleTimeout) {
    clearTimeout(cycleTimeout);
    cycleTimeout = null;
  }

  // Announce window switch for accessibility
  const windowTitle = selectedWindow.querySelector('.window-title')?.textContent || 'Unknown Window';
  let announceElement = document.getElementById('window-cycle-announce');
  if (!announceElement) {
    announceElement = document.createElement('div');
    announceElement.id = 'window-cycle-announce';
    announceElement.className = 'sr-only';
    announceElement.setAttribute('aria-live', 'polite');
    announceElement.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announceElement);
  }

  announceElement.textContent = `Switched to ${windowTitle}`;
}

// Export the complete function for use in keyboard handling
export function completeCurrentWindowCycle() {
  if (isWindowCycling) {
    const allWindows = Array.from(document.querySelectorAll('#windows-container > div'))
      .filter(win => win.style.display !== 'none' && win.id !== 'taskbar');

    if (allWindows.length > 0) {
      allWindows.sort((a, b) => {
        const aZ = parseInt(a.style.zIndex) || 0;
        const bZ = parseInt(b.style.zIndex) || 0;
        return bZ - aZ;
      });

      const selectedWindow = allWindows[windowCycleIndex] || allWindows[0];
      completeWindowCycle(selectedWindow);
    }
  }
}

// Helper for gestures to handle tab swiping
export function handleTabSwipe(direction) {
  // direction: 'left' or 'right'
  if (direction === 'left') {
    // Cycle backward: ensure popup exists then move selection left
    if (!isWindowCycling) {
      try { cycleWindows(); } catch(_){}
    }
    // Move selection left
    try {
      const items = document.querySelectorAll('#window-cycle-list > div');
      if (items.length) {
        // Emulate internal index movement
        windowCycleIndex = (windowCycleIndex - 1 + items.length) % items.length;
        updateWindowCycleSelection(windowCycleIndex);
      }
    } catch(_){}
    // Complete on short delay to feel snappy
    setTimeout(() => { try { completeCurrentWindowCycle(); } catch(_){} }, 10);
  } else if (direction === 'right') {
    try { cycleWindows(); } catch(_){}
    setTimeout(() => { try { completeCurrentWindowCycle(); } catch(_){} }, 10);
  }
}
