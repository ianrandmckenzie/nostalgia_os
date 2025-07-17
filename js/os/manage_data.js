let fileSystemState = {
  folders: {
    "C://": {
      "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
      "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {
          "compostbin": { id: 'compostbin', name: 'Composting Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.png' }
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
    desktopSettings: desktopSettings
  };
  localStorage.setItem('appState', JSON.stringify(appState));
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

  // Navigate to target folder
  const pathParts = targetFolderPath.replace(/^[A-Z]:\/\//, '').split('/').filter(p => p);
  let targetFolder = fs.folders['C://'];

  console.log('Adding file to path:', targetFolderPath);
  console.log('Path parts:', pathParts);
  console.log('Initial target folder:', targetFolder);

  for (const part of pathParts) {
    if (targetFolder[part]) {
      targetFolder = targetFolder[part];
      console.log('Navigated to:', part, targetFolder);
      // Don't navigate to contents here, we need the folder object itself
    } else {
      console.error('Target folder not found:', targetFolderPath, 'Missing part:', part);
      console.error('Available folders:', Object.keys(targetFolder));
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
    reader.onload = function(e) {
      newFile.dataURL = e.target.result;
      // Remove the File object since we have the data URL now
      newFile.file = null;
      setFileSystemState(fs);
      saveState();

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

function initializeAppState() {
  if (!localStorage.getItem('appState')) {
    // No saved state; initialize using the default base objects.
    const initialState = {
      fileSystemState: fileSystemState,
      windowStates: windowStates,
      desktopIconsState: desktopIconsState,
      desktopSettings: desktopSettings
    };
    localStorage.setItem('appState', JSON.stringify(initialState));

    // Add the default song to the Music folder on first load
    setTimeout(() => {
      addFileToFileSystem('too_many_screws_final.mp3', '', 'C://Music', 'mp3');
    }, 100);
  } else {
    // Load state from localStorage
    const storedState = JSON.parse(localStorage.getItem('appState'));
    setFileSystemState(storedState.fileSystemState);
    windowStates = storedState.windowStates;
    desktopIconsState = storedState.desktopIconsState;
    desktopSettings = storedState.desktopSettings;

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

function restoreFileSystemState() {
  const saved = localStorage.getItem('fileSystemState');
  if (saved) {
    fileSystemState = JSON.parse(saved);
  }
}

function restoreWindows() {
  const saved = localStorage.getItem('windowStates');
  if (saved) {
    const savedStates = JSON.parse(saved);
    windowStates = savedStates;
    for (const id in savedStates) {
      const state = savedStates[id];
      createWindow(
        state.title,
        state.content,
        state.isNav,
        state.id,
        state.isMinimized,
        true,
        state.dimensions,
        state.windowType
      );
    }
  }
}

function restoreDesktopIcons() {
  const saved = localStorage.getItem('desktopIconsState');
  if (saved) {
    desktopIconsState = JSON.parse(saved);
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
}

function restoreDesktopSettings() {
  const saved = localStorage.getItem('desktopSettings');
  if (saved) {
    desktopSettings = JSON.parse(saved);
    applyDesktopSettings();
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

restoreFileSystemState();
