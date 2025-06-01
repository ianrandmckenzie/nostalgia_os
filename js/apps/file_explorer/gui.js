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
}

/* =====================
   getBreadcrumbs
   Builds the breadcrumb trail for a given fullPath. Each segment is a clickable link.
====================== */
function getBreadcrumbs(fullPath) {
  fullPath = normalizePath(fullPath);
  let driveMatch = fullPath.match(/^([A-Z]:\/\/)(.*)/);
  if (!driveMatch) return fullPath;
  let drivePart = driveMatch[1];
  let rest = driveMatch[2]; // e.g., "folder-34862398/folder-9523759823"
  let breadcrumbHtml = `<span class="cursor-pointer hover:underline" onclick="openExplorer('${drivePart}')">${drivePart}</span>`;
  if (!rest) return breadcrumbHtml;
  let parts = rest.split('/').filter(p => p !== '');
  let currentPath = drivePart;
  parts.forEach(partKey => {
    // Append the folder key to currentPath.
    currentPath = currentPath.endsWith('/') ? currentPath + partKey : currentPath + "/" + partKey;
    let folderObj = findFolderObjectByFullPath(currentPath);
    let displayName = folderObj ? folderObj.name : partKey;
    breadcrumbHtml += ` / <span class="cursor-pointer hover:underline" onclick="openExplorer('${folderObj ? folderObj.id : currentPath}')">${displayName}</span>`;
  });
  return breadcrumbHtml;
}

/* =====================
   File Explorer Window Content
   Returns HTML for a file explorer window given a fullPath.
====================== */
function getExplorerWindowContent(currentPath = 'C://') {
  currentPath = normalizePath(currentPath);
  let itemsObj = getItemsForPath(currentPath);
  let items = Object.values(itemsObj);
  let listHtml = '<ul class="pl-5">';
  items.forEach(item => {
    const isFolder = item.type === 'folder';
    let icon = isFolder ? 'image/folder.svg' : 'image/file.svg';

    if (item.icon_url) { icon = item.icon_url; }
    if (isFolder) {
      // For folders, the clickable link calls openExplorer with the folder’s id.
      listHtml += `<li class="cursor-pointer hover:bg-gray-50 folder-item file-item" data-item-id="${item.id}" ondblclick="openExplorer('${item.id}')" onmobiledbltap="openExplorer('${item.id}')">
        <img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}
      </li>`;
    } else if (item.type == 'shortcut') {
      listHtml += `<li class="cursor-pointer hover:bg-gray-50 file-item" data-item-id="${item.id}" ondblclick="openShortcut(this);" data-url="${item.url}" onmobiledbltap="openShortcut(this);" data-url="${item.url}">
        <img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}${item.description ? ' (' + item.description + ')' : ''}
      </li>`;
    } else {
      listHtml += `<li class="cursor-pointer hover:bg-gray-50 file-item" data-item-id="${item.id}" ondblclick="openFile('${item.id}', event); event.stopPropagation();" onmobiledbltap="openFile('${item.id}', event); event.stopPropagation();">
        <img src="${icon}" class="inline h-4 w-4 mr-2"> ${item.name}${item.description ? ' (' + item.description + ')' : ''}
      </li>`;
    }
  });
  listHtml += '</ul>';
  
  return `
  <div class="file-explorer-window" data-current-path="${currentPath}">
      <div class="flex">
        <!-- Left Sidebar -->
        <div id="file-sidebar" class="w-1/4 border-r p-2">
          <ul>
            <li class="cursor-pointer border-b border-gray-200 hover:bg-gray-50 system-folder" onclick="openExplorer('C://')">
              <img src="image/drive_c.svg" class="inline h-4 w-4 mr-2"> C://
            </li>
            <li class="cursor-pointer border-b border-gray-200 hover:bg-gray-50 system-folder" onclick="openExplorer('A://')">
              <img src="image/floppy.svg" class="inline h-4 w-4 mr-2"> A://
            </li>
            <li class="cursor-pointer border-b border-gray-200 hover:bg-gray-50 system-folder" onclick="openExplorer('D://')">
              <img src="image/cd.svg" class="inline h-4 w-4 mr-2"> D://
            </li>
          </ul>
        </div>
        <!-- Main Content -->
        <div id="file-main" class="w-3/4 p-2">
          <div id="breadcrumbs" class="mb-2">Path: ${getBreadcrumbs(currentPath)}</div>
          <div id="files-area">
            ${listHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

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
  const explorerElem = e.target.closest('.file-explorer-window');
  let currentPath;
  if (explorerElem) {
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
        <div id="text-editor" contenteditable="true" style="padding:10px; overflow:auto;">${file.content || "Empty file"}</div>
      </div>`;
      windowType = 'editor';
    } else if (file.content_type === 'markdown' || file.content_type === 'md') {
      content = `<div id="file-content" style="padding:10px;">
        <div class="md_editor_pro_plus min-h-48 h-full w-full" data-markdown-pro-plus-editor-id="${file.id}"></div>
      </div>`;
      windowType = 'editor';
    } else if (file.content_type === 'html') {
      content = file.content ? file.content : `<p style="padding:10px;">Empty HTML file.</p>`;
    } else {
      content = `<p style="padding:10px;">${file.content || "Empty file"}</p>`;
    }
  } else {
    // Non-UGC file: fetch from the media folder.
    if (['image', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(file.content_type)) {
      content = `<img src="./media/${file.name}" alt="${file.name}" class="mx-auto max-h-full max-w-full" style="padding:10px;">`;
    } else if (['video', 'mov', 'mp4', 'webm', 'avi'].includes(file.content_type)) {
      content = `<video controls class="mx-auto max-h-full max-w-full" style="padding:10px;">
            <source src="./media/${file.name}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
    } else if (['audio', 'mp3', 'ogg', 'wav'].includes(file.content_type)) {
      content = `<audio controls class="mx-auto" style="min-width:320px; min-height:60px; padding:10px;">
            <source src="./media/${file.name}" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>`;
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
