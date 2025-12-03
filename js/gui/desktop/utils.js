import { getFileSystemStateSync } from '../../apps/file_explorer/storage.js';

// Helper function to get an item from the file system by its ID
export function getItemFromFileSystem(itemId) {
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

// Screen reader announcement function
export function announceToScreenReader(message, priority = 'polite') {
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

// Ensure icon stays within desktop bounds during drag
export function constrainIconPosition(icon) {
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

// Helper function to find a non-overlapping position for new icons
export function findNonOverlappingPosition(existingPositions, iconWidth = 96, iconHeight = 128, padding = 16) {
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
