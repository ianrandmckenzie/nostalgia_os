import { storage } from '../../os/indexeddb_storage.js';

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

export async function setFileSystemState(newFS) {

  // Log shortcuts being saved
  if (newFS.folders) {
    Object.keys(newFS.folders).forEach(path => {
      const items = newFS.folders[path];
      if (items && typeof items === 'object') {
        const shortcuts = Object.keys(items).filter(id => {
          const item = items[id];
          return item && item.type === 'shortcut';
        });
      }
    });
  }

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

export function getFileSystemStateSync() {
  try {
    const appState = storage.getItemSync('appState');
    if (appState && appState.fileSystemState) {
      const fs = appState.fileSystemState;

      // Log some key paths for debugging
      ['C://', 'C://Desktop', 'C://Documents'].forEach(path => {
        if (fs.folders && fs.folders[path]) {
          const items = Object.keys(fs.folders[path]);

          // Check for shortcuts specifically
          const shortcuts = items.filter(id => {
            const item = fs.folders[path][id];
            return item && item.type === 'shortcut';
          });
          if (shortcuts.length > 0) {
          }
        } else {
        }
      });

      return fs;
    } else {
    }
  } catch (error) {
    console.warn('Failed to get file system state sync:', error);
  }
  // Return global variable as fallback - check if it exists in global scope
  if (typeof window !== 'undefined' && window.fileSystemState) {
    return window.fileSystemState;
  }
  if (typeof fileSystemState !== 'undefined') {
    return fileSystemState;
  }
  // Last resort: return a minimal structure to prevent errors
  console.error('No file system state available anywhere!');
  return {
    folders: {
      "C://": {},
      "A://": {},
      "D://": {}
    }
  };
}

/* =====================
   Helper: Retrieve items for a given fullPath
   Since each folder’s contents are stored under its fullPath key,
   we simply return fs.folders[fullPath] or {} if not present.
====================== */
export function getItemsForPath(fullPath) {
  fullPath = normalizePath(fullPath);
  const fs = getFileSystemStateSync();
  if (fs.initialized !== true) fetchDocumentsSync();

  // For drive roots, return the contents directly
  if (fullPath.substring(1, 4) === '://' && fullPath.length === 4) {
    return fs.folders[fullPath] || {};
  }

  // For all other paths, use the direct lookup in fs.folders
  // since each folder's contents are stored under its fullPath key
  const folderContents = fs.folders[fullPath] || {};

  // Filter out the 'contents' object if it exists, as it's metadata not a file
  const filteredContents = {};
  for (const [key, value] of Object.entries(folderContents)) {
    if (key !== 'contents' && value && typeof value === 'object' && value.type) {
      filteredContents[key] = value;
    }
  }


  return filteredContents;
}

// System files preloaded by vendor
const myDocuments = {
  "files": []
};

async function fetchDocuments() {
  try {
    const data = myDocuments;
    const files = data.files;

    const fileItems = files.map(file => {
      let content_type = file.file_type.toLowerCase();
      let icon_url = 'image/file.webp';
      if (['png', 'jpg', 'jpeg', 'gif'].includes(content_type)) {
        icon_url = 'image/image.webp';
      } else if (['mp4', 'webm'].includes(content_type)) {
        icon_url = 'image/video.webp';
      } else if (['mp3', 'wav'].includes(content_type)) {
        icon_url = 'image/audio.webp';
      } else if (content_type === 'html') {
        icon_url = 'image/html.webp';
      } else if (['md', 'txt'].includes(content_type)) {
        icon_url = 'image/doc.webp';
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

    let fs = await getFileSystemState();

    // Use unified structure: populate Documents at fs.folders['C://Documents']
    if (!fs.folders['C://Documents']) {
      fs.folders['C://Documents'] = {};
    }

    const fileItemsObj = {};
    fileItems.forEach(file => {
      fileItemsObj[file.id] = file;
    });
    fs.folders['C://Documents'] = fileItemsObj;
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
      let icon_url = 'image/file.webp';
      if (['png', 'jpg', 'jpeg', 'gif'].includes(content_type)) {
        icon_url = 'image/image.webp';
      } else if (['mp4', 'webm'].includes(content_type)) {
        icon_url = 'image/video.webp';
      } else if (['mp3', 'wav'].includes(content_type)) {
        icon_url = 'image/audio.webp';
      } else if (content_type === 'html') {
        icon_url = 'image/html.webp';
      } else if (['md', 'txt'].includes(content_type)) {
        icon_url = 'image/doc.webp';
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

    // Use unified structure: populate Documents at fs.folders['C://Documents']
    if (!fs.folders['C://Documents']) {
      fs.folders['C://Documents'] = {};
    }

    const fileItemsObj = {};
    fileItems.forEach(file => {
      fileItemsObj[file.id] = file;
    });
    fs.folders['C://Documents'] = fileItemsObj;
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
