/* =====================
   Context Menu & Creation Functions
   (They now accept an optional fromFullPath parameter to determine the parent folder.)
====================== */
document.addEventListener('contextmenu', function (e) {
  // Check if right-click is in a valid context for file explorer menu
  let target = e.target.closest('.draggable-icon, .file-item');
  let explorerElem = e.target.closest('.file-explorer-window');

  // Also check if we're within the explorer window content area
  let explorerWindow = e.target.closest('#explorer-window');
  let isInExplorerWindow = explorerElem || explorerWindow;

  // Check if we're truly on the desktop (not in any app window)
  let isInAppWindow = e.target.closest('#windows-container > div');
  let isInDesktopIconsArea = e.target.closest('#desktop-icons');
  let isOnWindowsContainer = e.target.id === 'windows-container';
  let isDesktop = (isOnWindowsContainer || isInDesktopIconsArea) && !isInAppWindow;

  // Only show file explorer context menu if:
  // 1. Right-clicking on a file/folder item, OR
  // 2. Right-clicking within a file explorer window (including its content area), OR
  // 3. Right-clicking on empty desktop area (but NOT inside other app windows)
  if (!target && !isInExplorerWindow && !isDesktop) {
    return; // Let other context menus handle this (or show no menu)
  }

  e.preventDefault();

  // For right-click on blank space, determine current folder from the explorer.
  let fromFullPath;
  if (explorerElem) {
    fromFullPath = explorerElem.getAttribute('data-current-path');
  } else if (explorerWindow) {
    // If we're in the explorer window but not directly on .file-explorer-window,
    // find the .file-explorer-window within this window
    const fileExplorerContent = explorerWindow.querySelector('.file-explorer-window');
    fromFullPath = fileExplorerContent?.getAttribute('data-current-path') || 'C://';
  } else if (isDesktop) {
    fromFullPath = 'C://Desktop';
  } else {
    fromFullPath = 'C://';
  }

  showContextMenu(e, target, fromFullPath);
});

document.addEventListener('click', function () {
  hideContextMenu();
});

function showContextMenu(e, target, fromFullPath) {
  const menu = document.getElementById('context-menu');

  // clear old entries
  menu.replaceChildren();
  menu.style.zIndex = highestZ + 100;

  const addItem = (text, disabled, onclick, hasSubmenu = false) => {
    const item = document.createElement('div');
    item.className = `px-4 py-2 relative ${
      disabled ? 'text-gray-400'
               : 'hover:bg-gray-50 cursor-pointer'
    }`;

    if (hasSubmenu) {
      item.innerHTML = `${text} <span class="float-right">▶</span>`;
    } else {
      item.textContent = text;
    }

    if (!disabled && onclick) item.addEventListener('click', onclick);
    menu.appendChild(item);
    return item;
  };

  const addSubmenu = (parentItem, submenuItems) => {
    const submenu = document.createElement('div');
    submenu.className = 'absolute left-full top-0 bg-white border border-gray-500 shadow-lg hidden min-w-32';
    submenu.style.zIndex = highestZ + 101;

    submenuItems.forEach(({ text, disabled, onclick }) => {
      const subItem = document.createElement('div');
      subItem.textContent = text;
      subItem.className = `px-4 py-2 ${
        disabled ? 'text-gray-400'
                 : 'hover:bg-gray-50 cursor-pointer'
      }`;
      if (!disabled && onclick) {
        subItem.addEventListener('click', (ev) => {
          hideContextMenu();
          onclick(ev);
        });
      }
      submenu.appendChild(subItem);
    });

    parentItem.appendChild(submenu);

    // Show/hide submenu on hover/touch
    let hideTimeout;

    parentItem.addEventListener('mouseenter', () => {
      clearTimeout(hideTimeout);
      submenu.classList.remove('hidden');
    });

    parentItem.addEventListener('mouseleave', () => {
      hideTimeout = setTimeout(() => {
        submenu.classList.add('hidden');
      }, 200);
    });

    // Touch support for mobile
    parentItem.addEventListener('touchstart', (ev) => {
      ev.preventDefault();
      if (submenu.classList.contains('hidden')) {
        submenu.classList.remove('hidden');
      } else {
        submenu.classList.add('hidden');
      }
    });

    submenu.addEventListener('mouseenter', () => {
      clearTimeout(hideTimeout);
    });

    submenu.addEventListener('mouseleave', () => {
      hideTimeout = setTimeout(() => {
        submenu.classList.add('hidden');
      }, 200);
    });
  };

  if (target) {
    target.classList.add('right-click-target');
    const isVendor = target.getAttribute('data-is-vendor-application') === 'true';

    addItem('Edit Name',  isVendor, ev => editItemName(ev));
    addItem('Delete',     isVendor, ev => deleteItem(ev));
    addItem('New Folder', true);
    addItem('New File',   true);
    addItem('New Shortcut', true);
  } else {
    addItem('New Folder',   false, ev => createNewFolder  (ev, fromFullPath));

    const newFileItem = addItem('New File', false, null, true);
    addSubmenu(newFileItem, [
      { text: 'LetterPad', disabled: false, onclick: ev => createNewLetterpad(ev, fromFullPath) },
      { text: 'Image', disabled: false, onclick: ev => createNewImage(ev, fromFullPath) }
    ]);

    addItem('New Shortcut', false, ev => createNewShortcut(ev, fromFullPath));
  }

  menu.style.top  = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
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

  const winId = `window-${Date.now()}`;
  const win   = createWindow(
    'Edit Item Name', '', false, winId, false, false,
    { type:'integer', width:300, height:150 }, 'Default'
  );
  const box = win.querySelector('.p-2');
  box.classList.add('p-4');

  /* form ------------------------------------------------------------------ */
  const form = document.createElement('form');
  form.id    = 'edit-name-form';
  form.className = 'flex flex-col space-y-4';
  box.appendChild(form);

  // text field
  const input = document.createElement('input');
  input.type  = 'text';
  input.name  = 'newName';
  input.required = true;
  input.value = item.name;
  input.className = 'mt-1 block w-full border border-gray-300 rounded p-2';
  form.appendChild(makeField('New Name', input));

  // buttons row
  const btnRow = document.createElement('div');
  btnRow.className = 'flex justify-end space-x-2';
  form.appendChild(btnRow);

  const cancelBtn = makeWin95Button('Cancel');
  const submitBtn = makeWin95Button('Submit');
  cancelBtn.id = 'cancel-edit-button';
  submitBtn.id = 'submit-edit-button';
  btnRow.append(cancelBtn, submitBtn);

  /* handlers --------------------------------------------------------------- */
  cancelBtn.addEventListener('click', () => closeWindow(winId));
  submitBtn.addEventListener('click', () => toggleButtonActiveState('submit-edit-button', 'Editing...'));

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
    closeWindow(winId);
  });

  const cancelEditButton = document.getElementById('cancel-edit-button');
  cancelEditButton.addEventListener('click', function() {
    closeWindow(winId);
  });
}

/* =====================================================
   Delete item – uses a custom confirmation window
   ===================================================== */
function deleteItem(e) {
  e.stopPropagation();
  hideContextMenu();

  const targetElem = document.querySelector('.right-click-target');
  if (targetElem) targetElem.classList.remove('right-click-target');
  if (!targetElem) {
    showDialogBox('No file selected.', 'error');
    return;
  }

  /* ── gather context data ───────────────────────────── */
  const fileId       = targetElem.getAttribute('data-item-id');
  const explorerElem = targetElem.closest('.file-explorer-window');
  const contextPath  = explorerElem
        ? explorerElem.getAttribute('data-current-path')
        : targetElem.getAttribute('data-current-path');

  const fs   = getFileSystemState();
  let folderContents;
  const isDrive = contextPath.length === 4;

  if (isDrive)                    folderContents = fs.folders[contextPath];
  else if (contextPath === 'C://Desktop')
                                  folderContents = findFolderObjectByFullPath(contextPath, fs).contents;
  else                            folderContents = findFolderObjectByFullPath(contextPath, fs);

  if (!(fileId in folderContents)) {
    showDialogBox('Item not found.', 'error');
    return;
  }

  /* ── confirmation window ───────────────────────────── */
  const winId = `window-${Date.now()}`;
  const win   = createWindow(
    'Delete File?', '', false, winId, false, false,
    { type:'integer', width:320, height:140 }, 'Default'
  );
  const box   = win.querySelector('.p-2');
  box.classList.add('p-4', 'flex', 'flex-col', 'justify-between', 'h-full');

  const msg = document.createElement('p');
  msg.textContent = 'Are you sure you want to delete this file?';
  box.appendChild(msg);

  const btnRow = document.createElement('div');
  btnRow.className = 'flex justify-end space-x-2';
  box.appendChild(btnRow);

  // helpers already defined earlier
  const cancelBtn = makeWin95Button('Cancel');
  const deleteBtn = makeWin95Button('Delete');
  btnRow.append(cancelBtn, deleteBtn);

  /* ── handlers ──────────────────────────────────────── */
  cancelBtn.addEventListener('click', () => closeWindow(winId));

  deleteBtn.addEventListener('click', () => {
    // Clean up desktop icon position if deleting from desktop
    if (contextPath === 'C://Desktop') {
      const iconId = 'icon-' + fileId;
      if (desktopIconsState[iconId]) {
        delete desktopIconsState[iconId];
      }
    }

    // remove file
    delete folderContents[fileId];

    // refresh explorer content
    const explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      explorerWindow.querySelector('.file-explorer-window').outerHTML =
        getExplorerWindowContent(contextPath);
      setupFolderDrop();
    }
    setFileSystemState(fs);
    saveState();
    refreshExplorerViews();
    renderDesktopIcons();

    closeWindow(winId);
  });
}

function createNewFolder(e, fromFullPath) {
  e.stopPropagation();
  hideContextMenu();
  const parentPath = fromFullPath || 'C://';
  const winId = `window-${Date.now()}`;

  // Build a dialog window for entering the new folder name
   // blank dialog
  const win = createWindow(
    'New Folder', '', false, winId, false, false,
    { type:'integer', width:300, height:150 }, 'Default'
  );
  const box = win.querySelector('.p-2');
  box.classList.add('p-4');

  // build form
  const form = document.createElement('form');
  form.id    = 'create-folder-form';
  form.className = 'flex flex-col space-y-4';
  box.appendChild(form);

  const nameInput = document.createElement('input');
  nameInput.type  = 'text';
  nameInput.name  = 'folderName';
  nameInput.required = true;
  nameInput.value = 'New Folder';
  nameInput.className = 'mt-1 block w-full border border-gray-300 rounded p-2';
  form.appendChild(makeField('Folder Name', nameInput));

  const btnRow = document.createElement('div');
  btnRow.className = 'flex justify-end space-x-2';
  const cancelBtn = makeWin95Button('Cancel');
  const submitBtn = makeWin95Button('Submit');
  btnRow.append(cancelBtn, submitBtn);
  form.appendChild(btnRow);

  cancelBtn.addEventListener('click', () => closeWindow(winId));

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
    let destination;

    // For root directories, insert directly into the drive
    if (driveRootRegex.test(fromFullPath)) {
      destination = fs.folders[fromFullPath];
    } else {
      // For subdirectories, find the parent folder object
      const parentFolder = findFolderObjectByFullPath(fromFullPath, fs);
      if (parentFolder && parentFolder.contents) {
        destination = parentFolder.contents;
      } else {
        console.error('Parent folder not found or has no contents:', fromFullPath);
        destination = fs.folders[fromFullPath.substring(0, 4)] || {};
      }
    }

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

    closeWindow(winId);
  });

  cancelBtn.addEventListener('click', function() {
    closeWindow(winId);
  });
}

/* =========================
   Create a new UGC file — no innerHTML
   ========================= */
function createNewFile(e, fromFullPath, onCreated = null) {
  if (e) e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';
  const winId      = `window-${Date.now()}`;

  // ── 1. Empty dialog window ────────────────────────────
  const win  = createWindow(
    'New File', '',       // no markup
    false, winId, false, false,
    { type:'integer', width:300, height:150 },
    'Default'
  );
  const box  = win.querySelector('.p-2');
  box.classList.add('p-4');

  // ── 2. Build form -------------------------------------
  const form = document.createElement('form');
  form.id    = 'create-file-form';
  form.className = 'flex flex-col space-y-4';
  box.appendChild(form);

  // File-name input
  const nameInput = document.createElement('input');
  nameInput.type  = 'text';
  nameInput.name  = 'fileName';
  nameInput.required = true;
  nameInput.value = 'New File.rtf';
  nameInput.className = 'mt-1 block w-full border border-gray-300 rounded p-2';
  form.appendChild(makeField('File Name', nameInput));

  // Buttons
  const btnRow   = document.createElement('div');
  btnRow.className = 'flex justify-end space-x-2';
  form.appendChild(btnRow);

  const cancelBtn = makeWin95Button('Cancel');
  cancelBtn.id    = 'cancel-file-button';
  const submitBtn = makeWin95Button('Submit');
  submitBtn.id    = 'submit-file-button';
  btnRow.append(cancelBtn, submitBtn);

  // ── 3. Handlers ---------------------------------------
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleButtonActiveState('cancel-file-button', 'Cancelling...');
    setTimeout(() => closeWindow(winId), 100);
  });

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    toggleButtonActiveState('submit-file-button', 'Submitting...');
    setTimeout(() => closeWindow(winId), 100);

    const fileName = nameInput.value.trim() || 'Untitled';
    const newFile = {
      id: `file-${Date.now()}`,
      name: fileName,
      type: 'ugc-file',
      content: '',
      content_type: 'markdown',
      icon_url: 'image/doc.png',
      description: ''
    };

    /* ------------- insert into filesystem ---------------- */
    const fs    = getFileSystemState();
    const drive = parentPath.substring(0, 4);
    const paths = parentPath.substring(4).split('/');
    paths.unshift(drive);

    let dest = fs.folders;
    if (paths[1] !== '') {        // not at drive root
      paths.forEach(p => {
        const parent = dest;
        dest = dest[p];
        if (dest && typeof dest.contents !== 'undefined') {
          dest = typeof dest.contents === 'string' ? parent : dest.contents;
        }
      });
    }
    if (typeof dest === 'undefined') dest = dest[drive];
    if (dest && typeof dest[drive] === 'object') dest = dest[drive];

    dest[newFile.id] = newFile;

    /* ------------- refresh views ------------------------ */
    const explorerWin = document.getElementById('explorer-window');
    if (explorerWin) {
      explorerWin.querySelector('.file-explorer-window').outerHTML =
        getExplorerWindowContent(parentPath);
      setupFolderDrop();
    }
    setFileSystemState(fs);
    saveState();
    if (typeof onCreated === 'function') onCreated(newFile.id, newFile);
    refreshExplorerViews();
    if (fromFullPath === 'C://Desktop') renderDesktopIcons();
  });
}

function createNewShortcut(e, fromFullPath) {
  e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';
  const winId      = `window-${Date.now()}`;

  /* ── 1. blank dialog ───────────────────────────────── */
  const win  = createWindow(
    'New Shortcut', '',     // no markup
    false, winId, false, false,
    { type:'integer', width:300, height:200 },
    'Default'
  );
  const box  = win.querySelector('.p-2');
  box.classList.add('p-4');

  /* ── 2. build form ----------------------------------- */
  const form = document.createElement('form');
  form.id    = 'create-shortcut-form';
  form.className = 'flex flex-col space-y-4';
  box.appendChild(form);

  const nameInput = document.createElement('input');
  nameInput.type  = 'text';
  nameInput.name  = 'shortcutName';
  nameInput.placeholder = 'Example Website';
  nameInput.className =
    'mt-1 block w-full border border-gray-300 rounded p-2';
  form.appendChild(makeField('Shortcut Name', nameInput));

  const urlInput = document.createElement('input');
  urlInput.type  = 'url';
  urlInput.name  = 'shortcutURL';
  urlInput.required = true;
  urlInput.placeholder = 'https://example.com';
  urlInput.className =
    'mt-1 block w-full border border-gray-300 rounded p-2';
  form.appendChild(makeField('Shortcut URL', urlInput));

  // buttons
  const btnRow   = document.createElement('div');
  btnRow.className = 'flex justify-end space-x-2';
  const cancelBtn = makeWin95Button('Cancel');
  cancelBtn.id    = 'cancel-shortcut-button';
  const submitBtn = makeWin95Button('Submit');
  submitBtn.id    = 'submit-shortcut-button';
  btnRow.append(cancelBtn, submitBtn);
  form.appendChild(btnRow);

  /* ── 3. handlers ------------------------------------- */
  cancelBtn.addEventListener('click', () => {
    e.preventDefault();
    toggleButtonActiveState('cancel-shortcut-button', 'Cancelling...');
    setTimeout(() => closeWindow(winId), 100);
  });

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    toggleButtonActiveState('submit-shortcut-button', 'Submitting...');
    setTimeout(() => closeWindow(winId), 100);

    const shortcutURL = urlInput.value.trim();
    if (!shortcutURL) return;

    const shortcutName =
      nameInput.value.trim() ||
      shortcutURL.replace(shortcutURL.substring(15), '…');

    /* build shortcut object */
    const shortcutId = `shortcut-${Date.now()}`;
    let faviconURL   = 'https://www.google.com/s2/favicons?sz=64&domain=';
    try   { faviconURL += new URL(shortcutURL).hostname; }
    catch { faviconURL  = 'image/doc.png'; }

    const newShortcut = {
      id:  shortcutId,
      name: shortcutName,
      type: 'shortcut',
      url:  shortcutURL,
      icon_url: faviconURL,
      description: ''
    };

    /* insert into filesystem (same traversal logic) */
    const fs    = getFileSystemState();
    const drive = fromFullPath.substring(0, 4);
    const paths = fromFullPath.substring(4).split('/');
    paths.unshift(drive);

    let dest = fs.folders;
    if (paths[1] !== '') {
      paths.forEach(p => {
        const parent = dest;
        dest = dest[p];
        if (dest && typeof dest.contents !== 'undefined') {
          dest = typeof dest.contents === 'string' ? parent
                                                   : dest.contents;
        }
      });
    }
    if (typeof dest === 'undefined') dest = dest[drive];
    if (dest && typeof dest[drive] === 'object') dest = dest[drive];

    dest[newShortcut.id] = newShortcut;

    /* refresh views */
    const explorerWin = document.getElementById('explorer-window');
    if (explorerWin) {
      explorerWin.querySelector('.file-explorer-window').outerHTML =
        getExplorerWindowContent(parentPath);
      setupFolderDrop();
    }
    setFileSystemState(fs);
    saveState();
    refreshExplorerViews();
    if (fromFullPath === 'C://Desktop') renderDesktopIcons();
  });
}

/* =====================
   Create a new LetterPad file
====================== */
function createNewLetterpad(e, fromFullPath, onCreated = null) {
  if (e) e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';

  // Generate unique ID and default content
  const fileId = `file-${Date.now()}`;
  const fileName = 'New LetterPad.md';
  const defaultContent = '';

  // Create LetterPad file in the filesystem
  const newFile = {
    id: fileId,
    name: fileName,
    type: 'ugc-file',
    content: defaultContent,
    content_type: 'markdown',
    icon_url: 'image/doc.png'
  };

  // Insert into filesystem
  const fs = getFileSystemState();
  const drive = parentPath.substring(0, 4);
  const paths = parentPath.substring(4).split('/');
  paths.unshift(drive);

  let dest = fs.folders;
  if (paths[1] !== '') {
    paths.forEach(p => {
      const parent = dest;
      dest = dest[p];
      if (dest && typeof dest.contents !== 'undefined') {
        dest = typeof dest.contents === 'string' ? parent : dest.contents;
      }
    });
  }
  if (typeof dest === 'undefined') dest = dest[drive];
  if (dest && typeof dest[drive] === 'object') dest = dest[drive];

  dest[newFile.id] = newFile;

  // Save filesystem state
  setFileSystemState(fs);
  saveState();

  // Refresh views to show the new file
  const explorerWin = document.getElementById('explorer-window');
  if (explorerWin) {
    explorerWin.querySelector('.file-explorer-window').outerHTML =
      getExplorerWindowContent(parentPath);
    setupFolderDrop();
  }
  refreshExplorerViews();
  if (fromFullPath === 'C://Desktop') renderDesktopIcons();

  // Launch the LetterPad editor directly for immediate editing
  const win = createWindow(
    fileName,
    `<div class="letterpad_editor min-h-48 h-full w-full" data-letterpad-editor-id="${fileId}"></div>`,
    false,
    fileId,
    false,
    false,
    { type: 'integer', width: 600, height: 500 },
    'editor'
  );

  // Initialize the editor with the default content
  setTimeout(() => {
    const storageKey = `letterpad_${fileId}`;
    storage.setItemSync(storageKey, { content: defaultContent });

    const editorContainer = document.querySelector(`[data-letterpad-editor-id="${fileId}"]`);
    if (editorContainer && typeof initializeLetterPad === 'function') {
      initializeLetterPad(editorContainer);
    }
  }, 100);

  if (typeof onCreated === 'function') onCreated(newFile.id, newFile);
}

/* =========================
   Create a new Image file (upload from computer)
   ========================= */
function createNewImage(e, fromFullPath, onCreated = null) {
  if (e) e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';

  // Create hidden file input for image selection
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Get file extension for content type
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Use the addFileToFileSystem function
      const newFile = await addFileToFileSystem(file.name, '', parentPath, fileExtension, file);

      if (newFile && typeof onCreated === 'function') {
        onCreated(newFile.id, newFile);
      }

      // Refresh views
      if (typeof refreshExplorerViews === 'function') {
        refreshExplorerViews();
      }
      if (fromFullPath === 'C://Desktop' && typeof renderDesktopIcons === 'function') {
        renderDesktopIcons();
      }
    }

    // Clean up
    document.body.removeChild(fileInput);
  });

  // Add to document and trigger click
  document.body.appendChild(fileInput);
  fileInput.click();
}

// Create a menu/form button with Win-95 raised edges
function makeWin95Button(label) {
  const btn  = document.createElement('button');
  btn.className = 'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
  const span = document.createElement('span');
  span.className = 'border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3';
  span.textContent = label;
  btn.appendChild(span);
  return btn;
}

// Conventional field builder: <label> + control
function makeField(labelText, control) {
  const wrap  = document.createElement('div');
  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700';
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}
