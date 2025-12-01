import { getFileSystemState, saveState, desktopIconsState, fileSystemState, setFileSystemState, initializeAppState, desktopSettings } from '../os/manage_data.js';
import { getFileSystemStateSync } from '../apps/file_explorer/storage.js';
import { setupFolderDrop, setupDesktopDrop, moveItemToFolder, moveItemToExplorerPath } from '../apps/file_explorer/drag_and_drop.js';
import { moveItemToCompostBin } from '../apps/compost_bin.js';
import { openFile, openShortcut, openExplorerInNewWindow } from '../apps/file_explorer/gui.js';
import { openApp } from '../apps/main.js';

// Global state for keyboard drag operations
let keyboardDragState = {
  isActive: false,
  selectedIcon: null,
  cutIcon: null,
  moveStep: 20, // pixels to move per arrow key press
  gridStep: 96 + 16 // icon width + padding for grid snapping
};

// Keyboard drag and drop functions
function startKeyboardDrag(iconElement) {
  keyboardDragState.isActive = true;
  keyboardDragState.selectedIcon = iconElement;

  // Visual feedback for drag mode
  iconElement.classList.add('dragging', 'keyboard-dragging');
  iconElement.style.zIndex = '99999';

  // Add visual feedback for potential drop targets
  highlightDropTargets(iconElement);

  // Announce to screen readers
  announceToScreenReader('Drag mode activated. Use arrow keys to move, Enter to drop, or Escape to cancel.');

  // Add visual indicator
  showKeyboardDragIndicator(iconElement);
}

function endKeyboardDrag(dropped = false) {
  if (!keyboardDragState.isActive || !keyboardDragState.selectedIcon) return;

  const iconElement = keyboardDragState.selectedIcon;

  // Remove visual feedback
  iconElement.classList.remove('dragging', 'keyboard-dragging');
  iconElement.style.zIndex = '';
  removeDropTargetHighlights();
  hideKeyboardDragIndicator();

  if (dropped) {
    // Save new position
    constrainIconPosition(iconElement);
    desktopIconsState[iconElement.id] = {
      left: iconElement.style.left,
      top: iconElement.style.top
    };
    saveState();
    announceToScreenReader('Icon moved successfully.');
  } else {
    announceToScreenReader('Drag operation cancelled.');
  }

  // Reset state
  keyboardDragState.isActive = false;
  keyboardDragState.selectedIcon = null;
}

function moveIconWithKeyboard(iconElement, direction) {
  if (!keyboardDragState.isActive) return;

  const currentLeft = parseInt(iconElement.style.left) || 0;
  const currentTop = parseInt(iconElement.style.top) || 0;
  const step = keyboardDragState.moveStep;

  let newLeft = currentLeft;
  let newTop = currentTop;

  switch(direction) {
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

  iconElement.style.left = newLeft + 'px';
  iconElement.style.top = newTop + 'px';

  // Check for potential drop targets
  updateDropTargetFeedback(iconElement, newLeft + 48, newTop + 48); // Center of icon
}

function snapToGrid(iconElement) {
  if (!keyboardDragState.isActive) return;

  const currentLeft = parseInt(iconElement.style.left) || 0;
  const currentTop = parseInt(iconElement.style.top) || 0;
  const gridStep = keyboardDragState.gridStep;

  const snappedLeft = 16 + Math.round((currentLeft - 16) / gridStep) * gridStep;
  const snappedTop = 16 + Math.round((currentTop - 16) / gridStep) * gridStep;

  iconElement.style.left = Math.max(16, snappedLeft) + 'px';
  iconElement.style.top = Math.max(16, snappedTop) + 'px';

  announceToScreenReader('Icon snapped to grid.');
}

function cutIcon(iconElement) {
  // Clear previous cut icon
  if (keyboardDragState.cutIcon) {
    keyboardDragState.cutIcon.classList.remove('cut-icon');
  }

  keyboardDragState.cutIcon = iconElement;
  iconElement.classList.add('cut-icon');
  announceToScreenReader('Icon cut. Navigate to destination and press Ctrl+V to paste.');
}

function pasteIcon() {
  if (!keyboardDragState.cutIcon) {
    announceToScreenReader('No icon to paste.');
    return;
  }

  const focusedElement = document.activeElement;
  const cutIcon = keyboardDragState.cutIcon;

  // If pasting on desktop, move to focused icon's position or last mouse position
  if (focusedElement && focusedElement.classList.contains('draggable-icon')) {
    const targetRect = focusedElement.getBoundingClientRect();
    const desktopRect = document.getElementById('desktop').getBoundingClientRect();

    // Position next to target icon
    const newLeft = targetRect.left - desktopRect.left + 120; // Offset to avoid overlap
    const newTop = targetRect.top - desktopRect.top;

    cutIcon.style.left = newLeft + 'px';
    cutIcon.style.top = newTop + 'px';

    constrainIconPosition(cutIcon);
    desktopIconsState[cutIcon.id] = {
      left: cutIcon.style.left,
      top: cutIcon.style.top
    };
    saveState();
  }

  // Clear cut state
  cutIcon.classList.remove('cut-icon');
  keyboardDragState.cutIcon = null;
  announceToScreenReader('Icon pasted successfully.');
}

function highlightDropTargets(draggedIcon) {
  document.querySelectorAll('.desktop-folder-icon[data-item-id]').forEach(target => {
    const targetItem = getItemFromFileSystem(target.getAttribute('data-item-id'));
    const targetId = target.getAttribute('data-item-id');
    if (((targetItem && targetItem.type === 'folder') || targetId === 'compostbin') && target !== draggedIcon) {
      target.classList.add('drag-hover-target');
    }
  });
}

function removeDropTargetHighlights() {
  document.querySelectorAll('.drag-hover-target').forEach(target => {
    target.classList.remove('drag-hover-target');
  });
  document.querySelectorAll('.desktop-folder-icon').forEach(target => {
    target.classList.remove('dragover');
  });
}

function showKeyboardDragIndicator(iconElement) {
  // Create a visual indicator for keyboard drag mode
  const indicator = document.createElement('div');
  indicator.id = 'keyboard-drag-indicator';
  indicator.className = 'fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  indicator.innerHTML = `
    <div class="text-sm font-medium">Keyboard Drag Mode</div>
    <div class="text-xs">↑↓←→ Move • Enter Drop • Esc Cancel • G Grid Snap</div>
  `;

  document.body.appendChild(indicator);
}

function hideKeyboardDragIndicator() {
  const indicator = document.getElementById('keyboard-drag-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Screen reader announcement function
function announceToScreenReader(message, priority = 'polite') {
  let announcer = document.getElementById('sr-announcements');
  if (!announcer) {
    // Create announcer if it doesn't exist
    announcer = document.createElement('div');
    announcer.id = 'sr-announcements';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  announcer.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

// Handle keyboard drop operation
async function handleKeyboardDrop(iconElem) {
  if (!keyboardDragState.isActive) return;

  const iconRect = iconElem.getBoundingClientRect();
  const centerX = iconRect.left + iconRect.width / 2;
  const centerY = iconRect.top + iconRect.height / 2;

  // Find potential drop target at icon center
  const elementBelow = document.elementFromPoint(centerX, centerY);
  const dropTarget = elementBelow?.closest('.desktop-folder-icon[data-item-id]');

  if (dropTarget && dropTarget !== iconElem) {
    const sourceId = iconElem.getAttribute('data-item-id');
    const targetId = dropTarget.getAttribute('data-item-id');
    const targetItem = getItemFromFileSystem(targetId);

    if (targetId === 'compostbin') {
      await moveItemToCompostBin(sourceId, 'C://Desktop');
      announceToScreenReader('Icon moved to compost bin.');
      endKeyboardDrag(true);
      return;
    } else if (targetItem && targetItem.type === 'folder') {
      await moveItemToFolder(sourceId, targetId);
      announceToScreenReader(`Icon moved to ${targetItem.name} folder.`);
      endKeyboardDrag(true);
      return;
    }
  }

  // Regular position drop
  endKeyboardDrag(true);
}

export function makeIconDraggable(icon) {
  let isDragging = false;
  let startX, startY;
  let dragThreshold = 5; // Minimum distance to consider as drag
  let dragStartTime = 0; // Track when drag started to prevent conflicts with double-click

  // Use a unified pointer event system for both mouse and touch
  icon.addEventListener('pointerdown', function (e) {
    // Only handle primary pointer (left mouse button or first touch)
    if (!e.isPrimary) return;

    // Don't interfere with keyboard drag mode
    if (keyboardDragState.isActive) return;

    // Prevent text selection and other default behaviors
    e.preventDefault();

    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    dragStartTime = Date.now();

    const rect = icon.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Detect touch input for enhanced feedback
    const isTouch = e.pointerType === 'touch';

    function pointerMoveHandler(e) {
      if (!e.isPrimary) return;

      const moveDistance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));

      if (!isDragging && moveDistance > dragThreshold) {
        // Start dragging
        isDragging = true;
        icon.classList.add('dragging');

        // Reparent to body to ensure z-index works (break out of stacking context)
        const rect = icon.getBoundingClientRect();
        document.body.appendChild(icon);
        icon.style.position = 'fixed';
        icon.style.left = rect.left + 'px';
        icon.style.top = rect.top + 'px';
        icon.style.zIndex = '99999';
        console.log('Drag started. Reparented to body. zIndex:', icon.style.zIndex);

        // Check compostability
        const sourceId = icon.getAttribute('data-item-id');
        const sourceItem = getItemFromFileSystem(sourceId);
        let isCompostable = true;
        if (sourceItem && sourceItem.type === 'app') {
             if (sourceItem.isCustomApp && sourceItem.customAppData) {
                 isCompostable = String(sourceItem.customAppData.compostable) === 'true';
             } else {
                 isCompostable = false;
             }
        }
        icon.dataset.isCompostable = String(isCompostable);

        // Add touch-specific styling
        if (isTouch) {
          icon.classList.add('touch-dragging');
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }

        // Add visual feedback for potential drop targets
        document.querySelectorAll('.desktop-folder-icon[data-item-id]').forEach(target => {
          const targetItem = getItemFromFileSystem(target.getAttribute('data-item-id'));
          const targetId = target.getAttribute('data-item-id');

          // Check if target is compost bin and item is not compostable
          if (targetId === 'compostbin' && !isCompostable) return;

          if (((targetItem && targetItem.type === 'folder') || targetId === 'compostbin') && target !== icon) {
            target.classList.add('drag-hover-target');
          }
        });

        // Disable scrolling on the desktop during drag
        document.body.style.overflow = 'hidden';

        // Announce drag start for accessibility
        announceToScreenReader('Drag started. Move to reposition or drop on a folder.');
      }

      if (isDragging) {
        // Update icon position to follow cursor
        // Use fixed positioning since we are on body
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        
        // Constrain to viewport/desktop
        const desktop = document.getElementById('desktop');
        const desktopRect = desktop.getBoundingClientRect();
        const iconRect = icon.getBoundingClientRect();
        
        // Simple constraint
        newLeft = Math.max(desktopRect.left, Math.min(newLeft, desktopRect.right - iconRect.width));
        newTop = Math.max(desktopRect.top, Math.min(newTop, desktopRect.bottom - iconRect.height - 40));

        icon.style.left = newLeft + 'px';
        icon.style.top = newTop + 'px';

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
        // Reparent back to desktop-icons
        const desktopIcons = document.getElementById('desktop-icons');
        desktopIcons.appendChild(icon);
        
        // Convert fixed coordinates back to relative
        const containerRect = desktopIcons.getBoundingClientRect();
        const currentLeft = parseFloat(icon.style.left);
        const currentTop = parseFloat(icon.style.top);
        
        icon.style.position = 'absolute';
        icon.style.left = (currentLeft - containerRect.left) + 'px';
        icon.style.top = (currentTop - containerRect.top) + 'px';
        
        icon.style.zIndex = ''; // Reset z-index
        icon.classList.remove('dragging');
        console.log('Drag ended. Reparented to desktop-icons.');

        // Check if dropped on a folder or file explorer window
        // Temporarily hide the dragged element to get accurate elementFromPoint
        const originalVisibility = icon.style.visibility;
        icon.style.visibility = 'hidden';

        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);

        // Restore the icon visibility
        icon.style.visibility = originalVisibility;

        const targetFolder = elementBelow ? elementBelow.closest('.desktop-folder-icon[data-item-id]') : null;
        const targetExplorer = elementBelow ? elementBelow.closest('.file-explorer-window') : null;
        const targetCompostBinWindow = elementBelow ? elementBelow.closest('#compost-bin-content') : null;

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
        } else if (targetCompostBinWindow) {
             const sourceId = icon.getAttribute('data-item-id');
             const isCompostable = icon.dataset.isCompostable === 'true';
             if (isCompostable) {
                 await moveItemToCompostBin(sourceId, 'C://Desktop');
                 return;
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
      const compostContent = document.getElementById('compost-bin-content');
      if (compostContent) compostContent.classList.remove('bg-blue-50');

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

export function updateDesktopSettings() {
  const color = document.getElementById('bgColorInput').value;
  const image = document.getElementById('bgImageInput').value.trim();
  const clockSec = document.getElementById('clockSecondsInput').checked;


  desktopSettings.bgColor = color;
  desktopSettings.bgImage = image;
  desktopSettings.clockSeconds = clockSec;
  applyDesktopSettings();
  saveState();

}

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
      // Check if custom app is compostable
      if (item.isCustomApp && item.customAppData) {
        iconElem.dataset.compostable = String(item.customAppData.compostable);
      }
      iconSrc = item.icon;
      iconElem.addEventListener('dblclick', () => openApp(item.id));
      iconElem.addEventListener('mobiledbltap', () => openApp(item.id));
    } else if (item.type === 'folder') {
      iconElem.addEventListener('dblclick', () => openExplorerInNewWindow(item.id));
      iconElem.addEventListener('mobiledbltap', () => openExplorerInNewWindow(item.id));
    } else if (item.type === 'shortcut') {
      iconElem.dataset.url = item.url;
      iconSrc = item.icon_url;
      iconElem.addEventListener('dblclick', () => openShortcut(iconElem));
      iconElem.addEventListener('mobiledbltap', () => openShortcut(iconElem));
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
      <img src="${iconSrc}" alt="${item.name} icon" class="mb-1 p-1 h-16 w-16 desktop-folder-icon" />
      <span class="text-xs text-black max-w-20 text-center desktop-folder-icon truncate block">${item.name}</span>
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

export function applyDesktopSettings() {
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

export function getSettingsContent() {
  return `
    <div class="space-y-4">
      <div>
        <label for="bgColorInput" class="block text-sm font-medium">Desktop Background Color:</label>
        <input id="bgColorInput" type="color" value="${desktopSettings.bgColor}" class="border mt-1" aria-describedby="bgColorHelp" />
        <p id="bgColorHelp" class="text-xs text-gray-600 mt-1">Choose a color for your desktop background</p>
      </div>
      <div>
        <label for="bgImageInput" class="block text-sm font-medium">Background Image URL:</label>
        <input id="bgImageInput" type="text" placeholder="Enter image URL" value="${desktopSettings.bgImage}" class="border w-full mt-1" aria-describedby="bgImageHelp" />
        <p id="bgImageHelp" class="text-xs text-gray-600 mt-1">Enter a URL to display an image as your desktop background</p>
      </div>
      <div>
        <label for="clockSecondsInput" class="block text-sm font-medium">Show Seconds on Clock:</label>
        <input id="clockSecondsInput" type="checkbox" ${desktopSettings.clockSeconds ? "checked" : ""} class="mt-1" aria-describedby="clockSecondsHelp" />
        <p id="clockSecondsHelp" class="text-xs text-gray-600 mt-1">Display seconds in the taskbar clock</p>
      </div>
      <button id="settings-apply-button"
              class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"
              aria-label="Apply desktop settings changes">
        <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Apply</span>
      </button>
    </div>
  `;
}

// Helper function to find a non-overlapping position for new icons
function findNonOverlappingPosition(existingPositions, iconWidth = 96, iconHeight = 128, padding = 16) {
  const startX = 16;
  const startY = 16;
  const stepX = iconWidth + padding;
  const stepY = iconHeight + padding;
  const desktop = document.getElementById('desktop');
  const desktopRect = desktop.getBoundingClientRect();
  const maxX = desktopRect.width - iconWidth;
  const maxY = desktopRect.height - iconHeight - 40; // Account for taskbar

  // Try positions top-to-bottom then left-to-right (column-major order)
  let x = startX;
  let y = startY;

  while (x <= maxX) {
    while (y <= maxY) {
      // Check if this position overlaps with any existing icon
      const newRect = {
        left: x,
        top: y,
        right: x + iconWidth,
        bottom: y + iconHeight
      };

      let overlaps = false;
      for (const existing of existingPositions) {
        const existingRect = {
          left: existing.left,
          top: existing.top,
          right: existing.left + existing.width,
          bottom: existing.top + existing.height
        };

        if (!(newRect.right <= existingRect.left ||
              newRect.left >= existingRect.right ||
              newRect.bottom <= existingRect.top ||
              newRect.top >= existingRect.bottom)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        return { left: x, top: y };
      }

      y += stepY;
    }
    y = startY;
    x += stepX;
  }

  // If no non-overlapping position found, use the default position
  return { left: startX, top: startY };
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

  // Attach the inline attribute function dynamically using safe event dispatch
  element.addEventListener("mobiledbltap", function () {
    let funcCall = element.getAttribute("onmobiledbltap");
    if (funcCall) {
      try {
        // Safe alternative: dispatch a custom event instead of executing arbitrary code
        const customEvent = new CustomEvent('mobiledbltap-action', {
          detail: { action: funcCall, element: element }
        });
        document.dispatchEvent(customEvent);
      } catch (error) {
        console.error(`Error dispatching event for: ${funcCall}`, error);
      }
    }
  });
});

// Safe event handler for mobile double-tap actions
document.addEventListener('mobiledbltap-action', function(event) {
  const { action, element } = event.detail;

  // Whitelist of allowed function calls to prevent code injection
  const allowedActions = [
    'openExplorerInNewWindow',
    'openApp',
    'openShortcut'
  ];

  // Parse the action to extract function name and arguments
  const match = action.match(/^(\w+)\((.*)\)$/);
  if (match) {
    const [, funcName, args] = match;

    if (allowedActions.includes(funcName)) {
      try {
        // Safely call whitelisted functions
        if (funcName === 'openExplorerInNewWindow' && window.openExplorerInNewWindow) {
          // Parse arguments safely
          const argValue = args.replace(/['"]/g, '');
          window.openExplorerInNewWindow(argValue);
        } else if (funcName === 'openApp' && window.openApp) {
          const argValue = args.replace(/['"]/g, '');
          window.openApp(argValue);
        } else if (funcName === 'openShortcut' && window.openShortcut) {
          window.openShortcut(element);
        }
      } catch (error) {
        console.error(`Error executing safe action ${funcName}:`, error);
      }
    } else {
      console.warn(`Blocked potentially unsafe action: ${funcName}`);
    }
  } else {
    console.warn(`Invalid action format: ${action}`);
  }
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

  // Also remove highlight from compost bin window content
  const compostContent = document.getElementById('compost-bin-content');
  if (compostContent) compostContent.classList.remove('bg-blue-50');

  // Get element at cursor position (temporarily hide dragging icon)
  const originalVisibility = draggingIcon.style.visibility;
  draggingIcon.style.visibility = 'hidden';

  const elementBelow = document.elementFromPoint(clientX, clientY);
  const targetFolder = elementBelow ? elementBelow.closest('.desktop-folder-icon[data-item-id]') : null;
  const targetExplorer = elementBelow ? elementBelow.closest('.file-explorer-window') : null;
  const targetCompostBinWindow = elementBelow ? elementBelow.closest('#compost-bin-content') : null;

  // Restore visibility
  draggingIcon.style.visibility = originalVisibility;

  if (targetFolder && targetFolder !== draggingIcon) {
    const targetId = targetFolder.getAttribute('data-item-id');
    const targetItem = getItemFromFileSystem(targetId);
    const isCompostable = draggingIcon.dataset.isCompostable === 'true';

    // Check if target is compost bin and item is not compostable
    if (targetId === 'compostbin' && !isCompostable) return;

    // Add dragover visual feedback if it's a valid drop target
    if ((targetItem && targetItem.type === 'folder') || targetId === 'compostbin') {
      targetFolder.classList.add('dragover');
    }
  } else if (targetExplorer) {
    // Add visual feedback for file explorer windows
    targetExplorer.classList.add('dragover');
  } else if (targetCompostBinWindow) {
      const isCompostable = draggingIcon.dataset.isCompostable === 'true';
      if (isCompostable) {
          targetCompostBinWindow.classList.add('bg-blue-50');
      }
  }
}

// Make renderDesktopIcons globally available for file management operations
if (typeof window !== 'undefined') {
  window.renderDesktopIcons = renderDesktopIcons;
  window.makeIconDraggable = makeIconDraggable;
  window.applyDesktopSettings = applyDesktopSettings;

  // Initialize desktop drop functionality
  setupDesktopDrop();
}
