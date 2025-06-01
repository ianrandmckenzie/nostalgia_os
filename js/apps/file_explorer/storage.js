/* =====================
   Getter & Setter for fileSystemState
   Always retrieve and update state from localStorage.
====================== */
function getFileSystemState() {
  const appStateStr = localStorage.getItem('appState');
  if (appStateStr) {
    const appState = JSON.parse(appStateStr);
    return appState.fileSystemState;
  }
  return fileSystemState;
}

function setFileSystemState(newFS) {
  const appStateStr = localStorage.getItem('appState');
  let appState = appStateStr ? JSON.parse(appStateStr) : {};
  appState.fileSystemState = newFS;
  localStorage.setItem('appState', JSON.stringify(appState));
  fileSystemState = newFS; // update global variable for consistency
}

/* =====================
   Helper: Retrieve items for a given fullPath
   Since each folder’s contents are stored under its fullPath key,
   we simply return fs.folders[fullPath] or {} if not present.
====================== */
function getItemsForPath(fullPath) {
  fullPath = normalizePath(fullPath);
  const fs = getFileSystemState();

  let current = fs.folders;
  if (fullPath.substring(1, 4) === '://' && fullPath.length === 4) {
    return current[fullPath]
  }
  
  const drivePath = fullPath.substring(0, 4);
  current = current[drivePath];

  // Split the path into segments
  let parts = fullPath.split('/').filter(Boolean).filter(str => str !== 'A:').filter(str => str !== 'D:').filter(str => str !== 'C:');

  if (parts.length === 0) return {};
  current = current[parts[0]]
  let infinite_prot = 50;
  while (infinite_prot > 1) {
    let breakit = false;
    infinite_prot -= 1;
    parts.forEach(part => {
      let objects = drillIntoFolder(part, current);
      current = objects;
      if (typeof objects.contents === 'undefined') breakit = true;
    });
    if (breakit) {
      break;
    }
  }

  function drillIntoFolder (part) {
    if (part) {
      if (current[part]) {
        current = current[part]
      }
    }

    if (typeof current.contents !== 'undefined') {
      if ((drivePath + part === 'C://Documents') && Object.keys(current.contents).length === 0) {
        fetchDocuments();
      }

      current = current.contents; // Move deeper into contents
      return current;
    } else { return current }
  }
  return current;
}

// System files preloaded by vendor
function fetchDocuments() {
  fetch('./api/media.json')
    .then(response => response.json())
    .then(data => {
      const files = data.files;
      const fileItems = files.map(file => {
        let content_type = file.file_type.toLowerCase();
        let icon_url = 'image/file.svg';
        if (['png', 'jpg', 'jpeg', 'gif'].includes(content_type)) {
          icon_url = 'image/image.svg';
        } else if (['mp4', 'webm'].includes(content_type)) {
          icon_url = 'image/video.svg';
        } else if (['mp3', 'wav'].includes(content_type)) {
          icon_url = 'image/audio.svg';
        } else if (content_type === 'html') {
          icon_url = 'image/html.svg';
        } else if (content_type === 'md') {
          icon_url = 'image/doc.svg';
        } else if (content_type === 'txt') {
          icon_url = 'image/doc.svg';
        }
        return {
          id: file.id,
          name: file.url,
          type: "file",
          content: "",
          fullPath: `C://Documents/${file.id}`,
          content_type: content_type,
          icon_url: icon_url,
          description: file.description || ""
        };
      });
      let fs = getFileSystemState();
      if (fs.folders['C://'] && fs.folders['C://']['Documents']) {
        // Convert fileItems array to an object keyed by file id.
        const fileItemsObj = {};
        fileItems.forEach(file => {
          fileItemsObj[file.id] = file;
        });
        fs.folders['C://']['Documents'].contents = fileItemsObj;
      }
      setFileSystemState(fs);
      let listHtml = '<ul class="pl-5">';
      fileItems.forEach(file => {
        listHtml += `<li class="cursor-pointer hover:bg-gray-50 file-item" data-item-id="${file.id}" data-file-type="${file.content_type}" ondblclick="openFile('${file.id}', event); event.stopPropagation();" onmobiledbltap="openFile('${file.id}', event); event.stopPropagation();">
          <img src="${file.icon_url}" class="inline h-4 w-4 mr-2"> ${file.name} ${file.description ? '(' + file.description + ')' : ''}
        </li>`;
      });
      listHtml += '</ul>';
      const container = document.getElementById('files-area');
      if (container) {
        container.innerHTML = listHtml;
      }
    })
    .catch(error => {
      console.error("Error fetching media list:", error);
      const container = document.getElementById('files-area');
      if (container) {
        container.innerHTML = '<p>Error loading files.</p>';
      }
    });
}