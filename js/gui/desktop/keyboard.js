import { keyboardDragState } from './state.js';
import { getItemFromFileSystem, announceToScreenReader, constrainIconPosition } from './utils.js';
import { desktopIconsState, saveState } from '../../os/manage_data.js';
import { moveItemToCompostBin } from '../../apps/compost_bin.js';
import { moveItemToFolder } from '../../apps/file_explorer/drag_and_drop.js';
import { updateDropTargetFeedback } from './drag_drop.js';

// Keyboard drag and drop functions
export function startKeyboardDrag(iconElement) {
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

export function endKeyboardDrag(dropped = false) {
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

export function moveIconWithKeyboard(iconElement, direction) {
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
  updateDropTargetFeedback(newLeft + 48, newTop + 48, iconElement); // Center of icon
}

export function snapToGrid(iconElement) {
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

export function cutIcon(iconElement) {
  // Clear previous cut icon
  if (keyboardDragState.cutIcon) {
    keyboardDragState.cutIcon.classList.remove('cut-icon');
  }

  keyboardDragState.cutIcon = iconElement;
  iconElement.classList.add('cut-icon');
  announceToScreenReader('Icon cut. Navigate to destination and press Ctrl+V to paste.');
}

export function pasteIcon() {
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

export function highlightDropTargets(draggedIcon) {
  document.querySelectorAll('.desktop-folder-icon[data-item-id]').forEach(target => {
    const targetItem = getItemFromFileSystem(target.getAttribute('data-item-id'));
    const targetId = target.getAttribute('data-item-id');
    if (((targetItem && targetItem.type === 'folder') || targetId === 'compostbin') && target !== draggedIcon) {
      target.classList.add('drag-hover-target');
    }
  });
}

export function removeDropTargetHighlights() {
  document.querySelectorAll('.drag-hover-target').forEach(target => {
    target.classList.remove('drag-hover-target');
  });
  document.querySelectorAll('.desktop-folder-icon').forEach(target => {
    target.classList.remove('dragover');
  });
}

export function showKeyboardDragIndicator(iconElement) {
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

export function hideKeyboardDragIndicator() {
  const indicator = document.getElementById('keyboard-drag-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Handle keyboard drop operation
export async function handleKeyboardDrop(iconElem) {
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
