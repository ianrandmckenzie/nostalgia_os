import { storage } from '../indexeddb_storage.js';
import {
  fileSystemState,
  windowStates,
  desktopIconsState,
  desktopSettings,
  navWindows,
  startMenuOrder,
  apiOverrides
} from './state.js';

// Flag to prevent saving during initialization
export let isInitializing = false;

// Make initialization flag globally accessible
if (typeof window !== 'undefined') {
  window.isInitializing = isInitializing;
}

export function setIsInitializing(value) {
    isInitializing = value;
    if (typeof window !== 'undefined') {
        window.isInitializing = value;
    }
}

export async function saveState() {
  if (isInitializing) {
    return;
  }

  // Get startMenuOrder from either global var or window object
  const currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);

  // Exclude transient dialog/prompt windows from being persisted
  const filteredWindowStates = Object.fromEntries(
    Object.entries(windowStates).filter(([id]) => !/^dialogWindow-/.test(id) && !/^promptWindow-/.test(id))
  );

  const appState = {
    fileSystemState: fileSystemState,
    windowStates: filteredWindowStates,
    desktopIconsState: desktopIconsState,
    desktopSettings: desktopSettings,
    navWindows: navWindows,
    startMenuOrder: currentStartMenuOrder,
    apiOverrides: apiOverrides
  };

  console.log('💾 Saving state. apiOverrides:', JSON.stringify(apiOverrides));

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

// Add beforeunload handler to ensure data is saved before page closes
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', async (event) => {
    try {
        // Get startMenuOrder from either global var or window object
        const currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);

        // Force immediate save using sync method to ensure it completes before unload
        const appState = {
        fileSystemState: fileSystemState,
        windowStates: windowStates,
        desktopIconsState: desktopIconsState,
        desktopSettings: desktopSettings,
        navWindows: navWindows,
        startMenuOrder: currentStartMenuOrder,
        apiOverrides: apiOverrides
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
}
