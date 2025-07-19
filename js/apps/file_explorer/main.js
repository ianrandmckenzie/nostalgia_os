/* =====================
   normalizePath
   Removes trailing slashes (except for drive roots).
====================== */
function normalizePath(path) {
  if (/^[A-Z]:\/\/$/.test(path)) return path;
  return path.replace(/\/+$/, "");
}

function getFolderIdByFullPath(fullPath) {
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
function findFolderObjectByFullPath(fullPath, fileSystem = null) {
  fullPath = normalizePath(fullPath);
  const fs = fileSystem || getFileSystemStateSync();
  // For drive roots, return a synthetic folder object.
  if (/^[A-Z]:\/\/$/.test(fullPath)) {
    return { id: fullPath, name: fullPath, fullPath: fullPath, contents: fs.folders[fullPath] };
  }

  function search(contents) {
    for (const key in contents) {
      const item = contents[key];
      if (item.type === "folder") {
        if (normalizePath(item.fullPath) === fullPath) {
          return item;
        }
        // Search recursively in this folder's contents
        if (item.contents) {
          const result = search(item.contents);
          if (result) return result;
        }
      }
    }
    return null;
  }

  // Search in each drive root.
  const fsFolders = fs.folders;
  for (const drive in fsFolders) {
    if (/^[A-Z]:\/\/$/.test(drive)) {
      const result = search(fsFolders[drive]);
      if (result) return result;
    }
  }
  return null;
}

/* =====================
   Helper: Recursively find the fullPath for a folder given its id.
   For drive roots the id is the fullPath.
====================== */
function findFolderFullPathById(folderId, file = false) {
  // If folderId is a drive root, return it.
  if (/^[A-Z]:\/\/$/.test(folderId)) return folderId;
  function search(contents) {
    for (const key in contents) {
      const item = contents[key];
      if (item.type === "folder" || file === true) {
        if (key === folderId) {
          return item.fullPath;
        }
        const nested = getItemsForPath(item.fullPath);
        const result = search(nested);
        if (result) return result;
      }
    }
    return null;
  }
  const fsFolders = getFileSystemStateSync().folders;
  for (const drive in fsFolders) {
    if (/^[A-Z]:\/\/$/.test(drive)) {
      const result = search(fsFolders[drive]);
      if (result) return result;
    }
  }
  return null;
}
