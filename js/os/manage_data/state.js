
export let fileSystemState = {
  folders: {
    "C://": {
      "Documents": { id: 'Documents', name: 'Documents', type: 'folder', fullPath: 'C://Documents', contents: {}},
      "Desktop": { id: 'Desktop', name: 'Desktop', type: 'folder', fullPath: 'C://Desktop', contents: {
          "compostbin": { id: 'compostbin', name: 'Compost Bin', type: 'app', fullPath: 'C://Desktop/compostbin', content_type: 'html', contents: {}, icon: './image/compost-bin.webp' }
        }
      },
      "Media": { id: 'Media', name: 'Media', type: 'folder', fullPath: 'C://Media', contents: {} },
    },
    "A://": {
      "folder-34862398": { id: 'folder-34862398', name: 'example folder', type: 'folder', fullPath: 'A://folder-34862398', contents: {}}
    },
    "D://": {}
  }
};

// Global state for windows (keyed by window id)
export let windowStates = {};
// Global state for desktop icons positions
export let desktopIconsState = {};
// Mapping for navigation windows to avoid duplicates
export let navWindows = {};
// Global desktop settings (background, clock seconds)
export let desktopSettings = {
  clockSeconds: false,
  bgColor: "#20b1b1", // Default color now set to #20b1b1
  bgImage: ""
};
// Global state for Start menu item order - will be initialized from storage
export let startMenuOrder;
/* Global mapping of file IDs to folder paths */
export let fileFolderMapping = {};

// Window management state
export let highestZ = 100;
export let activeMediaWindow = null; // ID of the active window with media

// API Overrides state to track user changes to API-sourced files
export let apiOverrides = {
  deletedSlugs: [],
  movedSlugs: {} // slug -> newFullPath
};

// Setter functions for mutable module variables
export function setStartMenuOrder(newOrder) {
  startMenuOrder = newOrder;
  if (typeof window !== 'undefined') {
    window.startMenuOrder = newOrder;
  }
}

export function setHighestZ(newValue) {
  highestZ = newValue;
  if (typeof window !== 'undefined') {
    window.highestZ = newValue;
  }
}

export function setActiveMediaWindow(newValue) {
  activeMediaWindow = newValue;
  if (typeof window !== 'undefined') {
    window.activeMediaWindow = newValue;
  }
}

export function setWindowStates(newStates) {
  Object.assign(windowStates, newStates);
  if (typeof window !== 'undefined') {
    window.windowStates = windowStates;
  }
}

export function setDesktopIconsState(newState) {
  Object.assign(desktopIconsState, newState);
  if (typeof window !== 'undefined') {
    window.desktopIconsState = desktopIconsState;
  }
}

export function setDesktopSettings(newSettings) {
  Object.assign(desktopSettings, newSettings);
  if (typeof window !== 'undefined') {
    window.desktopSettings = desktopSettings;
  }
}

export function clearWindowStates() {
  Object.keys(windowStates).forEach(key => delete windowStates[key]);
  if (typeof window !== 'undefined') {
    window.windowStates = windowStates;
  }
}

export function clearDesktopIconsState() {
  Object.keys(desktopIconsState).forEach(key => delete desktopIconsState[key]);
  if (typeof window !== 'undefined') {
    window.desktopIconsState = desktopIconsState;
  }
}

export function getFileSystemState() {
  return fileSystemState;
}

export function setFileSystemState(newState) {
  fileSystemState = newState;
  // Also expose globally for consistency
  if (typeof window !== 'undefined') {
    window.fileSystemState = newState;
  }
}

// Expose globally for consistency across modules
if (typeof window !== 'undefined') {
  window.fileSystemState = fileSystemState;
  window.windowStates = windowStates;
  window.desktopIconsState = desktopIconsState;
  window.navWindows = navWindows;
  window.desktopSettings = desktopSettings;
  window.fileFolderMapping = fileFolderMapping;
  window.highestZ = highestZ;
  window.activeMediaWindow = activeMediaWindow;
  window.getFileSystemState = getFileSystemState;
  window.setFileSystemState = setFileSystemState;
}
