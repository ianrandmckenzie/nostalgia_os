/* =====================
   Getter & Setter for fileSystemState
   Always retrieve and update state from IndexedDB.
====================== */
async function getFileSystemState() {
  try {
    const appState = await storage.getItem('appState');
    if (appState && appState.fileSystemState) {
      return appState.fileSystemState;
    }
  } catch (error) {
    console.warn('Failed to get file system state from IndexedDB:', error);
    // Fallback to sync method
    try {
      const appState = storage.getItemSync('appState');
      if (appState && appState.fileSystemState) {
        return appState.fileSystemState;
      }
    } catch (fallbackError) {
      console.warn('Failed to get file system state with fallback:', fallbackError);
    }
  }
  return fileSystemState;
}

async function setFileSystemState(newFS) {
  try {
    const appState = await storage.getItem('appState') || {};
    appState.fileSystemState = newFS;
    await storage.setItem('appState', appState);
    fileSystemState = newFS; // update global variable for consistency
  } catch (error) {
    console.warn('Failed to set file system state in IndexedDB:', error);
    // Fallback to sync method
    try {
      const appState = storage.getItemSync('appState') || {};
      appState.fileSystemState = newFS;
      storage.setItemSync('appState', appState);
      fileSystemState = newFS;
    } catch (fallbackError) {
      console.error('Failed to set file system state with fallback:', fallbackError);
    }
  }
}

function getFileSystemStateSync() {
  try {
    const appState = storage.getItemSync('appState');
    if (appState && appState.fileSystemState) {
      return appState.fileSystemState;
    }
  } catch (error) {
    console.warn('Failed to get file system state sync:', error);
  }
  // Return global variable as fallback
  return fileSystemState;
}

/* =====================
   Helper: Retrieve items for a given fullPath
   Since each folder’s contents are stored under its fullPath key,
   we simply return fs.folders[fullPath] or {} if not present.
====================== */
function getItemsForPath(fullPath) {
  fullPath = normalizePath(fullPath);
  const fs = getFileSystemStateSync();
  if (fs.initialized !== true) fetchDocumentsSync();

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
      current = current.contents; // Move deeper into contents
      return current;
    } else { return current }
  }
  return current;
}

// System files preloaded by vendor
const myDocuments = {
  "files": [
    {
      "id": "abc",
      "description": "A (possibly doctored) image of a really cool website",
      "file_type": "jpg",
      "url": "inspo.jpg"
    },
    {
      "id": "xyz",
      "description": "",
      "file_type": "mp3",
      "url": "mail.mp3"
    },
    {
      "id": "123",
      "description": "",
      "file_type": "html",
      "url": "test.html"
    },
    {
      "id": "133323",
      "description": "",
      "file_type": "html",
      "url": "editor.html"
    },
    {
      "id": "789",
      "description": "",
      "file_type": "md",
      "url": "FAQ.md"
    },
    {
      "id": "01101011110011001",
      "description": "",
      "file_type": "txt",
      "url": "contact.txt"
    }
  ]
};

async function fetchDocuments() {
  try {
    const data = myDocuments;
    const files = data.files;
    const fileItems = files.map(file => {
      let content_type = file.file_type.toLowerCase();
      let icon_url = 'image/file.png';
      if (['png', 'jpg', 'jpeg', 'gif'].includes(content_type)) {
        icon_url = 'image/image.png';
      } else if (['mp4', 'webm'].includes(content_type)) {
        icon_url = 'image/video.png';
      } else if (['mp3', 'wav'].includes(content_type)) {
        icon_url = 'image/audio.png';
      } else if (content_type === 'html') {
        icon_url = 'image/html.png';
      } else if (['md', 'txt'].includes(content_type)) {
        icon_url = 'image/doc.png';
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
      const fileItemsObj = {};
      fileItems.forEach(file => {
        fileItemsObj[file.id] = file;
      });
      fs.folders['C://']['Documents'].contents = fileItemsObj;
    }
    fs.initialized = true;
    await setFileSystemState(fs);
  } catch (error) {
    console.error("Error loading documents:", error);
    const container = document.getElementById('files-area');
    if (container) {
      container.innerHTML = '<p>Error loading files.</p>';
    }
  }
}

function fetchDocumentsSync() {
  try {
    const fs = getFileSystemStateSync();
    if (!fs.folders || !fs.folders['C://']) {
      console.warn('File system structure not properly initialized for sync document fetch');
      return;
    }

    const fileItems = myDocuments.files.map(file => {
      const content_type = file.url.split('.').pop().toLowerCase();
      let icon_url = 'image/file.png';
      if (['png', 'jpg', 'jpeg', 'gif'].includes(content_type)) {
        icon_url = 'image/image.png';
      } else if (['mp4', 'webm'].includes(content_type)) {
        icon_url = 'image/video.png';
      } else if (['mp3', 'wav'].includes(content_type)) {
        icon_url = 'image/audio.png';
      } else if (content_type === 'html') {
        icon_url = 'image/html.png';
      } else if (['md', 'txt'].includes(content_type)) {
        icon_url = 'image/doc.png';
      }

      return {
        id: file.id,
        name: file.url,
        type: "file",
        content: "",
        fullPath: `C://Documents/${file.id}`,
        content_type: content_type,
        icon_url: icon_url,
        url: file.url
      };
    });

    if (fs.folders['C://'] && fs.folders['C://']['Documents']) {
      const fileItemsObj = {};
      fileItems.forEach(file => {
        fileItemsObj[file.id] = file;
      });
      fs.folders['C://']['Documents'].contents = fileItemsObj;
    }
    fs.initialized = true;
    // Use sync setFileSystemState by calling the sync storage directly
    try {
      const appState = storage.getItemSync('appState') || {};
      appState.fileSystemState = fs;
      storage.setItemSync('appState', appState);
      fileSystemState = fs;
    } catch (error) {
      console.warn('Failed to save file system state sync:', error);
      // At least update the global variable
      fileSystemState = fs;
    }
  } catch (error) {
    console.error("Error loading documents sync:", error);
  }
}

document.addEventListener('dblclick', e => {
  const fileItem = e.target.closest('[data-open-file]');
  if (fileItem) {
    e.stopPropagation();
    const fileId = fileItem.getAttribute('data-open-file');
    openFile(fileId, e);
  }
});

// Optional: mobile double-tap handler if you're using one
document.addEventListener('mobiledbltap', e => {
  const fileItem = e.target.closest('[data-open-file]');
  if (fileItem) {
    e.stopPropagation();
    const fileId = fileItem.getAttribute('data-open-file');
    openFile(fileId, e);
  }
});
