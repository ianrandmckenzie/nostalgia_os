/* =====================
   openExplorer
   Now accepts a folderId. It finds the folder's fullPath and refreshes the explorer.
   Updated to support multiple File Explorer windows with optional forceNewWindow parameter.
====================== */
function openExplorer(folderIdOrPath, forceNewWindow = false) {
  let fullPath;

  // Check if it's already a full path (starts with drive letter and contains ://)
  if (/^[A-Z]:\/\//.test(folderIdOrPath)) {
    // It's already a full path, use it directly
    fullPath = folderIdOrPath;
  } else {
    // It's a folder ID, look up the full path
    fullPath = findFolderFullPathById(folderIdOrPath);
  }

  if (!fullPath) {
    console.error("Folder not found for id/path:", folderIdOrPath);
    return;
  }

  const newContent = getExplorerWindowContent(fullPath);

  // If forceNewWindow is false, try to reuse existing explorer window
  if (!forceNewWindow) {
    let explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      explorerWindow.querySelector('.file-explorer-window').outerHTML = newContent;
      explorerWindow.querySelector('.file-explorer-window').setAttribute('data-current-path', fullPath);
      setTimeout(setupFolderDrop, 100);
      // Save state after navigation
      setTimeout(async () => {
        await saveFileExplorerState();
      }, 150);
      return explorerWindow;
    }
  }

  // Create new window (either forced or no existing window found)
  const windowId = forceNewWindow ? `explorer-window-${Date.now()}` : 'explorer-window';
  const explorerWindow = createWindow(
    fullPath,
    newContent,
    false,
    windowId,
    false,
    false,
    { type: 'integer', width: 600, height: 400 },
    "Explorer"
  );

  // Save state after creation
  setTimeout(async () => {
    await saveFileExplorerState();
  }, 150);

  return explorerWindow;
}

/* =====================
   openExplorerInNewWindow
   Always opens a folder in a new File Explorer window with debouncing
   to prevent multiple windows from opening on rapid double-clicks
====================== */
function openExplorerInNewWindow(folderIdOrPath) {
  // Debounce mechanism to prevent multiple windows opening rapidly
  const debounceKey = `openExplorer_${folderIdOrPath}`;
  const now = Date.now();

  // Check if we've recently opened this folder (within last 500ms)
  if (window.explorerDebounce && window.explorerDebounce[debounceKey]) {
    const lastCall = window.explorerDebounce[debounceKey];
    if (now - lastCall < 500) {
      return; // Ignore this call
    }
  }

  // Initialize debounce tracking if needed
  if (!window.explorerDebounce) {
    window.explorerDebounce = {};
  }

  // Record this call
  window.explorerDebounce[debounceKey] = now;

  // Clean up old entries to prevent memory leaks
  setTimeout(() => {
    if (window.explorerDebounce && window.explorerDebounce[debounceKey] === now) {
      delete window.explorerDebounce[debounceKey];
    }
  }, 1000);

  return openExplorer(folderIdOrPath, true);
}

// Make function globally available
window.openExplorerInNewWindow = openExplorerInNewWindow;

// Todo: this shit dont work!
function refreshExplorerViews() {
  document.querySelectorAll('.file-explorer-window').forEach(explorer => {
    const currentPath = explorer.getAttribute('data-current-path');
    const newElementTxt = getExplorerWindowContent(currentPath);
    const explorerWindowParent = explorer.parentElement;
    explorerWindowParent.innerHTML = newElementTxt;
  });
  // Re-setup drag and drop for all refreshed explorer windows
  setupFolderDrop();
}

/*
 * Return an HTML-string breadcrumb trail for the path.
 * Each <span> has data-path="…" so the global delegated
 * click-handler (see §3) still works.
 */
function getBreadcrumbsHtml(fullPath) {
  fullPath = normalizePath(fullPath);

  const m = fullPath.match(/^([A-Z]:\/\/)(.*)/);
  if (!m) return fullPath;                       // fallback

  const drive   = m[1];                          // "C://"
  const rest    = m[2];                          // "folder-1/…"

  let html = `<span class="cursor-pointer hover:underline" data-path="${drive}">${drive}</span>`;
  if (!rest) return html;

  let current = drive;
  rest.split('/').filter(Boolean).forEach(partKey => {
    current = current.endsWith('/') ? current + partKey : `${current}/${partKey}`;
    const folderObj   = findFolderObjectByFullPath(current);
    const displayName = folderObj ? folderObj.name : partKey;

    html += ` / <span class="cursor-pointer hover:underline" ` +
            `data-path="${folderObj ? folderObj.id : current}">${displayName}</span>`;
  });

  return html;
}


/* =====================
   File Explorer Window Content
   Returns HTML for a file explorer window given a fullPath.
====================== */
function getExplorerWindowContent(currentPath = 'C://') {
  currentPath = normalizePath(currentPath);

  /* ─────────────────────────────────────────────────────────
     Build file/folder list (each <li> carries data-attributes)
     ───────────────────────────────────────────────────────── */
  const itemsObj = getItemsForPath(currentPath);
  const list   = ['<ul class="pl-5">'];

  Object.values(itemsObj).forEach(item => {
    const isFolder  = item.type === 'folder';
    let   icon      = isFolder ? 'image/folder.png' : 'image/file.png';

    // Use specific icon if available (check both icon and icon_url for compatibility)
    if (item.icon) {
      icon = item.icon;
    } else if (item.icon_url) {
      icon = item.icon_url;
    }

    const classes   = 'cursor-pointer hover:bg-gray-50 file-item truncate' +
                      (isFolder ? ' folder-item' : '');
    const extraDesc = item.description ? ` (${item.description})` : '';

    if (isFolder) {
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-folder="${item.id}" title="${item.name}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}</li>`
      );
    } else if (item.type === 'shortcut') {
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-shortcut="true" data-url="${item.url}" title="${item.name}${extraDesc}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}${extraDesc}</li>`
      );
    } else {
      // Validate that the item has a proper name property
      const displayName = item.name || item.id || 'Unknown File';
      if (!item.name) {
        console.warn('🔍 EXPLORER: File missing name property, using fallback:', displayName, 'Item:', item);
      }
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-file="${item.id}" title="${displayName}${extraDesc}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2"> ${displayName}${extraDesc}</li>`
      );
    }
  });

  list.push('</ul>');

  /* ─────────────────────────────────────────────────────────
     Sidebar (each drive uses data-open-drive)
     ───────────────────────────────────────────────────────── */
  const drivesHtml = ['C://','A://','D://'].map(d =>
    `<li class="cursor-pointer border-b border-gray-200 hover:bg-gray-50 system-folder" ` +
    `data-open-drive="${d}">` +
    `<img src="image/${d[0].toLowerCase() === 'c' ? 'drive_c' : d[0].toLowerCase() === 'a' ? 'floppy' : 'cd'}.png" ` +
    `class="inline h-4 w-4 mr-2"> ${d}</li>`
  ).join('');

  const breadcrumbHtml = getBreadcrumbsHtml(currentPath);

  return `
    <div class="file-explorer-window" data-current-path="${currentPath}">
      <div class="flex">
        <!-- Left Sidebar -->
        <div id="file-sidebar" class="w-1/4 border-r p-2">
          <ul>${drivesHtml}</ul>
        </div>

        <!-- Main Content -->
        <div id="file-main" class="w-3/4 p-2 min-h-96">
          <div id="breadcrumbs" class="mb-2">Path: ${breadcrumbHtml}</div>
          <div id="files-area">
            ${list.join('')}
          </div>
        </div>
      </div>
    </div>
  `;

}

/* File-explorer interaction — single place, zero inline JS */
// Add single-click handler for image selection mode (HIGH PRIORITY - placed first)
document.addEventListener('click', e => {

  // First check if we're in image selection mode
  const explorerElem = e.target.closest('.file-explorer-window');

  if (explorerElem) {
  }

  if (explorerElem && explorerElem.getAttribute('data-image-selection-mode') === 'true') {

    const li = e.target.closest('[data-open-file]');

    if (li) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // Stop all other handlers


      // Get the file info
      const currentPath = explorerElem.getAttribute('data-current-path');

      const itemsObj = getItemsForPath(currentPath);

      const file = Object.values(itemsObj).find(it => it.id === li.dataset.openFile);

      // Check if it's an image file
      if (file && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(file.content_type)) {

        // Clear previous selection
        const allFileItems = explorerElem.querySelectorAll('[data-open-file]');
        allFileItems.forEach(item => {
          item.classList.remove('bg-blue-100', 'border-blue-300');
          item.style.backgroundColor = ''; // Clear inline styles
          item.style.border = '';
        });

        // Highlight selected item with both classes and inline styles for visibility
        li.classList.add('bg-blue-100', 'border-blue-300');
        li.style.backgroundColor = '#dbeafe'; // Light blue background
        li.style.border = '2px solid #93c5fd'; // Blue border
        li.style.borderRadius = '4px';

        // Update selection info
        const selectedNameSpan = document.getElementById('selected-image-name');

        if (selectedNameSpan) {
          selectedNameSpan.textContent = `Selected: ${file.name}`;
          window.watercolourSelectedFile = file;

          // Use the global function to enable the button if it exists
          if (typeof window.updateWatercolourImageSelectionButton === 'function') {
            window.updateWatercolourImageSelectionButton(true);
          } else {
            // Fallback to direct button manipulation
            const openButton = document.getElementById('open-selected-image');
            if (openButton) {
              openButton.disabled = false;
            }
          }
        } else {
          console.error('Selection UI elements not found', {
            selectedNameSpan
          });
        }
      } else {
        // Show message for non-image files
        const selectedNameSpan = document.getElementById('selected-image-name');
        if (selectedNameSpan) {
          selectedNameSpan.textContent = 'Please select an image file';

          // Use the global function to disable the button if it exists
          if (typeof window.updateWatercolourImageSelectionButton === 'function') {
            window.updateWatercolourImageSelectionButton(false);
          } else {
            // Fallback to direct button manipulation
            const openButton = document.getElementById('open-selected-image');
            if (openButton) {
              openButton.disabled = true;
            }
          }
        }
      }
      return; // Exit early
    } else {
    }
  }
}, true); // Use capture phase to ensure this runs first

document.addEventListener('dblclick', e => {
  const li = e.target.closest('[data-open-folder],[data-open-file],[data-open-shortcut]');
  if (!li) return;

  // Check if this is in image selection mode - if so, completely disable double-clicks
  const explorerElem = e.target.closest('.file-explorer-window');
  if (explorerElem && explorerElem.getAttribute('data-image-selection-mode') === 'true') {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  if (li.dataset.openFolder) {
    openExplorer(li.dataset.openFolder);
  } else if (li.dataset.openFile) {
    // Normal file opening
    openFile(li.dataset.openFile, e);
  } else if (li.dataset.openShortcut) {
    openShortcut(li);
  }
});

document.addEventListener('click', e => {
  const drive = e.target.closest('[data-open-drive]');
  if (drive) openExplorer(drive.dataset.openDrive);
});


// Works for all spans (or other elements) that have data-path
document.addEventListener('click', e => {
  const el = e.target.closest('[data-path]');
  if (el) {
    e.stopPropagation();
    openExplorer(el.dataset.path);
  }
});

// Looks up a file by its ID (from desktop or current folder) and opens it.
function openFile(incoming_file, e) {
  const existingWindow = document.getElementById(incoming_file);
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) => getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }
  let file;
  const launchedFromTaskbar = (e.target === document.body);
  const explorerElem = e.target.closest('.file-explorer-window');
  let currentPath;
  if (launchedFromTaskbar) {
    currentPath = 'C://Documents';
  } else if (explorerElem) {
    currentPath = explorerElem.getAttribute('data-current-path');
  } else if (e.srcElement.classList.contains('desktop-folder-icon')) {
    currentPath = 'C://Desktop';
  }
  const itemsObj = getItemsForPath(currentPath);
  file = Object.values(itemsObj).find(it => it.id === incoming_file);

  if (!file || typeof file === 'string') {
    const file_name = `File ${typeof file === 'string' ? `"${file}"` : ''}`;
    showDialogBox(`${file_name}not found.`, 'error');
    return;
  }

  let content = "";
  let windowType = 'default';

  // Check if the file is user-generated; if so, use its local content.
  if (file.type === "ugc-file") {
    if (file.content_type === 'text' || file.content_type === 'txt') {
      content = `<div id="file-content" style="padding:10px;">
        <div id="text-editor" contenteditable="true" style="padding:10px; overflow:auto;">${file.content || file.contents || "Empty file"}</div>
      </div>`;
      windowType = 'editor';

      // Set up the editor after window creation
      setTimeout(() => {
        const textEditor = document.getElementById('text-editor');
        if (textEditor) {
          textEditor.addEventListener('input', function () {
            updateContent(file.id, this.innerHTML);
            // Update the file content
            file.content = this.innerHTML;
            saveState();
          });
        }
      }, 100);
    } else if (file.content_type === 'markdown' || file.content_type === 'md') {
      content = `<div id="file-content" style="padding:10px;">
        <div class="letterpad_editor min-h-48 h-full w-full" data-letterpad-editor-id="${file.id}"></div>
      </div>`;
      windowType = 'editor';

      // Initialize the LetterPad editor with existing content after the window is created
      setTimeout(async () => {
        // Store the file content in the expected storage format for the editor
        const storageKey = `letterpad_${file.id}`;

        // Check if there's already content in storage (from previous edits)
        let contentToStore = file.content || file.contents || '';

        try {
          const existingData = await storage.getItem(storageKey);
          if (existingData && existingData.content !== undefined) {
            // If there's existing content in storage, use that instead of file content
            contentToStore = existingData.content;
          }

          await storage.setItem(storageKey, { content: contentToStore });

          // Initialize the editor
          const editorContainer = document.querySelector(`[data-letterpad-editor-id="${file.id}"]`);
          if (editorContainer && typeof initializeLetterPad === 'function') {
            await initializeLetterPad(editorContainer);
          }
        } catch (error) {
          console.warn('Failed to initialize LetterPad editor:', error);
          // Fallback to sync methods if async fails
          try {
            const existingData = storage.getItemSync(storageKey);
            if (existingData && existingData.content !== undefined) {
              contentToStore = existingData.content;
            }
            storage.setItemSync(storageKey, { content: contentToStore });

            const editorContainer = document.querySelector(`[data-letterpad-editor-id="${file.id}"]`);
            if (editorContainer && typeof initializeLetterPad === 'function') {
              await initializeLetterPad(editorContainer);
            }
          } catch (fallbackError) {
            console.error('Failed to initialize LetterPad editor with fallback:', fallbackError);
          }
        }
      }, 100);
    } else if (file.content_type === 'html') {
      content = file.content || file.contents || `<p style="padding:10px;">Empty HTML file.</p>`;
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(file.content_type)) {
      // Handle UGC image files

      if (file.dataURL) {
        content = `<img src="${file.dataURL}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
      } else if (file.isLargeFile && file.storageLocation === 'indexeddb') {
        // For large files stored in IndexedDB, we need to load them asynchronously
        content = `<div style="padding:10px; text-align:center;">Loading image...</div>`;
        windowType = 'image';

        // Load the image data from IndexedDB after window creation
        setTimeout(async () => {
          try {
            const imageData = await storage.getItem(`file_data_${file.id}`);
            if (imageData) {
              const img = `<img src="${imageData}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
              const win = document.getElementById(file.id);
              if (win) {
                const contentDiv = win.querySelector('.p-2');
                if (contentDiv) {
                  contentDiv.innerHTML = img;
                }
              }
            } else {
              console.error('No image data found in IndexedDB for file:', file.id);
              throw new Error('Image data not found in storage');
            }
          } catch (error) {
            console.error('Error loading large image file:', error);
            console.error('File object details:', file);
            const win = document.getElementById(file.id);
            if (win) {
              const contentDiv = win.querySelector('.p-2');
              if (contentDiv) {
                contentDiv.innerHTML = `<p style="padding:10px;">Error loading image: ${error.message}</p>`;
              }
            }
          }
        }, 100);
      } else if (file.file && file.file instanceof File) {
        const imageURL = URL.createObjectURL(file.file);
        content = `<img src="${imageURL}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
      } else {
        content = `<p style="padding:10px;">Image file not found or invalid.<br>Debug: isLargeFile=${file.isLargeFile}, storage=${file.storageLocation}</p>`;
      }
    } else if (['mp3', 'wav', 'ogg'].includes(file.content_type)) {

      if (file.dataURL) {
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${file.dataURL}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else if (file.isLargeFile && file.storageLocation === 'indexeddb') {
        content = `<div style="padding:10px; text-align:center;">Loading audio...</div>`;
        windowType = 'audio';

        setTimeout(async () => {
          try {
            const audioData = await storage.getItem(`file_data_${file.id}`);
            if (audioData) {
              const audio = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
                <source src="${audioData}" type="audio/mpeg">
                Your browser does not support the audio element.
              </audio>`;
              const win = document.getElementById(file.id);
              if (win) {
                const contentDiv = win.querySelector('.p-2');
                if (contentDiv) {
                  contentDiv.innerHTML = audio;
                }
              }
            } else {
              throw new Error('Audio data not found in IndexedDB');
            }
          } catch (error) {
            console.error('Error loading large audio file:', error);
            const win = document.getElementById(file.id);
            if (win) {
              const contentDiv = win.querySelector('.p-2');
              if (contentDiv) {
                contentDiv.innerHTML = `<p style="padding:10px;">Error loading audio: ${error.message}</p>`;
              }
            }
          }
        }, 100);
      } else if (file.file && file.file instanceof File) {
        const audioURL = URL.createObjectURL(file.file);
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${audioURL}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else if (file.tempObjectURL) {
        // Handle files with temporary object URLs (uploaded files being processed)
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;"
                     onerror="console.error('🔍 AUDIO: Audio element error:', event.target.error)">
              <source src="${file.tempObjectURL}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else if (file.isDefault || file.isSystemFile || file.path) {
        // Handle default/system audio files that reference static media files
        const audioPath = file.path || `media/${file.name}`;
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${audioPath}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else {
        content = `<p style="padding:10px;">Audio file not found or invalid.<br>Debug: Missing required properties for audio playback.</p>`;
      }
    } else if (['mp4', 'webm', 'avi', 'mov'].includes(file.content_type)) {
      // Handle UGC video files
      if (file.dataURL) {
        content = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;">
            <source src="${file.dataURL}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
      } else if (file.tempObjectURL) {
        // Handle files with temporary object URLs (uploaded files being processed)
        content = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;"
                     onerror="console.error('🔍 VIDEO: Video element error:', event.target.error)">
            <source src="${file.tempObjectURL}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
      } else if (file.isLargeFile && file.storageLocation === 'indexeddb') {
        content = `<div style="padding:10px; text-align:center;">Loading video...</div>`;
        windowType = 'video';

        setTimeout(async () => {
          try {
            const videoData = await storage.getItem(`file_data_${file.id}`);
            if (videoData) {
              const video = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;">
                <source src="${videoData}" type="video/mp4">
                Your browser does not support the video tag.
              </video>`;
              const win = document.getElementById(file.id);
              if (win) {
                const contentDiv = win.querySelector('.p-2');
                if (contentDiv) {
                  contentDiv.innerHTML = video;
                }
              }
            }
          } catch (error) {
            console.error('Error loading large video file:', error);
            const win = document.getElementById(file.id);
            if (win) {
              const contentDiv = win.querySelector('.p-2');
              if (contentDiv) {
                contentDiv.innerHTML = `<p style="padding:10px;">Error loading video: ${error.message}</p>`;
              }
            }
          }
        }, 100);
      } else if (file.file && file.file instanceof File) {
        const videoURL = URL.createObjectURL(file.file);
        content = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;">
            <source src="${videoURL}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
      } else {
        content = `<p style="padding:10px;">Video file not found or invalid.</p>`;
      }
    } else {
      content = `<p style="padding:10px;">${file.content || file.contents || "Empty file"}</p>`;
    }
  } else {
    // Non-UGC file: fetch from the media folder.
    if (['image', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(file.content_type)) {
      if (file.file) {
        // Handle uploaded image files with file objects
        const imageURL = URL.createObjectURL(file.file);
        content = `<img src="${imageURL}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
      } else {
        // Handle image files from the media folder
        content = `<img src="./media/${file.name}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
      }
    } else if (['video', 'mov', 'mp4', 'webm', 'avi'].includes(file.content_type)) {
      content = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;">
            <source src="./media/${file.name}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
    } else if (['audio', 'mp3', 'ogg', 'wav'].includes(file.content_type)) {
      if (file.file) {
        // Handle uploaded audio files with file objects
        const audioURL = URL.createObjectURL(file.file);
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${audioURL}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else if (file.isDefault || file.isSystemFile || file.path) {
        // Handle default/system audio files that reference static media files
        const audioPath = file.path || `media/${file.name}`;
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${audioPath}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else {
        // Handle audio files from the media folder (fallback)
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="./media/${file.name}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      }
    } else if (file.content_type === 'html') {
      content = file.contents ? file.contents : `<p style="padding:10px;">Loading HTML file...</p>`;
      if (!file.contents) {
        fetch(`./media/${file.name}`)
          .then(response => response.text())
          .then(html => {
            const win = document.getElementById(file.id);
            const contentDiv = win ? win.querySelector('.p-2') : null;
            if (contentDiv) { contentDiv.innerHTML = html; }
            file.contents = html;
            saveState();
          })
          .catch(error => {
            console.error("Error loading HTML file:", error);
            const win = document.getElementById(file.id);
            const contentDiv = win ? win.querySelector('.p-2') : null;
            if (contentDiv) { contentDiv.innerHTML = '<p>Error loading HTML file.</p>'; }
          });
      }
    } else if (file.content_type === 'text' || file.content_type === 'txt') {
      content = `<div id="file-content" style="padding:10px;">Loading file...</div>`;
      fetch(`./media/${file.name}`)
        .then(response => response.text())
        .then(text => {
          const win = document.getElementById(file.id);
          const contentDiv = win ? win.querySelector('.p-2') : null;
          if (contentDiv) {
            contentDiv.innerHTML = `<div id="text-editor" contenteditable="true" style="padding:10px; overflow:auto;">${text}</div>`;
            const textEditor = document.getElementById('text-editor');
            textEditor.addEventListener('input', function () {
              updateContent(file.id, this.innerHTML);
              // Mark as UGC so that future loads use the edited version.
              file.type = "ugc-file";
              file.content = this.innerHTML;
              saveState();
            });
          }
          file.content = text;
          saveState();
        })
        .catch(error => {
          console.error("Error loading text file:", error);
          const win = document.getElementById(file.id);
          const contentDiv = win ? win.querySelector('.p-2') : null;
          if (contentDiv) { contentDiv.innerHTML = '<p>Error loading file.</p>'; }
        });
      windowType = 'editor';
    } else if (file.content_type === 'markdown' || file.content_type === 'md') {
      content = `<div id="file-content" style="padding:10px;">Loading file...</div>`;
      fetch(`./media/${file.name}`)
        .then(response => response.text())
        .then(text => {
          const win = document.getElementById(file.id);
          const contentDiv = win ? win.querySelector('.p-2') : null;
          if (contentDiv) {
            contentDiv.innerHTML = `<div class="letterpad_editor min-h-48 h-full w-full" data-letterpad-editor-id="${file.id}"></div>`;
          }
          saveState();
        })
        .catch(error => {
          console.error("Error loading markdown file:", error);
          const win = document.getElementById(file.id);
          const contentDiv = win ? win.querySelector('.p-2') : null;
          if (contentDiv) { contentDiv.innerHTML = '<p>Error loading file.</p>'; }
        });
      windowType = 'editor';
    } else {
      content = `<p style="padding:10px;">Content of ${file.name}</p>`;
    }
  }

  let parentWin = null;
  if (e) {
    parentWin = e.target.closest('#windows-container > div');
  }
  let win = createWindow(file.name, content, false, file.id, false, false, { type: 'integer', width: 420, height: 350 }, windowType, parentWin);

  if (file.content_type === 'image') {
    let img = win.querySelector('img');
    if (img) {
      img.onload = function () {
        let newWidth = img.naturalWidth + 20;
        let newHeight = img.naturalHeight + 60;
        win.style.width = newWidth + 'px';
        win.style.height = newHeight + 'px';
        windowStates[win.id].dimensions = { type: 'integer', width: newWidth, height: newHeight };
        saveState();
      }
    }
  } else if (file.content_type === 'video') {
    let video = win.querySelector('video');
    if (video) {
      video.onloadedmetadata = function () {
        let newWidth = video.videoWidth + 20;
        let newHeight = video.videoHeight + 60;
        win.style.width = newWidth + 'px';
        win.style.height = newHeight + 'px';
        windowStates[win.id].dimensions = { type: 'integer', width: newWidth, height: newHeight };
        saveState();
      }
    }
  }
}

function openShortcut(target) {
  if (!target) return;
  const url = target.getAttribute('data-url');
  if (url) {
    window.open(url, '_blank');
  }
}

// Enhanced file opening that can handle image selection for Watercolour
function handleWatercolourImageSelection(file) {
  if (!file || !window.watercolourImageSelectionCallback) {
    return false;
  }

  // Check if it's an image file
  if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(file.content_type)) {
    alert('Please select an image file (.png, .jpg, .jpeg, .gif, .webp)');
    return false;
  }

  // Get the image data
  let imageData = null;

  if (file.dataURL) {
    imageData = file.dataURL;
    // Pass both image data and file info to the callback
    const fileInfo = {
      name: file.name,
      path: getCurrentPath(),
      data: imageData,
      storageKey: file.storageLocation === 'indexeddb' ? `file_data_${file.id}` : null
    };
    window.watercolourImageSelectionCallback(imageData, fileInfo);
    closeWindow('explorer-image-select');
    window.watercolourImageSelectionCallback = null;
    window.watercolourSelectedFile = null;
    return true;
  } else if (file.isLargeFile && file.storageLocation === 'indexeddb') {
    // Load from IndexedDB
    storage.getItem(`file_data_${file.id}`).then(data => {
      if (data) {
        const fileInfo = {
          name: file.name,
          path: getCurrentPath(),
          data: data,
          storageKey: `file_data_${file.id}`
        };
        window.watercolourImageSelectionCallback(data, fileInfo);
        closeWindow('explorer-image-select');
        window.watercolourImageSelectionCallback = null;
        window.watercolourSelectedFile = null;
      } else {
        alert('Could not load image data.');
      }
    }).catch(error => {
      console.error('Error loading image:', error);
      alert('Error loading image: ' + error.message);
    });
    return true;
  } else if (file.file && file.file instanceof File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileInfo = {
        name: file.name,
        path: getCurrentPath(),
        data: e.target.result,
        storageKey: null
      };
      window.watercolourImageSelectionCallback(e.target.result, fileInfo);
      closeWindow('explorer-image-select');
      window.watercolourImageSelectionCallback = null;
      window.watercolourSelectedFile = null;
    };
    reader.readAsDataURL(file.file);
    return true;
  }

  alert('Could not load the selected image.');
  return false;
}

// Helper function to get current path from active file explorer
function getCurrentPath() {
  // Try to find an active file explorer window
  const fileExplorerWindows = document.querySelectorAll('.file-explorer-window');
  if (fileExplorerWindows.length > 0) {
    // Use the most recent (last) file explorer window
    const currentWindow = fileExplorerWindows[fileExplorerWindows.length - 1];
    return currentWindow.getAttribute('data-current-path') || 'C://Documents';
  }
  // Default fallback
  return 'C://Documents';
}

/* =====================
   File Explorer State Management
   Functions to save and restore file explorer state
====================== */

// Save file explorer state to IndexedDB
async function saveFileExplorerState() {
  try {
    const explorerWindow = document.getElementById('explorer-window');
    if (explorerWindow) {
      const fileExplorerDiv = explorerWindow.querySelector('.file-explorer-window');
      if (fileExplorerDiv) {
        const currentPath = fileExplorerDiv.getAttribute('data-current-path') || 'C://';
        const state = {
          currentPath: currentPath,
          timestamp: Date.now()
        };
        await storage.setItem('fileExplorerState', state);
      }
    }
  } catch (error) {
    console.warn('Failed to save file explorer state:', error);
    // Fallback to sync method if async fails
    try {
      const explorerWindow = document.getElementById('explorer-window');
      if (explorerWindow) {
        const fileExplorerDiv = explorerWindow.querySelector('.file-explorer-window');
        if (fileExplorerDiv) {
          const currentPath = fileExplorerDiv.getAttribute('data-current-path') || 'C://';
          const state = {
            currentPath: currentPath,
            timestamp: Date.now()
          };
          storage.setItemSync('fileExplorerState', state);
        }
      }
    } catch (fallbackError) {
      console.error('Failed to save file explorer state with fallback:', fallbackError);
    }
  }
}

// Load file explorer state from IndexedDB
async function loadFileExplorerState() {
  try {
    const state = await storage.getItem('fileExplorerState');
    if (state) {
      return state;
    }
  } catch (error) {
    console.warn('Failed to load file explorer state:', error);
    // Fallback to sync method if async fails
    try {
      const state = storage.getItemSync('fileExplorerState');
      if (state) {
        return state;
      }
    } catch (fallbackError) {
      console.warn('Failed to load file explorer state with fallback:', fallbackError);
    }
  }
  return {
    currentPath: 'C://',
    timestamp: 0
  };
}

// Clear file explorer state
async function clearFileExplorerState() {
  try {
    await storage.removeItem('fileExplorerState');
  } catch (error) {
    console.warn('Failed to clear file explorer state:', error);
    // Fallback to sync method if async fails
    try {
      storage.removeItemSync('fileExplorerState');
    } catch (fallbackError) {
      console.error('Failed to clear file explorer state with fallback:', fallbackError);
    }
  }
}

// Initialize file explorer UI (for restoration)
function initializeFileExplorerUI(win) {

  // Restore the saved state
  setTimeout(async () => {
    await restoreFileExplorerState();
  }, 50);
}

// Restore file explorer state
async function restoreFileExplorerState() {
  const state = await loadFileExplorerState();
  const explorerWindow = document.getElementById('explorer-window');

  if (explorerWindow && state.currentPath) {

    // Navigate to the saved path
    const newContent = getExplorerWindowContent(state.currentPath);
    const fileExplorerDiv = explorerWindow.querySelector('.file-explorer-window');
    if (fileExplorerDiv) {
      fileExplorerDiv.outerHTML = newContent;
      // Set up event handlers again
      setTimeout(setupFolderDrop, 100);
    }
  }
}
