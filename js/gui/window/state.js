import { windowStates, navWindows, highestZ, setHighestZ, saveState, activeMediaWindow, setActiveMediaWindow } from '../../os/manage_data.js';
import { showCustomScrollbars, hideCustomScrollbars } from '../../os/custom_scrollbars.js';
import { makeDraggable, makeResizable } from './interaction.js';
import { clampWindowToViewport } from './utils.js';

export function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) {
    const wasMaximized = windowStates[windowId] && windowStates[windowId].fullScreen;

    win.style.display = 'none';
    win.setAttribute('aria-hidden', 'true');
    if (windowStates[windowId]) {
      windowStates[windowId].isMinimized = true;
      saveState();
    }
    const tab = document.getElementById('tab-' + windowId);
    if (tab) {
      tab.classList.remove('bg-gray-50');
      tab.setAttribute('aria-pressed', 'false');
    }

    // If we just minimized a maximized window, check if any other windows are still maximized
    if (wasMaximized) {
      const hasOtherMaximizedWindows = Object.values(windowStates).some(state =>
        state.fullScreen && !state.isMinimized
      );

      // If no other maximized windows exist, show scrollbars and enable scrolling
      if (!hasOtherMaximizedWindows) {
        if (typeof showCustomScrollbars === 'function') {
          showCustomScrollbars();
        }
        const stage = document.getElementById('desktop-stage');
        if (stage) {
          stage.style.overflow = 'scroll';
        }
      }
    }
  }
}

export function bringToFront(win) {
  let needsSave = false;

  // --- Sync highestZ with actual DOM before proceeding ---
  try {
    const windowContainer = document.getElementById('windows-container');
    if (windowContainer) {
      let realMax = highestZ;
      // Only consider direct child windows (avoid menus, overlays outside container)
      const children = windowContainer.children;
      for (let i = 0; i < children.length; i++) {
        const z = parseInt(getComputedStyle(children[i]).zIndex) || 0;
        if (z > realMax) realMax = z;
      }
      if (realMax > highestZ) {
        // Update stored highestZ so we don't assign a lower z-index than an existing window
        setHighestZ(realMax);
      }
    }
  } catch (e) {
    // Fail silently; syncing is a safety enhancement, not critical path
    // console.debug('bringToFront sync failed', e);
  }

  // Store maximized windows before bringing to front
  const wasMaximized = windowStates[win.id] && windowStates[win.id].fullScreen;
  const maximizedWindows = Object.keys(windowStates)
    .filter(id => windowStates[id].fullScreen)
    .map(id => document.getElementById(id))
    .filter(w => w);

  if (win.style.display === 'none') {
    win.style.display = 'block';
    win.setAttribute('aria-hidden', 'false');
    if (windowStates[win.id]) {
      windowStates[win.id].isMinimized = false;
      needsSave = true;
    }

    // Update corresponding tab
    const tab = document.getElementById('tab-' + win.id);
    if (tab) {
      tab.setAttribute('aria-pressed', 'true');
    }

    // If window being restored is maximized, hide scrollbars
    if (wasMaximized) {
      if (typeof hideCustomScrollbars === 'function') {
        hideCustomScrollbars();
      }
      const stage = document.getElementById('desktop-stage');
      if (stage) {
        stage.style.overflow = 'hidden';
      }
    }

    // If window being restored is not maximized, minimize all currently maximized windows
    if (!wasMaximized && maximizedWindows.length > 0) {
      maximizedWindows.forEach(maxWin => {
        if (maxWin.id !== win.id) {
          minimizeWindow(maxWin.id);
        }
      });
      // Show scrollbars since we're going back to desktop
      if (typeof showCustomScrollbars === 'function') {
        showCustomScrollbars();
      }
      const stage = document.getElementById('desktop-stage');
      if (stage) {
        stage.style.overflow = 'scroll';
      }
    }
  }

  // If bringing a maximized window to front, restore it and show scrollbars
  if (wasMaximized) {
    // Re-maximize all previously maximized windows
    maximizedWindows.forEach(maxWin => {
      if (windowStates[maxWin.id] && windowStates[maxWin.id].fullScreen) {
        // Ensure they stay maximized
        const stage = document.getElementById('desktop-stage');
        const scrollLeft = stage ? stage.scrollLeft : 0;
        const scrollTop = stage ? stage.scrollTop : 0;
        maxWin.style.left = scrollLeft + 'px';
        maxWin.style.top = scrollTop + 'px';
      }
    });
  }

  setHighestZ(highestZ + 1);
  win.style.zIndex = highestZ;

  // Save z-index to windowStates
  if (windowStates[win.id]) {
    windowStates[win.id].zIndex = highestZ;
    needsSave = true;
  }

  if (needsSave) {
    saveState();
  }

  document.querySelectorAll('#window-tabs > div').forEach(tab => tab.classList.remove('bg-gray-50'));
  const activeTab = document.getElementById('tab-' + win.id);
  if (activeTab) {
    activeTab.classList.add('bg-gray-50');
  }
  if (win.querySelector("video, audio")) {
    setActiveMediaWindow(win.id);
    if (typeof updateMediaControl === 'function') updateMediaControl();
  }
}

export function closeWindow(windowId) {
  const wasMaximized = windowStates[windowId] && windowStates[windowId].fullScreen;

  const win = document.getElementById(windowId);
  if (win) win.remove();
  const tab = document.getElementById('tab-' + windowId);
  if (tab) tab.remove();
  if (activeMediaWindow === windowId) {
    setActiveMediaWindow(null);
    if (typeof updateMediaControl === 'function') updateMediaControl();
  }
  delete windowStates[windowId];
  for (const key in navWindows) {
    if (navWindows[key] === windowId) { delete navWindows[key]; break; }
  }

  // If we just closed a maximized window, check if any other windows are still maximized
  if (wasMaximized) {
    const hasOtherMaximizedWindows = Object.values(windowStates).some(state =>
      state.fullScreen && !state.isMinimized
    );

    // If no other maximized windows exist, show scrollbars and enable scrolling
    if (!hasOtherMaximizedWindows) {
      if (typeof showCustomScrollbars === 'function') {
        showCustomScrollbars();
      }
      const stage = document.getElementById('desktop-stage');
      if (stage) {
        stage.style.overflow = 'scroll';
      }
    }
  }

  saveState();
}

export function toggleFullScreen(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  let state = windowStates[winId];

  // Get current scroll position (instead of pan transform)
  const stage = document.getElementById('desktop-stage');
  const scrollLeft = stage ? stage.scrollLeft : 0;
  const scrollTop = stage ? stage.scrollTop : 0;

  if (!state.fullScreen) {
    state.originalDimensions = state.dimensions;
    state.originalPosition = state.position;

    // Position relative to current scroll position to align with viewport
    win.style.left = scrollLeft + "px";
    win.style.top = scrollTop + "px";

    // Use viewport units to fill the screen regardless of parent size
    win.style.width = "100vw";
    win.style.height = "calc(100vh - 48px)"; // Subtract taskbar height (h-12 = 48px)
    win.style.maxWidth = "none";
    win.style.maxHeight = "none";

    state.dimensions = { type: 'viewport' };
    state.fullScreen = true;

    // Hide scrollbars when maximizing
    if (typeof hideCustomScrollbars === 'function') {
      hideCustomScrollbars();
    }

    // Disable scrolling on stage while maximized
    if (stage) {
      stage.style.overflow = 'hidden';
    }
  } else {
    if (state.originalDimensions && state.originalPosition) {
      win.style.left = state.originalPosition.left;
      win.style.top = state.originalPosition.top;
      win.style.width = state.originalDimensions.width + "px";
      win.style.height = state.originalDimensions.height + "px";
      state.dimensions = state.originalDimensions;
    } else {
      win.style.left = "15%";
      win.style.top = "15%";
      win.style.width = "70vw";
      win.style.height = "70vh";
      state.dimensions = { type: 'integer', width: window.innerWidth * 0.7, height: window.innerHeight * 0.7 };
    }
    state.fullScreen = false;
    makeDraggable(win);
    makeResizable(win);
    // Re-clamp after restoring
    setTimeout(() => clampWindowToViewport(win), 0);

    // Check if any other windows are still maximized
    const hasMaximizedWindows = Object.values(windowStates).some(s => s.fullScreen);

    if (!hasMaximizedWindows) {
      // Show scrollbars when no windows are maximized
      if (typeof showCustomScrollbars === 'function') {
        showCustomScrollbars();
      }

      // Re-enable scrolling on stage
      if (stage) {
        stage.style.overflow = 'scroll';
      }
    }
  }
  saveState();
}

// Listen for scroll changes to keep fullscreen windows aligned
if (typeof window !== 'undefined') {
  const stage = document.getElementById('desktop-stage');
  if (stage) {
    stage.addEventListener('scroll', () => {
      Object.values(windowStates).forEach(state => {
        if (state.fullScreen) {
          const win = document.getElementById(state.id);
          if (win) {
            win.style.left = stage.scrollLeft + 'px';
            win.style.top = stage.scrollTop + 'px';
          }
        }
      });
    }, { passive: true });
  }
}

export function closeActiveWindow() {
  // Find the window with the highest z-index (active window)
  const allWindows = Array.from(document.querySelectorAll('#windows-container > div'))
    .filter(win => win.style.display !== 'none' && win.id !== 'taskbar');

  if (allWindows.length === 0) {
    return; // No windows to close
  }

  // Sort by z-index and get the top window
  allWindows.sort((a, b) => {
    const aZ = parseInt(a.style.zIndex) || 0;
    const bZ = parseInt(b.style.zIndex) || 0;
    return bZ - aZ;
  });

  const activeWindow = allWindows[0];
  if (activeWindow) {
    closeWindow(activeWindow.id);

    // Announce window closure for accessibility
    const windowTitle = activeWindow.querySelector('.window-title')?.textContent || 'Unknown Window';
    let announceElement = document.getElementById('window-cycle-announce');
    if (!announceElement) {
      announceElement = document.createElement('div');
      announceElement.id = 'window-cycle-announce';
      announceElement.className = 'sr-only';
      announceElement.setAttribute('aria-live', 'polite');
      announceElement.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announceElement);
    }
    announceElement.textContent = `Closed ${windowTitle}`;
  }
}

export function minimizeActiveWindow() {
  // Find the window with the highest z-index (active window)
  const allWindows = Array.from(document.querySelectorAll('#windows-container > div'))
    .filter(win => win.style.display !== 'none' && win.id !== 'taskbar');

  if (allWindows.length === 0) {
    return; // No windows to minimize
  }

  // Sort by z-index and get the top window
  allWindows.sort((a, b) => {
    const aZ = parseInt(a.style.zIndex) || 0;
    const bZ = parseInt(b.style.zIndex) || 0;
    return bZ - aZ;
  });

  const activeWindow = allWindows[0];
  if (activeWindow) {
    minimizeWindow(activeWindow.id);

    // Announce window minimization for accessibility
    const windowTitle = activeWindow.querySelector('.window-title')?.textContent || 'Unknown Window';
    let announceElement = document.getElementById('window-cycle-announce');
    if (!announceElement) {
      announceElement = document.createElement('div');
      announceElement.id = 'window-cycle-announce';
      announceElement.className = 'sr-only';
      announceElement.setAttribute('aria-live', 'polite');
      announceElement.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announceElement);
    }
    announceElement.textContent = `Minimized ${windowTitle}`;
  }
}
