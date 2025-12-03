import { windowStates, navWindows, highestZ, setHighestZ, saveState } from '../../os/manage_data.js';
import { getSettingsContent } from '../desktop.js';
import { setupFolderDrop } from '../../apps/file_explorer/drag_and_drop.js';
import { minimizeWindow, toggleFullScreen, closeWindow, bringToFront } from './state.js';
import { showTaskbarContextMenu } from './context_menu.js';
import { getAppIcon, clampWindowToViewport } from './utils.js';
import { makeDraggable, makeResizable } from './interaction.js';

export function createWindow(title, content, isNav = false, windowId = null, initialMinimized = false, restore = false, dimensions = { type: 'default' }, windowType = 'default', parentWin = null, color = 'white', zIndex = null, icon = null) {
  let contentToPrint = content;
  if (!windowId) {
    windowId = 'window-' + Date.now();
  }
  if (windowType === 'Settings') {
    contentToPrint = getSettingsContent();
  }
  if (windowType === 'Explorer') {
    // getExplorerWindowContent is expected to be global or imported elsewhere if needed,
    // but in original file it was not imported. Assuming global or handled by caller.
    // If it's not available, we fallback to content.
    if (typeof getExplorerWindowContent === 'function') {
        contentToPrint = content || getExplorerWindowContent();
    } else {
        contentToPrint = content;
    }
  }
  if (windowType === 'App') {
    contentToPrint = content;
  }
  let styleDimensions = "";
  if (dimensions.type === 'integer') {
  // Keep max-width to prevent overflow horizontally on small devices; allow full height
  styleDimensions = `width: ${dimensions.width}px; height: ${dimensions.height}px; max-width:100%;`;
  } else {
    styleDimensions = "width: 100%; height: 100%;";
  }
  const win = document.createElement('div');
  win.id = windowId;
  win.className = `absolute border border-gray-500 shadow-lg overflow-auto z-20`;
  win.style.cssText = styleDimensions;
  win.style.minWidth = "320px";
  win.style.minHeight = "200px";

  // Set custom app icon if provided
  if (icon) {
    win.dataset.customAppIcon = icon;
  }

  // Add ARIA attributes for accessibility
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', title);
  win.setAttribute('aria-modal', 'false'); // Not true modal since multiple windows can be open

  if (initialMinimized) {
    win.style.display = 'none';
    win.setAttribute('aria-hidden', 'true');
  } else {
    win.setAttribute('aria-hidden', 'false');
  }

  // Clear existing content
  win.textContent = ''

  const container = document.createElement('div')
  container.className = 'relative w-full h-[calc(100%-2.5rem)]'

  // --- Header Bar ---
  const header = document.createElement('div')
  header.className = 'bg-handlebar-blue sticky top-0 left-0 text-white px-2 py-1 flex justify-between items-center cursor-move'
  header.style.backgroundColor = '#003f7f'
  header.setAttribute('role', 'banner')

  const titleSpan = document.createElement('span')
  titleSpan.textContent = title
  titleSpan.className = 'window-title flex-1 truncate pr-2'
  titleSpan.style.maxWidth = 'calc(100% - 120px)' // Reserve space for the 3 buttons (40px each)
  titleSpan.id = `${windowId}-title`

  const buttonContainer = document.createElement('div')
  buttonContainer.className = 'my-1 flex-shrink-0'
  buttonContainer.setAttribute('role', 'group')
  buttonContainer.setAttribute('aria-label', 'Window controls')

  // Minimize button
  const minimizeBtn = document.createElement('button')
  minimizeBtn.id = `minimizeWindow-${windowId}`
  minimizeBtn.className = 'bg-yellow-500 h-6 w-6 text-white'
  minimizeBtn.textContent = '_'
  minimizeBtn.setAttribute('aria-label', `Minimize ${title}`)
  minimizeBtn.setAttribute('title', 'Minimize window')
  minimizeBtn.addEventListener('click', (event) => { minimizeWindow(windowId); event.stopPropagation(); });

  // Fullscreen toggle button
  const fullscreenBtn = document.createElement('button')
  fullscreenBtn.id = `toggleFullScreen-${windowId}`
  fullscreenBtn.className = 'bg-green-500 h-6 w-6 text-white ml-1'
  fullscreenBtn.textContent = '⛶'
  fullscreenBtn.setAttribute('aria-label', `Toggle fullscreen for ${title}`)
  fullscreenBtn.setAttribute('title', 'Toggle fullscreen')
  fullscreenBtn.addEventListener('click', (event) => { toggleFullScreen(windowId); event.stopPropagation(); });

  // Close button
  const closeBtn = document.createElement('button')
  closeBtn.id = `closeWindow-${windowId}`
  closeBtn.className = 'bg-red-500 h-6 w-6 text-white ml-1'
  closeBtn.textContent = 'X'
  closeBtn.setAttribute('aria-label', `Close ${title}`)
  closeBtn.setAttribute('title', 'Close window')
  closeBtn.addEventListener('click', (event) => { closeWindow(windowId); event.stopPropagation();});

  // Append buttons
  buttonContainer.append(minimizeBtn, fullscreenBtn, closeBtn)
  header.append(titleSpan, buttonContainer)

  // --- Content Area ---
  const contentDiv = document.createElement('div')
  contentDiv.className = `p-2 bg-${color} h-full ${windowType === 'editor' ? 'w-full' : ''} overflow-auto`
  contentDiv.innerHTML = contentToPrint
  contentDiv.setAttribute('role', 'main')
  contentDiv.setAttribute('aria-labelledby', `${windowId}-title`)

  if (windowType === 'default') {
    contentDiv.setAttribute('role', 'textbox')
    contentDiv.setAttribute('aria-label', `Editable content for ${title}`)
    contentDiv.addEventListener('input', () => {
      if (typeof updateContent === 'function') {
        updateContent(windowId, contentDiv.innerHTML)
      }
    })
  }

  // Setup drag and drop for Explorer windows
  if (windowType === 'Explorer') {
    setTimeout(() => {
      if (typeof setupFolderDrop === 'function') {
        setupFolderDrop();
      }
    }, 50);
  }

  // Assemble window
  container.append(header, contentDiv)
  win.appendChild(container)

  // Apply z-index if provided (for restoration)
  if (zIndex !== undefined && zIndex !== null) {
    win.style.zIndex = zIndex;
    // Update highestZ if this restored window has a higher z-index
    if (parseInt(zIndex) > highestZ) {
      setHighestZ(parseInt(zIndex));
    }
  } else {
    // New window - first sync with actual DOM to avoid stale highestZ
    try {
      const windowContainer = document.getElementById('windows-container');
      if (windowContainer) {
        let realMax = highestZ;
        const children = windowContainer.children;
        for (let i = 0; i < children.length; i++) {
          const z = parseInt(getComputedStyle(children[i]).zIndex) || 0;
          if (z > realMax) realMax = z;
        }
        if (realMax > highestZ) {
          setHighestZ(realMax);
        }
      }
    } catch (_) {}
    setHighestZ(highestZ + 1);
    win.style.zIndex = highestZ;
  }

  // Use capture phase so z-index promotion occurs BEFORE inner click handlers that may
  // create new dialog windows. Without capture, the sequence was:
  // 1) Button inside window handles click and creates a dialog (assigning z = currentHighest+1)
  // 2) Event bubbles to parent window listener which then increments highestZ and
  //    promotes the parent ABOVE the newly created dialog, obscuring it.
  // By promoting in the capture phase, the dialog created later in target/bubble phases
  // will always receive a higher z-index than the parent, keeping it visible.
  win.addEventListener('click', function () {
    bringToFront(win);
  }, true);
  document.getElementById('windows-container').appendChild(win);

  const tab = document.createElement('div');
  tab.id = 'tab-' + windowId;
  tab.className = 'bg-gray-200 border border-gray-500 px-2 py-1 cursor-pointer flex items-center';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-label', `${title} window tab`);
  tab.setAttribute('aria-pressed', !initialMinimized ? 'true' : 'false');
  tab.setAttribute('tabindex', '0');

  // Get app icon and create tab content
  const appIcon = getAppIcon(windowId, title);
  if (appIcon) {
    const iconImg = document.createElement('img');
    iconImg.src = appIcon;
    iconImg.className = 'h-4 w-4 mr-2';
    iconImg.alt = '';  // Decorative icon, tab already has aria-label
    tab.appendChild(iconImg);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    tab.appendChild(titleSpan);
  } else {
    tab.textContent = title;
  }

  const handleTabActivation = function () {
    if (win.style.display === 'none') {
      bringToFront(win);
      tab.setAttribute('aria-pressed', 'true');
    } else {
      minimizeWindow(win.id);
      tab.setAttribute('aria-pressed', 'false');
    }
  };

  tab.onclick = handleTabActivation;

  // Add keyboard support
  tab.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabActivation();
    }
  });

  // Add right-click context menu for taskbar tabs
  tab.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showTaskbarContextMenu(e, windowId, win);
  });

  document.getElementById('window-tabs').appendChild(tab);

  // Preserve existing window state if this is a restore operation
  const existingState = windowStates[windowId];
  const savedPosition = existingState ? existingState.position : null;
  const savedDimensions = existingState ? existingState.dimensions : dimensions;
  const savedFullScreen = existingState ? existingState.fullScreen : false;

  windowStates[windowId] = {
    id: windowId,
    title: title,
    content: contentToPrint,
    isNav: isNav,
    isMinimized: initialMinimized,
    dimensions: restore && existingState ? savedDimensions : dimensions,
    windowType: windowType,
    position: savedPosition,
    fullScreen: savedFullScreen,
    color: color,  // Store the background color
    zIndex: parseInt(win.style.zIndex) || highestZ  // Store the z-index
  };
  if (isNav) {
    navWindows[title] = windowId;
  }
  if (!initialMinimized) {
    bringToFront(win);
  }
  if (dimensions.type !== 'default') {
    if (restore && savedPosition) {
      win.style.left = savedPosition.left;
      win.style.top = savedPosition.top;
    }
    // Apply saved dimensions if restoring, but constrain to viewport
    if (restore && savedDimensions && savedDimensions.type === 'integer') {
      const vpWidth = window.innerWidth;
      const vpHeight = window.innerHeight - 48; // minus taskbar
      const headerHeight = 30;
      const maxWidth = vpWidth - 10;
      const maxHeight = vpHeight - headerHeight - 10;

      // Constrain dimensions to viewport while maintaining minimums
      const constrainedWidth = Math.max(320, Math.min(savedDimensions.width, maxWidth));
      const constrainedHeight = Math.max(200, Math.min(savedDimensions.height, maxHeight));

      win.style.width = constrainedWidth + 'px';
      win.style.height = constrainedHeight + 'px';

      // Update state with constrained dimensions
      if (windowStates[windowId]) {
        windowStates[windowId].dimensions = {
          type: 'integer',
          width: constrainedWidth,
          height: constrainedHeight
        };
      }
    }
    if (!restore || !savedPosition) {
      if (parentWin) {
        let parentLeft = parseInt(parentWin.style.left, 10) || 0;
        let parentTop = parseInt(parentWin.style.top, 10) || 0;
        let candidateLeft = parentLeft + 30;
        let candidateTop = parentTop + 30;
        let desktopWidth = window.innerWidth;
        let desktopHeight = window.innerHeight - 40;
        let newWidth = dimensions.width;
        let newHeight = dimensions.height;
        if (candidateLeft + newWidth > desktopWidth || candidateTop + newHeight > desktopHeight) {
          candidateLeft = 0;
          candidateTop = 0;
          const existingTopLeft = Array.from(document.querySelectorAll('#windows-container > div')).find(el => {
            return (parseInt(el.style.left, 10) || 0) <= 10 && (parseInt(el.style.top, 10) || 0) <= 10;
          });
          if (existingTopLeft) {
            candidateLeft = (parseInt(existingTopLeft.style.left, 10) || 0) + 30;
          }
        }
        win.style.left = candidateLeft + 'px';
        win.style.top = candidateTop + 'px';
      } else {
        win.style.left = "100px";
        win.style.top = "100px";
      }
    }
    makeDraggable(win);
    makeResizable(win);
  }
  if (!restore) {
    saveState();
  }
  // Clamp new window to current viewport if not fullscreen (mobile safety)
  try { clampWindowToViewport(win); } catch(_){}

  // Re-apply fullscreen state if window was maximized when saved
  if (restore && savedFullScreen) {
    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
      toggleFullScreen(windowId);
    }, 10);
  }

  return win;
}

export function openWindow(id, content = '', dimensions = { type: 'default' }, windowType = 'default', parentWin = null) {
  return createWindow(id, content === '' ? 'Content for ' + id : content, false, null, false, false, dimensions, windowType, parentWin);
}
