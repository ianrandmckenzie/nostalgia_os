import { storage } from './indexeddb_storage.js';
import { saveState, clearWindowStates, clearDesktopIconsState, setStartMenuOrder, setDesktopSettings } from './manage_data.js';
import { showSplash } from './splash.js';

export async function restart() {
  // Set flag to indicate this is an explicit restart
  await storage.setItem('explicitRestart', true);

  // Reset state objects for current session
  clearWindowStates();
  clearDesktopIconsState();
  setStartMenuOrder([]);
  setDesktopSettings({
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  });

  // Show splash screen
  showSplash();
}

// Logout function - similar to restart but preserves data
export async function logout() {
  // Set flag to indicate this is an explicit logout
  await storage.setItem('explicitRestart', true);

  // Save current state before showing login
  try {
    await saveState();
  } catch (error) {
    console.warn('Failed to save state before logout:', error);
  }

  // Show splash screen
  showSplash();
}

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.restart = restart;
  window.logout = logout;
}
