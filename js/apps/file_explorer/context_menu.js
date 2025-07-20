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
      { text: 'LetterPad', disabled: false, onclick: async ev => await createNewLetterpad(ev, fromFullPath) },
      { text: 'Image', disabled: false, onclick: ev => createNewImage(ev, fromFullPath) },
      { text: 'Audio', disabled: false, onclick: ev => createNewAudio(ev, fromFullPath) },
      { text: 'Video', disabled: false, onclick: ev => createNewVideo(ev, fromFullPath) }
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

  let fs = getFileSystemStateSync();

  // Safety check to ensure file system state is properly initialized
  if (!fs || !fs.folders) {
    console.error('File system state not properly initialized:', fs);
    showDialogBox('File system not initialized. Please refresh the page.', 'error');
    return;
  }

  let folderContents = {};
  const isDrive = contextPath.length === 4;
  if (isDrive) {
    folderContents = fs.folders[contextPath];
  } else {
    // For all subdirectories (including desktop), use direct fs.folders lookup
    folderContents = fs.folders[contextPath];
  }

  if (!folderContents) {
    console.error('Folder contents not found for path:', contextPath);
    showDialogBox('Folder contents not found.', 'error');
    return;
  }
  if (!(itemId in folderContents)) {
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

        // Recursively update all nested folder paths
        function updateNestedFolderPaths(oldPath, newPath) {
          // Update the folder's own path
          if (fs.folders[oldPath]) {
            fs.folders[newPath] = fs.folders[oldPath];
            delete fs.folders[oldPath];

            // Recursively update all nested folders
            for (const key in fs.folders[newPath]) {
              const nestedItem = fs.folders[newPath][key];
              if (nestedItem.type === "folder" && nestedItem.fullPath && nestedItem.fullPath.startsWith(oldPath)) {
                const nestedOldPath = nestedItem.fullPath;
                const nestedNewPath = nestedItem.fullPath.replace(oldPath, newPath);
                nestedItem.fullPath = nestedNewPath;

                // Recursively update this nested folder's contents
                if (fs.folders[nestedOldPath]) {
                  updateNestedFolderPaths(nestedOldPath, nestedNewPath);
                }
              }
            }
          }
        }

        item.fullPath = newFullPath;
        updateNestedFolderPaths(oldFullPath, newFullPath);
      }
      item.name = newName;

      // Refresh the UI to show the updated name
      if (contextPath === "C://Desktop") {
        // For desktop, refresh desktop icons
        if (typeof renderDesktopIcons === 'function') {
          renderDesktopIcons();
        } else {
          console.error('renderDesktopIcons function not available');
        }
      } else {
        // For explorer windows, refresh all windows showing this path
        if (typeof refreshAllExplorerWindows === 'function') {
          refreshAllExplorerWindows(contextPath);
        } else {
          console.error('refreshAllExplorerWindows function not available');
        }
      }

      setFileSystemState(fs);
      // Use async save for critical data operations
      saveState().catch(error => {
        console.error('Failed to save state after renaming:', error);
      });

      // Force additional refresh after a short delay to ensure everything updates
      setTimeout(() => {
        if (contextPath === "C://Desktop" && typeof renderDesktopIcons === 'function') {
          renderDesktopIcons();
        } else if (typeof refreshAllExplorerWindows === 'function') {
          refreshAllExplorerWindows(contextPath);
        }
      }, 100);

      // Note: refreshExplorerViews() is known to be broken, so we handle refresh above
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

  const fs   = getFileSystemStateSync();

  // Safety check to ensure file system state is properly initialized
  if (!fs || !fs.folders) {
    console.error('File system state not properly initialized:', fs);
    showDialogBox('File system not initialized. Please refresh the page.', 'error');
    return;
  }

  // Use the modern unified approach: fs.folders[contextPath] for folder contents
  let folderContents = fs.folders[contextPath];

  if (!folderContents) {
    console.error('Folder contents not found for path:', contextPath);
    console.error('Available folders:', Object.keys(fs.folders));
    showDialogBox('Folder not found in file system.', 'error');
    return;
  }

  if (!(fileId in folderContents)) {
    console.error('Item not found in folder:', fileId, 'at path:', contextPath);
    console.error('Available items:', Object.keys(folderContents));
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

  deleteBtn.addEventListener('click', async () => {
    // Get the file object before deletion to check if it's a music file
    const deletedFile = folderContents[fileId];
    const isMediaFile = deletedFile && deletedFile.content_type && ['mp3', 'wav', 'ogg', 'audio'].includes(deletedFile.content_type);
    const isFromMediaFolder = contextPath === 'C://Media';

    // Clean up desktop icon position if deleting from desktop
    if (contextPath === 'C://Desktop') {
      const iconId = 'icon-' + fileId;
      if (desktopIconsState[iconId]) {
        delete desktopIconsState[iconId];
      }
    }

    // remove file
    delete folderContents[fileId];

    // Save state first, then update UI
    await setFileSystemState(fs);

    // refresh explorer content
    const explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      explorerWindow.querySelector('.file-explorer-window').outerHTML =
        getExplorerWindowContent(contextPath);
      setupFolderDrop();
    }
    refreshExplorerViews();
    renderDesktopIcons();

    // If a music file was deleted from C://Media, refresh the media player playlist
    if (isMediaFile && isFromMediaFolder) {
      if (typeof window.refreshMediaPlayerPlaylist === 'function') {
        setTimeout(() => {
          window.refreshMediaPlayerPlaylist();
        }, 100);
      }
    }

    closeWindow(winId);
  });
}

function createNewFolder(e, fromFullPath) {
  e.stopPropagation();
  hideContextMenu();
  const parentPath = fromFullPath || 'C://';

  // Use makeWin95Prompt to get folder name from user
  makeWin95Prompt(
    'Enter the name for the new folder:',
    'New Folder',
    async (folderName) => {
      // User confirmed - create the folder
      if (!folderName || !folderName.trim()) {
        folderName = 'Untitled';
      }
      folderName = folderName.trim();

      let fs = getFileSystemStateSync();

      // Safety check to ensure file system state is properly initialized
      if (!fs || !fs.folders) {
        console.error('File system state not properly initialized:', fs);
        showDialogBox('File system not initialized. Please refresh the page.', 'error');
        return;
      }

      const folderId = "folder-" + Date.now();
      const driveRootRegex = /^[A-Z]:\/\/$/;
      // Build the correct folder path using the folder name, not the ID
      let newFolderPath = driveRootRegex.test(parentPath) ? parentPath + folderName : parentPath + "/" + folderName;
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
        if (!destination) {
          fs.folders[fromFullPath] = {};
          destination = fs.folders[fromFullPath];
        }
      } else if (fromFullPath === 'C://Desktop') {
        // Special handling for desktop
        if (!fs.folders['C://Desktop']) {
          fs.folders['C://Desktop'] = {};
        }
        destination = fs.folders['C://Desktop'];
      } else {
        // For subdirectories, use the direct folder contents from fs.folders
        destination = fs.folders[fromFullPath];
        if (!destination) {
          // If the parent folder doesn't exist in fs.folders, create it
          console.warn('Parent folder contents not found, creating:', fromFullPath);
          fs.folders[fromFullPath] = {};
          destination = fs.folders[fromFullPath];
        }
      }

      // Insert the new folder into the parent's contents.
      destination[folderId] = newFolderItem;

      // Initialize the folder's contents in fs.folders
      fs.folders[newFolderPath] = {};

      // Save state first, then refresh UI
      await setFileSystemState(fs);
      try {
        await saveState();
        // Refresh the UI to show the new folder after state is saved
        if (fromFullPath === 'C://Desktop') {
          // For desktop, refresh desktop icons
          if (typeof renderDesktopIcons === 'function') {
            renderDesktopIcons();
          }
        } else {
          // For explorer windows, refresh all windows showing this path
          if (typeof refreshAllExplorerWindows === 'function') {
            refreshAllExplorerWindows(parentPath);
          }
        }
      } catch (error) {
        console.error('Failed to save state after creating folder:', error);
      }
      // Note: refreshExplorerViews() is broken, so we handle refresh above
    },
    () => {
      // User cancelled - do nothing
    }
  );
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

    /* ------------- insert into filesystem using unified helper ---------------- */
    if (!addItemToFileSystem(newFile, parentPath)) {
      return; // Error already shown by helper
    }

    /* ------------- refresh views ------------------------ */
    if (fromFullPath === 'C://Desktop') {
      // For desktop, refresh desktop icons
      renderDesktopIcons();
    } else {
      // For explorer windows, refresh all windows showing this path
      refreshAllExplorerWindows(parentPath);
    }

    saveState().catch(error => {
      console.error('Failed to save state after creating file:', error);
    });
    if (typeof onCreated === 'function') onCreated(newFile.id, newFile);
    // Note: refreshExplorerViews() is broken, so we handle refresh above
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

  form.addEventListener('submit', async ev => {
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

    /* insert into filesystem using unified helper */
    if (!(await addItemToFileSystem(newShortcut, fromFullPath))) {
      return; // Error already shown by helper
    }

    /* refresh views */
    if (fromFullPath === 'C://Desktop') {
      // For desktop, refresh desktop icons
      renderDesktopIcons();
    } else {
      // For explorer windows, refresh the current explorer window
      const explorerWin = document.getElementById('explorer-window');
      if (explorerWin) {
        const fileExplorerDiv = explorerWin.querySelector('.file-explorer-window');
        if (fileExplorerDiv) {
          fileExplorerDiv.outerHTML = getExplorerWindowContent(parentPath);
        }
      }
    }

    setupFolderDrop();
    try {
      await saveState();
    } catch (error) {
      console.error('Failed to save state after creating shortcut:', error);
    }
    // Note: refreshExplorerViews() is broken, so we handle refresh above
  });
}

/* =====================
   Create a new LetterPad file
====================== */
async function createNewLetterpad(e, fromFullPath, onCreated = null) {
  if (e) e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';

  // Use makeWin95Prompt to get filename from user
  makeWin95Prompt(
    'Enter the name for the new LetterPad document:',
    'New LetterPad.md',
    async (fileName) => {
      // User confirmed - create the file
      if (!fileName || !fileName.trim()) {
        fileName = 'New LetterPad.md';
      }
      fileName = fileName.trim();

      // Ensure it has .md extension if not provided
      if (!fileName.endsWith('.md')) {
        fileName = fileName + '.md';
      }

      // Generate unique ID and default content
      const fileId = `file-${Date.now()}`;
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

      // Insert into filesystem using the unified helper function
      if (!(await addItemToFileSystem(newFile, parentPath))) {
        return; // Error already shown by helper
      }

      // Save filesystem state
      try {
        await saveState();
      } catch (error) {
        console.error('Failed to save state after creating LetterPad:', error);
      }

      // Refresh views to show the new file
      if (fromFullPath === 'C://Desktop') {
        // For desktop, refresh desktop icons
        renderDesktopIcons();
      } else {
        // For explorer windows, refresh all windows showing this path
        refreshAllExplorerWindows(parentPath);
      }

      // Note: refreshExplorerViews() is broken, so we handle refresh above

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
    },
    () => {
      // User cancelled - do nothing
    }
  );
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
      // Check file size limit (25MB for images)
      const maxSizeInMB = 25;
      const fileSizeInMB = file.size / (1024 * 1024);

      if (fileSizeInMB > maxSizeInMB) {
        showDialogBox(
          `Image file "${file.name}" is too large (${fileSizeInMB.toFixed(2)}MB). Maximum allowed size is ${maxSizeInMB}MB.`,
          'error'
        );
        document.body.removeChild(fileInput);
        return;
      }

      // Get file extension for content type
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Use our unified binary file creation helper
      const newFile = await addBinaryFileToFileSystem(file.name, parentPath, fileExtension, file);

      if (newFile && typeof onCreated === 'function') {
        onCreated(newFile.id, newFile);
      }

      // Refresh views using our unified approach
      if (fromFullPath === 'C://Desktop') {
        if (typeof renderDesktopIcons === 'function') {
          renderDesktopIcons();
        }
      } else {
        if (typeof refreshAllExplorerWindows === 'function') {
          refreshAllExplorerWindows(parentPath);
        }
      }
    }

    // Clean up
    document.body.removeChild(fileInput);
  });

  // Add to document and trigger click
  document.body.appendChild(fileInput);
  fileInput.click();
}

/* =========================
   Create a new Audio file (upload from computer)
   ========================= */
function createNewAudio(e, fromFullPath, onCreated = null) {
  if (e) e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';

  // Create hidden file input for audio selection
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size limit (50MB for audio)
      const maxSizeInMB = 50;
      const fileSizeInMB = file.size / (1024 * 1024);

      if (fileSizeInMB > maxSizeInMB) {
        showDialogBox(
          `Audio file "${file.name}" is too large (${fileSizeInMB.toFixed(2)}MB). Maximum allowed size is ${maxSizeInMB}MB.`,
          'error'
        );
        document.body.removeChild(fileInput);
        return;
      }

      // Get file extension for content type
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Use our unified binary file creation helper
      const newFile = await addBinaryFileToFileSystem(file.name, parentPath, fileExtension, file);

      if (newFile && typeof onCreated === 'function') {
        onCreated(newFile.id, newFile);
      }

      // Refresh views using our unified approach
      if (fromFullPath === 'C://Desktop') {
        if (typeof renderDesktopIcons === 'function') {
          renderDesktopIcons();
        }
      } else {
        if (typeof refreshAllExplorerWindows === 'function') {
          refreshAllExplorerWindows(parentPath);
        }
      }
    }

    // Clean up
    document.body.removeChild(fileInput);
  });

  // Add to document and trigger click
  document.body.appendChild(fileInput);
  fileInput.click();
}

/* =========================
   Create a new Video file (upload from computer)
   ========================= */
function createNewVideo(e, fromFullPath, onCreated = null) {
  if (e) e.stopPropagation();
  hideContextMenu();

  const parentPath = fromFullPath || 'C://';

  // Create hidden file input for video selection
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'video/*';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size limit (100MB for video)
      const maxSizeInMB = 100;
      const fileSizeInMB = file.size / (1024 * 1024);

      if (fileSizeInMB > maxSizeInMB) {
        showDialogBox(
          `Video file "${file.name}" is too large (${fileSizeInMB.toFixed(2)}MB). Maximum allowed size is ${maxSizeInMB}MB.`,
          'error'
        );
        document.body.removeChild(fileInput);
        return;
      }

      // Get file extension for content type
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Use our unified binary file creation helper
      const newFile = await addBinaryFileToFileSystem(file.name, parentPath, fileExtension, file);

      if (newFile && typeof onCreated === 'function') {
        onCreated(newFile.id, newFile);
      }

      // Refresh views using our unified approach
      if (fromFullPath === 'C://Desktop') {
        if (typeof renderDesktopIcons === 'function') {
          renderDesktopIcons();
        }
      } else {
        if (typeof refreshAllExplorerWindows === 'function') {
          refreshAllExplorerWindows(parentPath);
        }
      }
    }

    // Clean up
    document.body.removeChild(fileInput);
  });

  // Add to document and trigger click
  document.body.appendChild(fileInput);
  fileInput.click();
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

// Comprehensive function to refresh all explorer windows showing a specific path
function refreshAllExplorerWindows(targetPath) {

  // Find all explorer windows that are currently showing the target path
  const allExplorerWindows = document.querySelectorAll('.file-explorer-window');

  let refreshedCount = 0;
  allExplorerWindows.forEach((explorerDiv, index) => {
    const currentPath = explorerDiv.getAttribute('data-current-path');

    if (currentPath === targetPath) {
      try {
        // Use innerHTML instead of outerHTML to preserve the element itself and its attributes
        const newContent = getExplorerWindowContent(targetPath);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newContent;
        const newExplorerDiv = tempDiv.querySelector('.file-explorer-window');

        if (newExplorerDiv) {
          // Copy the inner content while preserving the original element
          explorerDiv.innerHTML = newExplorerDiv.innerHTML;
          // Ensure the data-current-path is preserved
          explorerDiv.setAttribute('data-current-path', targetPath);
          refreshedCount++;
        } else {
          console.warn(`Failed to get new explorer content for window ${index}`);
        }
      } catch (error) {
        console.error(`Error refreshing window ${index}:`, error);
      }
    }
  });


  // Re-setup all event handlers for the refreshed windows
  setTimeout(() => {
    if (typeof setupFolderDrop === 'function') {
      setupFolderDrop();
    }
  }, 50);
}

// Make refreshAllExplorerWindows globally available
window.refreshAllExplorerWindows = refreshAllExplorerWindows;

/* =====================
   Unified File System Item Insertion Helper
   Uses the same reliable approach as folder creation for consistent behavior.
   This ensures all file/folder operations use the fs.folders[fullPath] pattern.

   Enhanced version that can handle both simple files and complex file uploads.
====================== */
async function addItemToFileSystem(item, targetPath) {
  const fs = getFileSystemStateSync();

  // Safety check to ensure file system state is properly initialized
  if (!fs || !fs.folders) {
    console.error('File system state not properly initialized:', fs);
    showDialogBox('File system not initialized. Please refresh the page.', 'error');
    return false;
  }

  // Use the unified approach: fs.folders[targetPath] for folder contents
  let destination = fs.folders[targetPath];
  if (!destination) {
    // If the parent folder doesn't exist in fs.folders, create it
    console.warn('Parent folder contents not found, creating:', targetPath);
    fs.folders[targetPath] = {};
    destination = fs.folders[targetPath];
  }

  // Insert the new item into the parent's contents
  destination[item.id] = item;

  // Save the file system state
  await setFileSystemState(fs);

  return true;
}

/* =====================
   Enhanced File Creation Helper for Binary Files (Images, etc.)
   Handles File objects and binary data while using the unified fs.folders approach.
====================== */
async function addBinaryFileToFileSystem(fileName, targetPath, contentType, fileObj) {
  // Generate unique file ID
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Determine appropriate icon based on content type
  let icon_url = 'image/file.png';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(contentType)) {
    icon_url = 'image/image.png';
  } else if (['mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
    icon_url = 'image/video.png';
  } else if (['mp3', 'wav', 'ogg'].includes(contentType)) {
    icon_url = 'image/audio.png';
  }

  // Create file object
  const newFile = {
    id: fileId,
    name: fileName,
    type: 'ugc-file',
    content_type: contentType,
    icon_url: icon_url,
    content: '', // Will be populated async for binary files
    isLargeFile: true, // Mark as large file by default for binary files
    storageLocation: 'indexeddb', // Indicate where the data will be stored
    file: null   // Will be cleared after processing
  };

  // First, add the file to the file system using our unified approach
  if (!addItemToFileSystem(newFile, targetPath)) {
    return null; // Error already shown
  }

  // Handle binary file data conversion and storage
  if (fileObj && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
    // Create immediate object URL for instant access while async processing happens
    const tempObjectURL = URL.createObjectURL(fileObj);

    // Update the file entry with the temporary URL before async processing
    const fs = getFileSystemStateSync();
    const destination = fs.folders[targetPath];
    if (destination && destination[fileId]) {
      destination[fileId].tempObjectURL = tempObjectURL;
      destination[fileId].file = fileObj; // Keep the file object temporarily
      setFileSystemState(fs);
    }

    try {
      const dataURL = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      const fileSizeInMB = (dataURL.length * 0.75) / (1024 * 1024);

      // Store file data in IndexedDB
      await storage.setItem(`file_data_${fileId}`, dataURL);

      // Update file metadata - all IndexedDB files should be treated as "large" for loading purposes
      const currentFS = getFileSystemStateSync();
      const destination = currentFS.folders[targetPath];
      if (destination && destination[fileId]) {
        destination[fileId].isLargeFile = true; // Always true for IndexedDB stored files
        destination[fileId].storageLocation = 'indexeddb';
        destination[fileId].content = ''; // Keep content empty for binary files
        destination[fileId].fileSizeInMB = fileSizeInMB; // Add size info for debugging
        destination[fileId].actualSizeInMB = fileSizeInMB; // Track actual size separately
        destination[fileId].dataURL = dataURL; // Store the data URL for permanent access
        destination[fileId].file = null; // Clear the file object after processing

        // Keep the tempObjectURL as backup until dataURL is confirmed working
      }

      // Save updated file system state
      setFileSystemState(currentFS);
      await saveState();

      // If a media file was added to C://Media, refresh the media player playlist
      if (targetPath === 'C://Media' && ['mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
        if (typeof window.refreshMediaPlayerPlaylist === 'function') {
          // Delay the refresh to ensure the file system state is fully updated
          setTimeout(() => {
            window.refreshMediaPlayerPlaylist();
          }, 200);
        }
      }

    } catch (error) {
      console.error('Failed to store binary file:', error);

      // Update file to indicate storage failure but keep tempObjectURL for immediate access
      const currentFS = getFileSystemStateSync();
      const destination = currentFS.folders[targetPath];
      if (destination && destination[fileId]) {
        destination[fileId].isLargeFile = true;
        destination[fileId].storageLocation = 'failed';
        // Keep tempObjectURL so the file is still accessible even if storage failed
        setFileSystemState(currentFS);
      }

      showDialogBox(`File "${fileName}" could not be stored. Storage error: ${error.message}`, 'error');
    }
  } else {
    // For non-binary files, save immediately
    await saveState();
  }

  return newFile;
}
