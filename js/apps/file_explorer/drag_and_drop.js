function setupFolderDrop() {
  const fileItems = document.querySelectorAll('.file-item');
  fileItems.forEach(item => {
    item.setAttribute('draggable', true);
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });

  // Also setup desktop folder icons as drop targets
  const desktopFolders = document.querySelectorAll('.desktop-folder-icon[data-item-id]');
  desktopFolders.forEach(folder => {
    const itemId = folder.getAttribute('data-item-id');
    const item = getItemFromFileSystem(itemId);
    if (item && item.type === 'folder') {
      folder.addEventListener('dragover', handleDesktopFolderDragOver);
      folder.addEventListener('dragleave', handleDesktopFolderDragLeave);
      folder.addEventListener('drop', handleDesktopFolderDrop);
    }
  });
}

function handleDragStart(e) {
  e.dataTransfer.effectAllowed = "move";
  // Store the dragged item's id.
  e.dataTransfer.setData("text/plain", this.getAttribute('data-item-id'));
  this.classList.add('dragging');
}

function handleDragOver(e) {
  // Allow drop.
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  this.classList.add('dragover');
}

function handleDragLeave(e) {
  this.classList.remove('dragover');
}

function handleDrop(e) {
  e.stopPropagation();
  this.classList.remove('dragover');

  const sourceId = e.dataTransfer.getData("text/plain");
  const targetId = this.getAttribute('data-item-id');

  if (sourceId === targetId) return; // No action if dropped on itself.

  const sourceElem = document.querySelector(`[data-item-id="${sourceId}"]`);
  const targetElem = this;

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
  let fs = getFileSystemState();

  // Find the dragged item and its parent.
  const result = findItemAndParentById(itemId, fs);
  if (!result) {
    console.error("Item not found:", itemId);
    return;
  }
  const { item, parent } = result;
  // Remove the item from its current parent's contents.
  delete parent[itemId];

  // Find the target folder object.
  let targetFullPath = findFolderFullPathById(folderId);
  let targetFolder = findFolderObjectByFullPath(targetFullPath, fs);
  if (!targetFolder) {
    console.error("Target folder not found:", folderId);
    return;
  }
  // Ensure target folder has a 'contents' object.
  if (!targetFolder.contents) targetFolder.contents = {};
  targetFolder.contents[itemId] = item;

  // Update the moved item's fullPath.
  item.fullPath = targetFullPath + "/" + item.id;

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
  let fs = getFileSystemState();
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
  function search(contents) {
    for (const key in contents) {
      if (key === itemId) {
        return { item: contents[key], parent: contents };
      }
      if (contents[key].type === 'folder' && contents[key].contents) {
        const found = search(contents[key].contents);
        if (found) return found;
      }
    }
    return null;
  }
  for (const drive in fs.folders) {
    if (/^[A-Z]:\/\/$/.test(drive)) {
      const found = search(fs.folders[drive]);
      if (found) return found;
    }
  }
  return null;
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

// Helper function to find the current path of an item
function findItemCurrentPath(itemId) {
  function searchPath(contents, currentPath) {
    for (const key in contents) {
      if (key === itemId) {
        return currentPath;
      }
      if (contents[key].type === 'folder' && contents[key].contents) {
        const found = searchPath(contents[key].contents, contents[key].fullPath || currentPath + '/' + key);
        if (found) return found;
      }
    }
    return null;
  }

  const fs = getFileSystemState();
  for (const drive in fs.folders) {
    if (/^[A-Z]:\/\/$/.test(drive)) {
      const found = searchPath(fs.folders[drive], drive);
      if (found) return found;
    }
  }
  return '';
}

// Handle drag over desktop folder icons
function handleDesktopFolderDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  this.classList.add('dragover');
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

  if (sourceId && targetId && sourceId !== targetId) {
    moveItemToFolder(sourceId, targetId);
  }
}

setupFolderDrop();
