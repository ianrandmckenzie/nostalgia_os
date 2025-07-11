function makeIconDraggable(icon) {
  let isDragging = false;
  let startX, startY;

  // Make the icon draggable for HTML5 drag and drop as well
  icon.setAttribute('draggable', true);

  // HTML5 drag and drop events
  icon.addEventListener('dragstart', function(e) {
    const itemId = icon.getAttribute('data-item-id');
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
    icon.classList.add('dragging');
  });

  icon.addEventListener('dragend', function(e) {
    icon.classList.remove('dragging');
    // Remove visual feedback
    document.querySelectorAll('.drag-hover-target').forEach(target => {
      target.classList.remove('drag-hover-target');
    });
  });

  icon.addEventListener('mousedown', function (e) {
    // Prevent default to allow drag and drop to work
    if (e.button !== 0) return; // Only handle left mouse button

    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    const rect = icon.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    function mouseMoveHandler(e) {
      // Check if we've moved enough to consider this a drag
      const moveDistance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
      if (moveDistance > 5) {
        isDragging = true;
        icon.style.left = (e.clientX - offsetX) + 'px';
        icon.style.top = (e.clientY - offsetY) + 'px';
        icon.style.position = 'absolute';
        icon.style.zIndex = '1000'; // Bring to front while dragging

        // Add visual feedback for potential drop targets
        document.querySelectorAll('.desktop-folder-icon[data-item-id]').forEach(target => {
          const targetItem = getItemFromFileSystem(target.getAttribute('data-item-id'));
          if (targetItem && targetItem.type === 'folder' && target !== icon) {
            target.classList.add('drag-hover-target');
          }
        });
      }
    }

    function mouseUpHandler(e) {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);

      if (isDragging) {
        icon.style.zIndex = ''; // Reset z-index

        // Check if dropped on a folder
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        const targetFolder = elementBelow ? elementBelow.closest('.desktop-folder-icon[data-item-id]') : null;

        if (targetFolder && targetFolder !== icon) {
          const targetId = targetFolder.getAttribute('data-item-id');
          const targetItem = getItemFromFileSystem(targetId);
          const sourceId = icon.getAttribute('data-item-id');

          if (targetItem && targetItem.type === 'folder' && sourceId !== targetId) {
            // Move the item into the folder
            moveItemToFolder(sourceId, targetId);
            return; // Don't save position if moved to folder
          }
        }

        // Save new position if just repositioned
        desktopIconsState[icon.id] = { left: icon.style.left, top: icon.style.top };
        saveState();
      }

      // Remove visual feedback
      document.querySelectorAll('.drag-hover-target').forEach(target => {
        target.classList.remove('drag-hover-target');
      });

      isDragging = false;
    }

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  });

  icon.addEventListener('click', function (e) {
    // Only handle click if it wasn't a drag
    if (!isDragging) {
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

function renderDesktopIcons() {
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

  let fs = getFileSystemState();
  const desktopFolder = fs.folders['C://']?.['Desktop'];
  if (!desktopFolder) return;

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

  Object.values(desktopFolder.contents).forEach(item => {
    const iconElem = document.createElement('div');
    iconElem.id = "icon-" + item.id;
    iconElem.className = 'flex flex-col items-center cursor-pointer draggable-icon desktop-folder-icon z-10 h-32 truncate-ellipsis w-24 text-wrap absolute';

    let iconSrc = (item.type === 'folder') ? 'image/folder.png' : 'image/file.png';

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
      <span class="text-xs text-black max-w-20 text-center desktop-folder-icon">${item.name}</span>
    `;

    // Position icon in grid only if not previously positioned by user
    if (!desktopIconsState[iconElem.id]) {
      const column = Math.floor(iconIndex / iconsPerColumn);
      const row = iconIndex % iconsPerColumn;

      const x = START_X + (column * (ICON_WIDTH + PADDING));
      const y = START_Y + (row * (ICON_HEIGHT + PADDING));

      iconElem.style.left = x + 'px';
      iconElem.style.top = y + 'px';
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

// Helper function to get an item from the file system by its ID
function getItemFromFileSystem(itemId) {
  function searchInContents(contents) {
    for (const key in contents) {
      if (key === itemId) {
        return contents[key];
      }
      if (contents[key].type === 'folder' && contents[key].contents) {
        const found = searchInContents(contents[key].contents);
        if (found) return found;
      }
    }
    return null;
  }

  const fs = getFileSystemState();
  for (const drive in fs.folders) {
    if (/^[A-Z]:\/\/$/.test(drive)) {
      const found = searchInContents(fs.folders[drive]);
      if (found) return found;
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
