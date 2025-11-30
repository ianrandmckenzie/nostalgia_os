// Main entry point for Nostalgia OS
import { DISABLE_DEVVIT } from './config.js';
import { storage } from './os/indexeddb_storage.js';

// Set default Devvit flag
window.isDevvit = false;

// Add message listener for Devvit communication
if (!DISABLE_DEVVIT) {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'devvit-message') {
      const message = event.data.data.message;
      if (message.type === 'initialData') {
        window.isDevvit = true;
        // Store the game scores for later use
        window.devvitGameScores = message.data.gameScores;
      } else if (message.type === 'updateGameScore') {
        // Update the stored scores when Devvit sends updates
        if (window.devvitGameScores) {
          window.devvitGameScores[message.data.game] = {
            ...window.devvitGameScores[message.data.game],
            score: message.data.score
          };
        }
      }
    }
  });
}
import {
  initializeAppState,
  restoreWindows,
  windowStates,
  desktopIconsState,
  restoreDesktopIcons,
  navWindows,
  desktopSettings,
  startMenuOrder,
  fileFolderMapping,
  highestZ,
  activeMediaWindow
} from './os/manage_data.js';
import { renderDesktopIcons, makeIconDraggable } from './gui/desktop.js';
import { initializeStartMenu, addStartMenuKeyboardNavigation } from './gui/start_menu.js';
import { showSplash, showOSLoading } from './os/splash.js';
import { restart, logout } from './os/restart.js';
import {
  createWindow,
  minimizeWindow,
  bringToFront,
  closeWindow,
  toggleFullScreen,
  showDialogBox,
  getAppIcon,
  cycleWindows,
  closeActiveWindow,
  minimizeActiveWindow,
  completeCurrentWindowCycle
} from './gui/window.js';
import {
  toggleStartMenu,
  minimizeAllWindows,
  openNav,
  updateClock,
  toggleMediaPlayback,
  updateMediaControl,
  getActiveMediaElement
} from './gui/taskbar.js';
import { openApp } from './apps/main.js';
import {
  openExplorer,
  openExplorerInNewWindow,
  refreshExplorerViews,
  getExplorerWindowContent,
  getBreadcrumbsHtml,
  openFile,
  saveFileExplorerState,
  handleWatercolourImageSelection
} from './apps/file_explorer/gui.js';
import {
  normalizePath,
  getFolderIdByFullPath,
  findFolderObjectByFullPath,
  findFolderFullPathById
} from './apps/file_explorer/main.js';
import {
  showContextMenu,
  hideContextMenu,
  createNewFolder,
  createNewFile,
  refreshAllExplorerWindows
} from './apps/file_explorer/context_menu.js';
import { launchCompostBin, loadCompostBinContents, emptyCompostBin } from './apps/compost_bin.js';
import { launchStorageManager, refreshStorageData, fullSystemRestart, openCleanupWindow, makeWin95Dropdown } from './apps/storage_manager.js';
import { launchOSUpdate, refreshUpdateCheck } from './apps/os_update.js';
import { openAboutWindow } from './os/about.js';
import { launchCalculator, initializeCalculatorUI } from './apps/calculator.js';
import { launchSolitaire, initializeSolitaireUI } from './apps/solitaire.js';
import { launchChess, initializeChessUI } from './apps/chess.js';
import { launchBombbroomer, initializeBombbroomerUI } from './apps/bombbroomer.js';
import { launchHappyTurd, initializeHappyTurdUI } from './apps/happyturd.js';
import { initializeLetterPad, initializeAllLetterPadEditors, applyFormatting, convertMarkdownToHTML } from './apps/letterpad.js';
import { launchMailbox } from './apps/mailbox.js';
import { launchSnake, initializeSnakeUI } from './apps/snake.js';
// Import watercolour functions
import {
  launchWatercolour,
  initializeWatercolourUI,
  getWatercolourHTML,
  initializeWatercolour
} from './apps/watercolour/main.js';

// Import tube stream functions
import {
  launchTubeStream,
  loadPrimaryStream
} from './apps/tube_stream.js';

// Import media player functions
import {
  launchMediaPlayer,
  initializeMediaPlayerUI,
  restoreMediaPlayerSession,
  saveMediaPlayerState,
  loadMediaPlayerState,
  clearMediaPlayerState
} from './apps/mediaplayer.js';

// Pong game
import { launchPong, initializePongUI } from './apps/pong.js';

// Import router functions
import {
  initializeRouter,
  handleRoute,
  openSecurityPolicy
} from './os/router.js';
import { initializeDesktopPan } from './os/desktop_pan.js';

export const version = '1.0';

// Show loading screen immediately
showOSLoading();

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

// Make variables globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.version = version;
  window.highestZ = highestZ;
  window.activeMediaWindow = activeMediaWindow;
  window.windowStates = windowStates;
  window.desktopIconsState = desktopIconsState;
  window.navWindows = navWindows;
  window.desktopSettings = desktopSettings;
  window.startMenuOrder = startMenuOrder;
  window.fileFolderMapping = fileFolderMapping;

  // Window management functions
  window.createWindow = createWindow;
  window.minimizeWindow = minimizeWindow;
  window.bringToFront = bringToFront;
  window.closeWindow = closeWindow;
  window.toggleFullScreen = toggleFullScreen;
  window.showDialogBox = showDialogBox;
  window.getAppIcon = getAppIcon;

    // Desktop functions
  window.renderDesktopIcons = renderDesktopIcons;
  window.makeIconDraggable = makeIconDraggable;

  // Taskbar functions
  window.toggleStartMenu = toggleStartMenu;
  window.minimizeAllWindows = minimizeAllWindows;
  window.openNav = openNav;
  window.updateClock = updateClock;
  window.toggleMediaPlayback = toggleMediaPlayback;
  window.updateMediaControl = updateMediaControl;
  window.getActiveMediaElement = getActiveMediaElement;

  // App functions
  window.openApp = openApp;

  // File Explorer functions
  window.openExplorer = openExplorer;
  window.openExplorerInNewWindow = openExplorerInNewWindow;
  window.refreshExplorerViews = refreshExplorerViews;
  window.getExplorerWindowContent = getExplorerWindowContent;
  window.getBreadcrumbsHtml = getBreadcrumbsHtml;
  window.openFile = openFile;
  window.normalizePath = normalizePath;
  window.getFolderIdByFullPath = getFolderIdByFullPath;
  window.findFolderObjectByFullPath = findFolderObjectByFullPath;
  window.findFolderFullPathById = findFolderFullPathById;
  window.showContextMenu = showContextMenu;
  window.hideContextMenu = hideContextMenu;
  window.createNewFolder = createNewFolder;
  window.createNewFile = createNewFile;
  window.refreshAllExplorerWindows = refreshAllExplorerWindows;
  window.saveFileExplorerState = saveFileExplorerState;
  window.handleWatercolourImageSelection = handleWatercolourImageSelection;

  // Compost Bin functions
  window.launchCompostBin = launchCompostBin;
  window.loadCompostBinContents = loadCompostBinContents;
  window.emptyCompostBin = emptyCompostBin;

  // Storage Manager functions
  window.launchStorageManager = launchStorageManager;
  window.refreshStorageData = refreshStorageData;
  window.fullSystemRestart = fullSystemRestart;
  window.openCleanupWindow = openCleanupWindow;
  window.makeWin95Dropdown = makeWin95Dropdown;

  // OS Update functions
  window.launchOSUpdate = launchOSUpdate;
  window.refreshUpdateCheck = refreshUpdateCheck;

  // About window function
  window.openAboutWindow = openAboutWindow;

  // Game functions
  window.launchCalculator = launchCalculator;
  window.initializeCalculatorUI = initializeCalculatorUI;
  window.launchSolitaire = launchSolitaire;
  window.initializeSolitaireUI = initializeSolitaireUI;
  window.launchChess = launchChess;
  window.initializeChessUI = initializeChessUI;
  window.launchBombbroomer = launchBombbroomer;
  window.initializeBombbroomerUI = initializeBombbroomerUI;
  window.launchHappyTurd = launchHappyTurd;
  window.initializeHappyTurdUI = initializeHappyTurdUI;
  window.launchPong = launchPong;
  window.initializePongUI = initializePongUI;

  // Snake functions
  window.launchSnake = launchSnake;
  window.initializeSnakeUI = initializeSnakeUI;

  // LetterPad functions
  window.initializeLetterPad = initializeLetterPad;
  window.initializeAllLetterPadEditors = initializeAllLetterPadEditors;
  window.applyFormatting = applyFormatting;
  window.convertMarkdownToHTML = convertMarkdownToHTML;

  // Mail Box functions
  window.launchMailbox = launchMailbox;

  // Watercolour functions
  window.launchWatercolour = launchWatercolour;
  window.initializeWatercolourUI = initializeWatercolourUI;
  window.getWatercolourHTML = getWatercolourHTML;
  window.initializeWatercolour = initializeWatercolour;

  // TubeStream functions
  window.launchTubeStream = launchTubeStream;
  window.loadPrimaryStream = loadPrimaryStream;

  // Media Player functions
  window.launchMediaPlayer = launchMediaPlayer;
  window.initializeMediaPlayerUI = initializeMediaPlayerUI;
  window.restoreMediaPlayerSession = restoreMediaPlayerSession;
  window.saveMediaPlayerState = saveMediaPlayerState;
  window.loadMediaPlayerState = loadMediaPlayerState;
  window.clearMediaPlayerState = clearMediaPlayerState;

  // Router functions
  window.initializeRouter = initializeRouter;
  window.handleRoute = handleRoute;
  window.openSecurityPolicy = openSecurityPolicy;

  // Restart functions
  window.restart = restart;
  window.logout = logout;

  // Storage system
  window.storage = storage;
}

// Event listeners and main initialization
document.getElementById('desktop').addEventListener('click', function (e) {
  if (!e.target.closest('.draggable-icon')) {
    document.querySelectorAll('.draggable-icon').forEach(i => i.classList.remove('bg-gray-50'));
  }
});

// Add keyboard support for interactive elements
function setupKeyboardSupport() {
  // Media control keyboard support
  const mediaControl = document.getElementById('media-control');
  if (mediaControl) {
    mediaControl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMediaPlayback();
      }
    });
  }

  // Start button keyboard support
  const startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleStartMenu();
      }
    });
  }

  // Minimize all button keyboard support
  const minAllBtn = document.getElementById('min-all-btn');
  if (minAllBtn) {
    minAllBtn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        minimizeAllWindows();
      }
    });
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Escape key to close start menu and context menus
    if (e.key === 'Escape') {
      const startMenu = document.getElementById('start-menu');
      const contextMenu = document.getElementById('context-menu');

      if (startMenu && !startMenu.classList.contains('hidden')) {
        const startButton = document.getElementById('start-button');
        startButton.setAttribute('aria-expanded', 'false');
        startMenu.classList.add('hidden');
        startMenu.setAttribute('aria-hidden', 'true');
        const { toggleButtonActiveState } = window;
        if (toggleButtonActiveState) {
          toggleButtonActiveState('start-button');
        }
      }

      if (contextMenu && !contextMenu.classList.contains('hidden')) {
        contextMenu.classList.add('hidden');
        contextMenu.setAttribute('aria-hidden', 'true');
      }
    }
  });
}

window.addEventListener('click', async function (e) {
  const startMenu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
    if (!startMenu.classList.contains('hidden')) {
      const { toggleButtonActiveState } = await import('./gui/main.js');
      toggleButtonActiveState('start-button');
    }
    startMenu.classList.add('hidden');
    startMenu.setAttribute('aria-hidden', 'true');
    startButton.setAttribute('aria-expanded', 'false');
  }
});

window.addEventListener('load', async function () {
  // Send webViewReady message to Devvit if we're in an iframe (likely Devvit context)
  if (!DISABLE_DEVVIT && window.parent !== window) {
    window.parent.postMessage({
      type: 'webViewReady'
    }, '*');
  }

  // Initialize app and storage first
  await initializeApp();

  // Make main.js functions globally available for legacy scripts
  const { toggleButtonActiveState, makeWin95Button, makeWin95Prompt, openFileExplorerForImageSelection } = await import('./gui/main.js');
  window.toggleButtonActiveState = toggleButtonActiveState;
  window.makeWin95Button = makeWin95Button;
  window.makeWin95Prompt = makeWin95Prompt;
  window.openFileExplorerForImageSelection = openFileExplorerForImageSelection;

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
  // Initialize two-finger desktop panning (must be after windows/icons exist)
  initializeDesktopPan();

  // Initialize start menu system (this will also restore order)
  if (typeof initializeStartMenu === 'function') {
    initializeStartMenu();

    // Import and expose the focusability update function globally
    const { updateStartMenuFocusability } = await import('./gui/taskbar.js');
    window.updateStartMenuFocusability = updateStartMenuFocusability;

    // Ensure Start menu items are not focusable when hidden (accessibility fix)
    const menu = document.getElementById('start-menu');
    if (menu && menu.classList.contains('hidden')) {
      updateStartMenuFocusability(false);
    }
  } else {
    console.error('initializeStartMenu function not available');
  }

  // Initialize router for URL-based navigation
  initializeRouter();

  // Set up keyboard support for interactive elements
  setupKeyboardSupport();

  document.querySelectorAll('.draggable-icon').forEach(icon => makeIconDraggable(icon));
});

// Add to window.js - keyboard shortcuts for window management
document.addEventListener('keydown', function(e) {
  if (e.altKey) {
    switch(e.key) {
      case 'Tab':
        e.preventDefault();
        // Cycle through open windows with popup
        cycleWindows();
        break;
      case 'F4':
        e.preventDefault();
        // Close active window
        closeActiveWindow();
        break;
    }
  }

  // Handle escape key to cancel window cycling
  if (e.key === 'Escape') {
    completeCurrentWindowCycle();
  }

  // Handle Enter key to select current window
  if (e.key === 'Enter' && document.getElementById('window-cycle-popup') && !document.getElementById('window-cycle-popup').classList.contains('hidden')) {
    e.preventDefault();
    completeCurrentWindowCycle();
  }

  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case 'w':
        e.preventDefault();
        closeActiveWindow();
        break;
      case 'm':
        e.preventDefault();
        minimizeActiveWindow();
        break;
    }
  }
});

// Handle Alt key release to complete window cycling
document.addEventListener('keyup', function(e) {
  if (e.key === 'Alt') {
    const popup = document.getElementById('window-cycle-popup');
    if (popup && !popup.classList.contains('hidden')) {
      // Complete the cycle when Alt is released
      completeCurrentWindowCycle();
    }
  }
});

addStartMenuKeyboardNavigation();
