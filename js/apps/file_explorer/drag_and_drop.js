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

function handleDrop(e) {
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
      restoreItemFromCompostBin(sourceId, targetPath);
    }
    return;
  }

  // Check if the target is a folder (has 'folder-item') to move into it.
  if (targetElem.classList.contains('folder-item')) {
    moveItemToFolder(sourceId, targetId);
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
    updateOrderForCurrentPath();
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
}

/*
  Moves an item (file or folder) into a target folder.
  It removes the item from its current parent's contents and adds it
  to the target folder's contents, updating fullPath as needed.
*/
function moveItemToFolder(itemId, folderId) {
  let fs = getFileSystemStateSync();

  console.log('moveItemToFolder called:', { itemId, folderId });
  console.log('File system structure:', fs);

  // Find the dragged item and its parent.
  const result = findItemAndParentById(itemId, fs);
  console.log('findItemAndParentById result:', result);
  if (!result) {
    console.error("Item not found:", itemId);
    return;
  }
  const { item, parent } = result;

  // Check if item is moving from desktop for cleanup
  const isMovingFromDesktop = item.fullPath && item.fullPath.includes('C://Desktop');
  console.log('Moving from desktop:', isMovingFromDesktop);

  // Remove the item from its current parent's contents.
  delete parent[itemId];
  console.log('Removed item from parent');

  // Clean up desktop icon position if moving from desktop
  if (isMovingFromDesktop) {
    const iconId = 'icon-' + itemId;
    if (desktopIconsState[iconId]) {
      delete desktopIconsState[iconId];
    }
  }

  // Find the target folder object.
  let targetFullPath = findFolderFullPathById(folderId);
  console.log('Target full path:', targetFullPath);
  let targetFolder = findFolderObjectByFullPath(targetFullPath, fs);
  console.log('Target folder object:', targetFolder);
  if (!targetFolder) {
    console.error("Target folder not found:", folderId);
    return;
  }
  // Ensure target folder has a 'contents' object.
  if (!targetFolder.contents) targetFolder.contents = {};
  targetFolder.contents[itemId] = item;

  // Also ensure the item is accessible in the unified structure
  // For folders that are not drive roots, also update fs.folders[targetFullPath]
  if (!/^[A-Z]:\/\/$/.test(targetFullPath)) {
    if (!fs.folders[targetFullPath]) {
      console.log('Creating folder entry in unified structure:', targetFullPath);
      fs.folders[targetFullPath] = {};
    }
    fs.folders[targetFullPath][itemId] = item;
    console.log('Added item to unified structure at:', targetFullPath, 'item:', item);
  }

  console.log('Final target folder contents:', targetFolder.contents);
  console.log('Final fs.folders[targetFullPath]:', fs.folders[targetFullPath]);

  // Update the moved item's fullPath using the item's name, not its ID.
  item.fullPath = targetFullPath + "/" + item.name;
  console.log('Updated item fullPath:', item.fullPath);

  setFileSystemState(fs);
  saveState();
  refreshExplorerViews();

  // If moving from or to desktop, refresh desktop icons
  if (targetFullPath.includes('Desktop') || findItemCurrentPath(itemId).includes('Desktop')) {
    renderDesktopIcons();
  }
}

/*
  After a reordering drag-and-drop, update the underlying file system's order
  for the current folder (as rendered in the explorer window).
*/
function updateOrderForCurrentPath() {
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
  setFileSystemState(fs);
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
function handleDesktopFolderDrop(e) {
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
        restoreItemFromCompostBin(sourceId, targetItem.fullPath);
      }
    } else {
      // Special case for compost bin
      if (targetId === 'compostbin') {
        const sourcePath = findItemCurrentPath(sourceId);
        moveItemToCompostBin(sourceId, sourcePath);
      } else {
        moveItemToFolder(sourceId, targetId);
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
function handleExplorerDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('dragover');

  const sourceId = e.dataTransfer.getData("text/plain");
  const explorerPath = this.getAttribute('data-current-path');

  if (sourceId && explorerPath) {
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
        moveItemToExplorerPath(sourceId, explorerPath);
      } else {
        // Move between explorer locations
        moveItemToExplorerPath(sourceId, explorerPath);
      }
    }
  }
}

setupFolderDrop();

// Function to restore an item from compost bin to a target location
function restoreItemFromCompostBin(itemId, targetPath) {
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
  setFileSystemState(fs);
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

    desktop.addEventListener('drop', (e) => {
      e.preventDefault();
      desktop.classList.remove('drag-hover-target');

      const isCompostItem = e.dataTransfer.getData('application/x-compost-item') === 'true';
      const itemId = e.dataTransfer.getData('text/plain');

      if (itemId) {
        if (isCompostItem) {
          // Restore from compost bin to desktop
          restoreItemFromCompostBin(itemId, 'C://Desktop');
        } else {
          // Move regular file/folder from explorer to desktop
          moveItemToDesktop(itemId);
        }
      }
    });
  }
}

// Call setupDesktopDrop when the script loads
setupDesktopDrop();

// Function to move an item from file explorer to desktop
function moveItemToDesktop(itemId) {
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
  setFileSystemState(fs);
  saveState();
  refreshExplorerViews();
  renderDesktopIcons();
}

// Function to move an item from any location to a specific explorer path
function moveItemToExplorerPath(itemId, targetPath) {
  const fs = getFileSystemStateSync();

  // Find the item and its current parent
  const result = findItemAndParentById(itemId, fs);
  if (!result) {
    console.error("Item not found:", itemId);
    return;
  }

  const { item, parent } = result;

  // Don't move if already in target path
  if (item.fullPath && item.fullPath.startsWith(targetPath)) {
    return;
  }

  // Check if item is moving from desktop for cleanup
  const isMovingFromDesktop = item.fullPath && item.fullPath.includes('C://Desktop');

  // Remove from current location
  delete parent[itemId];

  // Clean up desktop icon position if moving from desktop
  if (isMovingFromDesktop) {
    const iconId = 'icon-' + itemId;
    if (desktopIconsState[iconId]) {
      delete desktopIconsState[iconId];
    }
  }

  // Find target container
  let targetContainer;
  if (targetPath === 'C://') {
    targetContainer = fs.folders['C://'];
  } else {
    const targetFolder = findFolderObjectByFullPath(targetPath, fs);
    if (!targetFolder) {
      console.error('Target path not found:', targetPath);
      return;
    }
    if (!targetFolder.contents) targetFolder.contents = {};
    targetContainer = targetFolder.contents;
  }

  // Move item to target location
  targetContainer[itemId] = item;

  // Update item's fullPath
  item.fullPath = targetPath === 'C://' ? targetPath + item.id : targetPath + '/' + item.id;

  // Save changes
  setFileSystemState(fs);
  saveState();
  refreshExplorerViews();
  renderDesktopIcons();
}
