let fileSystemState = {
  folders: {
    "C://": {
      "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
      "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {
          // "tubestream": { id: 'tubestream', name: 'Example Stream.exe', type: 'app', fullPath: 'C://Desktop/tubestream', content_type: 'html', contents: '', icon: './image/video.png' },
          // "mailbox": { id: 'mailbox', name: 'Inpeek Mail.exe', type: 'app', fullPath: 'C://Desktop/mailbox', content_type: 'html', contents: '', icon: './image/mail.png' },
          // "calculator": { id: 'calculator', name: 'Calculator.exe', type: 'app', fullPath: 'C://Desktop/calculator', content_type: 'html', contents: '', icon: './image/calculator.png' },
          // "solitaire": { id: 'solitaire', name: 'Solitaire.exe', type: 'app', fullPath: 'C://Desktop/solitaire', content_type: 'html', contents: '', icon: './image/solitaire.png' },
          // "bombbroomer": { id: 'bombbroomer', name: 'Bombbroomer.exe', type: 'app', fullPath: 'C://Desktop/bombbroomer', content_type: 'html', contents: '', icon: './image/bombbroomer.png' },
          // "mediaplayer": { id: 'mediaplayer', name: 'Media Player.exe', type: 'app', fullPath: 'C://Desktop/mediaplayer', content_type: 'html', contents: '', icon: './image/video.png' },
          "compostbin": { id: 'compostbin', name: 'Composting Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.png' },
          // "FAQs": { id: 'FAQs', name: 'Frequently asked questions.rtf', type: 'ugc-file', fullPath: 'C://Desktop/FAQs', content_type: 'md', contents: '' },
          // "Watercolour": { id: 'watercolour', name: 'Watercolour.exe', type: 'app', fullPath: 'C://Desktop/Watercolour', content_type: 'html', contents: '', icon: './image/watercolour.png' }
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

function updateContent(windowId, newContent) {
  if (windowStates[windowId]) {
    windowStates[windowId].content = newContent;
    saveState();
  }
}

// Utility function to add a file to the file system
function addFileToFileSystem(fileName, fileContent, targetFolderPath, contentType, fileObj = null) {
  const fs = getFileSystemState();
  console.log(targetFolderPath)
  // Find the target folder
  let targetFolder;
  if (targetFolderPath === 'C://') {
    targetFolder = fs.folders['C://'];
  } else {
    // For manage_data.js context, we need to find folder differently since findFolderObjectByFullPath might not be available
    // Let's use a simple path-based approach for now
    if (targetFolderPath === 'C://Music') {
      targetFolder = fs.folders['C://'].Music;
      if (!targetFolder.contents) {
        targetFolder.contents = {};
      }
      targetFolder = targetFolder.contents;
    } else {
      console.error('Target folder not found:', targetFolderPath);
      return null;
    }
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

  // Add to target folder
  targetFolder[fileId] = newFile;

  // Save changes
  setFileSystemState(fs);
  saveState();

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

restoreFileSystemState();
