import { storage } from '../indexeddb_storage.js';
import { API_BASE_URL, DEFAULT_FILES_PATH } from '../../config.js';
import { loadCustomApps, getCustomAppsForFileSystem } from '../../apps/custom_apps.js';
import {
  fileSystemState,
  windowStates,
  desktopIconsState,
  desktopSettings,
  navWindows,
  apiOverrides,
  startMenuOrder,
  setFileSystemState,
  setWindowStates,
  setDesktopIconsState,
  setDesktopSettings,
  setStartMenuOrder,
  getFileSystemState
} from './state.js';
import { saveState, setIsInitializing } from './persistence.js';
import {
  migrateFileSystemToUnifiedStructure,
  populateFileSystemFromFlatArray,
  repairFileSystem,
  addFileToFileSystem
} from './filesystem.js';
import { initializeRestoredApp } from './apps.js';

export async function initializeAppState() {
  setIsInitializing(true); // Prevent saves during initialization

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

  let initialData = appStateData;

  // If no stored state, try to load from JSON files
  if (!initialData) {
    // 1. Load Local Data First (to get settings, desktop icons, etc.)
    try {
        // Check for custom config
        const customConfigResponse = await fetch('custom-config.js', { method: 'HEAD' });
        const configContentType = customConfigResponse.headers.get('content-type');

        if (customConfigResponse.ok && (!configContentType || !configContentType.includes('text/html'))) {
            try {
                const customDataResponse = await fetch('custom_data/data.json');
                const dataContentType = customDataResponse.headers.get('content-type');

                if (customDataResponse.ok && (!dataContentType || !dataContentType.includes('text/html'))) {
                    initialData = await customDataResponse.json();
                }
            } catch (e) {
                console.warn('Failed to load custom_data/data.json despite custom-config.js presence', e);
            }
        }

        // If no custom data loaded, try default data
        if (!initialData) {
            try {
                const defaultDataResponse = await fetch('default_data/data.json');
                const defaultContentType = defaultDataResponse.headers.get('content-type');

                if (defaultDataResponse.ok && (!defaultContentType || !defaultContentType.includes('text/html'))) {
                    initialData = await defaultDataResponse.json();
                }
            } catch (e) {
                // Only warn if it's not a syntax error (which implies HTML response)
                if (!(e instanceof SyntaxError)) {
                    console.warn('Failed to load default_data/data.json', e);
                }
            }
        }
    } catch (e) {
        console.warn('Error checking for initial data', e);
    }
  }

  // Ensure we have a basic structure if nothing loaded
  if (!initialData) {
      initialData = { fileSystemState: { folders: { "C://": {} } } };
  }
  if (!initialData.fileSystemState) {
      initialData.fileSystemState = { folders: { "C://": {} } };
  }

  // Initialize apiOverrides from loaded data so it's available for API filtering
  if (initialData.apiOverrides) {
      Object.assign(apiOverrides, initialData.apiOverrides);
  } else {
      // Ensure initialData has the apiOverrides so it gets saved correctly later
      initialData.apiOverrides = apiOverrides;
  }

  // 2. ALWAYS Try to fetch File System from API (Overrides local file system)
  // This ensures the API is the source of truth for the data it provides
  try {
    let fileSystemData = [];
    let nextUrl = `${API_BASE_URL}${DEFAULT_FILES_PATH}`;

    // Handle potential double slash if DEFAULT_FILES_PATH starts with /
    if (API_BASE_URL.endsWith('/') && DEFAULT_FILES_PATH.startsWith('/')) {
      nextUrl = `${API_BASE_URL}${DEFAULT_FILES_PATH.substring(1)}`;
    }

    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        // If 404 or other error, break loop and fall back
        console.warn(`API fetch failed: ${response.status} ${response.statusText}`);
        break;
      }

      const json = await response.json();

      if (json.data && Array.isArray(json.data)) {
        fileSystemData = fileSystemData.concat(json.data);
      }

      // Handle pagination
      if (json.links && json.links.next) {
        const nextLink = json.links.next;
        if (nextLink.startsWith('http')) {
          nextUrl = nextLink;
        } else {
          // Construct absolute URL
          const baseUrlObj = new URL(API_BASE_URL);
          nextUrl = new URL(nextLink, baseUrlObj).toString();
        }
      } else {
        nextUrl = null;
      }
    }

    if (fileSystemData.length > 0) {
      // Ensure we are working with unified structure before merging
      initialData.fileSystemState = migrateFileSystemToUnifiedStructure(initialData.fileSystemState);

      // Merge API data into existing file system (overwriting existing items)
      populateFileSystemFromFlatArray(fileSystemData, initialData.fileSystemState);
      repairFileSystem(initialData.fileSystemState);
    }
  } catch (e) {
    console.warn('Error fetching from API, falling back to local data:', e);
  }

  // Apply migration/repair to whatever we have
  if (initialData.fileSystemState) {
       initialData.fileSystemState = migrateFileSystemToUnifiedStructure(initialData.fileSystemState);
       repairFileSystem(initialData.fileSystemState);
  }

  // Set global state
  setFileSystemState(initialData.fileSystemState || fileSystemState);
  setWindowStates(initialData.windowStates || {});
  setDesktopIconsState(initialData.desktopIconsState || {});

  // Merge stored desktop settings with defaults
  const newDesktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: "",
    ...(initialData.desktopSettings || {})
  };
  setDesktopSettings(newDesktopSettings);

  Object.assign(navWindows, initialData.navWindows || {});
  Object.assign(apiOverrides, initialData.apiOverrides || { deletedSlugs: [], movedSlugs: {} });

  // Handle start menu order
  let finalStartMenuOrder = [];
  if (initialData.startMenuOrder && Array.isArray(initialData.startMenuOrder)) {
      finalStartMenuOrder = initialData.startMenuOrder;
  } else {
      // Try direct storage fallback
      try {
          const directStartMenuOrder = await storage.getItem('startMenuOrder');
          if (directStartMenuOrder && Array.isArray(directStartMenuOrder)) {
              finalStartMenuOrder = directStartMenuOrder;
          }
      } catch (e) {}
  }
  setStartMenuOrder(finalStartMenuOrder);

  // Apply desktop settings
  if (typeof window !== 'undefined' && typeof window.applyDesktopSettings === 'function') {
    window.applyDesktopSettings();
  }

  // Update initialData with current global state before saving
  initialData.apiOverrides = apiOverrides;

  // Save the updated state (including API data)
  try {
      await storage.setItem('appState', initialData);
  } catch (error) {
      console.error('Failed to save loaded initial state:', error);
  }

  // Post-initialization tasks

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
          icon: 'image/audio.webp',
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

    // Also check if Documents folder needs to be populated
    await processSystemManifest();
  }, 100);

  // Load and add custom apps to the file system
  await integrateCustomApps();

  // Initialization complete, allow saves now
  setIsInitializing(false);
}

async function restoreFileSystemState() {
  const saved = await storage.getItem('fileSystemState');
  if (saved) {
    setFileSystemState(saved);
  }
}

export async function restoreWindows() {
  // Window states are already loaded in windowStates during initializeAppState()
  // Just need to recreate the windows from the loaded state
  if (windowStates && Object.keys(windowStates).length > 0) {
    // Remove any transient dialog windows that may have been saved previously
    Object.keys(windowStates).forEach(id => {
      if (/^dialogWindow-/.test(id) || /^promptWindow-/.test(id)) {
        delete windowStates[id];
      }
    });
    // Sort windows by z-index to restore in correct order (lowest to highest)
    const sortedWindows = Object.entries(windowStates)
      .sort(([,a], [,b]) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const [id, state] of sortedWindows) {
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
        state.color || 'white',  // Use saved color or default to white
        state.zIndex // Pass the saved z-index
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

export async function restoreDesktopIcons() {
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
      setDesktopSettings(storedState.desktopSettings);
      if (typeof window !== 'undefined' && typeof window.applyDesktopSettings === 'function') {
        window.applyDesktopSettings();
      }
    }
  }
}

// Initialize async
restoreFileSystemState().then(() => {
}).catch(console.error);

let systemUpdatePromise = null;

export async function processSystemManifest() {
  if (systemUpdatePromise) return systemUpdatePromise;

  systemUpdatePromise = (async () => {
    try {
      const response = await fetch('/api/system_manifest.json');
      if (!response.ok) throw new Error('Manifest fetch failed');
      const manifest = await response.json();

      const storedVersion = await storage.getItem('systemVersion');
      const shouldUpdate = !storedVersion || (manifest.version !== storedVersion);

      if (shouldUpdate) {
        // Process default files
        for (const fileDef of manifest.defaultFiles) {
          const fs = await getFileSystemState();
          const targetFolder = fs.folders[fileDef.targetFolder];

          // Check if file exists by name
          let existingFileId = null;
          if (targetFolder) {
             existingFileId = Object.keys(targetFolder).find(key => targetFolder[key].name === fileDef.name);
          }

          if (!existingFileId) {
             // File doesn't exist, add it
             let content = '';
             if (['md', 'txt', 'html', 'json'].includes(fileDef.contentType)) {
               try {
                 const contentRes = await fetch(fileDef.path);
                 if (contentRes.ok) content = await contentRes.text();
               } catch (e) {
                 console.warn('Failed to fetch content for', fileDef.name);
               }
             }

             const newFile = await addFileToFileSystem(
               fileDef.name,
               content,
               fileDef.targetFolder,
               fileDef.contentType,
               null,
               true // skipSave
             );

             if (newFile) {
               // Add extra properties
               if (fileDef.path && !['md', 'txt', 'html', 'json'].includes(fileDef.contentType)) {
                  newFile.path = fileDef.path;
               }
               newFile.isSystemFile = true;
               newFile.version = fileDef.version;
               if (fileDef.description) newFile.description = fileDef.description;
             }
          } else {
             // File exists, update if needed
             const fileEntry = targetFolder[existingFileId];
             if (fileEntry.isSystemFile || !fileEntry.version || fileEntry.version !== fileDef.version) {
                // Update content
                 if (['md', 'txt', 'html', 'json'].includes(fileDef.contentType)) {
                   try {
                     const contentRes = await fetch(fileDef.path);
                     if (contentRes.ok) fileEntry.contents = await contentRes.text();
                   } catch (e) {}
                 }

                 if (fileDef.path && !['md', 'txt', 'html', 'json'].includes(fileDef.contentType)) {
                    fileEntry.path = fileDef.path;
                 }
                 fileEntry.version = fileDef.version;
                 if (fileDef.description) fileEntry.description = fileDef.description;
                 fileEntry.isSystemFile = true;
             }
          }
        }

        await storage.setItem('systemVersion', manifest.version);
        await saveState();
      }
    } catch (error) {
      console.warn('System manifest processing failed:', error);
    } finally {
      // Optional: clear promise if we want to allow retries on failure,
      // but for now keeping it to prevent multiple runs in same session
      // systemUpdatePromise = null;
    }
  })();

  return systemUpdatePromise;
}

/**
 * Integrate custom apps into the file system
 * Merges custom apps from configuration with saved state, adding new apps and updating existing ones
 */
export async function integrateCustomApps() {
  try {
    // Load custom apps configuration
    await loadCustomApps();

    // Get custom apps formatted for file system
    const customAppsForFS = getCustomAppsForFileSystem();
    const validAppIds = new Set(customAppsForFS.map(app => app.id));

    // Note: We do NOT return early if customAppsForFS is empty,
    // because we need to clean up any existing custom apps that should no longer be there.

    const fs = await getFileSystemState();

    if (!fs || !fs.folders || !fs.folders['C://Desktop']) {
      console.error('❌ File system not properly initialized for custom apps');
      return;
    }

    // Get Compost Bin contents
    const compostBin = fs.folders['C://Desktop']['compostbin'];
    const compostedItems = compostBin && compostBin.contents ? compostBin.contents : {};

    // Get list of permanently deleted custom apps
    const deletedApps = fs.deletedCustomApps || [];

    // Track which apps were added or updated
    let addedCount = 0;
    let updatedCount = 0;
    let restoredCount = 0;
    let removedCount = 0;

    // 1. CLEANUP PHASE: Remove custom apps that are no longer in the loaded list
    // We need to scan all folders because custom apps might have been moved
    for (const folderPath in fs.folders) {
        const folder = fs.folders[folderPath];
        // Check items in the folder
        for (const itemId in folder) {
            const item = folder[itemId];
            // Check if it's a custom app and if it's invalid
            if (item && typeof item === 'object' && item.isCustomApp) {
                if (!validAppIds.has(item.id)) {
                    delete folder[itemId];
                    removedCount++;

                    // Close window if open
                    const win = document.getElementById(item.id);
                    if (win) {
                        win.remove();
                        const tab = document.getElementById('tab-' + item.id);
                        if (tab) tab.remove();
                    }

                    // Always remove from windowStates if it exists, regardless of whether the DOM element exists yet
                    // This ensures that restoreWindows() won't try to restore a window for a removed app
                    if (windowStates[item.id]) {
                        delete windowStates[item.id];
                    }
                }
            }
        }
    }

    // Cleanup Compost Bin
    for (const itemId in compostedItems) {
        const item = compostedItems[itemId];
        if (item && item.isCustomApp && !validAppIds.has(item.id)) {
             delete compostedItems[itemId];
             removedCount++;
        }
    }

    // Cleanup deleted apps list
    if (fs.deletedCustomApps) {
        const newDeletedApps = fs.deletedCustomApps.filter(id => validAppIds.has(id));
        if (newDeletedApps.length !== fs.deletedCustomApps.length) {
            fs.deletedCustomApps = newDeletedApps;
        }
    }

    // Add custom apps to their designated locations
    customAppsForFS.forEach(app => {
      // Extract the folder path from the app's fullPath
      const folderPath = app.fullPath.substring(0, app.fullPath.lastIndexOf('/'));
      const targetFolder = fs.folders[folderPath];

      if (targetFolder) {
        // Check if app already exists in target folder
        const existingApp = targetFolder[app.id];

        // Check if app exists in Compost Bin
        const compostedApp = compostedItems[app.id];

        // Check if app was permanently deleted
        const isDeleted = deletedApps.includes(app.id);

        if (existingApp) {
          // Update existing app (in case config changed)
          // Compare remote version (app) with local version (existingApp)
          // We check customAppData specifically as it holds the source of truth
          const remoteData = app.customAppData;
          const localData = existingApp.customAppData;

          // Deep comparison of configuration
          const hasChanges = JSON.stringify(remoteData) !== JSON.stringify(localData);

          if (hasChanges) {
            // Preserve any user-specific data if it exists, but update app configuration
            targetFolder[app.id] = { ...existingApp, ...app };
            updatedCount++;
          }
        } else if (compostedApp) {
          // App is in Compost Bin
          // Check if it is still compostable
          const isCompostable = String(app.customAppData.compostable) === 'true' || app.customAppData.compostable === true;

          // App is no longer compostable, restore it!
          if (!isCompostable) {
            // Remove from Compost Bin
            delete compostedItems[app.id];

            // Add to target folder
            targetFolder[app.id] = app;
            restoredCount++;
          } else {
            // App is still compostable, leave it in the bin
            // But we should update its definition in the bin in case other properties changed
             const remoteData = app.customAppData;
             const localData = compostedApp.customAppData;
             const hasChanges = JSON.stringify(remoteData) !== JSON.stringify(localData);

             if (hasChanges) {
                 compostedItems[app.id] = { ...compostedApp, ...app };
                 updatedCount++;
             } else {
             }
          }
        } else if (isDeleted) {
             // App was permanently deleted. Check if it should be restored (no longer compostable)
             const isCompostable = String(app.customAppData.compostable) === 'true' || app.customAppData.compostable === true;

             if (!isCompostable) {
                 // Restore it!

                 // Remove from deleted list
                 const idx = fs.deletedCustomApps.indexOf(app.id);
                 if (idx > -1) {
                     fs.deletedCustomApps.splice(idx, 1);
                 }

                 // Add to target folder
                 targetFolder[app.id] = app;
                 restoredCount++;
             } else {
             }
        } else {
          // Add new app (not in target, not in bin, not deleted)
          targetFolder[app.id] = app;
          addedCount++;
        }
      } else {
        console.error(`❌ Target folder not found in file system: ${folderPath}`);
      }
    });

    if (addedCount > 0 || updatedCount > 0 || restoredCount > 0 || removedCount > 0) {
      setFileSystemState(fs);
      await saveState();

      // Refresh UI to show changes
      if (typeof window.renderDesktopIcons === 'function') {
        window.renderDesktopIcons();
      }
      if (typeof window.restoreStartMenuOrder === 'function') {
        window.restoreStartMenuOrder();
      }
    } else {
    }

  } catch (error) {
    console.error('❌ Failed to integrate custom apps:', error);
  }
}

if (typeof window !== 'undefined') {
    window.integrateCustomApps = integrateCustomApps;
}
