const version = '1.0';

// Initialize storage-dependent code after storage is ready
async function initializeApp() {
  // Wait for storage to be ready
  await storage.ensureReady?.() || Promise.resolve();

  let oldVersion = storage.getItemSync('version');
  if (!oldVersion) storage.setItemSync('version', version);
  if (oldVersion !== version) {
    storage.removeItemSync('appState');
    storage.removeItemSync('splashScreen');
    storage.removeItemSync('version');
    storage.setItemSync('version', version);
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

/* Global mapping of file IDs to folder paths */
let fileFolderMapping = {};

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

  const splashShown = await storage.getItem("splashScreen");
  if (!splashShown) {
    showSplash();
  }

  await initializeAppState();
  await restoreWindows();
  renderDesktopIcons(); // Render icons first
  await restoreDesktopIcons(); // Then restore their positions
  document.querySelectorAll('.draggable-icon').forEach(icon => makeIconDraggable(icon));
});
