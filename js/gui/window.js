import { saveState, windowStates, navWindows, highestZ, activeMediaWindow, setHighestZ, setActiveMediaWindow } from '../os/manage_data.js';
import { setupFolderDrop } from '../apps/file_explorer/drag_and_drop.js';
import { toggleButtonActiveState } from './main.js';
import { getSettingsContent, updateDesktopSettings } from './desktop.js';

// Function to get app icon based on window ID or title
export function getAppIcon(windowId, title) {
  // Map of app window IDs to their icons
  const appIconMap = {
    'calculator': 'image/calculator.webp',
    'mediaplayer': 'image/video.webp',
    'bombbroomer': 'image/bombbroomer.webp',
    'solitaire': 'image/solitaire.webp',
    'pong': 'image/pong.webp',
    'snake': 'image/snake.webp',
    'happyturd': 'image/happyturd.webp',
    'chess': 'image/guillotine_chess.webp',
    'mailbox': 'image/mail.webp',
    'watercolour': 'image/watercolour.webp',
    'compostbin': 'image/compost-bin.webp',
    'storage': 'image/drive_c.webp',
    'explorer-window': 'image/computer.webp',
    'tubestream': 'image/video.webp'
  };

  // Map of window titles to their icons (for navigation windows and other special cases)
  const titleIconMap = {
    'Settings': 'image/gears.webp',
    'About This Computer': 'image/info.webp',
    'My Computer': 'image/computer.webp',
    'File Explorer': 'image/computer.webp',
    'Media Player': 'image/video.webp',
    'Calculator': 'image/calculator.webp',
    'Bombbroomer': 'image/bombbroomer.webp',
    'Solitaire': 'image/solitaire.webp',
    'Pong': 'image/pong.webp',
    'Snake': 'image/snake.webp',
    'Happy Turd': 'image/happyturd.webp',
    'Guillotine Chess': 'image/guillotine_chess.webp',
    'Chess': 'image/guillotine_chess.webp',
    'Inpeek Mailbox': 'image/mail.webp',
    'Watercolour': 'image/watercolour.webp',
    'Compost Bin': 'image/compost-bin.webp',
    'Storage Manager': 'image/drive_c.webp',
    'TubeStream': 'image/video.webp',
    'Security Policy': 'image/info.webp'
  };

  // Check by window ID first
  if (appIconMap[windowId]) {
    return appIconMap[windowId];
  }

  // Check by title
  if (titleIconMap[title]) {
    return titleIconMap[title];
  }

  // Special handling for file windows that may have IDs like file names
  if (windowId && windowId.includes('-')) {
    // Check if this might be a file window
    const lowerTitle = title.toLowerCase();
    const lowerWindowId = windowId.toLowerCase();

    // Image files
    if (lowerTitle.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i) ||
        lowerWindowId.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i)) {
      return 'image/image.webp';
    }

    // Video files
    if (lowerTitle.match(/\.(mp4|webm|avi|mov|mkv)$/i) ||
        lowerWindowId.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
      return 'image/video.webp';
    }

    // Audio files
    if (lowerTitle.match(/\.(mp3|wav|ogg|m4a|flac)$/i) ||
        lowerWindowId.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
      return 'image/audio.webp';
    }

    // Text/Document files
    if (lowerTitle.match(/\.(txt|md|doc|docx)$/i) ||
        lowerWindowId.match(/\.(txt|md|doc|docx)$/i) ||
        lowerTitle.includes('letterpad')) {
      return 'image/file.webp';
    }

    // HTML files
    if (lowerTitle.match(/\.(html|htm)$/i) ||
        lowerWindowId.match(/\.(html|htm)$/i)) {
      return 'image/html.webp';
    }
  }

  // Default icons for common window title patterns
  if (title.includes('LetterPad') || title.includes('.md') || title.includes('.txt')) {
    return 'image/file.webp';
  }

  if (title.includes('.jpg') || title.includes('.png') || title.includes('.gif') ||
      title.includes('.webp') || title.includes('.jpeg') || title.includes('.bmp') ||
      title.includes('.avif')) {
    return 'image/image.webp';
  }

  if (title.includes('.mp4') || title.includes('.webm') || title.includes('.avi') ||
      title.includes('.mov') || title.includes('.mkv')) {
    return 'image/video.webp';
  }

  if (title.includes('.mp3') || title.includes('.wav') || title.includes('.ogg') ||
      title.includes('.m4a') || title.includes('.flac')) {
    return 'image/audio.webp';
  }

  if (title.includes('.html') || title.includes('.htm')) {
    return 'image/html.webp';
  }

  // Return null for unknown window types (will fall back to text-only)
  return null;
}

export function createWindow(title, content, isNav = false, windowId = null, initialMinimized = false, restore = false, dimensions = { type: 'default' }, windowType = 'default', parentWin = null, color = 'white', zIndex = null) {
  let contentToPrint = content;
  if (!windowId) {
    windowId = 'window-' + Date.now();
  }
  if (windowType === 'Settings') {
    contentToPrint = getSettingsContent();
  }
  if (windowType === 'Explorer') {
    contentToPrint = content || getExplorerWindowContent();
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
      updateContent(windowId, contentDiv.innerHTML)
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
    // Apply saved dimensions if restoring
    if (restore && savedDimensions && savedDimensions.type === 'integer') {
      win.style.width = savedDimensions.width + 'px';
      win.style.height = savedDimensions.height + 'px';
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
  return win;
}

export function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) {
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
    updateMediaControl();
  }
}

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

export function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) win.remove();
  const tab = document.getElementById('tab-' + windowId);
  if (tab) tab.remove();
  if (activeMediaWindow === windowId) {
    setActiveMediaWindow(null);
    updateMediaControl();
  }
  delete windowStates[windowId];
  for (const key in navWindows) {
    if (navWindows[key] === windowId) { delete navWindows[key]; break; }
  }
  saveState();
}

function makeDraggable(el) {
  const header = el.querySelector('.cursor-move');
  if (!header) return;
  header.addEventListener('mousedown', function (e) {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    // Determine current pan offset from desktop-stage transform if present
    let panX = 0, panY = 0;
    const stage = document.getElementById('desktop-stage');
    if (stage) {
      const transform = getComputedStyle(stage).transform;
      if (transform && transform !== 'none') {
        const parts = transform.match(/matrix\(([^)]+)\)/);
        if (parts && parts[1]) {
          const nums = parts[1].split(',').map(n => parseFloat(n.trim()));
          if (nums.length === 6) { panX = nums[4]; panY = nums[5]; }
        }
      }
    }
    function mouseMoveHandler(e) {
      // Adjust for pan (stage translated by panX/panY)
      el.style.left = (e.clientX - offsetX - panX) + 'px';
      el.style.top = (e.clientY - offsetY - panY) + 'px';
    }
    function mouseUpHandler() {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      if (windowStates[el.id]) {
        windowStates[el.id].position = { left: el.style.left, top: el.style.top };
        saveState();
      }
    }
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    bringToFront(el);
  });
}

function makeResizable(el) {
  const resizer = document.createElement('div');
  // Make the resizer clearly above transient drag clones (z=1000) and easier to grab
  resizer.className = 'absolute bottom-0 right-0 w-6 h-6 cursor-se-resize';
  resizer.style.background = 'rgba(0,0,0,0.2)';
  resizer.style.zIndex = '1100';
  resizer.style.pointerEvents = 'auto';
  // Add a subtle border to make it more visible
  resizer.style.borderTop = '1px solid rgba(255,255,255,0.2)';
  resizer.style.borderLeft = '1px solid rgba(255,255,255,0.05)';
  el.appendChild(resizer);
  resizer.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
    const startHeight = parseInt(document.defaultView.getComputedStyle(el).height, 10);
    function doDrag(e) {
      const newWidth = Math.max(startWidth + e.clientX - startX, 350);
      const newHeight = Math.max(startHeight + e.clientY - startY, 200);
      el.style.width = newWidth + 'px';
      el.style.height = newHeight + 'px';
    }
    function stopDrag() {
      document.documentElement.removeEventListener('mousemove', doDrag, false);
      document.documentElement.removeEventListener('mouseup', stopDrag, false);
      windowStates[el.id].dimensions = { type: 'integer', width: parseInt(el.style.width), height: parseInt(el.style.height) };
      saveState();
    }
    document.documentElement.addEventListener('mousemove', doDrag, false);
    document.documentElement.addEventListener('mouseup', stopDrag, false);
  });
}

export function toggleFullScreen(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  let state = windowStates[winId];
  if (!state.fullScreen) {
    state.originalDimensions = state.dimensions;
    state.originalPosition = state.position;
    win.style.left = "0px";
    win.style.top = "0px";
    win.style.width = window.innerWidth + "px";
    win.style.height = (window.innerHeight - 40) + "px";
    state.dimensions = { type: 'default' };
    state.fullScreen = true;
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
  }
  saveState();
}

function openWindow(id, content = '', dimensions = { type: 'default' }, windowType = 'default', parentWin = null) {
  return createWindow(id, content === '' ? 'Content for ' + id : content, false, null, false, false, dimensions, windowType, parentWin);
}

export function showDialogBox(message, dialogType, onConfirm = null, onCancel = null, options = {}) {
  // Treat both 'confirmation' and legacy 'confirm' as confirmation prompts. Add 'prompt' type.
  const isConfirmationType = dialogType === 'confirmation' || dialogType === 'confirm';
  const isPrompt = dialogType === 'prompt';
  // Use promptWindow- prefix for any confirmation/prompt style dialog (transient, not persisted)
  const uniqueWindowId = (isConfirmationType || isPrompt ? 'promptWindow-' : 'dialogWindow-') + Date.now();

  // Determine if this is a confirmation dialog that needs OK/Cancel buttons
  const isConfirmationDialog = isConfirmationType && (onConfirm || onCancel);

  // Create the HTML content as a string instead of DOM elements
  let dialogContent;

  if (isPrompt) {
    const defaultValue = options.defaultValue || '';
    dialogContent = `
      <div class="flex flex-col p-4 h-full justify-between">
        <div class="mb-4">
          <p class="text-sm mb-3">${message}</p>
          <input type="text" id="${uniqueWindowId}-input" value="${defaultValue.replace(/"/g,'&quot;')}" class="w-full px-2 py-1 border-2 border-gray-400 bg-white" style="border-top-color:#808080; border-left-color:#808080; border-bottom-color:#ffffff; border-right-color:#ffffff; border-style: inset;" aria-label="Text input for prompt dialog" title="Enter your response here" />
        </div>
        <div class="flex gap-2 justify-center">
          <button id="${uniqueWindowId}-ok-button" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">OK</span></button>
          <button id="${uniqueWindowId}-cancel-button" class="bg-gray-200 border-t-2 border-l-2 border-gray-300"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span></button>
        </div>
      </div>
    `;
  } else if (isConfirmationDialog) {
    dialogContent = `
      <div class="text-center p-4">
        <h2 class="text-lg mb-4">${message}</h2>
        <div class="flex gap-2 justify-center">
          <button id="${uniqueWindowId}-ok-button" class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300" style="border-style: outset;">
            OK
          </button>
          <button id="${uniqueWindowId}-cancel-button" class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300" style="border-style: outset;">
            Cancel
          </button>
        </div>
      </div>
    `;
  } else {
    dialogContent = `
      <div class="text-center p-4">
        <h2 class="text-lg mb-4">${message}</h2>
        <button id="${uniqueWindowId}-button" class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300" style="border-style: outset;">
          OK
        </button>
      </div>
    `;
  }

  let title = '⚠️ Information';
  if (isPrompt) {
    title = '💬 Input Required';
    announceToScreenReader(message, 'polite');
  } else if (isConfirmationType) {
    title = isConfirmationDialog ? '⚠️ Confirmation' : '✅ Success';
    announceToScreenReader(message, 'polite');
  } else if (dialogType === 'error') {
    title = '⚠️ Error';
    const errorAudio = document.getElementById('error-popup-audio');
    if (errorAudio) errorAudio.play();
    announceToScreenReader(message, 'assertive');
  }

  const dialogWindow = createWindow(title, dialogContent, false, uniqueWindowId, false, false, { type: 'integer', width: 350, height: 180 }, "default");

  // Ensure dialog is always on top by bringing it to front immediately
  // Use both immediate call and a slight delay to handle any race conditions
  bringToFront(dialogWindow);
  setTimeout(() => {
    bringToFront(dialogWindow);
  }, 10);

  // Add event listeners after the window is created
  setTimeout(() => {
    if (isPrompt) {
      const okButton = document.getElementById(`${uniqueWindowId}-ok-button`);
      const cancelButton = document.getElementById(`${uniqueWindowId}-cancel-button`);
      const inputField = document.getElementById(`${uniqueWindowId}-input`);

      if (inputField) {
        setTimeout(() => { inputField.focus(); inputField.select(); }, 10);
        inputField.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const value = inputField.value;
            closeWindow(uniqueWindowId);
            if (onConfirm) onConfirm(value);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closeWindow(uniqueWindowId);
            if (onCancel) onCancel(null);
          }
        });
      }

      if (okButton) {
        okButton.addEventListener('click', () => {
          const value = inputField ? inputField.value : '';
          closeWindow(uniqueWindowId);
          if (onConfirm) onConfirm(value);
        });
      }
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          if (onCancel) onCancel(null);
        });
      }
    } else if (isConfirmationDialog) {
      const okButton = document.getElementById(`${uniqueWindowId}-ok-button`);
      const cancelButton = document.getElementById(`${uniqueWindowId}-cancel-button`);

      if (okButton) {
        okButton.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          if (onConfirm) onConfirm();
        });
      }

      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          if (onCancel) onCancel();
        });
      }
  } else {
      const button = document.getElementById(`${uniqueWindowId}-button`);
      if (button) {
        button.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          // For backward compatibility, if onConfirm is provided for non-confirmation dialogs, call it
          if (onConfirm) onConfirm();
        });
      }
    }
  }, 100);

  return dialogWindow;
}

function announceToScreenReader(message, priority = 'polite') {
  const announcer = document.getElementById(priority === 'assertive' ? 'sr-alerts' : 'sr-announcements');
  announcer.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

document.addEventListener('click', e => {
  const btn = e.target.closest('#settings-apply-button');
  if (!btn) return;

  e.stopPropagation();

  showDialogBox(
    'Are you sure you want to apply these desktop settings changes?',
    'confirmation',
    () => {
      // Confirmed - apply the settings
      toggleButtonActiveState('settings-apply-button', 'Applied!');
      setTimeout(() => {
        toggleButtonActiveState('settings-apply-button', 'Apply');
      }, 1000);

      updateDesktopSettings();

      showDialogBox(
        'Your settings have successfully been saved!',
        'info'
      );
    }
  );
});

function showTaskbarContextMenu(e, windowId, win) {
  const menu = document.getElementById('context-menu');

  // Clear old entries
  menu.replaceChildren();
  menu.style.zIndex = (highestZ || 1000) + 100;

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
      hideContextMenu();
    });
  } else {
    addItem('Minimize', false, () => {
      minimizeWindow(windowId);
      hideContextMenu();
    });
  }

  if (!isFullScreen) {
    addItem('Maximize', false, () => {
      toggleFullScreen(windowId);
      hideContextMenu();
    });
  }

  addItem('Close', false, () => {
    closeWindow(windowId);
    hideContextMenu();
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
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 0);
}

// --- Mobile/ViewPort Safety Helpers ---
function clampWindowToViewport(win) {
  if (!win) return;
  const state = windowStates[win.id];
  if (state && state.fullScreen) return; // skip fullscreen
  const vpWidth = window.innerWidth;
  const vpHeight = window.innerHeight - 40; // minus taskbar
  // Current size
  const rect = win.getBoundingClientRect();
  let changed = false;
  // Constrain width/height if bigger than viewport
  if (rect.width > vpWidth) {
    win.style.width = Math.max(350, vpWidth - 10) + 'px';
    if (state) state.dimensions = { type: 'integer', width: parseInt(win.style.width), height: parseInt(win.style.height || rect.height) };
    changed = true;
  }

  // Reposition if off-screen (consider desktop-stage pan)
  let panX = 0, panY = 0;
  const stage = document.getElementById('desktop-stage');
  if (stage) {
    const tf = getComputedStyle(stage).transform;
    if (tf && tf !== 'none') {
      const m = tf.match(/matrix\(([^)]+)\)/);
      if (m) {
        const nums = m[1].split(',').map(n=>parseFloat(n.trim()));
        if (nums.length === 6) { panX = nums[4]; panY = nums[5]; }
      }
    }
  }
  const left = parseInt(win.style.left, 10) || 0;
  const top = parseInt(win.style.top, 10) || 0;
  let newLeft = left;
  let newTop = top;
  if (left + rect.width < -panX + 50) { newLeft = -panX + 20; changed = true; }
  if (top + rect.height < -panY + 50) { newTop = -panY + 20; changed = true; }
  if (left > -panX + vpWidth - 50) { newLeft = -panX + vpWidth - rect.width - 20; changed = true; }
  if (top > -panY + vpHeight - 50) { newTop = -panY + vpHeight - rect.height - 20; changed = true; }
  win.style.left = newLeft + 'px';
  win.style.top = newTop + 'px';
  if (changed && state) {
    state.position = { left: win.style.left, top: win.style.top };
    saveState();
  }
}

// Re-clamp all visible windows on resize (debounced)
let clampTimer = null;
window.addEventListener('resize', () => {
  if (clampTimer) cancelAnimationFrame(clampTimer);
  clampTimer = requestAnimationFrame(() => {
    document.querySelectorAll('#windows-container > div').forEach(w => clampWindowToViewport(w));
  });
});

// --- Touch Gesture Support (mobile-friendly shortcuts) ---
// Adds:
// - Swipe left/right on taskbar tabs area to cycle windows (Alt+Tab equivalent)
// - Two-finger tap on desktop to show desktop (minimize all)
// - Two-finger swipe on window header: up = maximize/restore, down = minimize
// This runs once on touch-capable devices.
(function setupTouchGesturesOnce(){
  if (typeof window === 'undefined') return;
  if (window.__touchGesturesSetup) return;
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  window.__touchGesturesSetup = true;

  // Helper: add horizontal swipe detection
  function addHorizontalSwipe(el, { threshold = 50, onLeft, onRight } = {}) {
    if (!el) return;
    let startX = 0, startY = 0, moved = false;
    el.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; moved = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      moved = true;
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
          // Horizontal swipe
          if (dx < 0 && typeof onLeft === 'function') onLeft(e);
          if (dx > 0 && typeof onRight === 'function') onRight(e);
        }
      }
    }, { passive: true });
  }

  // Helper: two-finger tap (quick) detection
  function addTwoFingerTap(el, { maxDuration = 300, maxMove = 15, onTap } = {}) {
    if (!el) return;
    let startTime = 0;
    let startTouches = [];
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        startTime = Date.now();
        startTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
      } else {
        startTime = 0; startTouches = [];
      }
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (!startTime) return;
      const duration = Date.now() - startTime;
      if (duration > maxDuration) { startTime = 0; return; }
      // Check movement
      const changed = e.changedTouches;
      if (!changed || changed.length < 1) { startTime = 0; return; }
      let moved = false;
      Array.from(changed).forEach((t, i) => {
        const ref = startTouches[i] || startTouches[0];
        if (!ref) return;
        if (Math.hypot(t.clientX - ref.x, t.clientY - ref.y) > maxMove) moved = true;
      });
      if (!moved && typeof onTap === 'function') {
        onTap(e);
      }
      startTime = 0; startTouches = [];
    }, { passive: true });
  }

  // Helper: two-finger vertical swipe on headers
  function addTwoFingerHeaderSwipe({ threshold = 60 } = {}) {
    let startY = 0; let active = false; let targetWinId = null;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const header = e.target.closest('.cursor-move');
        if (header) {
          startY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          active = true;
          const win = header.closest('[role="dialog"]');
          targetWinId = win ? win.id : null;
        }
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      // passive true, do not block scroll unless we detect big gesture on header
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!active) return;
      const header = e.target.closest('.cursor-move');
      if (!header) { active = false; targetWinId = null; return; }
      const avgY = (e.changedTouches[0]?.clientY ?? startY);
      const dy = avgY - startY;
      const winId = targetWinId;
      active = false; targetWinId = null;
      if (!winId) return;
      if (dy > threshold) {
        // Swipe down: minimize
        if (typeof minimizeWindow === 'function') minimizeWindow(winId);
      } else if (dy < -threshold) {
        // Swipe up: maximize/restore
        if (typeof toggleFullScreen === 'function') toggleFullScreen(winId);
      }
    }, { passive: true });
  }

  // 1) Taskbar swipe: cycle windows. Left = previous, Right = next.
  const tabs = document.getElementById('window-tabs');
  addHorizontalSwipe(tabs, {
    onLeft: () => {
      // Cycle backward: ensure popup exists then move selection left
      if (!window.__isWindowCycling) {
        try { cycleWindows(); } catch(_){}
      }
      // Move selection left
      try {
        const items = document.querySelectorAll('#window-cycle-list > div');
        if (items.length) {
          // Using internal state if available; otherwise decrement index visually
          if (typeof window !== 'undefined') {
            // Emulate internal index movement
            windowCycleIndex = (windowCycleIndex - 1 + items.length) % items.length;
            updateWindowCycleSelection(windowCycleIndex);
          }
        }
      } catch(_){}
      // Complete on short delay to feel snappy
      setTimeout(() => { try { completeCurrentWindowCycle(); } catch(_){} }, 10);
    },
    onRight: () => {
      try { cycleWindows(); } catch(_){}
      setTimeout(() => { try { completeCurrentWindowCycle(); } catch(_){} }, 10);
    }
  });

  // 2) Two-finger tap on desktop to show desktop (minimize all)
  const desktop = document.getElementById('desktop-stage') || document.body;
  addTwoFingerTap(desktop, { onTap: () => { try { if (typeof window.minimizeAllWindows === 'function') window.minimizeAllWindows(); } catch(_){} } });

  // 3) Two-finger swipe on window header to minimize/maximize
  addTwoFingerHeaderSwipe();

  // 4) Global long-press => synthesize contextmenu (for desktop, explorer, items, taskbar tabs)
  (function setupGlobalLongPressToContextMenu(){
    let pressTimer = null;
    let startX = 0, startY = 0;
    let moved = false;
    let startTarget = null;
    const LONG_PRESS_MS = 500;
    const MOVE_CANCEL = 12; // px

    function clearTimer(){ if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }

    document.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) { clearTimer(); return; }
      // Ignore editable fields
      const t = e.target.closest('input, textarea, [contenteditable="true"]');
      if (t) { clearTimer(); return; }
      const touch = e.touches[0];
      startX = touch.clientX; startY = touch.clientY;
      moved = false;
      startTarget = e.target;
      clearTimer();
      pressTimer = setTimeout(() => {
        // Determine target at press point (in case DOM changed)
        const targetAtPoint = document.elementFromPoint(startX, startY) || startTarget || document.body;
        const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: startX, clientY: startY });
        targetAtPoint.dispatchEvent(evt);
        clearTimer();
      }, LONG_PRESS_MS);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!pressTimer || !e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - startX) > MOVE_CANCEL || Math.abs(t.clientY - startY) > MOVE_CANCEL) {
        moved = true; clearTimer();
      }
    }, { passive: true });

    document.addEventListener('touchend', () => { clearTimer(); }, { passive: true });
    document.addEventListener('touchcancel', () => { clearTimer(); }, { passive: true });
  })();
})();
