/* =====================
   openExplorer
   Now accepts a folderId. It finds the folder’s fullPath and refreshes the explorer.
====================== */
function openExplorer(folderId) {
  // If folderId is a drive root (like "C://"), use it directly.
  let fullPath = /^[A-Z]:\/\/$/.test(folderId) ? folderId : findFolderFullPathById(folderId);
  if (!fullPath) {
    console.error("Folder not found for id:", folderId);
    return;
  }
  let explorerWindow = document.getElementById('explorer-window');
  const newContent = getExplorerWindowContent(fullPath);
  if (explorerWindow) {
    explorerWindow.querySelector('.file-explorer-window').outerHTML = newContent;
    explorerWindow.querySelector('.file-explorer-window').setAttribute('data-current-path', fullPath);
    setTimeout(setupFolderDrop, 100);
  } else {
    explorerWindow = createWindow(
      fullPath,
      newContent,
      false,
      'explorer-window',
      false,
      false,
      { type: 'integer', width: 600, height: 400 },
      "Explorer"
    );
  }
}

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
    if (item.icon_url) icon = item.icon_url;

    const classes   = 'cursor-pointer hover:bg-gray-50 file-item' +
                      (isFolder ? ' folder-item' : '');
    const extraDesc = item.description ? ` (${item.description})` : '';

    if (isFolder) {
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-folder="${item.id}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}</li>`
      );
    } else if (item.type === 'shortcut') {
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-shortcut="true" data-url="${item.url}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}${extraDesc}</li>`
      );
    } else {
      list.push(
        `<li class="${classes}" data-item-id="${item.id}" ` +
        `data-open-file="${item.id}">` +
        `<img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}${extraDesc}</li>`
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
document.addEventListener('dblclick', e => {
  const li = e.target.closest('[data-open-folder],[data-open-file],[data-open-shortcut]');
  if (!li) return;

  if (li.dataset.openFolder) {
    openExplorer(li.dataset.openFolder);
  } else if (li.dataset.openFile) {
    openFile(li.dataset.openFile, e);
  } else if (li.dataset.openShortcut) {
    openShortcut(li);           // same API you were already using
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
        <div class="md_editor_pro_plus min-h-48 h-full w-full" data-markdown-pro-plus-editor-id="${file.id}"></div>
      </div>`;
      windowType = 'editor';
    } else if (file.content_type === 'html') {
      content = file.content || file.contents || `<p style="padding:10px;">Empty HTML file.</p>`;
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(file.content_type)) {
      // Handle UGC image files
      if (file.dataURL) {
        content = `<img src="${file.dataURL}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
      } else if (file.file && file.file instanceof File) {
        const imageURL = URL.createObjectURL(file.file);
        content = `<img src="${imageURL}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
      } else {
        content = `<p style="padding:10px;">Image file not found or invalid.</p>`;
      }
    } else if (['mp3', 'wav', 'ogg'].includes(file.content_type)) {
      // Handle UGC audio files
      if (file.dataURL) {
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${file.dataURL}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else if (file.file && file.file instanceof File) {
        const audioURL = URL.createObjectURL(file.file);
        content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
              <source src="${audioURL}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>`;
      } else {
        content = `<p style="padding:10px;">Audio file not found or invalid.</p>`;
      }
    } else if (['mp4', 'webm', 'avi', 'mov'].includes(file.content_type)) {
      // Handle UGC video files
      if (file.dataURL) {
        content = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;">
            <source src="${file.dataURL}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
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
      } else {
        // Handle audio files from the media folder
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
            contentDiv.innerHTML = `<div class="md_editor_pro_plus min-h-48 h-full w-full" data-markdown-pro-plus-editor-id="${file.id}"></div>`;
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
