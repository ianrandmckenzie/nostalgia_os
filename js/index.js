const version = '1.0';
let oldVersion = localStorage.getItem('version');
if (!oldVersion) localStorage.setItem('version', version);
if (oldVersion !== version) {
  localStorage.removeItem('appState');
  localStorage.removeItem('splashScreen');
  localStorage.removeItem('version');
  localStorage.setItem('version', version);
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

window.addEventListener('load', function () {
  if (!localStorage.getItem("splashScreen")) {
    showSplash();
  }
  initializeAppState();
  restoreWindows();
  renderDesktopIcons(); // Render icons first
  restoreDesktopIcons(); // Then restore their positions
  restoreDesktopSettings();
  document.querySelectorAll('.draggable-icon').forEach(icon => makeIconDraggable(icon));
});
