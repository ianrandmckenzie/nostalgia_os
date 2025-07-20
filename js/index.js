const isReddit = window.location.href.includes('reddit.com');
const version = '1.0';

// Initialize storage-dependent code after storage is ready
async function initializeApp() {
  // Wait for storage to be ready
  await storage.ensureReady?.() || Promise.resolve();

  let oldVersion = await storage.getItem('version');
  if (!oldVersion) {
    await storage.setItem('version', version);
  }

  if (oldVersion !== version) {
    // On version change, clear state but keep the explicit restart flag if it exists
    const explicitRestart = await storage.getItem('explicitRestart');
    await storage.removeItem('appState');
    await storage.removeItem('version');
    await storage.setItem('version', version);
    // Restore explicit restart flag if it was set
    if (explicitRestart) {
      await storage.setItem('explicitRestart', explicitRestart);
    }
  }
}
let highestZ = 100;
let activeMediaWindow = null; // ID of the active window with media
// Global state for windows (keyed by window id)
let windowStates = {};
// Global state for desktop icons positions
let desktopIconsState = {};
// Mapping for navigation windows to avoid duplicates
let navWindows = {};
// Global desktop settings (background, clock seconds)
let desktopSettings = {
  clockSeconds: false,
  bgColor: "#20b1b1", // Default color now set to #20b1b1
  bgImage: ""
};
// Global state for Start menu item order - will be initialized from storage
let startMenuOrder;

/* Global mapping of file IDs to folder paths */
let fileFolderMapping = {};

// Make variables globally available - but don't set startMenuOrder until loaded
if (typeof window !== 'undefined') {
  // Don't set window.startMenuOrder here - wait for storage load
}

document.getElementById('desktop').addEventListener('click', function (e) {
  if (!e.target.closest('.draggable-icon')) {
    document.querySelectorAll('.draggable-icon').forEach(i => i.classList.remove('bg-gray-50'));
  }
});

window.addEventListener('click', function (e) {
  const startMenu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
    if (!startMenu.classList.contains('hidden')) {
      toggleButtonActiveState('start-button');
    }
    startMenu.classList.add('hidden');
  }
});

window.addEventListener('load', async function () {
  // Initialize app and storage first
  await initializeApp();

  // Check if we have existing app state (indicates user has been here before)
  const existingAppState = await storage.getItem('appState');
  const isExplicitRestart = await storage.getItem('explicitRestart');

  // Only show splash screen if:
  // 1. No existing app state (first time visit), OR
  // 2. This is an explicit restart
  if (!existingAppState || isExplicitRestart) {
    showSplash();
    // Clear the restart flag after showing splash
    if (isExplicitRestart) {
      await storage.removeItem('explicitRestart');
    }
  }

  await initializeAppState();
  await restoreWindows();
  await renderDesktopIcons(); // Render icons first
  await restoreDesktopIcons(); // Then restore their positions

  // Initialize start menu system (this will also restore order)
  if (typeof initializeStartMenu === 'function') {
    initializeStartMenu();
  } else {
    console.error('initializeStartMenu function not available');
  }

  document.querySelectorAll('.draggable-icon').forEach(icon => makeIconDraggable(icon));
});
