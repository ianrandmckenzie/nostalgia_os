// Main entry point for Nostalgia OS
import { storage } from './os/indexeddb_storage.js';
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
import { initializeStartMenu } from './gui/start_menu.js';
import { showSplash } from './os/splash.js';
import { restart, logout } from './os/restart.js';
import {
  createWindow,
  minimizeWindow,
  bringToFront,
  closeWindow,
  toggleFullScreen,
  showDialogBox,
  getAppIcon
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
import { openAboutWindow } from './os/about.js';
import { launchCalculator, initializeCalculatorUI } from './apps/calculator.js';
import { launchSolitaire, initializeSolitaireUI } from './apps/solitaire.js';
import { launchChess, initializeChessUI } from './apps/chess.js';
import { launchBombbroomer, initializeBombbroomerUI } from './apps/bombbroomer.js';
import { initializeLetterPad, initializeAllLetterPadEditors, applyFormatting, convertMarkdownToHTML } from './apps/letterpad.js';
import { launchMailbox } from './apps/mailbox.js';
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

export const version = '1.0';

// All scripts have been converted to ES modules!
async function loadLegacyScripts() {
  console.log('✅ All scripts have been successfully converted to ES modules');
}

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

  // LetterPad functions
  window.initializeLetterPad = initializeLetterPad;
  window.initializeAllLetterPadEditors = initializeAllLetterPadEditors;
  window.applyFormatting = applyFormatting;
  window.convertMarkdownToHTML = convertMarkdownToHTML;

  // Mailbox functions
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

window.addEventListener('click', async function (e) {
  const startMenu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
    if (!startMenu.classList.contains('hidden')) {
      const { toggleButtonActiveState } = await import('./gui/main.js');
      toggleButtonActiveState('start-button');
    }
    startMenu.classList.add('hidden');
  }
});

window.addEventListener('load', async function () {
  // Initialize app and storage first
  await initializeApp();

  // Load all legacy scripts
  await loadLegacyScripts();

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

  // Initialize start menu system (this will also restore order)
  if (typeof initializeStartMenu === 'function') {
    initializeStartMenu();
  } else {
    console.error('initializeStartMenu function not available');
  }

  document.querySelectorAll('.draggable-icon').forEach(icon => makeIconDraggable(icon));
});
