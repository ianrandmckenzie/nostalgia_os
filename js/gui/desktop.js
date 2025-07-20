function makeIconDraggable(icon) {
  let isDragging = false;
  let startX, startY;
  let dragThreshold = 5; // Minimum distance to consider as drag
  let dragStartTime = 0; // Track when drag started to prevent conflicts with double-click

  // Use a unified pointer event system for both mouse and touch
  icon.addEventListener('pointerdown', function (e) {
    // Only handle primary pointer (left mouse button or first touch)
    if (!e.isPrimary) return;

    // Prevent text selection and other default behaviors
    e.preventDefault();

    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    dragStartTime = Date.now();

    const rect = icon.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    function pointerMoveHandler(e) {
      if (!e.isPrimary) return;

      const moveDistance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));

      if (!isDragging && moveDistance > dragThreshold) {
        // Start dragging
        isDragging = true;
        icon.classList.add('dragging');
        icon.style.zIndex = '1000'; // Bring to front while dragging

        // Add visual feedback for potential drop targets
        document.querySelectorAll('.desktop-folder-icon[data-item-id]').forEach(target => {
          const targetItem = getItemFromFileSystem(target.getAttribute('data-item-id'));
          const targetId = target.getAttribute('data-item-id');
          if (((targetItem && targetItem.type === 'folder') || targetId === 'compostbin') && target !== icon) {
            target.classList.add('drag-hover-target');
          }
        });

        // Disable scrolling on the desktop during drag
        document.body.style.overflow = 'hidden';
      }

      if (isDragging) {
        // Update icon position to follow cursor
        icon.style.left = (e.clientX - offsetX) + 'px';
        icon.style.top = (e.clientY - offsetY) + 'px';
        icon.style.position = 'absolute';

        // Constrain icon position within desktop bounds
        constrainIconPosition(icon);

        // Update visual feedback for drop targets
        updateDropTargetFeedback(e.clientX, e.clientY, icon);
      }
    }

    async function pointerUpHandler(e) {
      if (!e.isPrimary) return;

      document.removeEventListener('pointermove', pointerMoveHandler);
      document.removeEventListener('pointerup', pointerUpHandler);
      document.removeEventListener('pointercancel', pointerUpHandler);

      if (isDragging) {
        icon.style.zIndex = ''; // Reset z-index
        icon.classList.remove('dragging');

        // Check if dropped on a folder or file explorer window
        // Temporarily disable pointer events on the dragged element to get accurate elementFromPoint
        const originalPointerEvents = icon.style.pointerEvents;
        icon.style.pointerEvents = 'none';

        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);

        // Restore the icon pointer events
        icon.style.pointerEvents = originalPointerEvents;

        const targetFolder = elementBelow ? elementBelow.closest('.desktop-folder-icon[data-item-id]') : null;
        const targetExplorer = elementBelow ? elementBelow.closest('.file-explorer-window') : null;

        if (targetFolder && targetFolder !== icon) {
          const targetId = targetFolder.getAttribute('data-item-id');
          const targetItem = getItemFromFileSystem(targetId);
          const sourceId = icon.getAttribute('data-item-id');

          if (sourceId !== targetId) {
            // Special case for compost bin
            if (targetId === 'compostbin') {
              await moveItemToCompostBin(sourceId, 'C://Desktop');
              return; // Don't save position if moved to compost bin
            } else if (targetItem && targetItem.type === 'folder') {
              // Move the item into the folder
              await moveItemToFolder(sourceId, targetId);
              return; // Don't save position if moved to folder
            }
          }
        } else if (targetExplorer) {
          // Dropped on file explorer window
          const sourceId = icon.getAttribute('data-item-id');
          const explorerPath = targetExplorer.getAttribute('data-current-path');
          if (explorerPath && sourceId) {
            await moveItemToExplorerPath(sourceId, explorerPath);
            return; // Don't save position if moved to explorer
          }
        }

        // Save new position if just repositioned
        constrainIconPosition(icon); // Ensure final position is within bounds
        desktopIconsState[icon.id] = { left: icon.style.left, top: icon.style.top };
        saveState();
      }      // Remove visual feedback
      document.querySelectorAll('.drag-hover-target').forEach(target => {
        target.classList.remove('drag-hover-target');
      });
      document.querySelectorAll('.desktop-folder-icon').forEach(target => {
        target.classList.remove('dragover');
      });
      document.querySelectorAll('.file-explorer-window').forEach(target => {
        target.classList.remove('dragover');
      });

      // Re-enable scrolling
      document.body.style.overflow = '';

      isDragging = false;
    }

    // Attach event listeners to document for global pointer tracking
    document.addEventListener('pointermove', pointerMoveHandler);
    document.addEventListener('pointerup', pointerUpHandler);
    document.addEventListener('pointercancel', pointerUpHandler); // Handle cancel events (e.g., when dragging outside viewport)
  });

  icon.addEventListener('click', function (e) {
    // Only handle click if it wasn't a drag and sufficient time has passed since drag start
    const timeSinceDragStart = Date.now() - dragStartTime;
    if (!isDragging && timeSinceDragStart > 100) {
      document.querySelectorAll('.draggable-icon').forEach(i => i.classList.remove('bg-gray-50'));
      icon.classList.add('bg-gray-50');
    }
  });
}

function updateDesktopSettings() {
  const color = document.getElementById('bgColorInput').value;
  const image = document.getElementById('bgImageInput').value.trim();
  const clockSec = document.getElementById('clockSecondsInput').checked;


  desktopSettings.bgColor = color;
  desktopSettings.bgImage = image;
  desktopSettings.clockSeconds = clockSec;
  applyDesktopSettings();
  saveState();

}

async function renderDesktopIcons() {
  const desktopIconsContainer = document.getElementById('desktop-icons');
  desktopIconsContainer.innerHTML = "";

  // Clean up any desktop icons that might have been incorrectly placed in windows-container
  const windowsContainer = document.getElementById('windows-container');
  const existingDesktopIcons = windowsContainer.querySelectorAll('.desktop-folder-icon');
  existingDesktopIcons.forEach(icon => {
    if (icon.parentElement && icon.parentElement.classList.contains('draggable-icon')) {
      icon.parentElement.remove();
    }
  });

  let fs = await getFileSystemState();

  // If file system is not initialized, initialize it with default state
  if (!fs || !fs.folders || !fs.folders['C://Desktop']) {
    // Call initializeAppState to set up the default file system
    if (typeof initializeAppState === 'function') {
      await initializeAppState();
      fs = await getFileSystemState();
    } else {
      // Fallback: use the default fileSystemState from manage_data.js if available
      console.warn('initializeAppState not available, using default fileSystemState');
      if (typeof window.fileSystemState !== 'undefined') {
        fs = window.fileSystemState;
      } else if (typeof fileSystemState !== 'undefined') {
        fs = fileSystemState;
      } else {
        console.error('No fileSystemState available, creating minimal fallback structure');
        // Create minimal working structure as last resort
        fs = {
          folders: {
            "C://": {
              "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
              "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {
                  "compostbin": { id: 'compostbin', name: 'Compost Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.png' }
                }
              },
              "Media": { id: 'Media', name: 'Media', type: 'folder', fullPath: 'C://Media', contents: {} },
            },
            "A://": {},
            "D://": {}
          }
        };
      }
      // Update the global file system state if possible
      if (typeof setFileSystemState === 'function') {
        try {
          setFileSystemState(fs);
        } catch (error) {
          console.warn('Failed to update global file system state:', error);
        }
      }
    }
  }

  // Final validation to ensure fs has the required structure
  if (!fs || !fs.folders || !fs.folders['C://Desktop']) {
    console.error('File system structure is still invalid after initialization attempts:', fs);
    return;
  }

  // Get desktop items from the correct location
  // Desktop items are stored in fs.folders['C://Desktop'], not in the nested structure
  const desktopItems = fs.folders['C://Desktop'] || {};

  if (!desktopItems) {
    fs.folders['C://Desktop'] = {};
  }


  // Constants for grid layout
  const ICON_WIDTH = 96; // w-24 = 96px
  const ICON_HEIGHT = 128; // h-32 = 128px
  const PADDING = 16; // m-2 = 8px margin each side = 16px total
  const START_X = 16;
  const START_Y = 16;

  // Calculate how many icons can fit per column
  const availableHeight = window.innerHeight - 80; // account for taskbar
  const iconsPerColumn = Math.floor((availableHeight - START_Y) / (ICON_HEIGHT + PADDING));

  let iconIndex = 0;
  let gridIndex = 0; // Separate counter for grid positioning

  Object.values(desktopItems).forEach(item => {
    const iconElem = document.createElement('div');
    iconElem.id = "icon-" + item.id;
    iconElem.className = 'flex flex-col items-center cursor-pointer draggable-icon desktop-folder-icon z-10 h-32 truncate-ellipsis w-24 text-wrap absolute';

    let iconSrc = (item.type === 'folder') ? 'image/folder.png' : 'image/file.png';

    // Use specific icon if available
    if (item.icon) {
      iconSrc = item.icon;
    } else if (item.icon_url) {
      iconSrc = item.icon_url;
    }

    // Common metadata
    iconElem.setAttribute('data-item-id', item.id);
    iconElem.setAttribute('data-current-path', 'C://Desktop');

    if (item.type === 'ugc-file' || item.type === 'file') {
      iconElem.addEventListener('dblclick', e => {
        e.stopPropagation();
        openFile(item.id, e);
      });
      iconElem.addEventListener('mobiledbltap', e => {
        e.stopPropagation();
        openFile(item.id, e);
      });
    } else if (item.type === 'app') {
      iconElem.dataset.isVendorApplication = true;
      iconSrc = item.icon;
      iconElem.addEventListener('dblclick', () => openApp(item.id));
      iconElem.addEventListener('mobiledbltap', () => openApp(item.id));
    } else if (item.type === 'folder') {
      iconElem.addEventListener('dblclick', () => openExplorer(item.id));
      iconElem.addEventListener('mobiledbltap', () => openExplorer(item.id));
    } else if (item.type === 'shortcut') {
      iconElem.dataset.url = item.url;
      iconSrc = item.icon_url;
      iconElem.addEventListener('dblclick', () => openShortcut(iconElem));
      iconElem.addEventListener('mobiledbltap', () => openShortcut(iconElem));
    }

    iconElem.innerHTML = `
      <img src="${iconSrc}" alt="${item.name}" class="mb-1 p-1 h-16 w-16 desktop-folder-icon" />
      <span class="text-xs text-black max-w-20 text-center desktop-folder-icon truncate block">${item.name}</span>
    `;

    // Position icon in grid or restore saved position
    if (desktopIconsState[iconElem.id]) {
      // Restore saved position
      const savedPos = desktopIconsState[iconElem.id];
      iconElem.style.left = savedPos.left;
      iconElem.style.top = savedPos.top;
    } else {
      // Use default grid position
      const column = Math.floor(gridIndex / iconsPerColumn);
      const row = gridIndex % iconsPerColumn;

      const x = START_X + (column * (ICON_WIDTH + PADDING));
      const y = START_Y + (row * (ICON_HEIGHT + PADDING));

      iconElem.style.left = x + 'px';
      iconElem.style.top = y + 'px';

      gridIndex++; // Only increment grid index for items without saved positions
    }

    desktopIconsContainer.appendChild(iconElem);
    makeIconDraggable(iconElem);
    detectDoubleTap(iconElem); // ensures mobile dbltap support

    iconIndex++;
  });

  // Setup drag and drop functionality for desktop folder icons
  if (typeof setupFolderDrop === 'function') {
    setupFolderDrop();
  }
}

function applyDesktopSettings() {
  const desktop = document.getElementById('desktop');
  if (desktopSettings.bgColor) {
    desktop.style.backgroundColor = desktopSettings.bgColor;
  }
  if (desktopSettings.bgImage) {
    desktop.style.backgroundImage = `url(${desktopSettings.bgImage})`;
    desktop.style.backgroundSize = 'cover';
    desktop.style.backgroundRepeat = 'no-repeat';
  } else {
    desktop.style.backgroundImage = 'none';
  }
}

function getSettingsContent() {
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-sm">Desktop Background Color:</label>
        <input id="bgColorInput" type="color" value="${desktopSettings.bgColor}" class="border" />
      </div>
      <div>
        <label class="block text-sm">Background Image URL:</label>
        <input id="bgImageInput" type="text" placeholder="Enter image URL" value="${desktopSettings.bgImage}" class="border w-full" />
      </div>
      <div>
        <label class="block text-sm">Show Seconds on Clock:</label>
        <input id="clockSecondsInput" type="checkbox" ${desktopSettings.clockSeconds ? "checked" : ""} />
      </div>
      <button id="settings-apply-button" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
        <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Apply</span>
      </button>
    </div>
  `;
}

// Ensure icon stays within desktop bounds during drag
function constrainIconPosition(icon) {
  const desktop = document.getElementById('desktop');
  const desktopRect = desktop.getBoundingClientRect();
  const iconRect = icon.getBoundingClientRect();

  let left = parseInt(icon.style.left) || 0;
  let top = parseInt(icon.style.top) || 0;

  // Keep icon within desktop bounds
  left = Math.max(0, Math.min(left, desktopRect.width - iconRect.width));
  top = Math.max(0, Math.min(top, desktopRect.height - iconRect.height - 40)); // Account for taskbar

  icon.style.left = left + 'px';
  icon.style.top = top + 'px';
}

// Helper function to get an item from the file system by its ID
function getItemFromFileSystem(itemId) {
  const fs = getFileSystemStateSync();

  // Search through all folders in the unified structure
  for (const folderPath in fs.folders) {
    const folder = fs.folders[folderPath];

    // Check if the item is directly in this folder
    if (folder[itemId]) {
      return folder[itemId];
    }

    // Check if the item is in the folder's contents
    if (folder.contents && folder.contents[itemId]) {
      return folder.contents[itemId];
    }
  }

  return null;
}

// Function to detect double tap on mobile
function detectDoubleTap(element) {
  let lastTouchTime = 0;

  element.addEventListener("pointerdown", function (event) {
    let currentTime = new Date().getTime();
    let timeDiff = currentTime - lastTouchTime;

    if (timeDiff < 300 && timeDiff > 0) {
      // Dispatch a custom "mobiledbltap" event
      let customEvent = new Event("mobiledbltap");
      element.dispatchEvent(customEvent);
    }

    lastTouchTime = currentTime;
  });
}

// Add support for the custom "mobiledbltap" event on all elements
document.querySelectorAll("[onmobiledbltap]").forEach(element => {
  detectDoubleTap(element);

  // Attach the inline attribute function dynamically
  element.addEventListener("mobiledbltap", function () {
    let funcCall = element.getAttribute("onmobiledbltap");
      if (funcCall) {
        try {
          new Function(funcCall)();
        } catch (error) {
          console.error(`Error executing: ${funcCall}`, error);
        }
      }
  });
});

// Function to update visual feedback for drop targets during dragging
function updateDropTargetFeedback(clientX, clientY, draggingIcon) {
  // Remove all existing dragover classes
  document.querySelectorAll('.desktop-folder-icon').forEach(target => {
    target.classList.remove('dragover');
  });
  document.querySelectorAll('.file-explorer-window').forEach(target => {
    target.classList.remove('dragover');
  });

  // Get element at cursor position (temporarily make dragging icon invisible to pointer events)
  const originalPointerEvents = draggingIcon.style.pointerEvents;
  draggingIcon.style.pointerEvents = 'none';

  const elementBelow = document.elementFromPoint(clientX, clientY);
  const targetFolder = elementBelow ? elementBelow.closest('.desktop-folder-icon[data-item-id]') : null;
  const targetExplorer = elementBelow ? elementBelow.closest('.file-explorer-window') : null;

  // Restore pointer events
  draggingIcon.style.pointerEvents = originalPointerEvents;

  if (targetFolder && targetFolder !== draggingIcon) {
    const targetId = targetFolder.getAttribute('data-item-id');
    const targetItem = getItemFromFileSystem(targetId);

    // Add dragover visual feedback if it's a valid drop target
    if ((targetItem && targetItem.type === 'folder') || targetId === 'compostbin') {
      targetFolder.classList.add('dragover');
    }
  } else if (targetExplorer) {
    // Add visual feedback for file explorer windows
    targetExplorer.classList.add('dragover');
  }
}

// Make renderDesktopIcons globally available for file management operations
window.renderDesktopIcons = renderDesktopIcons;
