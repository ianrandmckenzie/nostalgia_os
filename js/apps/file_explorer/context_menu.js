/* =====================
   Context Menu & Creation Functions
   (They now accept an optional fromFullPath parameter to determine the parent folder.)
====================== */
document.addEventListener('contextmenu', function (e) {
  e.preventDefault();
  let target = e.target.closest('.draggable-icon, .file-item');
  // For right-click on blank space, determine current folder from the explorer.
  let explorerElem = document.querySelector('.file-explorer-window');
  let fromFullPath = explorerElem ? explorerElem.getAttribute('data-current-path') : 'C://';
  if (e.target.id == 'windows-container') fromFullPath = 'C://Desktop'; // Switch path to Desktop if Desktop is r-clicked
  showContextMenu(e, target, fromFullPath);
});

document.addEventListener('click', function () {
  hideContextMenu();
});

function showContextMenu(e, target, fromFullPath) {
  const menu = document.getElementById('context-menu');
  menu.style.zIndex = highestZ + 100;
  let html = '';
  if (target) {
    target.classList.add('right-click-target');
    const isVendor = target.getAttribute('data-is-vendor-application') === 'true';
    html += `<div class="px-4 py-2 ${isVendor ? 'text-gray-400' : 'hover:bg-gray-50 cursor-pointer'}" ${ isVendor ? '' : 'onclick="editItemName(event, this)"'}>Edit Name</div>`;
    html += `<div class="px-4 py-2 ${isVendor ? 'text-gray-400' : 'hover:bg-gray-50 cursor-pointer'}" ${ isVendor ? '' : 'onclick="deleteItem(event, this)"'}>Delete</div>`;
    html += `<div class="px-4 py-2 text-gray-400">New Folder</div>`;
    html += `<div class="px-4 py-2 text-gray-400">New File</div>`;
    html += `<div class="px-4 py-2 text-gray-400">New Shortcut</div>`;
  } else {
    html += `<div class="px-4 py-2 hover:bg-gray-50 cursor-pointer" onclick="createNewFolder(event, '${fromFullPath}')">New Folder</div>`;
    html += `<div class="px-4 py-2 hover:bg-gray-50 cursor-pointer" onclick="createNewFile(event, '${fromFullPath}')">New File</div>`;
    html += `<div class="px-4 py-2 hover:bg-gray-50 cursor-pointer" onclick="createNewShortcut(event, '${fromFullPath}')">New Shortcut</div>`;
  }
  menu.innerHTML = html;
  menu.style.top = e.clientY + 'px';
  menu.style.left = e.clientX + 'px';
  menu.classList.remove('hidden');
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  menu.classList.add('hidden');
}

function editItemName(e, menuItem) {
  e.stopPropagation();
  hideContextMenu();
  const targetElem = document.querySelector('.right-click-target');
  targetElem.classList.remove('right-click-target');
  if (!targetElem) {
    showDialogBox('No item selected.', 'error');
    return;
  }
  const itemId = targetElem.getAttribute('data-item-id');
  const explorerElem = targetElem.closest('.file-explorer-window');
  let contextPath;
  if (explorerElem) {
    contextPath = explorerElem.getAttribute('data-current-path');
  } else {
    contextPath = targetElem.getAttribute('data-current-path')
  }

  let fs = getFileSystemState();
  let folderContents = {};
  let fileId = targetElem.getAttribute('data-item-id');
  const isDrive = contextPath.length === 4;
  if (isDrive) {
    folderContents = fs.folders[contextPath];
  } else if (contextPath == 'C://Desktop') {
    folderContents = findFolderObjectByFullPath(contextPath, fs).contents;
  } else {
    folderContents = findFolderObjectByFullPath(contextPath, fs);
  }
  if (!(fileId in folderContents)) {
    showDialogBox('Item not found.', 'error');
    return;
  }
  let item = folderContents[itemId];
  if (!item) {
    showDialogBox('Item not found in file system.', 'error');
    return;
  }
  const windowId = 'window-' + Date.now();

  const editContent = `
    <div class="p-4">
      <form id="edit-name-form" class="flex flex-col space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">New Name</label>
          <input type="text" name="newName" value="${item.name}" required class="mt-1 block w-full border border-gray-300 rounded p-2" />
        </div>
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-edit-button" onclick="setTimeout(function(){closeWindow('${windowId}')},100);toggleButtonActiveState('cancel-edit-button', 'Cool!');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span>
          </button>
          <button type="submit" id="submit-edit-button" onclick="setTimeout(function(){closeWindow('${windowId}')},100);toggleButtonActiveState('submit-edit-button', 'Cool!');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Submit</span>
          </button>
        </div>
      </form>
    </div>
  `;
  createWindow("Edit Item Name", editContent, false, windowId, false, false, { type: 'integer', width: 300, height: 150 }, "Default");

  // Attach event listeners once the window is rendered.
  const editForm = document.getElementById('edit-name-form');
  editForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const newName = editForm.newName.value.trim();
    if (newName && newName !== item.name) {
      // For folders, update fullPath if necessary.
      if (item.type === "folder" && item.fullPath) {
        const driveRootRegex = /^[A-Z]:\/\/$/;
        let newFullPath;
        if (driveRootRegex.test(contextPath)) {
          newFullPath = contextPath + newName;
        } else {
          newFullPath = contextPath + "/" + newName;
        }
        const oldFullPath = item.fullPath;
        item.fullPath = newFullPath;
        fs.folders[newFullPath] = fs.folders[oldFullPath] || {};
        if(newFullPath !== oldFullPath) {
          delete fs.folders[oldFullPath];
        }
      }
      item.name = newName;
      if (!(contextPath === "C://Desktop")) {
        const explorerWindow = document.getElementById('explorer-window');
        if (explorerWindow) {
          explorerWindow.querySelector('.file-explorer-window').outerHTML = getExplorerWindowContent(contextPath);
        }
      }
      setupFolderDrop();
      setFileSystemState(fs);
      saveState();
      refreshExplorerViews();
      if (contextPath === "C://Desktop") renderDesktopIcons();
    }
    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });

  const cancelEditButton = document.getElementById('cancel-edit-button');
  cancelEditButton.addEventListener('click', function() {
    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });
}

function deleteItem(e) {
  e.stopPropagation();
  hideContextMenu();
  const targetElem = document.querySelector('.right-click-target');
  targetElem.classList.remove('right-click-target');
  if (!targetElem) {
    showDialogBox('No file selected.', 'error');
    return;
  }
  let fileId = targetElem.getAttribute('data-item-id');
  const explorerElem = targetElem.closest('.file-explorer-window');
  let contextPath;
  if (explorerElem) {
    contextPath = explorerElem.getAttribute('data-current-path');
  } else {
    contextPath = targetElem.getAttribute('data-current-path')
  }
  let fs = getFileSystemState();
  let folderContents = {};
  const isDrive = contextPath.length === 4;
  if (isDrive) {
    folderContents = fs.folders[contextPath];
  } else if (contextPath == 'C://Desktop') {
    folderContents = findFolderObjectByFullPath(contextPath, fs).contents;
  } else {
    folderContents = findFolderObjectByFullPath(contextPath, fs);
  }
  if (!(fileId in folderContents)) {
    showDialogBox('Item not found.', 'error');
    return;
  }
  if (!confirm("Are you sure you want to delete this file?")) {
    return;
  }
  delete folderContents[fileId];
  const explorerWindow = document.getElementById('explorer-window');
  if (explorerWindow) {
    explorerWindow.querySelector('.file-explorer-window').outerHTML = getExplorerWindowContent(contextPath);
    setupFolderDrop();
  }
  setFileSystemState(fs);
  saveState();
  refreshExplorerViews();
  renderDesktopIcons();
}

function createNewFolder(e, fromFullPath) {
  e.stopPropagation();
  hideContextMenu();
  const parentPath = fromFullPath || 'C://';
  const windowId = 'window-' + Date.now();

  // Build a dialog window for entering the new folder name
  const folderDialogContent = `
    <div class="p-4">
      <form id="create-folder-form" class="flex flex-col space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Folder Name</label>
          <input type="text" name="folderName" value="New Folder" required class="mt-1 block w-full border border-gray-300 rounded p-2" />
        </div>
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-folder-button" onclick="setTimeout(function(){closeWindow('${windowId}')},100);toggleButtonActiveState('cancel-folder-button', 'Cool!');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span>
          </button>
          <button type="submit" id="submit-folder-button" onclick="setTimeout(function(){closeWindow('${windowId}')},100);toggleButtonActiveState('submit-folder-button', 'Cool!');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Submit</span>
          </button>
        </div>
      </form>
    </div>
  `;

  createWindow("New Folder", folderDialogContent, false, windowId, false, false, { type: 'integer', width: 300, height: 150 }, "Default");

  const form = document.getElementById('create-folder-form');
  form.addEventListener('submit', function(ev) {
    ev.preventDefault();
    let folderName = form.folderName.value.trim();
    if (!folderName) folderName = 'Untitled';

    let fs = getFileSystemState();
    const folderId = "folder-" + Date.now();
    const driveRootRegex = /^[A-Z]:\/\/$/;
    let newFolderPath = driveRootRegex.test(parentPath) ? parentPath + folderId : parentPath + "/" + folderId;
    const newFolderItem = {
      id: folderId,
      name: folderName,
      type: "folder",
      fullPath: newFolderPath,
      contents: {}
    };

    // Determine destination by parsing fromFullPath
    const drive = fromFullPath.substring(0, 4);
    let paths = fromFullPath.substring(4).split('/');
    paths.unshift(drive);
    let destination = fs.folders;
    if (paths[1] !== '') { // Not at drive root
      paths.forEach(path => {
        const destination_parent = destination;
        destination = destination[path];
        if (destination && typeof destination.contents !== 'undefined') {
          if (typeof destination.contents !== 'string') {
            destination = destination.contents;
          } else {
            destination = destination_parent;
          }
        }
      });
    }
    if (typeof destination === 'undefined') destination = destination[drive];
    if (typeof destination !== 'undefined' && typeof destination[drive] === 'object') destination = destination[drive];

    // Insert the new folder into the parent's contents.
    destination[folderId] = newFolderItem;

    // Refresh explorer view.
    const explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      explorerWindow.querySelector('.file-explorer-window').outerHTML = getExplorerWindowContent(parentPath);
      setupFolderDrop();
    }
    setFileSystemState(fs);
    saveState();
    refreshExplorerViews();
    if (fromFullPath == 'C://Desktop') renderDesktopIcons();

    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });

  const cancelFolderBtn = document.getElementById('cancel-folder-button');
  cancelFolderBtn.addEventListener('click', function() {
    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });
}

function createNewFile(e, fromFullPath) {
  e.stopPropagation();
  hideContextMenu();
  const parentPath = fromFullPath || 'C://';

  const windowId = 'window-' + Date.now();
  // Build a dialog window for entering the new file name
  const fileDialogContent = `
    <div class="p-4">
      <form id="create-file-form" class="flex flex-col space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">File Name</label>
          <input type="text" name="fileName" value="New File.md" required class="mt-1 block w-full border border-gray-300 rounded p-2" />
        </div>
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-file-button" onclick="toggleButtonActiveState('cancel-file-button', 'Cool!');setTimeout(function(){closeWindow('${windowId}')},100);" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span>
          </button>
          <button type="submit" id="submit-file-button" onclick="toggleButtonActiveState('submit-file-button', 'Cool!');setTimeout(function(){closeWindow('${windowId}')},100);" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Submit</span>
          </button>
        </div>
      </form>
    </div>
  `;

  createWindow("New File", fileDialogContent, false, windowId, false, false, { type: 'integer', width: 300, height: 150 }, "Default");

  const form = document.getElementById('create-file-form');
  form.addEventListener('submit', function(ev) {
    ev.preventDefault();
    let fileName = form.fileName.value.trim();
    if (!fileName) fileName = 'Untitled';

    const newFile = {
      id: "file-" + Date.now(),
      name: fileName,
      type: "ugc-file",
      content: "",
      content_type: "markdown",
      icon_url: "image/doc.svg",
      description: ""
    };

    let fs = getFileSystemState();
    const drive = fromFullPath.substring(0, 4);
    let paths = fromFullPath.substring(4).split('/');
    paths.unshift(drive);
    let destination = fs.folders;
    if (paths[1] !== '') { // Not at drive root
      paths.forEach(path => {
        const destination_parent = destination;
        destination = destination[path];
        if (destination && typeof destination.contents !== 'undefined') {
          if (typeof destination.contents !== 'string') {
            destination = destination.contents;
          } else {
            destination = destination_parent;
          }
        }
      });
    }
    if (typeof destination === 'undefined') destination = destination[drive];
    if (typeof destination !== 'undefined' && typeof destination[drive] === 'object') destination = destination[drive];

    // Insert the new file into the parent's contents.
    destination[newFile.id] = newFile;

    // Refresh explorer view.
    const explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      explorerWindow.querySelector('.file-explorer-window').outerHTML = getExplorerWindowContent(parentPath);
      setupFolderDrop();
    }
    setFileSystemState(fs);
    saveState();
    refreshExplorerViews();
    if (fromFullPath == 'C://Desktop') renderDesktopIcons();

    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });

  const cancelFileBtn = document.getElementById('cancel-file-button');
  cancelFileBtn.addEventListener('click', function() {
    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });
}

function createNewShortcut(e, fromFullPath) {
  e.stopPropagation();
  hideContextMenu();
  const parentPath = fromFullPath || 'C://';
  const windowId = 'window-' + Date.now();

  const shortcutDialogContent = `
    <div class="p-4">
      <form id="create-shortcut-form" class="flex flex-col space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Shortcut Name</label>
          <input type="text" name="shortcutName" placeholder="Example Website" class="mt-1 block w-full border border-gray-300 rounded p-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Shortcut URL</label>
          <input type="url" name="shortcutURL" placeholder="https://example.com" required class="mt-1 block w-full border border-gray-300 rounded p-2" />
        </div>
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-shortcut-button" onclick="setTimeout(function(){closeWindow('${windowId}')},100);toggleButtonActiveState('cancel-shortcut-button', 'Cool!');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span>
          </button>
          <button type="submit" id="submit-shortcut-button" onclick="setTimeout(function(){closeWindow('${windowId}')},100);toggleButtonActiveState('submit-shortcut-button', 'Cool!');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
            <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Submit</span>
          </button>
        </div>
      </form>
    </div>
  `;

  createWindow("New Shortcut", shortcutDialogContent, false, windowId, false, false, { type: 'integer', width: 300, height: 200 }, "Default");

  const form = document.getElementById('create-shortcut-form');
  form.addEventListener('submit', function(ev) {
    ev.preventDefault();
    const shortcutURL = form.shortcutURL.value.trim();
    if (!shortcutURL) return; // Optionally, show an error dialog here.
    const shortcutName = form.shortcutName.value.trim() || shortcutURL.replace(shortcutURL.substring(15), '...');
    let fs = getFileSystemState();
    const shortcutId = "shortcut-" + Date.now();

    // Compute favicon URL using Google's favicon API.
    let faviconURL = "https://www.google.com/s2/favicons?sz=64&domain=";
    try {
      let urlObj = new URL(shortcutURL);
      faviconURL += urlObj.hostname;
    } catch (error) {
      faviconURL = "image/doc.svg"; // Fallback icon.
    }

    // Create new shortcut item.
    const newShortcut = {
      id: shortcutId,
      name: shortcutName, // You could optionally extract and use the hostname.
      type: "shortcut", // Custom type to handle double-click differently.
      url: shortcutURL,
      icon_url: faviconURL,
      description: ''
    };

    // Determine destination by parsing fromFullPath (same logic as createNewFile).
    const drive = fromFullPath.substring(0, 4);
    let paths = fromFullPath.substring(4).split('/');
    paths.unshift(drive);
    let destination = fs.folders;
    if (paths[1] !== '') { // Not at drive root.
      paths.forEach(path => {
        const destination_parent = destination;
        destination = destination[path];
        if (destination && typeof destination.contents !== 'undefined') {
          if (typeof destination.contents !== 'string') {
            destination = destination.contents;
          } else {
            destination = destination_parent;
          }
        }
      });
    }
    if (typeof destination === 'undefined') destination = destination[drive];
    if (typeof destination !== 'undefined' && typeof destination[drive] === 'object') destination = destination[drive];

    // Insert the new shortcut into parent's contents.
    destination[newShortcut.id] = newShortcut;

    // Refresh explorer view.
    const explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      explorerWindow.querySelector('.file-explorer-window').outerHTML = getExplorerWindowContent(parentPath);
      setupFolderDrop();
    }
    setFileSystemState(fs);
    saveState();
    refreshExplorerViews();
    if (fromFullPath == 'C://Desktop') renderDesktopIcons();

    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });

  const cancelBtn = document.getElementById('cancel-shortcut-button');
  cancelBtn.addEventListener('click', function() {
    if (typeof closeCurrentWindow === 'function') {
      closeCurrentWindow();
    }
  });
}
