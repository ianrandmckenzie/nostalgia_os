import { getFileSystemStateSync } from './storage.js';

/* =====================
   normalizePath
   Removes trailing slashes (except for drive roots).
====================== */
export function normalizePath(path) {
  if (/^[A-Z]:\/\/$/.test(path)) return path;
  return path.replace(/\/+$/, "");
}

export function getFolderIdByFullPath(fullPath) {
  // For drive roots, return the fullPath itself.
  if (/^[A-Z]:\/\/$/.test(fullPath)) return fullPath;
  const fs = getFileSystemStateSync();
  function searchInFolder(contents) {
    for (const key in contents) {
      const item = contents[key];
      if (item.type === 'folder') {
        if (item.fullPath === fullPath) return key;
        const nested = fs.folders[item.fullPath] || {};
        const result = searchInFolder(nested);
        if (result) return result;
      }
    }
    return null;
  }
  for (const rootKey in fs.folders) {
    if (/^[A-Z]:\/\/$/.test(rootKey)) {
      const result = searchInFolder(fs.folders[rootKey]);
      if (result) return result;
    }
  }
  return null;
}

/* =====================
   Helper: Recursively find a folder object by its fullPath.
   Returns the folder object (which includes name, id, fullPath, etc.)
====================== */
export function findFolderObjectByFullPath(fullPath, fileSystem = null) {
  fullPath = normalizePath(fullPath);
  const fs = fileSystem || getFileSystemStateSync();

  // For drive roots, return a synthetic folder object.
  if (/^[A-Z]:\/\/$/.test(fullPath)) {
    return { id: fullPath, name: fullPath, fullPath: fullPath, contents: fs.folders[fullPath] };
  }

  // First, try to find the folder by searching through all folder contents
  // This is more reliable than recursive search through item.contents
  function searchAllFolders() {
    for (const folderPath in fs.folders) {
      if (/^[A-Z]:\/\/$/.test(folderPath)) {
        // Search through this drive's contents
        for (const itemKey in fs.folders[folderPath]) {
          const item = fs.folders[folderPath][itemKey];
          if (item.type === "folder" && normalizePath(item.fullPath) === fullPath) {
            return item;
          }
        }
      } else {
        // Search through subfolder contents
        for (const itemKey in fs.folders[folderPath]) {
          const item = fs.folders[folderPath][itemKey];
          if (item.type === "folder" && normalizePath(item.fullPath) === fullPath) {
            return item;
          }
        }
      }
    }
    return null;
  }

  return searchAllFolders();
}

/* =====================
   Helper: Recursively find the fullPath for a folder given its id.
   For drive roots the id is the fullPath.
====================== */
export function findFolderFullPathById(folderId, file = false) {
  // If folderId is a drive root, return it.
  if (/^[A-Z]:\/\/$/.test(folderId)) return folderId;

  const fs = getFileSystemStateSync();

  function search(contents, parentPath = null) {
    for (const key in contents) {
      const item = contents[key];
      if (item.type === "folder" || file === true) {
        if (key === folderId) {
          return item.fullPath;
        }
        // If this item is a folder, look for its contents in fs.folders
        if (item.type === "folder" && item.fullPath && fs.folders[item.fullPath]) {
          const result = search(fs.folders[item.fullPath], item.fullPath);
          if (result) return result;
        }
      }
    }
    return null;
  }

  // Search in each drive root
  for (const drive in fs.folders) {
    if (/^[A-Z]:\/\/$/.test(drive)) {
      const result = search(fs.folders[drive], drive);
      if (result) return result;
    }
  }
  return null;
}
