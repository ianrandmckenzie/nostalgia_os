let fileSystemState = {
  folders: {
    "C://": {
      "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
      "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {
          "compostbin": { id: 'compostbin', name: 'Compost Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.png' }
        }
      },
      "Music": { id: 'Music', name: 'Music', type: 'folder', fullPath: 'C://Music', contents: {} },
    },
    "A://": {
      "folder-34862398": { id: 'folder-34862398', name: 'example folder', type: 'folder', fullPath: 'A://folder-34862398', contents: {
        "folder-9523759823": { id: 'folder-9523759823', name: "nested in example", type: 'folder', fullPath: 'A://folder-34862398/folder-9523759823', contents: {
          "folder-53829539": { id: 'folder-53829539', name: 'supernested', type: 'folder', fullPath: 'A://folder-34862398/folder-9523759823/folder-53829539', contents: {
            "file-593485739": { id: 'file-593485739', name: 'some md example', type: 'ugc-file', content_type: 'md', fullPath: 'A://folder-34862398/folder-9523759823/folder-53829539/file-593485739', contents: 'lol sup' }
          }}
        }}
      }}
    },
    "D://": {}
  }
};

function saveState() {
  const appState = {
    fileSystemState: fileSystemState,
    windowStates: windowStates,
    desktopIconsState: desktopIconsState,
    desktopSettings: desktopSettings,
    navWindows: navWindows
  };
  storage.setItemSync('appState', JSON.stringify(appState));
}

function getFileSystemState() {
  return fileSystemState;
}

function setFileSystemState(newState) {
  fileSystemState = newState;
}

function updateContent(windowId, newContent) {
  if (windowStates[windowId]) {
    windowStates[windowId].content = newContent;
    saveState();
  }
}

// Utility function to add a file to the file system
function addFileToFileSystem(fileName, fileContent, targetFolderPath, contentType, fileObj = null) {
  const fs = getFileSystemState();

  // Ensure file system is initialized
  if (!fs || !fs.folders) {
    console.error('File system not initialized');
    return null;
  }

  // Extract drive and navigate to target folder
  const driveMatch = targetFolderPath.match(/^([A-Z]:\/\/)/);
  if (!driveMatch) {
    console.error('Invalid path format:', targetFolderPath);
    return null;
  }

  const drive = driveMatch[1];
  const pathParts = targetFolderPath.replace(/^[A-Z]:\/\//, '').split('/').filter(p => p);
  let targetFolder = fs.folders[drive];

  console.log('Adding file to path:', targetFolderPath);
  console.log('Drive:', drive);
  console.log('Path parts:', pathParts);
  console.log('Initial target folder:', targetFolder);

  // Navigate through the path parts
  for (const part of pathParts) {
    if (targetFolder[part]) {
      targetFolder = targetFolder[part];
      console.log('Navigated to:', part, targetFolder);
      // Don't navigate to contents here, we need the folder object itself
    } else if (targetFolder.contents && targetFolder.contents[part]) {
      // Check if the folder is in contents (for nested folders)
      targetFolder = targetFolder.contents[part];
      console.log('Navigated to (via contents):', part, targetFolder);
    } else {
      console.error('Target folder not found:', targetFolderPath, 'Missing part:', part);
      console.error('Available folders:', Object.keys(targetFolder));
      if (targetFolder.contents) {
        console.error('Available in contents:', Object.keys(targetFolder.contents));
      }
      return null;
    }
  }

  // Ensure the target folder has a contents object
  if (!targetFolder.contents) {
    console.log('Creating contents object for folder:', targetFolder.name);
    targetFolder.contents = {};
  }

  // Determine appropriate icon based on content type
  let icon_url = 'image/file.png';
  if (['png', 'jpg', 'jpeg', 'gif'].includes(contentType)) {
    icon_url = 'image/image.png';
  } else if (['mp4', 'webm'].includes(contentType)) {
    icon_url = 'image/video.png';
  } else if (['mp3', 'wav', 'audio'].includes(contentType)) {
    icon_url = 'image/audio.png';
  } else if (contentType === 'html') {
    icon_url = 'image/html.png';
  } else if (['md', 'txt'].includes(contentType)) {
    icon_url = 'image/doc.png';
  }

  // Create file object
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newFile = {
    id: fileId,
    name: fileName,
    type: 'ugc-file',
    fullPath: `${targetFolderPath}/${fileId}`,
    content_type: contentType,
    icon: icon_url,
    contents: fileContent || '',
    file: fileObj || null // Store the actual file object if provided
  };

  // Convert File object to data URL for persistence if it's a binary file
  if (fileObj && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const dataURL = e.target.result;
      const fileSizeInMB = (dataURL.length * 0.75) / (1024 * 1024); // Approximate size after base64 encoding

      // If file is larger than 1MB, store in IndexedDB instead of localStorage
      if (fileSizeInMB > 1) {
        try {
          // Store large file in IndexedDB
          await storage.setItem(`file_data_${fileId}`, dataURL);
          newFile.isLargeFile = true;
          newFile.storageLocation = 'indexeddb';
          console.log(`Large file (${fileSizeInMB.toFixed(2)}MB) stored in IndexedDB:`, fileName);
        } catch (error) {
          console.error('Failed to store large file in IndexedDB:', error);
          // Fallback: don't store the file data, just the metadata
          newFile.isLargeFile = true;
          newFile.storageLocation = 'failed';
          showDialogBox(`File "${fileName}" is too large to store (${fileSizeInMB.toFixed(2)}MB). Consider using smaller files.`, 'error');
        }
      } else {
        // Store small file in localStorage as before
        newFile.dataURL = dataURL;
        console.log(`Small file (${fileSizeInMB.toFixed(2)}MB) stored in localStorage:`, fileName);
      }

      // Remove the File object since we have the data stored
      newFile.file = null;
      setFileSystemState(fs);

      // Save state with try-catch to handle quota errors
      try {
        saveState();
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.error('Storage quota exceeded. Moving file to IndexedDB.');
          // Move the file data to IndexedDB and retry
          if (newFile.dataURL) {
            await storage.setItem(`file_data_${fileId}`, newFile.dataURL);
            delete newFile.dataURL;
            newFile.isLargeFile = true;
            newFile.storageLocation = 'indexeddb';
            saveState(); // Retry saving
          }
        } else {
          throw error;
        }
      }

      // Refresh views after async operation
      if (typeof refreshExplorerViews === 'function') {
        refreshExplorerViews();
      }
      if (targetFolderPath === 'C://Desktop' && typeof renderDesktopIcons === 'function') {
        renderDesktopIcons();
      }
    };
    reader.readAsDataURL(fileObj);
  }

  // Add to target folder contents
  targetFolder.contents[fileId] = newFile;

  // Save changes (for non-binary files or immediate save)
  setFileSystemState(fs);
  if (!fileObj || !['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
    saveState();
  }

  // Refresh views if the function exists (will be available when file explorer is loaded)
  if (typeof refreshExplorerViews === 'function') {
    refreshExplorerViews();
  }

  return newFile;
}

// Make addFileToFileSystem available globally for iframe access
window.globalAddFileToFileSystem = addFileToFileSystem;

async function initializeAppState() {
  const appStateData = await storage.getItem('appState');
  if (!appStateData) {
    // No saved state; initialize using the default base objects.
    const initialState = {
      fileSystemState: fileSystemState,
      windowStates: windowStates,
      desktopIconsState: desktopIconsState,
      desktopSettings: desktopSettings,
      navWindows: navWindows
    };
    await storage.setItem('appState', JSON.stringify(initialState));

    // Add the default song to the Music folder on first load
    setTimeout(() => {
      addFileToFileSystem('too_many_screws_final.mp3', '', 'C://Music', 'mp3');
    }, 100);
  } else {
    // Load state from IndexedDB
    const storedState = JSON.parse(appStateData);
    setFileSystemState(storedState.fileSystemState);
    windowStates = storedState.windowStates || {};
    desktopIconsState = storedState.desktopIconsState || {};
    navWindows = storedState.navWindows || {};

    // Merge stored desktop settings with defaults to ensure all properties exist
    desktopSettings = {
      clockSeconds: false,
      bgColor: "#20b1b1",
      bgImage: "",
      ...(storedState.desktopSettings || {})
    };

    console.log('Loaded desktop settings:', desktopSettings);

    // Apply desktop settings after loading them
    applyDesktopSettings();

    // Check if default song exists in Music folder, add if not (for migration)
    setTimeout(() => {
      const fs = getFileSystemState();
      const musicFolder = fs.folders['C://'].Music;
      if (musicFolder && musicFolder.contents) {
        const hasDefaultSong = Object.values(musicFolder.contents).some(file =>
          file.name === 'too_many_screws_final.mp3'
        );
        if (!hasDefaultSong) {
          addFileToFileSystem('too_many_screws_final.mp3', '', 'C://Music', 'mp3');
        }
      }
    }, 100);
  }
}

async function restoreFileSystemState() {
  const saved = await storage.getItem('fileSystemState');
  if (saved) {
    fileSystemState = JSON.parse(saved);
  }
}

async function restoreWindows() {
  // Window states are already loaded in windowStates during initializeAppState()
  // Just need to recreate the windows from the loaded state
  if (windowStates && Object.keys(windowStates).length > 0) {
    for (const id in windowStates) {
      const state = windowStates[id];
      createWindow(
        state.title,
        state.content,
        state.isNav,
        state.id,
        state.isMinimized,
        true,
        state.dimensions,
        state.windowType,
        null,  // parentWin
        state.color || 'white'  // Use saved color or default to white
      );

      // Initialize app-specific functionality for restored windows
      await initializeRestoredApp(state.id);
    }
  }
}

// Initialize app-specific functionality for restored windows
async function initializeRestoredApp(windowId) {
  // Add a small delay to ensure all scripts are loaded
  await new Promise(resolve => setTimeout(resolve, 50));

  // Mapping of window IDs to their initialization functions
  const appInitializers = {
    'storage-window': () => {
      // Storage Manager needs to load storage data
      if (typeof loadStorageData === 'function') {
        setTimeout(loadStorageData, 100);
      } else {
        console.warn('loadStorageData function not available for storage window restoration');
      }
    },
    'calculator': () => {
      // Calculator needs UI reconstruction
      const calcWindow = document.getElementById('calculator');
      if (calcWindow) {
        const content = calcWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          console.log('Calculator content empty, reinitializing...');
          initializeCalculatorUI(calcWindow);
        } else {
          console.log('Calculator content already exists, skipping reinitialization');
        }
      }
    },
    'mediaplayer': () => {
      // Media Player needs UI reconstruction
      const playerWindow = document.getElementById('mediaplayer');
      if (playerWindow) {
        const content = playerWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          console.log('Media Player content empty, reinitializing...');
          initializeMediaPlayerUI(playerWindow);
        } else {
          console.log('Media Player content already exists, skipping reinitialization');
        }
      }
    },
    'bombbroomer': () => {
      // Bombbroomer needs UI reconstruction
      const gameWindow = document.getElementById('bombbroomer');
      if (gameWindow) {
        const content = gameWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          console.log('Bombbroomer content empty, reinitializing...');
          if (typeof initializeBombbroomerUI === 'function') {
            initializeBombbroomerUI(gameWindow);
          } else {
            console.warn('initializeBombbroomerUI function not available');
          }
        } else {
          console.log('Bombbroomer content already exists, skipping reinitialization');
        }
      }
    },
    'solitaire': () => {
      // Solitaire needs UI reconstruction
      const gameWindow = document.getElementById('solitaire');
      if (gameWindow) {
        const content = gameWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          console.log('Solitaire content empty, reinitializing...');
          initializeSolitaireUI(gameWindow);
        } else {
          console.log('Solitaire content already exists, skipping reinitialization');
        }
      }
    },
    'compost-bin': () => {
      // Compost Bin needs to load its contents
      const compostWindow = document.getElementById('compost-bin');
      if (compostWindow) {
        const contentArea = compostWindow.querySelector('#compost-bin-content');
        if (contentArea && typeof loadCompostBinContents === 'function') {
          loadCompostBinContents(contentArea);
          if (typeof updateCompostBinHeader === 'function') {
            updateCompostBinHeader(compostWindow);
          }
        } else {
          console.warn('Compost bin content area not found or loadCompostBinContents not available');
        }
      }
    },
    'watercolour': () => {
      // Watercolour needs UI reconstruction
      const watercolourWindow = document.getElementById('watercolour');
      if (watercolourWindow) {
        const content = watercolourWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          console.log('Watercolour content empty, reinitializing...');
          initializeWatercolourUI(watercolourWindow);
        } else {
          console.log('Watercolour content exists, but ensuring event handlers are set up...');
          // Even if content exists, we need to ensure event handlers and global functions are set up
          if (typeof initializeWatercolour === 'function') {
            initializeWatercolour();
          } else {
            // If initializeWatercolour is not available, call initializeWatercolourUI to load it
            initializeWatercolourUI(watercolourWindow);
          }
        }
      }
    },
    'tubestream': () => {
      // TubeStream needs its interface initialized
      if (typeof initializeTubeStream === 'function') {
        setTimeout(initializeTubeStream, 100);
      }
    },
    'explorer-window': () => {
      // File Explorer needs to restore its current path
      const explorerWindow = document.getElementById('explorer-window');
      if (explorerWindow) {
        console.log('File Explorer found, restoring state...');
        if (typeof initializeFileExplorerUI === 'function') {
          initializeFileExplorerUI(explorerWindow);
        } else {
          console.log('File Explorer UI initializer not available, trying direct restoration...');
          if (typeof restoreFileExplorerState === 'function') {
            setTimeout(restoreFileExplorerState, 100);
          }
        }
      }
    }
  };

  // Call the appropriate initializer if it exists
  if (appInitializers[windowId]) {
    try {
      appInitializers[windowId]();
    } catch (error) {
      console.warn(`Failed to initialize restored app ${windowId}:`, error);
    }
  }
}

// Helper function to check if app content needs reinitialization
function needsReinitialization(content) {
  if (!content) return true;

  const html = content.innerHTML.trim();

  // Empty content
  if (!html) return true;

  // Only whitespace or basic structure
  if (html.length < 50 && !html.includes('button') && !html.includes('canvas') && !html.includes('input')) {
    return true;
  }

  // Check for specific app indicators that suggest proper initialization
  if (content.querySelector('button, canvas, input[type="text"], .game-board, #media-container, #game-grid, #calc-display')) {
    return false; // Has proper app elements
  }

  return true; // Needs reinitialization
}

// Helper function to reinitialize app content in existing window
function reinitializeApp(windowId, launchFunction) {
  if (typeof launchFunction !== 'function') {
    console.warn(`Launch function not available for ${windowId}`);
    return;
  }

  const existingWindow = document.getElementById(windowId);
  if (!existingWindow) {
    console.warn(`Window ${windowId} not found for reinitialization`);
    return;
  }

  try {
    // Temporarily change the window ID to avoid conflicts
    const tempId = windowId + '-temp-' + Date.now();
    existingWindow.id = tempId;

    // Call the launch function - it will create a new window
    launchFunction();

    // Get the newly created window
    const newWindow = document.getElementById(windowId);
    if (newWindow && newWindow !== existingWindow) {
      // Copy the content from new window to existing window
      const existingContent = existingWindow.querySelector('.p-2');
      const newContent = newWindow.querySelector('.p-2');

      if (existingContent && newContent) {
        existingContent.innerHTML = newContent.innerHTML;
        existingContent.className = newContent.className;
      }

      // Remove the new window and its tab
      newWindow.remove();
      const newTab = document.getElementById('tab-' + windowId);
      if (newTab) newTab.remove();

      // Remove the entry from windowStates that was created by the new window
      delete windowStates[windowId];
    }

    // Restore the original window ID
    existingWindow.id = windowId;

    console.log(`Successfully reinitialized ${windowId}`);
  } catch (error) {
    // Restore window ID if something went wrong
    if (existingWindow && existingWindow.id !== windowId) {
      existingWindow.id = windowId;
    }
    console.error(`Failed to reinitialize ${windowId}:`, error);
  }
}

// Debug function to check current window states
function debugWindowStates() {
  console.log('Current windowStates:', windowStates);
  console.log('Current navWindows:', navWindows);
  console.log('Current desktop icons state:', desktopIconsState);
}

// Force save current state (for testing)
function forceSaveState() {
  saveState();
  console.log('State saved manually');
}

// Test app restoration (for testing)
function testAppRestoration(windowId) {
  initializeRestoredApp(windowId);
  console.log(`Tested restoration for app: ${windowId}`);
}

// Test app reinitialization (for testing)
function testAppReinitialization(windowId) {
  const launchFunctions = {
    'calculator': launchCalculator,
    'mediaplayer': launchMediaPlayer,
    'bombbroomer': launchBombbroomer,
    'solitaire': launchSolitaire
  };

  if (launchFunctions[windowId]) {
    reinitializeApp(windowId, launchFunctions[windowId]);
  } else {
    console.warn(`No launch function found for ${windowId}`);
  }
}

// Test Bombbroomer specific initialization
function testBombbroomerInit() {
  const gameWindow = document.getElementById('bombbroomer');
  if (gameWindow && typeof initializeBombbroomerUI === 'function') {
    initializeBombbroomerUI(gameWindow);
    console.log('Bombbroomer UI initialized');
  } else {
    console.warn('Bombbroomer window not found or function not available');
  }
}

// Make debug functions globally available
window.debugWindowStates = debugWindowStates;
window.forceSaveState = forceSaveState;
window.testAppRestoration = testAppRestoration;
window.testAppReinitialization = testAppReinitialization;
window.testBombbroomerInit = testBombbroomerInit;

async function restoreDesktopIcons() {
  // Desktop icon positions are already loaded into desktopIconsState during initializeAppState()
  // Just apply them to the existing icons
  for (const iconId in desktopIconsState) {
    const icon = document.getElementById(iconId);
    if (icon) {
      const pos = desktopIconsState[iconId];
      icon.style.position = 'absolute';
      icon.style.left = pos.left;
      icon.style.top = pos.top;
    }
  }
}

async function restoreDesktopSettings() {
  const appStateData = await storage.getItem('appState');
  if (appStateData) {
    const storedState = JSON.parse(appStateData);
    if (storedState.desktopSettings) {
      desktopSettings = storedState.desktopSettings;
      applyDesktopSettings();
    }
  }
}

// Helper function to find a folder by its full path
function findFolderByPath(fs, targetPath) {
  // Handle root drives (C://, D://, A://)
  if (targetPath.endsWith('://')) {
    return fs.folders[targetPath];
  }

  // Split the path into components
  const pathParts = targetPath.split('/').filter(part => part !== '');

  // First part should be the drive (C:, D:, A:) - handle the colon properly
  const driveLetter = pathParts[0].replace(':', '');
  const drive = driveLetter + '://';
  let currentFolder = fs.folders[drive];

  if (!currentFolder) {
    console.error('Drive not found:', drive);
    return null;
  }

  // Traverse through the remaining path parts
  for (let i = 1; i < pathParts.length; i++) {
    const folderName = pathParts[i];

    // Look for the folder by name in the current level
    let found = false;
    if (currentFolder.contents) {
      for (const [key, item] of Object.entries(currentFolder.contents)) {
        if (item.type === 'folder' && item.name === folderName) {
          currentFolder = item;
          found = true;
          break;
        }
      }
    } else {
      // Check direct properties for root level folders
      for (const [key, item] of Object.entries(currentFolder)) {
        if (item && item.type === 'folder' && item.name === folderName) {
          currentFolder = item;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      console.error(`Folder '${folderName}' not found in path:`, targetPath);
      return null;
    }
  }

  return currentFolder;
}

// Initialize async
restoreFileSystemState().then(() => {
  console.log('File system state restored from IndexedDB');
}).catch(console.error);
