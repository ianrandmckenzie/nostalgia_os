// Function to get app icon based on window ID or title
function getAppIcon(windowId, title) {
  // Map of app window IDs to their icons
  const appIconMap = {
    'calculator': 'image/calculator.png',
    'mediaplayer': 'image/video.png',
    'bombbroomer': 'image/bombbroomer.png',
    'solitaire': 'image/solitaire.png',
    'chess': 'image/guillotine_chess.png',
    'mailbox': 'image/mail.png',
    'watercolour': 'image/watercolour.png',
    'compostbin': 'image/compost-bin.png',
    'storage': 'image/drive_c.png',
    'explorer-window': 'image/computer.png',
    'tubestream': 'image/video.png'
  };

  // Map of window titles to their icons (for navigation windows and other special cases)
  const titleIconMap = {
    'Settings': 'image/gears.png',
    'About This Computer': 'image/info.png',
    'My Computer': 'image/computer.png',
    'File Explorer': 'image/computer.png',
    'Media Player': 'image/video.png',
    'Calculator': 'image/calculator.png',
    'Bombbroomer': 'image/bombbroomer.png',
    'Solitaire': 'image/solitaire.png',
    'Guillotine Chess': 'image/guillotine_chess.png',
    'Chess': 'image/guillotine_chess.png',
    'Inpeek Mailbox': 'image/mail.png',
    'Watercolour': 'image/watercolour.png',
    'Compost Bin': 'image/compost-bin.png',
    'Storage Manager': 'image/drive_c.png',
    'TubeStream': 'image/video.png'
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
      return 'image/image.png';
    }

    // Video files
    if (lowerTitle.match(/\.(mp4|webm|avi|mov|mkv)$/i) ||
        lowerWindowId.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
      return 'image/video.png';
    }

    // Audio files
    if (lowerTitle.match(/\.(mp3|wav|ogg|m4a|flac)$/i) ||
        lowerWindowId.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
      return 'image/audio.png';
    }

    // Text/Document files
    if (lowerTitle.match(/\.(txt|md|doc|docx)$/i) ||
        lowerWindowId.match(/\.(txt|md|doc|docx)$/i) ||
        lowerTitle.includes('letterpad')) {
      return 'image/file.png';
    }

    // HTML files
    if (lowerTitle.match(/\.(html|htm)$/i) ||
        lowerWindowId.match(/\.(html|htm)$/i)) {
      return 'image/html.png';
    }
  }

  // Default icons for common window title patterns
  if (title.includes('LetterPad') || title.includes('.md') || title.includes('.txt')) {
    return 'image/file.png';
  }

  if (title.includes('.jpg') || title.includes('.png') || title.includes('.gif') ||
      title.includes('.webp') || title.includes('.jpeg') || title.includes('.bmp') ||
      title.includes('.avif')) {
    return 'image/image.png';
  }

  if (title.includes('.mp4') || title.includes('.webm') || title.includes('.avi') ||
      title.includes('.mov') || title.includes('.mkv')) {
    return 'image/video.png';
  }

  if (title.includes('.mp3') || title.includes('.wav') || title.includes('.ogg') ||
      title.includes('.m4a') || title.includes('.flac')) {
    return 'image/audio.png';
  }

  if (title.includes('.html') || title.includes('.htm')) {
    return 'image/html.png';
  }

  // Return null for unknown window types (will fall back to text-only)
  return null;
}

function createWindow(title, content, isNav = false, windowId = null, initialMinimized = false, restore = false, dimensions = { type: 'default' }, windowType = 'default', parentWin = null, color = 'white') {
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
    styleDimensions = `width: ${dimensions.width}px; height: ${dimensions.height}px; max-width:100%; max-height:100%;`;
  } else {
    styleDimensions = "width: 100%; height: 100%;";
  }
  const win = document.createElement('div');
  win.id = windowId;
  win.className = `absolute border border-gray-500 shadow-lg overflow-auto z-20`;
  win.style.cssText = styleDimensions;
  win.style.minWidth = "350px";
  win.style.minHeight = "240px";
  if (initialMinimized) {
    win.style.display = 'none';
  }
  // Clear existing content
  win.textContent = ''

  const container = document.createElement('div')
  container.className = 'relative w-full h-[calc(100%-2.5rem)]'

  // --- Header Bar ---
  const header = document.createElement('div')
  header.className = 'bg-handlebarBlue sticky top-0 left-0 text-white px-2 py-1 flex justify-between items-center cursor-move'

  const titleSpan = document.createElement('span')
  titleSpan.textContent = title
  titleSpan.className = 'flex-1 truncate pr-2'
  titleSpan.style.maxWidth = 'calc(100% - 120px)' // Reserve space for the 3 buttons (40px each)

  const buttonContainer = document.createElement('div')
  buttonContainer.className = 'my-1 flex-shrink-0'

  // Minimize button
  const minimizeBtn = document.createElement('button')
  minimizeBtn.id = `minimizeWindow-${windowId}`
  minimizeBtn.className = 'bg-yellow-500 h-6 w-6 text-white'
  minimizeBtn.textContent = '_'
  minimizeBtn.addEventListener('click', (event) => { minimizeWindow(windowId); event.stopPropagation(); });

  // Fullscreen toggle button
  const fullscreenBtn = document.createElement('button')
  fullscreenBtn.id = `toggleFullScreen-${windowId}`
  fullscreenBtn.className = 'bg-green-500 h-6 w-6 text-white ml-1'
  fullscreenBtn.textContent = '⛶'
  fullscreenBtn.addEventListener('click', (event) => { toggleFullScreen(windowId); event.stopPropagation(); });

  // Close button
  const closeBtn = document.createElement('button')
  closeBtn.id = `closeWindow-${windowId}`
  closeBtn.className = 'bg-red-500 h-6 w-6 text-white ml-1'
  closeBtn.textContent = 'X'
  closeBtn.addEventListener('click', (event) => { closeWindow(windowId); event.stopPropagation();});

  // Append buttons
  buttonContainer.append(minimizeBtn, fullscreenBtn, closeBtn)
  header.append(titleSpan, buttonContainer)

  // --- Content Area ---
  const contentDiv = document.createElement('div')
  contentDiv.className = `p-2 bg-${color} h-full ${windowType === 'editor' ? 'w-full' : ''} overflow-auto`
  contentDiv.innerHTML = contentToPrint

  if (windowType === 'default') {
    contentDiv.contentEditable = 'true'
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
  win.addEventListener('click', function () {
    bringToFront(win);
  });
  document.getElementById('windows-container').appendChild(win);

  const tab = document.createElement('div');
  tab.id = 'tab-' + windowId;
  tab.className = 'bg-gray-200 border border-gray-500 px-2 py-1 cursor-pointer flex items-center';

  // Get app icon and create tab content
  const appIcon = getAppIcon(windowId, title);
  if (appIcon) {
    const iconImg = document.createElement('img');
    iconImg.src = appIcon;
    iconImg.className = 'h-4 w-4 mr-2';
    iconImg.alt = title;
    tab.appendChild(iconImg);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    tab.appendChild(titleSpan);
  } else {
    tab.textContent = title;
  }

  tab.onclick = function () {
    if (win.style.display === 'none') {
      bringToFront(win);
    } else {
      minimizeWindow(win.id);
    }
  };

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
    color: color  // Store the background color
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
  return win;
}

function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) {
    win.style.display = 'none';
    if (windowStates[windowId]) {
      windowStates[windowId].isMinimized = true;
      saveState();
    }
    const tab = document.getElementById('tab-' + windowId);
    if (tab) {
      tab.classList.remove('bg-gray-50');
    }
  }
}

function bringToFront(win) {
  if (win.style.display === 'none') {
    win.style.display = 'block';
    if (windowStates[win.id]) {
      windowStates[win.id].isMinimized = false;
      saveState();
    }
  }
  highestZ++;
  win.style.zIndex = highestZ;
  document.querySelectorAll('#window-tabs > div').forEach(tab => tab.classList.remove('bg-gray-50'));
  const activeTab = document.getElementById('tab-' + win.id);
  if (activeTab) {
    activeTab.classList.add('bg-gray-50');
  }
  if (win.querySelector("video, audio")) {
    activeMediaWindow = win.id;
    updateMediaControl();
  }
}

function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) win.remove();
  const tab = document.getElementById('tab-' + windowId);
  if (tab) tab.remove();
  if (activeMediaWindow === windowId) {
    activeMediaWindow = null;
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
    function mouseMoveHandler(e) {
      el.style.left = (e.clientX - offsetX) + 'px';
      el.style.top = (e.clientY - offsetY) + 'px';
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
  resizer.className = 'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize';
  resizer.style.background = 'rgba(0,0,0,0.2)';
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

function toggleFullScreen(winId) {
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

function showDialogBox(message, dialogType, onConfirm = null, onCancel = null) {
  const uniqueWindowId = 'dialogWindow-' + Date.now();

  // Determine if this is a confirmation dialog that needs OK/Cancel buttons
  const isConfirmationDialog = dialogType === 'confirmation' && (onConfirm || onCancel);

  // Create the HTML content as a string instead of DOM elements
  let dialogContent;

  if (isConfirmationDialog) {
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
  if (dialogType === 'confirmation') {
    title = isConfirmationDialog ? '⚠️ Confirmation' : '✅ Success';
  }
  if (dialogType === 'error') {
    title = '⚠️ Error';
    const errorAudio = document.getElementById('error-popup-audio');
    if (errorAudio) errorAudio.play();
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
    if (isConfirmationDialog) {
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
