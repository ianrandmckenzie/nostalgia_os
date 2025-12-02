import { storage } from '../indexeddb_storage.js';
import {
  getFileSystemState,
  setFileSystemState,
  windowStates,
  apiOverrides
} from './state.js';
import { saveState } from './persistence.js';

export function updateContent(windowId, newContent) {
  if (windowStates[windowId]) {
    windowStates[windowId].content = newContent;
    saveState(); // Fire and forget - this is not critical for data integrity
  }
}

// Utility function to add a file to the file system
export async function addFileToFileSystem(fileName, fileContent, targetFolderPath, contentType, fileObj = null, skipSave = false) {
  const fs = await getFileSystemState();

  // Ensure file system is initialized with proper structure
  if (!fs || !fs.folders) {
    console.error('File system not initialized, creating basic structure');
    // Create a basic file system structure
    const basicFS = {
      folders: {
        "C://": {
          "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
          "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {}},
          "Media": { id: 'Media', name: 'Media', type: 'folder', fullPath: 'C://Media', contents: {} },
        },
        "A://": {},
        "D://": {}
      }
    };
    setFileSystemState(basicFS);
    fs = basicFS;
  }

  // Extract drive and navigate to target folder
  const driveMatch = targetFolderPath.match(/^([A-Z]:\/\/)/);
  if (!driveMatch) {
    console.error('Invalid path format:', targetFolderPath);
    return null;
  }

  const drive = driveMatch[1];
  const pathParts = targetFolderPath.replace(/^[A-Z]:\/\//, '').split('/').filter(p => p);

  // Ensure the drive exists
  if (!fs.folders[drive]) {
    console.error('Drive does not exist:', drive);
    fs.folders[drive] = {};
  }

  let targetFolder = fs.folders[drive];


  // Use unified structure: all folders are stored directly in fs.folders[fullPath]
  if (pathParts.length === 0) {
    // Targeting root drive
    targetFolder = fs.folders[drive];
  } else {
    // Targeting specific folder - use full path in unified structure
    targetFolder = fs.folders[targetFolderPath];
    if (!targetFolder) {
      console.error('Target folder not found in unified structure:', targetFolderPath);
      console.error('Available folders:', Object.keys(fs.folders));
      return null;
    }
  }

  // Check if we're targeting a root drive
  const isRootDrive = pathParts.length === 0;

  // Note: In unified structure, we don't use a separate contents object
  // Files are stored directly in the folder

  // Determine appropriate icon based on content type
  let icon_url = 'image/file.webp';
  if (['png', 'jpg', 'jpeg', 'gif'].includes(contentType)) {
    icon_url = 'image/image.webp';
  } else if (['mp4', 'webm'].includes(contentType)) {
    icon_url = 'image/video.webp';
  } else if (['mp3', 'wav', 'audio'].includes(contentType)) {
    icon_url = 'image/audio.webp';
  } else if (contentType === 'html') {
    icon_url = 'image/html.webp';
  } else if (['md', 'txt'].includes(contentType)) {
    icon_url = 'image/doc.webp';
  }

  // Create file object
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newFile = {
    id: fileId,
    name: fileName,
    type: 'ugc-file',
    fullPath: isRootDrive ? `${targetFolderPath}${fileName}` : `${targetFolderPath}/${fileName}`,
    content_type: contentType,
    icon: icon_url,
    contents: fileContent || '',
    file: fileObj || null // Store the actual file object if provided
  };

  // Convert File object to data URL for persistence if it's a binary file
  if (fileObj && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {

    // Set initial properties to prevent undefined values
    newFile.isLargeFile = true;
    newFile.storageLocation = 'indexeddb';

    // Create immediate object URL for instant playback while async processing happens
    const tempObjectURL = URL.createObjectURL(fileObj);
    newFile.tempObjectURL = tempObjectURL;

    const reader = new FileReader();
    reader.onload = async function(e) {
      const dataURL = e.target.result;
      const fileSizeInMB = (dataURL.length * 0.75) / (1024 * 1024); // Approximate size after base64 encoding

      // Store all files in IndexedDB for consistency
      try {
        await storage.setItem(`file_data_${fileId}`, dataURL);

        // Update the file entry with storage information
        const currentFS = await getFileSystemState();
        let fileEntry;

        if (isRootDrive) {
          fileEntry = currentFS.folders[drive][fileId];
        } else {
          fileEntry = currentFS.folders[targetFolderPath][fileId];
        }

        if (fileEntry) {
          fileEntry.isLargeFile = true; // Always true for IndexedDB stored binary files
          fileEntry.storageLocation = 'indexeddb';
          fileEntry.dataURL = dataURL; // Store the data URL for immediate access

          // Keep the tempObjectURL as backup - don't clean it up immediately
          // The file explorer will prefer dataURL when available

        } else {
          console.error('🎵 ADDFILE: File entry not found after creation:', fileId);
          console.error('🎵 ADDFILE: Looking in:', isRootDrive ? drive : targetFolderPath);
          console.error('🎵 ADDFILE: Available keys:', isRootDrive ? Object.keys(currentFS.folders[drive] || {}) : Object.keys(currentFS.folders[targetFolderPath] || {}));
        }
      } catch (error) {
        console.error('Failed to store file in IndexedDB:', error);

        // Update the file entry with failure information
        const currentFS = await getFileSystemState();
        let fileEntry;

        if (isRootDrive) {
          fileEntry = currentFS.folders[drive][fileId];
        } else {
          fileEntry = currentFS.folders[targetFolderPath][fileId];
        }

        if (fileEntry) {
          fileEntry.isLargeFile = true;
          fileEntry.storageLocation = 'failed';
        }
        if (typeof showDialogBox === 'function') {
            showDialogBox(`File "${fileName}" could not be stored (${fileSizeInMB.toFixed(2)}MB). Storage error: ${error.message}`, 'error');
        }
      }

      // Remove the File object since we have the data stored
      const currentFS = await getFileSystemState();
      let fileEntry;

      if (isRootDrive) {
        fileEntry = currentFS.folders[drive][fileId];
      } else {
        fileEntry = currentFS.folders[targetFolderPath][fileId];
      }

      if (fileEntry) {
        fileEntry.file = null;
      } else {
        console.error('🎵 ADDFILE: Could not find file entry to remove File object:', fileId);
      }

      setFileSystemState(currentFS);

      // Save state - wait for completion to ensure data integrity
      try {
        await saveState();
      } catch (error) {
        console.error('Failed to save state after file storage:', error);
      }

      // Refresh views after async operation
      if (targetFolderPath === 'C://Desktop' && typeof renderDesktopIcons === 'function') {
        renderDesktopIcons();
      } else if (typeof refreshAllExplorerWindows === 'function') {
        refreshAllExplorerWindows(targetFolderPath);
      }
      // Note: refreshExplorerViews() is broken, so we handle refresh above
    };
    reader.readAsDataURL(fileObj);
  }

  // Add to target folder (handle root drives differently)
  if (isRootDrive) {
    // For root drives, add directly to the drive folder
    targetFolder[fileId] = newFile;
  } else {
    // For regular folders in unified structure, add directly to the folder, NOT to contents
    targetFolder[fileId] = newFile;
  }


  // Save changes (for non-binary files or immediate save)
  setFileSystemState(fs);
  if (!skipSave && (!fileObj || !['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType))) {
    try {
      await saveState();
    } catch (error) {
      console.error('Failed to save state after non-binary file:', error);
    }
  }

  // Refresh views if the function exists (will be available when file explorer is loaded)
  if (targetFolderPath === 'C://Desktop') {
    if (typeof renderDesktopIcons === 'function') {
      renderDesktopIcons();
    } else if (typeof window.renderDesktopIcons === 'function') {
      window.renderDesktopIcons();
    } else {
      console.warn('renderDesktopIcons function not found');
    }
  } else {
    if (typeof refreshAllExplorerWindows === 'function') {
      refreshAllExplorerWindows(targetFolderPath);
    } else if (typeof window.refreshAllExplorerWindows === 'function') {
      window.refreshAllExplorerWindows(targetFolderPath);
    } else {
      console.warn('refreshAllExplorerWindows function not found');
    }
  }

  // If a media file was added to C://Media, refresh the media player playlist
  if (targetFolderPath === 'C://Media' && ['mp3', 'wav', 'ogg', 'audio', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
    if (typeof window.refreshMediaPlayerPlaylist === 'function') {
      // Delay the refresh to ensure the file system state is fully updated
      setTimeout(() => {
        window.refreshMediaPlayerPlaylist();
      }, 100);
    } else {
    }
  }
  // Note: refreshExplorerViews() is broken, so we handle refresh above

  return newFile;
}

// Make addFileToFileSystem available globally for iframe access
if (typeof window !== 'undefined') {
    window.globalAddFileToFileSystem = addFileToFileSystem;
}

/* =====================
   File System Migration Function
   Converts old nested structure to unified fs.folders[fullPath] structure.
   This ensures compost bin and other desktop items appear correctly.
====================== */
export function migrateFileSystemToUnifiedStructure(fs) {

  // Ensure the unified structure exists
  if (!fs.folders) {
    fs.folders = {};
  }

  // Check if migration is needed or if we need to ensure default folders exist
  let migrationNeeded = false;

  // Check for old nested structure
  if (fs.folders['C://'] && typeof fs.folders['C://'] === 'object') {

    // Migrate all items (folders, files, shortcuts) from nested to unified structure
    const driveContents = fs.folders['C://'];
    for (const [itemKey, itemObj] of Object.entries(driveContents)) {
      if (itemObj && typeof itemObj === 'object') {

        if (itemObj.type === 'folder') {
          // Handle folder migration
          const unifiedPath = `C://${itemObj.name || itemKey}`;

          // If this folder doesn't exist in unified structure, migrate it
          if (!fs.folders[unifiedPath]) {
            // Create the folder in unified structure with its contents
            fs.folders[unifiedPath] = itemObj.contents || {};
            migrationNeeded = true;

            // Also recursively migrate any nested folder contents
            if (itemObj.contents) {
              Object.values(itemObj.contents).forEach(item => {
                if (item.type === 'folder' && item.fullPath) {
                  migrateNestedContents(item.fullPath, item, fs);
                }
              });
            }
          }
        } else {
          // Handle non-folder items (shortcuts, files, etc.)
          // These should remain in the drive root, so we don't need to do anything special
          // The unified structure already has them in fs.folders['C://']
          // Just ensure they're preserved during migration
        }
      }
    }
  }

  // Ensure essential folders exist in unified structure (even if not migrated)
  const essentialFolders = [
    { path: 'C://Desktop', name: 'Desktop' },
    { path: 'C://Documents', name: 'Documents' },
    { path: 'C://Media', name: 'Media' }
  ];

  // Ensure C:// exists
  if (!fs.folders['C://']) {
    fs.folders['C://'] = {};
    migrationNeeded = true;
  }

  for (const folder of essentialFolders) {
    // Create the folder in unified structure if it doesn't exist
    if (!fs.folders[folder.path]) {
      fs.folders[folder.path] = {};
      migrationNeeded = true;
    }

    // Also ensure the folder has an entry in C:// that points to it
    if (!fs.folders['C://'][folder.name]) {
      fs.folders['C://'][folder.name] = {
        id: folder.name,
        name: folder.name,
        type: 'folder',
        fullPath: folder.path,
        contents: {}
      };
      migrationNeeded = true;
    }
  }

  // Add compost bin to Desktop if it doesn't exist
  if (fs.folders['C://Desktop'] && !fs.folders['C://Desktop']['compostbin']) {
    fs.folders['C://Desktop']['compostbin'] = {
      id: 'compostbin',
      name: 'Compost Bin',
      type: 'app',
      fullPath: 'C://Desktop/compostbin',
      content_type: 'html',
      contents: {},
      icon: './image/compost-bin.webp'
    };
    migrationNeeded = true;
  }

  // Helper function to migrate nested contents recursively
  function migrateNestedContents(folderPath, folderObj, fileSystem) {
    if (folderObj.contents && Object.keys(folderObj.contents).length > 0) {
      // Move contents to the unified location
      if (!fileSystem.folders[folderPath]) {
        fileSystem.folders[folderPath] = {};
      }
      Object.assign(fileSystem.folders[folderPath], folderObj.contents);

      // Recursively migrate nested folders
      Object.values(folderObj.contents).forEach(item => {
        if (item.type === 'folder' && item.fullPath) {
          migrateNestedContents(item.fullPath, item, fileSystem);
        }
      });
    }
  }

  if (migrationNeeded) {
  } else {
  }


  return fs;
}

export function populateFileSystemFromFlatArray(flatArray, fs) {
  if (!fs.folders) {
    fs.folders = {};
  }
  // Ensure root exists
  if (!fs.folders['C://']) {
    fs.folders['C://'] = {};
  }

  // Pre-process and normalize all items
  const normalizedItems = flatArray.map(item => {
    const normalizedItem = {};
    Object.keys(item).forEach(key => {
      // Map lowercase keys to camelCase expected by the system
      if (key.toLowerCase() === 'fullpath') normalizedItem.fullPath = item[key];
      else if (key.toLowerCase() === 'parentpath') normalizedItem.parentPath = item[key];
      else if (key.toLowerCase() === 'islargefile') normalizedItem.isLargeFile = item[key];
      else if (key.toLowerCase() === 'content_type') normalizedItem.content_type = item[key];
      else if (key.toLowerCase() === 'url') normalizedItem.url = item[key];
      else normalizedItem[key] = item[key];
    });

    // Derive name from fullPath if missing
    if (!normalizedItem.name && normalizedItem.fullPath) {
        const parts = normalizedItem.fullPath.split('/').filter(p => p);
        normalizedItem.name = parts[parts.length - 1];
    }

    // Derive ID if missing
    if (!normalizedItem.id) {
        // Use name as ID if available, otherwise generate one
        // We use the name as ID to ensure stability across reloads if the API doesn't provide IDs
        normalizedItem.id = normalizedItem.name || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add slug if present
    if (item.slug) normalizedItem.slug = item.slug;

    return normalizedItem;
  });

  // Pass 0: Cleanup moved items to prevent duplication
  // This is critical to remove "ghost" items that might exist in old locations in the local state
  console.log('🔍 Checking for moved items to cleanup. apiOverrides:', JSON.stringify(apiOverrides));
  normalizedItems.forEach(item => {
    if (item.slug) {
        // console.log(`Checking item slug: ${item.slug}`);
        if (apiOverrides.movedSlugs[item.slug]) {
            const correctPath = apiOverrides.movedSlugs[item.slug];
            console.log(`🧹 Cleanup: Item ${item.slug} is moved to ${correctPath}. Scanning for ghosts...`);
            // Scan all folders and delete incorrect instances
            for (const folderPath in fs.folders) {
                const folder = fs.folders[folderPath];
                for (const itemId in folder) {
                const fsItem = folder[itemId];
                if (fsItem && fsItem.slug === item.slug) {
                    // If the item is not at the correct path, it's a ghost/duplicate. Delete it.
                    if (fsItem.fullPath !== correctPath) {
                        console.log(`👻 DESTROYING GHOST: ${item.slug} found at ${fsItem.fullPath} (should be at ${correctPath})`);
                        delete folder[itemId];
                    } else {
                        console.log(`✅ Found valid instance of ${item.slug} at ${fsItem.fullPath}`);
                    }
                }
                }
            }
        }
    }
  });

  // Filter out items that shouldn't be merged
  const itemsToMerge = normalizedItems.filter(item => {
    // Filter out deleted items based on slug
    if (item.slug && apiOverrides.deletedSlugs.includes(item.slug)) {
      console.log(`Skipping deleted API item: ${item.slug}`);
      return false;
    }
    // Filter out moved items - we rely on local state for these
    if (item.slug && apiOverrides.movedSlugs[item.slug]) {
        console.log(`🚫 Skipping moved API item (relying on local state): ${item.slug}`);
        return false;
    }
    return true;
  });

  // Pass 1: Ensure all folders have an entry in fs.folders
  itemsToMerge.forEach(normalizedItem => {
    // Use normalized item for processing
    if (normalizedItem.type === 'folder') {
      if (!fs.folders[normalizedItem.fullPath]) {
        fs.folders[normalizedItem.fullPath] = {};
      }
    }
  });

  // Pass 2: Link items to their parents
  itemsToMerge.forEach(normalizedItem => {
    const parentPath = normalizedItem.parentPath;
    if (!parentPath) return; // Skip root or invalid

    // Special handling for Compost Bin
    if (parentPath === 'C://Desktop/compostbin') {
        if (fs.folders['C://Desktop'] && fs.folders['C://Desktop']['compostbin']) {
            if (!fs.folders['C://Desktop']['compostbin'].contents) {
                fs.folders['C://Desktop']['compostbin'].contents = {};
            }
            fs.folders['C://Desktop']['compostbin'].contents[normalizedItem.id] = itemEntry;
            return;
        }
    }

    // Ensure parent folder exists in fs.folders
    if (!fs.folders[parentPath]) {
      fs.folders[parentPath] = {};
    }

    const parentFolder = fs.folders[parentPath];

    // Add item to parent folder
    const itemEntry = { ...normalizedItem };
    if (normalizedItem.type === 'folder') {
      itemEntry.contents = {}; // Placeholder
    }

    parentFolder[normalizedItem.id] = itemEntry;
  });
}

export function repairFileSystem(fs) {
  if (!fs || !fs.folders) return fs;

  console.log('🔧 Running file system repair...');
  let repairCount = 0;

  Object.keys(fs.folders).forEach(folderPath => {
    const folder = fs.folders[folderPath];
    if (!folder) return;

    // 1. Fix "undefined" key
    if (Object.prototype.hasOwnProperty.call(folder, 'undefined')) {
      console.log(`Repairing 'undefined' key in ${folderPath}`);
      const item = folder['undefined'];

      // Generate a valid ID
      let newId = item.name || `repaired-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Ensure ID is unique in this folder
      if (folder[newId]) {
          newId = `${newId}-${Math.random().toString(36).substr(2, 5)}`;
      }

      item.id = newId;
      if (!item.name) item.name = newId;

      // Move to new key
      folder[newId] = item;
      delete folder['undefined'];
      repairCount++;
    }

    // 2. Fix items with missing/bad IDs
    Object.keys(folder).forEach(key => {
      const item = folder[key];
      if (item && typeof item === 'object') {
        let changed = false;

        if (!item.id || item.id === 'undefined') {
           item.id = key !== 'undefined' ? key : (item.name || `repaired-${Date.now()}`);
           changed = true;
        }

        if (!item.name) {
            item.name = item.id;
            changed = true;
        }

        if (changed) repairCount++;
      }
    });
  });

  if (repairCount > 0) {
      console.log(`✅ Repaired ${repairCount} items in file system`);
  }

  return fs;
}

// Helper function to find a folder by its full path
export function findFolderByPath(fs, targetPath) {
  // Handle root drives (C://, D://, A://)
  if (targetPath.endsWith('://')) {
    return fs.folders[targetPath];
  }

  // Use unified structure: all folders are stored directly in fs.folders[fullPath]
  const folder = fs.folders[targetPath];
  if (!folder) {
    console.error('Folder not found in unified structure:', targetPath);
    console.error('Available folders:', Object.keys(fs.folders));
    return null;
  }

  return folder;
}

if (typeof window !== 'undefined') {
    window.updateContent = updateContent;
}
