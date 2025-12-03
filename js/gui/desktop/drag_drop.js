import { keyboardDragState } from './state.js';
import { getItemFromFileSystem, announceToScreenReader, constrainIconPosition } from './utils.js';
import { desktopIconsState, saveState } from '../../os/manage_data.js';
import { moveItemToCompostBin } from '../../apps/compost_bin.js';
import { moveItemToFolder, moveItemToExplorerPath } from '../../apps/file_explorer/drag_and_drop.js';

// Function to update visual feedback for drop targets during dragging
export function updateDropTargetFeedback(clientX, clientY, draggingIcon) {
  // Remove all existing dragover classes
  document.querySelectorAll('.desktop-folder-icon').forEach(target => {
    target.classList.remove('dragover');
  });
  document.querySelectorAll('.file-explorer-window').forEach(target => {
    target.classList.remove('dragover');
  });

  // Also remove highlight from compost bin window content
  const compostContent = document.getElementById('compost-bin-content');
  if (compostContent) compostContent.classList.remove('dragover');

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
          targetCompostBinWindow.classList.add('dragover');
      }
  }
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

        // Add dragging styling
        icon.classList.add('point-dragging');

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

        // Also highlight compost bin window if open and item is compostable
        if (isCompostable) {
            const compostBinContent = document.getElementById('compost-bin-content');
            if (compostBinContent) {
                compostBinContent.classList.add('drag-hover-target');
            }
        }

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
        icon.classList.remove('point-dragging');
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
      if (compostContent) compostContent.classList.remove('dragover');

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

// Global listener to clear icon selection when clicking elsewhere
function clearIconSelection(e) {
  // If the click is not on a draggable icon (or inside one), clear all selections
  if (!e.target.closest('.draggable-icon')) {
    document.querySelectorAll('.draggable-icon').forEach(i => i.classList.remove('bg-gray-50'));
  }
}

document.addEventListener('click', clearIconSelection);
document.addEventListener('pointerdown', clearIconSelection);
