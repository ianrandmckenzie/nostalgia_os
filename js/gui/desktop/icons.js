import { getFileSystemState, initializeAppState, fileSystemState, setFileSystemState, desktopIconsState, saveState } from '../../os/manage_data.js';
import { setupFolderDrop } from '../../apps/file_explorer/drag_and_drop.js';
import { openFile, openShortcut, openExplorerInNewWindow } from '../../apps/file_explorer/gui.js';
import { openApp } from '../../apps/main.js';
import { makeIconDraggable } from './drag_drop.js';
import { detectDoubleTap } from './mobile.js';
import { findNonOverlappingPosition, constrainIconPosition, announceToScreenReader } from './utils.js';
import { keyboardDragState } from './state.js';
import { startKeyboardDrag, endKeyboardDrag, cutIcon, pasteIcon, snapToGrid, moveIconWithKeyboard, handleKeyboardDrop } from './keyboard.js';

export async function renderDesktopIcons() {
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
                  "compostbin": { id: 'compostbin', name: 'Compost Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.webp' }
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


  // Constants for icon positioning
  const START_X = 16;
  const START_Y = 16;

  let iconIndex = 0;
  const positionedIcons = []; // Track icons we've already positioned

  Object.values(desktopItems).forEach(item => {
    const iconElem = document.createElement('div');
    iconElem.id = "icon-" + item.id;
    iconElem.className = 'flex flex-col items-center cursor-pointer draggable-icon desktop-folder-icon z-10 h-32 truncate-ellipsis w-24 text-wrap absolute';

    // Add accessibility attributes
    iconElem.setAttribute('role', 'button');
    iconElem.setAttribute('tabindex', '0');
    iconElem.setAttribute('aria-label', `${item.name} - Double-click to open`);

    let iconSrc = (item.type === 'folder') ? 'image/folder.webp' : 'image/file.webp';

    // Use specific icon if available
    if (item.icon) {
      iconSrc = item.icon;
    } else if (item.icon_url) {
      iconSrc = item.icon_url;
    }

    // Common metadata
    iconElem.setAttribute('data-item-id', item.id);
    iconElem.setAttribute('data-current-path', 'C://Desktop');

    // Set up event handlers based on item type
    const handleActivation = () => {
      if (item.type === 'ugc-file' || item.type === 'file') {
        openFile(item.id, null);
      } else if (item.type === 'app') {
        openApp(item.id);
      } else if (item.type === 'folder') {
        openExplorerInNewWindow(item.id);
      } else if (item.type === 'shortcut') {
        openShortcut(iconElem);
      }
    };

    // Debounce helper to prevent double-firing (dblclick + mobiledbltap)
    let lastClickTime = 0;
    const handleAction = (actionFn) => (e) => {
      const now = Date.now();
      if (now - lastClickTime < 500) return;
      lastClickTime = now;
      if (e && e.stopPropagation) e.stopPropagation();
      actionFn(e);
    };

    if (item.type === 'ugc-file' || item.type === 'file') {
      const action = (e) => openFile(item.id, e);
      iconElem.addEventListener('dblclick', handleAction(action));
      iconElem.addEventListener('mobiledbltap', handleAction(action));
    } else if (item.type === 'app') {
      iconElem.dataset.isVendorApplication = true;
      // Check if custom app is compostable
      if (item.isCustomApp && item.customAppData) {
        iconElem.dataset.compostable = String(item.customAppData.compostable);
      }
      iconSrc = item.icon;
      const action = () => openApp(item.id);
      iconElem.addEventListener('dblclick', handleAction(action));
      iconElem.addEventListener('mobiledbltap', handleAction(action));
    } else if (item.type === 'folder') {
      const action = () => openExplorerInNewWindow(item.id);
      iconElem.addEventListener('dblclick', handleAction(action));
      iconElem.addEventListener('mobiledbltap', handleAction(action));
    } else if (item.type === 'shortcut') {
      iconElem.dataset.url = item.url;
      iconSrc = item.icon_url;
      const action = () => openShortcut(iconElem);
      iconElem.addEventListener('dblclick', handleAction(action));
      iconElem.addEventListener('mobiledbltap', handleAction(action));
    }

    // Add keyboard support
    iconElem.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (keyboardDragState.isActive && keyboardDragState.selectedIcon === iconElem) {
          // Drop the icon in drag mode
          e.preventDefault();
          handleKeyboardDrop(iconElem);
        } else if (!keyboardDragState.isActive) {
          // Normal activation
          e.preventDefault();
          handleActivation();
        }
      } else if (e.key === 'Escape') {
        if (keyboardDragState.isActive && keyboardDragState.selectedIcon === iconElem) {
          e.preventDefault();
          endKeyboardDrag(false);
        }
      } else if (e.key === 'd' && e.ctrlKey) {
        // Ctrl + D to start drag mode
        e.preventDefault();
        startKeyboardDrag(iconElem);
      } else if (e.key === 'x' && e.ctrlKey) {
        // Ctrl + X to cut
        e.preventDefault();
        cutIcon(iconElem);
      } else if (e.key === 'v' && e.ctrlKey) {
        // Ctrl + V to paste
        e.preventDefault();
        pasteIcon();
      } else if (e.key === 'g' && keyboardDragState.isActive && keyboardDragState.selectedIcon === iconElem) {
        // G to snap to grid while dragging
        e.preventDefault();
        snapToGrid(iconElem);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (keyboardDragState.isActive && keyboardDragState.selectedIcon === iconElem) {
          // Move icon in drag mode
          e.preventDefault();
          moveIconWithKeyboard(iconElem, e.key);
        } else if (e.shiftKey) {
          // Shift + Arrow for fine positioning without entering drag mode
          e.preventDefault();
          const currentLeft = parseInt(iconElem.style.left) || 0;
          const currentTop = parseInt(iconElem.style.top) || 0;
          const step = 5; // Fine movement

          let newLeft = currentLeft;
          let newTop = currentTop;

          switch(e.key) {
            case 'ArrowUp':
              newTop = Math.max(16, currentTop - step);
              break;
            case 'ArrowDown':
              newTop = currentTop + step;
              break;
            case 'ArrowLeft':
              newLeft = Math.max(16, currentLeft - step);
              break;
            case 'ArrowRight':
              newLeft = currentLeft + step;
              break;
          }

          iconElem.style.left = newLeft + 'px';
          iconElem.style.top = newTop + 'px';

          constrainIconPosition(iconElem);
          desktopIconsState[iconElem.id] = {
            left: iconElem.style.left,
            top: iconElem.style.top
          };
          saveState();
          announceToScreenReader(`Icon moved to position ${newLeft}, ${newTop}`);
        }
      }
    });

    iconElem.innerHTML = `
      <img src="${iconSrc}" alt="${item.name} icon" class="mb-1 p-1 h-16 w-16 desktop-folder-icon drop-shadow-md" />
      <span class="text-xs text-white max-w-20 text-center desktop-folder-icon truncate block" style="text-shadow: 1px 1px 2px black, 0 0 1em black, 0 0 0.2em black;">${item.name}</span>
    `;

    // Position icon in grid or restore saved position
    if (desktopIconsState[iconElem.id]) {
      // Restore saved position
      const savedPos = desktopIconsState[iconElem.id];
      iconElem.style.left = savedPos.left;
      iconElem.style.top = savedPos.top;
      // Add to positioned icons for overlap checking
      positionedIcons.push({
        left: parseInt(savedPos.left),
        top: parseInt(savedPos.top),
        width: 96,
        height: 128
      });
    } else {
      // Find a non-overlapping position for new icons
      const position = findNonOverlappingPosition(positionedIcons);
      iconElem.style.left = position.left + 'px';
      iconElem.style.top = position.top + 'px';
      // Add to positioned icons for overlap checking
      positionedIcons.push({
        left: position.left,
        top: position.top,
        width: 96,
        height: 128
      });
    }

    desktopIconsContainer.appendChild(iconElem);
    makeIconDraggable(iconElem);
    detectDoubleTap(iconElem); // ensures mobile dbltap support

    iconIndex++;
  });

  // Calculate required size for desktop-icons container to enable scrolling
  let maxX = 0;
  let maxY = 0;

  const icons = desktopIconsContainer.querySelectorAll('.draggable-icon');
  icons.forEach(icon => {
    const left = parseInt(icon.style.left) || 0;
    const top = parseInt(icon.style.top) || 0;
    // Icon size is roughly 96x128 (w-24 h-32 in tailwind: 6rem x 8rem = 96px x 128px)
    maxX = Math.max(maxX, left + 100);
    maxY = Math.max(maxY, top + 140);
  });

  // Set size of desktop-icons container to ensure scrolling works
  desktopIconsContainer.style.minWidth = '100%';
  desktopIconsContainer.style.minHeight = '100%';
  desktopIconsContainer.style.width = Math.max(window.innerWidth - 32, maxX) + 'px';
  desktopIconsContainer.style.height = Math.max(window.innerHeight - 80, maxY) + 'px';

  // Setup drag and drop functionality for desktop folder icons
  if (typeof setupFolderDrop === 'function') {
    setupFolderDrop();
  }
}
