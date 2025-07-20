let fileSystemState = {
  folders: {
    "C://": {
      "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
      "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {
          "compostbin": { id: 'compostbin', name: 'Compost Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.png' }
        }
      },
      "Media": { id: 'Media', name: 'Media', type: 'folder', fullPath: 'C://Media', contents: {} },
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

// Expose globally for consistency across modules
if (typeof window !== 'undefined') {
  window.fileSystemState = fileSystemState;
}

// Flag to prevent saving during initialization
let isInitializing = false;

// Make initialization flag globally accessible
if (typeof window !== 'undefined') {
  window.isInitializing = isInitializing;
}

async function saveState() {
  if (isInitializing) {
    return;
  }

  // Get startMenuOrder from either global var or window object
  const currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);

  // Debug: Check if startMenuOrder is available

  const appState = {
    fileSystemState: fileSystemState,
    windowStates: windowStates,
    desktopIconsState: desktopIconsState,
    desktopSettings: desktopSettings,
    navWindows: navWindows,
    startMenuOrder: currentStartMenuOrder
  };


  const startTime = Date.now();

  try {
    // Use async method to ensure data is fully written before continuing
    await storage.setItem('appState', appState);
    const endTime = Date.now();

    // Verify save by reading it back immediately
    const readBack = await storage.getItem('appState');
  } catch (error) {
    console.warn('Failed to save state to IndexedDB:', error);
    // Fallback to sync method as last resort
    storage.setItemSync('appState', appState);
  }
}

// Make saveState available globally
if (typeof window !== 'undefined') {
  window.saveState = saveState;
}

function getFileSystemState() {
  return fileSystemState;
}

function setFileSystemState(newState) {
  fileSystemState = newState;
  // Also expose globally for consistency
  if (typeof window !== 'undefined') {
    window.fileSystemState = newState;
  }
}

function updateContent(windowId, newContent) {
  if (windowStates[windowId]) {
    windowStates[windowId].content = newContent;
    saveState(); // Fire and forget - this is not critical for data integrity
  }
}

// Utility function to add a file to the file system
async function addFileToFileSystem(fileName, fileContent, targetFolderPath, contentType, fileObj = null) {
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
    fullPath: isRootDrive ? `${targetFolderPath}${fileName}` : `${targetFolderPath}/${fileName}`,
    content_type: contentType,
    icon: icon_url,
    contents: fileContent || '',
    file: fileObj || null // Store the actual file object if provided
  };

  // Convert File object to data URL for persistence if it's a binary file
  if (fileObj && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {

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
        showDialogBox(`File "${fileName}" could not be stored (${fileSizeInMB.toFixed(2)}MB). Storage error: ${error.message}`, 'error');
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
  if (!fileObj || !['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov'].includes(contentType)) {
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
window.globalAddFileToFileSystem = addFileToFileSystem;

/* =====================
   File System Migration Function
   Converts old nested structure to unified fs.folders[fullPath] structure.
   This ensures compost bin and other desktop items appear correctly.
====================== */
function migrateFileSystemToUnifiedStructure(fs) {

  // Ensure the unified structure exists
  if (!fs.folders) {
    fs.folders = {};
  }

  // Check if migration is needed or if we need to ensure default folders exist
  let migrationNeeded = false;

  // Check for old nested structure
  if (fs.folders['C://'] && typeof fs.folders['C://'] === 'object') {

    // Migrate all default folders from nested to unified structure
    const driveContents = fs.folders['C://'];
    for (const [folderName, folderObj] of Object.entries(driveContents)) {
      if (folderObj && typeof folderObj === 'object' && folderObj.type === 'folder') {
        const unifiedPath = `C://${folderName}`;

        // If this folder doesn't exist in unified structure, migrate it
        if (!fs.folders[unifiedPath]) {

          // Create the folder in unified structure with its contents
          fs.folders[unifiedPath] = folderObj.contents || {};
          migrationNeeded = true;

          // Also recursively migrate any nested folder contents
          if (folderObj.contents) {
            Object.values(folderObj.contents).forEach(item => {
              if (item.type === 'folder' && item.fullPath) {
                migrateNestedContents(item.fullPath, item, fs);
              }
            });
          }
        }
      }
    }
  }

  // Ensure essential folders exist in unified structure (even if not migrated)
  const essentialFolders = ['C://Desktop', 'C://Documents', 'C://Media'];
  for (const folderPath of essentialFolders) {
    if (!fs.folders[folderPath]) {
      fs.folders[folderPath] = {};
      migrationNeeded = true;
    }
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

async function initializeAppState() {
  isInitializing = true; // Prevent saves during initialization
  if (typeof window !== 'undefined') {
    window.isInitializing = true;
  }

  // Ensure storage is ready before proceeding
  try {
    await storage.ensureReady();
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }

  let appStateData;
  try {
    appStateData = await storage.getItem('appState');
  } catch (error) {
    console.error('Failed to load app state from storage:', error);
    appStateData = null;
  }

  if (!appStateData) {

    // Initialize startMenuOrder to empty array for new installs
    startMenuOrder = [];
    if (typeof window !== 'undefined') {
      window.startMenuOrder = startMenuOrder;
    }

    // Migrate the default file system to the unified structure
    const migratedFileSystemState = migrateFileSystemToUnifiedStructure(fileSystemState);

    // No saved state; initialize using the migrated file system.
    const initialState = {
      fileSystemState: migratedFileSystemState,
      windowStates: windowStates,
      desktopIconsState: desktopIconsState,
      desktopSettings: desktopSettings,
      navWindows: navWindows
    };
    try {
      await storage.setItem('appState', initialState);
    } catch (error) {
      console.error('Failed to save initial app state:', error);
    }

    // Add the default song to the Media folder on first load
    setTimeout(async () => {
      // For the default song, create a file entry that references the static media file
      const fs = await getFileSystemState();
      if (fs.folders['C://Media']) {
        // Check if the default song is already there
        const hasDefaultSong = Object.values(fs.folders['C://Media']).some(file =>
          file.name === 'too_many_screws_final.mp3'
        );
        if (!hasDefaultSong) {
          const defaultSongFile = {
            id: 'default-music-file',
            name: 'too_many_screws_final.mp3',
            type: 'ugc-file',
            fullPath: 'C://Media/too_many_screws_final.mp3',
            content_type: 'mp3',
            icon: 'image/audio.png',
            contents: '',
            file: null,
            isDefault: true,
            path: 'media/too_many_screws_final.mp3', // Reference to static file
            isSystemFile: true // Mark as system file for proper handling
          };
          fs.folders['C://Media']['default-music-file'] = defaultSongFile;
          setFileSystemState(fs);
          await saveState();
        } else {
        }
      } else {
      }
    }, 100);

    // Initialize Documents folder with default files
    setTimeout(async () => {
      if (typeof fetchDocuments === 'function') {
        await fetchDocuments();
      } else {
        console.warn('fetchDocuments function not available, trying sync version');
        if (typeof fetchDocumentsSync === 'function') {
          fetchDocumentsSync();
        }
      }
    }, 200);
  } else {
    // Load state from IndexedDB with validation
    const storedState = appStateData;

    // Validate and sanitize the loaded state
    if (storedState.fileSystemState && typeof storedState.fileSystemState === 'object') {
      // Apply migration to existing file system state
      const migratedFS = migrateFileSystemToUnifiedStructure(storedState.fileSystemState);
      setFileSystemState(migratedFS);
    } else {
      console.warn('Invalid fileSystemState in saved data, using default');
      const migratedFileSystemState = migrateFileSystemToUnifiedStructure(fileSystemState);
      setFileSystemState(migratedFileSystemState);
    }

    windowStates = (storedState.windowStates && typeof storedState.windowStates === 'object')
      ? storedState.windowStates : {};
    desktopIconsState = (storedState.desktopIconsState && typeof storedState.desktopIconsState === 'object')
      ? storedState.desktopIconsState : {};
    navWindows = (storedState.navWindows && typeof storedState.navWindows === 'object')
      ? storedState.navWindows : {};
    startMenuOrder = (storedState.startMenuOrder && Array.isArray(storedState.startMenuOrder))
      ? storedState.startMenuOrder : [];

    // Also update window reference for consistency
    if (typeof window !== 'undefined') {
      window.startMenuOrder = startMenuOrder;
    }


    // Merge stored desktop settings with defaults to ensure all properties exist
    desktopSettings = {
      clockSeconds: false,
      bgColor: "#20b1b1",
      bgImage: "",
      ...(storedState.desktopSettings || {})
    };


    // Apply desktop settings after loading them
    applyDesktopSettings();

    // Check if default song exists in Media folder, add if not (for migration)
    setTimeout(async () => {
      const fs = await getFileSystemState();
      if (fs && fs.folders && fs.folders['C://Media']) {
        const musicFolder = fs.folders['C://Media'];
        if (musicFolder) {
          const hasDefaultSong = Object.values(musicFolder).some(file =>
            file.name === 'too_many_screws_final.mp3'
          );
          if (!hasDefaultSong) {
            const defaultSongFile = {
              id: 'default-music-file',
              name: 'too_many_screws_final.mp3',
              type: 'ugc-file',
              fullPath: 'C://Media/too_many_screws_final.mp3',
              content_type: 'mp3',
              icon: 'image/audio.png',
              contents: '',
              file: null,
              isDefault: true,
              path: 'media/too_many_screws_final.mp3', // Reference to static file
              isSystemFile: true // Mark as system file for proper handling
            };
            fs.folders['C://Media']['default-music-file'] = defaultSongFile;
            setFileSystemState(fs);
            await saveState();
          }
        }
      }

      // Also check if Documents folder needs to be populated
      const documentsItems = fs.folders['C://Documents'] || {};
      const documentsCount = Object.keys(documentsItems).length;

      if (documentsCount === 0) {
        if (typeof fetchDocuments === 'function') {
          await fetchDocuments();
        } else if (typeof fetchDocumentsSync === 'function') {
          fetchDocumentsSync();
        }
      } else {
      }
    }, 100);
  }

  // Initialization complete, allow saves now
  isInitializing = false;
  if (typeof window !== 'undefined') {
    window.isInitializing = false;
  }
}

async function restoreFileSystemState() {
  const saved = await storage.getItem('fileSystemState');
  if (saved) {
    fileSystemState = saved;
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

    // Also initialize any LetterPad editors that might have been missed
    if (typeof window.initializeAllLetterPadEditors === 'function') {
      try {
        await window.initializeAllLetterPadEditors();
      } catch (error) {
        console.warn('Error during global LetterPad initialization:', error);
      }
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
          initializeCalculatorUI(calcWindow);
        } else {
        }
      }
    },
    'mediaplayer': () => {
      // Media Player needs UI reconstruction
      const playerWindow = document.getElementById('mediaplayer');
      if (playerWindow) {
        const content = playerWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          initializeMediaPlayerUI(playerWindow);
        } else {
        }
      }
    },
    'bombbroomer': () => {
      // Bombbroomer needs UI reconstruction
      const gameWindow = document.getElementById('bombbroomer');
      if (gameWindow) {
        const content = gameWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializeBombbroomerUI === 'function') {
            initializeBombbroomerUI(gameWindow);
          } else {
            console.warn('initializeBombbroomerUI function not available');
          }
        } else {
        }
      }
    },
    'solitaire': () => {
      // Solitaire needs UI reconstruction
      const gameWindow = document.getElementById('solitaire');
      if (gameWindow) {
        const content = gameWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          initializeSolitaireUI(gameWindow);
        } else {
        }
      }
    },
    'chess': () => {
      // Chess needs UI reconstruction
      const chessWindow = document.getElementById('chess');
      if (chessWindow) {
        const content = chessWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializeChessUI === 'function') {
            initializeChessUI(chessWindow);
          } else {
            console.warn('initializeChessUI function not available');
          }
        } else {
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
          initializeWatercolourUI(watercolourWindow);
        } else {
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
        if (typeof initializeFileExplorerUI === 'function') {
          initializeFileExplorerUI(explorerWindow);
        } else {
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
  } else {
    // Check if this is a file window that might contain a LetterPad editor
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
      const letterpadEditor = windowElement.querySelector('.letterpad_editor');
      if (letterpadEditor) {
        try {
          if (typeof initializeLetterPad === 'function') {
            await initializeLetterPad(letterpadEditor);
          } else {
            console.warn('initializeLetterPad function not available');
          }
        } catch (error) {
          console.warn(`Failed to initialize LetterPad editor in window ${windowId}:`, error);
        }
      }
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
}

// Force save current state (for testing)
async function forceSaveState() {
  try {
    await saveState();
  } catch (error) {
    console.error('Failed to save state manually:', error);
  }
}

// Test app restoration (for testing)
function testAppRestoration(windowId) {
  initializeRestoredApp(windowId);
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
  } else {
    console.warn('Bombbroomer window not found or function not available');
  }
}

// Test data integrity (for debugging)
async function testDataIntegrity() {
  try {
    // Test 1: Save current state
    await saveState();

    // Test 2: Read back the saved state
    const savedData = await storage.getItem('appState');

    if (savedData) {

      // Test 3: Verify IndexedDB persistence
      const storage_estimate = await navigator.storage.estimate();

      return true;
    } else {
      console.error('✗ No data found after save');
      return false;
    }
  } catch (error) {
    console.error('✗ Data integrity test failed:', error);
    return false;
  }
}

// Test session persistence (for debugging login behavior)
async function testSessionPersistence() {
  try {
    const appState = await storage.getItem('appState');
    const explicitRestart = await storage.getItem('explicitRestart');


    if (appState) {
    } else {
    }

    return !!appState;
  } catch (error) {
    console.error('✗ Session persistence test failed:', error);
    return false;
  }
}

// Simulate restart for testing
async function simulateRestart() {
  await storage.setItem('explicitRestart', true);
}

// Make debug functions globally available
window.debugWindowStates = debugWindowStates;
window.forceSaveState = forceSaveState;
window.testAppRestoration = testAppRestoration;
window.testAppReinitialization = testAppReinitialization;
window.testBombbroomerInit = testBombbroomerInit;
window.testDataIntegrity = testDataIntegrity;
window.testSessionPersistence = testSessionPersistence;
window.simulateRestart = simulateRestart;// Add beforeunload handler to ensure data is saved before page closes
window.addEventListener('beforeunload', async (event) => {
  try {
    // Force immediate save using sync method to ensure it completes before unload
    const appState = {
      fileSystemState: fileSystemState,
      windowStates: windowStates,
      desktopIconsState: desktopIconsState,
      desktopSettings: desktopSettings,
      navWindows: navWindows
    };
    storage.setItemSync('appState', appState);
  } catch (error) {
    console.error('Failed to save state during page unload:', error);
  }
});

// Also add a periodic backup save to prevent data loss
setInterval(async () => {
  try {
    await saveState();
  } catch (error) {
    console.error('Failed to save periodic backup:', error);
  }
}, 30000); // Save every 30 seconds

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
    const storedState = appStateData;
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

  // Use unified structure: all folders are stored directly in fs.folders[fullPath]
  const folder = fs.folders[targetPath];
  if (!folder) {
    console.error('Folder not found in unified structure:', targetPath);
    console.error('Available folders:', Object.keys(fs.folders));
    return null;
  }

  return folder;
}

// Initialize async
restoreFileSystemState().then(() => {
}).catch(console.error);
