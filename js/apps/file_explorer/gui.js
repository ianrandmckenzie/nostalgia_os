/* =====================
   openExplorer
   Now accepts a folderId. It finds the folder's fullPath and refreshes the explorer.
   Updated to support multiple File Explorer windows with optional forceNewWindow parameter.
====================== */
import { getItemsForPath } from './storage.js'
import { findFolderFullPathById, findFolderObjectByFullPath } from './main.js';
import { setupFolderDrop } from './drag_and_drop.js';
import { saveState, windowStates, updateContent } from '../../os/manage_data.js';
import { createWindow, showDialogBox, closeWindow } from '../../gui/window.js';
import { storage } from '../../os/indexeddb_storage.js';
export function openExplorer(folderIdOrPath, forceNewWindow = false) {
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

      // Update window state to persist the navigation
      updateContent(explorerWindow.id, newContent);

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
export function openExplorerInNewWindow(folderIdOrPath) {
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
export function refreshExplorerViews() {
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
export function getBreadcrumbsHtml(fullPath) {
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
export function getExplorerWindowContent(currentPath = 'C://') {
  currentPath = normalizePath(currentPath);

  /* ─────────────────────────────────────────────────────────
     Build file/folder list (each <li> carries data-attributes)
     ───────────────────────────────────────────────────────── */
  const itemsObj = getItemsForPath(currentPath);
  const list   = ['<ul class="pl-5">'];

  Object.values(itemsObj).forEach(item => {
    const isFolder  = item.type === 'folder';
    let   icon      = isFolder ? 'image/folder.webp' : 'image/file.webp';

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
        `<img src="${icon}" class="inline h-4 w-4 mr-2" alt="${item.name} folder icon"> ${item.name}</li>`
      );
    } else if (item.type === 'shortcut') {
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-shortcut="true" data-url="${item.url}" title="${item.name}${extraDesc}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2" alt="${item.name} shortcut icon"> ${item.name}${extraDesc}</li>`
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
        `<img src="${icon}" class="inline h-4 w-4 mr-2" alt="${displayName} file icon"> ${displayName}${extraDesc}</li>`
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
    `<img src="image/${d[0].toLowerCase() === 'c' ? 'drive_c' : d[0].toLowerCase() === 'a' ? 'floppy' : 'cd'}.webp" ` +
    `class="inline h-4 w-4 mr-2" alt="${d} drive icon"> ${d}</li>`
  ).join('');

  const breadcrumbHtml = getBreadcrumbsHtml(currentPath);

  return `
    <div class="file-explorer-window" data-current-path="${currentPath}">
      <div class="flex">
        <!-- Left Sidebar -->
        <div id="file-sidebar" class="w-1/4 border-r p-2"><ul>${drivesHtml}</ul></div>

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
    // Check if we're within a file explorer window
    if (explorerElem) {
      // Navigate within the current window instead of opening a new one or using the main window
      const folderId = li.dataset.openFolder;
      let targetPath;

      // Check if it's already a full path (starts with drive letter and contains ://)
      if (/^[A-Z]:\/\//.test(folderId)) {
        targetPath = folderId;
      } else {
        // It's a folder ID, look up the full path
        targetPath = findFolderFullPathById(folderId);
      }

      if (targetPath) {
        const newContent = getExplorerWindowContent(targetPath);
        explorerElem.outerHTML = newContent;

        // Update window state to persist the navigation
        const windowElem = explorerElem.closest('.window');
        if (windowElem && windowElem.id) {
          updateContent(windowElem.id, newContent);
        }

        // Re-setup drag and drop for the updated window
        setTimeout(setupFolderDrop, 100);
        // Persist the new explorer path after navigation
        setTimeout(async () => {
          await saveFileExplorerState();
        }, 150);
      }
    } else {
      // Fallback to original behavior if not within an explorer window
      openExplorer(li.dataset.openFolder);
    }
  } else if (li.dataset.openFile) {
    // Normal file opening
    openFile(li.dataset.openFile, e);
  } else if (li.dataset.openShortcut) {
    openShortcut(li);
  }
});

document.addEventListener('click', e => {
  const drive = e.target.closest('[data-open-drive]');
  if (drive) {
    // Find the file explorer window that contains this drive button
    const explorerElem = drive.closest('.file-explorer-window');
    if (explorerElem) {
      // Navigate within the current window instead of opening a new one or using the main window
      const drivePath = drive.dataset.openDrive;
      const newContent = getExplorerWindowContent(drivePath);

      // Update the current explorer window's content
      explorerElem.outerHTML = newContent;

      // Update window state to persist the navigation
      const windowElem = explorerElem.closest('.window');
      if (windowElem && windowElem.id) {
        updateContent(windowElem.id, newContent);
      }

      // Re-setup drag and drop for the updated window
      setTimeout(setupFolderDrop, 100);
      // Persist the new explorer path after navigation
      setTimeout(async () => {
        await saveFileExplorerState();
      }, 150);
    } else {
      // Fallback to the original behavior if not within an explorer window
      openExplorer(drive.dataset.openDrive);
    }
  }
});


// Works for all spans (or other elements) that have data-path
document.addEventListener('click', e => {
  const el = e.target.closest('[data-path]');
  if (el) {
    e.stopPropagation();

    // Find the file explorer window that contains this breadcrumb
    const explorerElem = el.closest('.file-explorer-window');
    if (explorerElem) {
      // Navigate within the current window instead of opening a new one or using the main window
      let targetPath = el.dataset.path;

      // Check if it's a folder ID that needs to be converted to a full path
      if (targetPath && !(/^[A-Z]:\/\//.test(targetPath))) {
        // It's likely a folder ID, convert it to full path
        const fullPath = findFolderFullPathById(targetPath);
        if (fullPath) {
          targetPath = fullPath;
        }
      }

      const newContent = getExplorerWindowContent(targetPath);

      // Update the current explorer window's content
      explorerElem.outerHTML = newContent;

      // Update window state to persist the navigation
      const windowElem = explorerElem.closest('.window');
      if (windowElem && windowElem.id) {
        updateContent(windowElem.id, newContent);
      }

      // Re-setup drag and drop for the updated window
      setTimeout(setupFolderDrop, 100);

      setTimeout(async () => {
        await saveFileExplorerState();
      }, 150);
    } else {
      // Fallback to the original behavior if not within an explorer window
      openExplorer(el.dataset.path);
    }
  }
});

// Looks up a file by its ID (from desktop or current folder) and opens it.
export function openFile(incoming_file, e) {
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
        <div id="text-editor" contenteditable="true" style="padding:10px; overflow:auto;" role="textbox" aria-label="Text file editor" title="Edit the contents of this text file">${file.content || file.contents || "Empty file"}</div>
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
            contentDiv.innerHTML = `<div id="text-editor" contenteditable="true" style="padding:10px; overflow:auto;" role="textbox" aria-label="Text file editor" title="Edit the contents of this text file">${text}</div>`;
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
export function handleWatercolourImageSelection(file) {
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
export async function saveFileExplorerState() {
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
      setTimeout(() => {
        setupFolderDrop();
        refreshExplorerViews();
      }, 100);
    } else {
      console.warn('⚠️ Could not find .file-explorer-window element');
    }
  } else {
    console.warn('⚠️ No explorer window found or no current path in state');
  }
}

// Export functions needed by other modules
export { openShortcut, initializeFileExplorerUI, restoreFileExplorerState };

// Make restoration functions globally available for window restoration
if (typeof window !== 'undefined') {
  window.initializeFileExplorerUI = initializeFileExplorerUI;
  window.restoreFileExplorerState = restoreFileExplorerState;
}

function makeContextMenuAccessible(element) {
  element.addEventListener('keydown', function(e) {
    // Windows/Linux: Context Menu key or Shift+F10
    // Mac: Control+Space (easier to test) or Shift+F10 (standard)
    if (e.key === 'ContextMenu' ||
        (e.shiftKey && e.key === 'F10') ||
        (e.ctrlKey && e.key === ' ')) {
      e.preventDefault();

      // Create a synthetic right-click event at the element's position
      const rect = element.getBoundingClientRect();
      const syntheticEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      });

      // Dispatch the event on the element
      element.dispatchEvent(syntheticEvent);

      // After context menu appears, make it accessible
      setTimeout(() => {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu && !contextMenu.classList.contains('hidden')) {
          setupContextMenuAccessibility(contextMenu);
        }
      }, 10);
    }
  });
}

// Set up accessibility for context menu when it appears
function setupContextMenuAccessibility(menuContainer) {
  if (!menuContainer) return;

  // Set ARIA attributes on the menu container
  menuContainer.setAttribute('role', 'menu');
  menuContainer.setAttribute('aria-label', 'Context menu');

  // Get all menu items (clickable divs)
  const menuItems = Array.from(menuContainer.children).filter(item =>
    item.classList.contains('cursor-pointer') &&
    !item.classList.contains('text-gray-400') // Not disabled
  );

  menuItems.forEach((item, index) => {
    // Add menu item role and make focusable
    item.setAttribute('role', 'menuitem');
    item.setAttribute('tabindex', index === 0 ? '0' : '-1');

    // Add keyboard interaction
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });

    // Visual feedback for hover/focus
    item.addEventListener('mouseenter', function() {
      // Clear other highlights
      menuItems.forEach(mi => {
        mi.classList.remove('bg-gray-50');
        mi.style.backgroundColor = '';
      });
      // Highlight current item
      item.classList.add('bg-gray-50');
      item.style.backgroundColor = '#f9fafb';
    });

    item.addEventListener('mouseleave', function() {
      // Only remove highlight if not focused via keyboard
      if (document.activeElement !== item) {
        item.classList.remove('bg-gray-50');
        item.style.backgroundColor = '';
      }
    });

    // Check for submenus
    const submenu = item.querySelector('div.absolute');
    if (submenu) {
      item.setAttribute('aria-haspopup', 'true');
      item.setAttribute('aria-expanded', 'false');

      // Make submenu accessible
      submenu.setAttribute('role', 'menu');
      submenu.setAttribute('aria-label', 'Submenu');

      const submenuItems = Array.from(submenu.children).filter(subItem =>
        subItem.classList.contains('cursor-pointer')
      );

      submenuItems.forEach((subItem, subIndex) => {
        subItem.setAttribute('role', 'menuitem');
        subItem.setAttribute('tabindex', '-1');

        subItem.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            subItem.click();
          }
        });
      });
    }
  });

  // Focus first menu item when context menu opens
  if (menuItems.length > 0) {
    setTimeout(() => {
      menuItems[0].focus();
      menuItems[0].classList.add('bg-gray-50');
      menuItems[0].style.backgroundColor = '#f9fafb';
    }, 50);
  }
}

// Apply context menu accessibility to file explorer elements
function initFileExplorerAccessibility() {
  // Add basic file explorer keyboard navigation and context menu navigation
  document.addEventListener('keydown', function(e) {
    // Check if context menu is open
    const contextMenu = document.getElementById('context-menu');
    const isContextMenuOpen = contextMenu && !contextMenu.classList.contains('hidden');

    if (isContextMenuOpen) {
      // Handle context menu navigation
      handleContextMenuNavigation(e, contextMenu);
      return;
    }

    // Handle file explorer navigation
    const activeExplorer = document.querySelector('.file-explorer-window:focus-within');
    if (activeExplorer) {
      const focusedItem = document.activeElement;

      switch(e.key) {
        case 'F2':
          e.preventDefault();
          // Focus rename functionality (if available)
          console.log('F2 - Rename functionality would trigger here');
          break;
        case 'Delete':
          e.preventDefault();
          // Focus delete functionality (if available)
          console.log('Delete - Delete functionality would trigger here');
          break;
        case 'Enter':
          e.preventDefault();
          // Simulate double-click on focused item
          if (focusedItem && focusedItem.classList.contains('file-item')) {
            focusedItem.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
          }
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          navigateFileList(e.key === 'ArrowDown' ? 'down' : 'up', activeExplorer);
          break;
      }
    }
  });

  // Context menu navigation handler
  function handleContextMenuNavigation(e, contextMenu) {
    const menuItems = Array.from(contextMenu.children).filter(item =>
      !item.classList.contains('text-gray-400') && // Not disabled
      item.classList.contains('cursor-pointer') // Clickable
    );

    if (menuItems.length === 0) return;

    let currentIndex = -1;
    // Find currently focused item
    for (let i = 0; i < menuItems.length; i++) {
      if (menuItems[i].classList.contains('bg-gray-50') || menuItems[i].matches(':focus')) {
        currentIndex = i;
        break;
      }
    }

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        currentIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % menuItems.length;
        focusContextMenuItem(menuItems, currentIndex);
        break;

      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        currentIndex = currentIndex === -1 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
        focusContextMenuItem(menuItems, currentIndex);
        break;

      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        // Handle submenu expansion if current item has submenu
        if (currentIndex >= 0 && menuItems[currentIndex]) {
          const submenu = menuItems[currentIndex].querySelector('div.absolute');
          if (submenu) {
            submenu.classList.remove('hidden');
            // Focus first item in submenu
            const submenuItems = Array.from(submenu.children).filter(item =>
              item.classList.contains('cursor-pointer')
            );
            if (submenuItems.length > 0) {
              focusSubmenuItem(submenuItems, 0);
            }
          }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        // Handle submenu collapse (if we're in a submenu, return to main menu)
        const activeSubmenu = contextMenu.querySelector('div.absolute:not(.hidden)');
        if (activeSubmenu) {
          activeSubmenu.classList.add('hidden');
          // Return focus to parent menu item
          if (currentIndex >= 0 && menuItems[currentIndex]) {
            focusContextMenuItem(menuItems, currentIndex);
          }
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex >= 0 && menuItems[currentIndex]) {
          menuItems[currentIndex].click();
        }
        break;

      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        // Import hideContextMenu if it's not already available
        if (typeof hideContextMenu === 'function') {
          hideContextMenu();
        } else {
          contextMenu.classList.add('hidden');
        }
        break;
    }
  }

  // Focus context menu item helper
  function focusContextMenuItem(menuItems, index) {
    // Remove focus from all items
    menuItems.forEach(item => {
      item.classList.remove('bg-gray-50');
      item.style.backgroundColor = '';
    });

    // Focus current item
    if (menuItems[index]) {
      menuItems[index].classList.add('bg-gray-50');
      menuItems[index].style.backgroundColor = '#f9fafb';
      menuItems[index].focus();
    }
  }

  // Focus submenu item helper
  function focusSubmenuItem(submenuItems, index) {
    // Remove focus from all submenu items
    submenuItems.forEach(item => {
      item.classList.remove('bg-gray-50');
      item.style.backgroundColor = '';
    });

    // Focus current submenu item
    if (submenuItems[index]) {
      submenuItems[index].classList.add('bg-gray-50');
      submenuItems[index].style.backgroundColor = '#f9fafb';
      submenuItems[index].focus();
    }
  }

  // File list navigation helper
  function navigateFileList(direction, explorerWindow) {
    const fileItems = Array.from(explorerWindow.querySelectorAll('.file-item, .folder-item'));
    const currentFocused = document.activeElement;
    let currentIndex = fileItems.indexOf(currentFocused);

    if (currentIndex === -1 && fileItems.length > 0) {
      // No item focused, focus first item
      fileItems[0].focus();
      return;
    }

    let nextIndex;
    if (direction === 'down') {
      nextIndex = (currentIndex + 1) % fileItems.length;
    } else {
      nextIndex = (currentIndex - 1 + fileItems.length) % fileItems.length;
    }

    if (fileItems[nextIndex]) {
      fileItems[nextIndex].focus();
    }
  }

  // Apply to all file items when the explorer loads
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Apply to file items
          const fileItems = node.querySelectorAll?.('.file-item, .folder-item, .draggable-icon');
          fileItems?.forEach(item => {
            makeContextMenuAccessible(item);
            // Make items focusable
            if (!item.hasAttribute('tabindex')) {
              item.setAttribute('tabindex', '0');
            }
          });

          // Apply to explorer content areas for empty space context menus
          const explorerWindows = node.querySelectorAll?.('.file-explorer-window');
          explorerWindows?.forEach(explorer => {
            makeContextMenuAccessible(explorer);
            if (!explorer.hasAttribute('tabindex')) {
              explorer.setAttribute('tabindex', '0');
            }
          });
        }
      });
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Apply to existing elements
  document.querySelectorAll('.file-item, .folder-item, .draggable-icon').forEach(item => {
    makeContextMenuAccessible(item);
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', '0');
    }
  });

  document.querySelectorAll('.file-explorer-window').forEach(explorer => {
    makeContextMenuAccessible(explorer);
    if (!explorer.hasAttribute('tabindex')) {
      explorer.setAttribute('tabindex', '0');
    }
  });
}

// Initialize accessibility when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFileExplorerAccessibility);
} else {
  initFileExplorerAccessibility();
}

// TODO
// function addFileExplorerKeyboardSupport() {
//   document.addEventListener('keydown', function(e) {
//     const activeExplorer = document.querySelector('.file-explorer-window:focus-within');
//     if (activeExplorer) {
//       switch(e.key) {
//         case 'F2':
//           e.preventDefault();
//           renameSelectedFile();
//           break;
//         case 'Delete':
//           e.preventDefault();
//           deleteSelectedFile();
//           break;
//         case 'Enter':
//           e.preventDefault();
//           openSelectedFile();
//           break;
//       }
//     }
//   });
// }
