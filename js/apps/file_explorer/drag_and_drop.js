import { getFileSystemStateSync } from './storage.js';
import { setFileSystemState } from '../../os/manage_data.js';
import { saveState, desktopIconsState } from '../../os/manage_data.js';
import { refreshExplorerViews } from './gui.js';
import { renderDesktopIcons } from '../../gui/desktop.js';
import { moveItemToCompostBin, loadCompostBinContents, updateCompostBinHeader } from '../compost_bin.js';

function setupFolderDrop() {
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    // Setup file items in explorer windows
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      // Remove existing listeners first to prevent duplicates
      item.removeEventListener('dragstart', handleDragStart);
      item.removeEventListener('dragover', handleDragOver);
      item.removeEventListener('dragleave', handleDragLeave);
      item.removeEventListener('drop', handleDrop);
      item.removeEventListener('dragend', handleDragEnd);

      // Set up fresh listeners
      item.setAttribute('draggable', true);
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });

    // Setup file explorer windows as drop targets
    const explorerWindows = document.querySelectorAll('.file-explorer-window');
    explorerWindows.forEach(explorer => {
      // Remove existing listeners to prevent duplicates
      explorer.removeEventListener('dragover', handleExplorerDragOver);
      explorer.removeEventListener('dragleave', handleExplorerDragLeave);
      explorer.removeEventListener('drop', handleExplorerDrop);

      // Add new listeners
      explorer.addEventListener('dragover', handleExplorerDragOver);
      explorer.addEventListener('dragleave', handleExplorerDragLeave);
      explorer.addEventListener('drop', handleExplorerDrop);
    });

    // Also setup desktop folder icons as drop targets for HTML5 drag and drop
    const desktopFolders = document.querySelectorAll('.desktop-folder-icon[data-item-id]');
    desktopFolders.forEach(folder => {
      const itemId = folder.getAttribute('data-item-id');
      const item = getItemFromFileSystem(itemId);
      // Set up drop handlers for folders and the compost bin
      if ((item && item.type === 'folder') || itemId === 'compostbin') {
        // Remove existing listeners first to prevent duplicates
        folder.removeEventListener('dragover', handleDesktopFolderDragOver);
        folder.removeEventListener('dragleave', handleDesktopFolderDragLeave);
        folder.removeEventListener('drop', handleDesktopFolderDrop);

        // HTML5 drag and drop handlers (for file explorer items)
        folder.addEventListener('dragover', handleDesktopFolderDragOver);
        folder.addEventListener('dragleave', handleDesktopFolderDragLeave);
        folder.addEventListener('drop', handleDesktopFolderDrop);
      }
    });
  });
}

function handleDragStart(e) {
  e.dataTransfer.effectAllowed = "move";
  // Store the dragged item's id.
  e.dataTransfer.setData("text/plain", this.getAttribute('data-item-id'));
  this.classList.add('dragging');
}

function handleDragOver(e) {
  // Allow drop for regular items and compost bin items.
  const isCompostItem = e.dataTransfer.types.includes('application/x-compost-item');
  if (isCompostItem || e.dataTransfer.types.includes('text/plain')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    this.classList.add('dragover');
  }
}

function handleDragLeave(e) {
  this.classList.remove('dragover');
}

async function handleDrop(e) {
  e.stopPropagation();
  this.classList.remove('dragover');

  const sourceId = e.dataTransfer.getData("text/plain");
  const targetId = this.getAttribute('data-item-id');
  const isCompostItem = e.dataTransfer.getData('application/x-compost-item') === 'true';

  if (sourceId === targetId) return; // No action if dropped on itself.

  const sourceElem = document.querySelector(`[data-item-id="${sourceId}"]`);
  const targetElem = this;

  // Handle compost bin item restoration
  if (isCompostItem) {
    if (targetElem.classList.contains('folder-item')) {
      // Get the folder's path
      const explorer = targetElem.closest('.file-explorer-window');
      const currentPath = explorer ? explorer.getAttribute('data-current-path') : 'C://';
      const targetPath = currentPath === 'C://' ? currentPath + targetId : currentPath + '/' + targetId;
      await restoreItemFromCompostBin(sourceId, targetPath);
    }
    return;
  }

  // Check if the target is a folder (has 'folder-item') to move into it.
  if (targetElem.classList.contains('folder-item')) {
    await moveItemToFolder(sourceId, targetId);
  } else {
    // Reorder: decide based on mouse position.
    const bounding = this.getBoundingClientRect();
    const offset = e.clientY - bounding.top;
    const list = this.parentElement; // Assuming the parent is the <ul>
    if (offset < bounding.height / 2) {
      list.insertBefore(sourceElem, this);
    } else {
      list.insertBefore(sourceElem, this.nextSibling);
    }
    await updateOrderForCurrentPath();
  }

  // Clean up dragged style.
  if(sourceElem) {
    sourceElem.classList.remove('dragging');
  }
}

function handleDragEnd(e) {
  // Clean up any lingering classes.
  this.classList.remove('dragging');
  document.querySelectorAll('.file-item').forEach(item => item.classList.remove('dragover'));

  // Clean up desktop drop zone outline
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.classList.remove('drag-hover-target');
  }

  // Clean up any other drag-hover-target classes on desktop folders or explorer windows
  document.querySelectorAll('.drag-hover-target').forEach(element => {
    element.classList.remove('drag-hover-target');
  });
}

/*
  Moves an item (file or folder) into a target folder.
  It removes the item from its current parent's contents and adds it
  to the target folder's contents, updating fullPath as needed.
*/
async function moveItemToFolder(itemId, folderId) {
  let fs = getFileSystemStateSync();


  // Find the dragged item and its parent.
  const result = findItemAndParentById(itemId, fs);
  if (!result) {
    console.error("Item not found:", itemId);
    return;
  }
  const { item, parent } = result;

  // Find the target folder object.
  let targetFolder = null;
  let targetFullPath = findFolderFullPathById(folderId);

  if (targetFullPath) {
    targetFolder = findFolderObjectByFullPath(targetFullPath, fs);
  }

  // If not found via path, try finding it as an item in the FS
  if (!targetFolder) {
    const targetResult = findItemAndParentById(folderId, fs);
    if (targetResult && targetResult.item && targetResult.item.type === 'folder') {
      targetFolder = targetResult.item;
      targetFullPath = targetFolder.fullPath;
    }
  }

  if (!targetFolder) {
    console.error("Target folder not found:", folderId);
    return;
  }

  // Check if item is moving from desktop for cleanup
  const isMovingFromDesktop = item.fullPath && item.fullPath.includes('C://Desktop');

  // Remove the item from its current parent's contents.
  delete parent[itemId];

  // Clean up desktop icon position if moving from desktop
  if (isMovingFromDesktop) {
    const iconId = 'icon-' + itemId;
    if (desktopIconsState[iconId]) {
      delete desktopIconsState[iconId];
    }
  }

  // Ensure target folder has a 'contents' object.
  if (!targetFolder.contents) targetFolder.contents = {};
  targetFolder.contents[itemId] = item;

  // Also ensure the item is accessible in the unified structure
  // For folders that are not drive roots, also update fs.folders[targetFullPath]
  if (targetFullPath && !/^[A-Z]:\/\/$/.test(targetFullPath)) {
    if (!fs.folders[targetFullPath]) {
      fs.folders[targetFullPath] = {};
    }
    // We should probably copy the folder properties if creating a new entry
    if (Object.keys(fs.folders[targetFullPath]).length === 0) {
        Object.assign(fs.folders[targetFullPath], targetFolder);
    }
    fs.folders[targetFullPath][itemId] = item;
  }


  // Update the moved item's fullPath using the item's name, not its ID.
  // Ensure targetFullPath is valid
  if (!targetFullPath && targetFolder.fullPath) targetFullPath = targetFolder.fullPath;

  if (targetFullPath) {
      item.fullPath = targetFullPath + "/" + item.name;
  } else {
      console.warn("Could not determine full path for target folder", targetFolder);
  }

  await setFileSystemState(fs);
  saveState();
  refreshExplorerViews();

  // If moving from or to desktop, refresh desktop icons
  if ((targetFullPath && targetFullPath.includes('Desktop')) || (item.fullPath && item.fullPath.includes('Desktop'))) {
    renderDesktopIcons();
  }
}

/*
  Moves an item (file or folder) to a specific explorer path.
  This is used when dragging from desktop to explorer or between explorer windows.
*/
async function moveItemToExplorerPath(itemId, targetPath) {
  let fs = getFileSystemStateSync();

  // Find the dragged item and its parent.
  const result = findItemAndParentById(itemId, fs);
  if (!result) {
    console.error("Item not found:", itemId);
    return;
  }
  const { item, parent } = result;

  // Check if item is moving from desktop for cleanup
  const isMovingFromDesktop = item.fullPath && item.fullPath.includes('C://Desktop');

  // Remove the item from its current parent's contents.
  delete parent[itemId];

  // Clean up desktop icon position if moving from desktop
  if (isMovingFromDesktop) {
    const iconId = 'icon-' + itemId;
    if (typeof desktopIconsState !== 'undefined' && desktopIconsState[iconId]) {
      delete desktopIconsState[iconId];
    }
  }

  // Ensure target path exists in the file system structure
  if (!fs.folders[targetPath]) {
    fs.folders[targetPath] = {};
  }

  // Add item to target path
  fs.folders[targetPath][itemId] = item;

  // Update the moved item's fullPath
  item.fullPath = targetPath + "/" + item.name;

  await setFileSystemState(fs);
  saveState();
  refreshExplorerViews();

  // If moving from or to desktop, refresh desktop icons
  if (targetPath.includes('Desktop') || isMovingFromDesktop) {
    renderDesktopIcons();
  }
}

/*
  After a reordering drag-and-drop, update the underlying file system's order
  for the current folder (as rendered in the explorer window).
*/
async function updateOrderForCurrentPath() {
  const explorer = document.querySelector('.file-explorer-window');
  if (!explorer) return;
  const currentPath = explorer.getAttribute('data-current-path');
  const listItems = Array.from(explorer.querySelectorAll('ul > li'));
  let fs = getFileSystemStateSync();
  let folderObj = findFolderObjectByFullPath(currentPath, fs);
  if (!folderObj || !folderObj.contents) return;

  // Rebuild folder.contents in the order of <li> elements.
  let newContents = {};
  listItems.forEach(li => {
    const id = li.getAttribute('data-item-id');
    if (folderObj.contents[id]) {
      newContents[id] = folderObj.contents[id];
    }
  });
  folderObj.contents = newContents;
  await setFileSystemState(fs);
  saveState();
}

/*
  Helper: Recursively find an item by its id along with its parent's contents.
  Returns an object with the found item and its parent object.
*/
function findItemAndParentById(itemId, fs) {

  // Search through all folders in the unified structure
  for (const folderPath in fs.folders) {
    const folder = fs.folders[folderPath];

    // Check if the item is directly in this folder
    if (folder[itemId]) {
      return { item: folder[itemId], parent: folder };
    }

    // Check if the item is in the folder's contents
    if (folder.contents && folder.contents[itemId]) {
      return { item: folder.contents[itemId], parent: folder.contents };
    }
  }

  return null;
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

// Helper function to find the current path of an item
function findItemCurrentPath(itemId) {
  const fs = getFileSystemStateSync();

  // Search through all folders in the unified structure
  for (const folderPath in fs.folders) {
    const folder = fs.folders[folderPath];

    // Check if the item is directly in this folder
    if (folder[itemId]) {
      return folderPath;
    }

    // Check if the item is in the folder's contents
    if (folder.contents && folder.contents[itemId]) {
      return folderPath;
    }
  }

  return '';
}

// Handle drag over desktop folder icons
function handleDesktopFolderDragOver(e) {
  const isCompostItem = e.dataTransfer.types.includes('application/x-compost-item');
  if (isCompostItem || e.dataTransfer.types.includes('text/plain')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    this.classList.add('dragover');
  }
}

// Handle drag leave from desktop folder icons
function handleDesktopFolderDragLeave(e) {
  this.classList.remove('dragover');
}

// Handle drop on desktop folder icons
async function handleDesktopFolderDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('dragover');

  const sourceId = e.dataTransfer.getData("text/plain");
  const targetId = this.getAttribute('data-item-id');
  const isCompostItem = e.dataTransfer.getData('application/x-compost-item') === 'true';

  if (sourceId && targetId && sourceId !== targetId) {
    if (isCompostItem) {
      // Restore item to folder
      const targetItem = getItemFromFileSystem(targetId);
      if (targetItem && targetItem.type === 'folder') {
        await restoreItemFromCompostBin(sourceId, targetItem.fullPath);
      }
    } else {
      // Special case for compost bin
      if (targetId === 'compostbin') {
        const sourcePath = findItemCurrentPath(sourceId);
        await moveItemToCompostBin(sourceId, sourcePath);
      } else {
        await moveItemToFolder(sourceId, targetId);
      }
    }
  }
}

// Handle drag over explorer windows
function handleExplorerDragOver(e) {
  if (e.dataTransfer.types.includes('text/plain')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    this.classList.add('dragover');
  }
}

// Handle drag leave from explorer windows
function handleExplorerDragLeave(e) {
  // Only remove highlight if truly leaving the explorer window
  if (!this.contains(e.relatedTarget)) {
    this.classList.remove('dragover');
  }
}

// Handle drop on explorer windows
async function handleExplorerDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('dragover');

  const sourceId = e.dataTransfer.getData("text/plain");
  const explorerPath = this.getAttribute('data-current-path');
  const isCompostItem = e.dataTransfer.getData('application/x-compost-item') === 'true';

  if (sourceId && explorerPath) {
    if (isCompostItem) {
      // Restore from compost bin to this explorer path
      await restoreItemFromCompostBin(sourceId, explorerPath);
      return;
    }

    // Check if item is from desktop or another explorer
    const sourceItem = getItemFromFileSystem(sourceId);
    if (sourceItem) {
      const currentPath = sourceItem.fullPath;

      // Don't move if already in this path
      if (currentPath && currentPath.startsWith(explorerPath)) {
        return;
      }

      // Move from desktop to explorer
      if (currentPath && currentPath.includes('C://Desktop')) {
        await moveItemToExplorerPath(sourceId, explorerPath);
      } else {
        // Move between explorer locations
        await moveItemToExplorerPath(sourceId, explorerPath);
      }
    }
  }
}

setupFolderDrop();

// Function to restore an item from compost bin to a target location
async function restoreItemFromCompostBin(itemId, targetPath) {
  const fs = getFileSystemStateSync();

  // Use unified structure: look for compost bin in fs.folders['C://Desktop']
  const desktopItems = fs.folders['C://Desktop'] || {};
  const compostBin = desktopItems['compostbin'];

  if (!compostBin || !compostBin.contents || !compostBin.contents[itemId]) {
    console.error('Item not found in compost bin:', itemId);
    return;
  }

  const item = compostBin.contents[itemId];

  // Remove from compost bin
  delete compostBin.contents[itemId];

  // Find target container
  let targetContainer;
  if (targetPath === 'C://Desktop') {
    // Use unified structure for desktop
    if (!fs.folders['C://Desktop']) {
      fs.folders['C://Desktop'] = {};
    }
    targetContainer = fs.folders['C://Desktop'];
  } else {
    const targetFolder = findFolderObjectByFullPath(targetPath, fs);
    if (!targetFolder) {
      console.error('Target folder not found:', targetPath);
      return;
    }
    if (!targetFolder.contents) targetFolder.contents = {};
    targetContainer = targetFolder.contents;
  }

  // Update item's fullPath
  item.fullPath = targetPath === 'C://Desktop' ? targetPath + '/' + item.id : targetPath + '/' + item.id;

  // Add to target location
  targetContainer[itemId] = item;

  // Save and refresh
  await setFileSystemState(fs);
  saveState();
  refreshExplorerViews();
  renderDesktopIcons();

  // Refresh compost bin if open
  const compostBinWindow = document.getElementById('compost-bin');
  if (compostBinWindow) {
    const contentArea = compostBinWindow.querySelector('#compost-bin-content');
    if (contentArea) {
      loadCompostBinContents(contentArea);
      updateCompostBinHeader(compostBinWindow);
    }
  }
}

// Setup desktop as a drop target for both compost bin items and regular file explorer items
function setupDesktopDrop() {
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.addEventListener('dragover', (e) => {
      const isCompostItem = e.dataTransfer.types.includes('application/x-compost-item');
      const isRegularItem = e.dataTransfer.types.includes('text/plain');

      if (isCompostItem || isRegularItem) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Add visual feedback for desktop drop
        desktop.classList.add('drag-hover-target');
      }
    });

    desktop.addEventListener('dragleave', (e) => {
      // Only remove highlight if leaving the desktop completely
      if (!desktop.contains(e.relatedTarget)) {
        desktop.classList.remove('drag-hover-target');
      }
    });

    desktop.addEventListener('drop', async (e) => {
      e.preventDefault();
      desktop.classList.remove('drag-hover-target');

      const isCompostItem = e.dataTransfer.getData('application/x-compost-item') === 'true';
      const itemId = e.dataTransfer.getData('text/plain');

      if (itemId) {
        if (isCompostItem) {
          // Restore from compost bin to desktop
          await restoreItemFromCompostBin(itemId, 'C://Desktop');
        } else {
          // Move regular file/folder from explorer to desktop
          await moveItemToDesktop(itemId);
        }
      }
    });
  }
}

// Function to move an item from file explorer to desktop
async function moveItemToDesktop(itemId) {
  const fs = getFileSystemStateSync();

  // Find the item and its current parent
  const result = findItemAndParentById(itemId, fs);
  if (!result) {
    console.error("Item not found:", itemId);
    return;
  }

  const { item, parent } = result;

  // Don't move if already directly on desktop (not in a subfolder)
  if (item.fullPath && item.fullPath === 'C://Desktop/' + item.id) {
    return;
  }

  // Remove item from current location
  delete parent[itemId];

  // Ensure desktop contents exist in unified structure
  if (!fs.folders['C://Desktop']) {
    fs.folders['C://Desktop'] = {};
  }

  // Move item to desktop using unified structure
  fs.folders['C://Desktop'][itemId] = item;

  // Update item's fullPath
  item.fullPath = 'C://Desktop/' + item.id;

  // Save changes
  await setFileSystemState(fs);
  saveState();
  refreshExplorerViews();
  renderDesktopIcons();
}

// Export functions for use by other modules
export { setupFolderDrop, setupDesktopDrop, moveItemToFolder, moveItemToExplorerPath };

// Helper function to find a folder's full path by its ID
function findFolderFullPathById(folderId) {
  const fs = getFileSystemStateSync();

  // Search through all folders in the unified structure
  for (const folderPath in fs.folders) {
    const folder = fs.folders[folderPath];
    if (folder.id === folderId) {
      return folderPath;
    }
    // Also check contents if it's not a top-level match
    if (folder.contents && folder.contents[folderId] && folder.contents[folderId].type === 'folder') {
        return folder.contents[folderId].fullPath || (folderPath + '/' + folder.contents[folderId].name);
    }
  }

  return '';
}

// Helper function to find a folder object by its full path
function findFolderObjectByFullPath(fullPath, fs) {
  if (!fs) fs = getFileSystemStateSync();

  // Direct lookup in unified structure
  if (fs.folders[fullPath]) {
    return fs.folders[fullPath];
  }

  return null;
}
