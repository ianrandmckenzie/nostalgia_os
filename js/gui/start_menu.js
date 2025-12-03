import { loadCustomApps } from '../apps/custom_apps.js';
import { restoreStartMenuOrder, saveStartMenuOrder } from './start_menu/persistence.js';
import { initializeApiProbes } from './start_menu/api.js';
import { initializeStartMenuDragDrop, safeInitializeStartMenuDragDrop } from './start_menu/drag_drop.js';
import { addStartMenuKeyboardNavigation } from './start_menu/keyboard.js';

export { addStartMenuKeyboardNavigation };

// Initialize start menu on page load
export async function initializeStartMenu() {
  // Load custom apps first
  await loadCustomApps();

// Default start menu configuration
const DEFAULT_START_MENU_ITEMS = [
  {
    id: 'mycomp',
    text: 'My Computer',
    icon: 'image/computer.webp',
    type: 'item'
  },
  {
    id: 'mailboxapp',
    text: 'Mail Box',
    icon: 'image/mail.webp',
    type: 'item'
  },
  {
    id: 'mediaapp',
    text: 'Media Player',
    icon: 'image/video.webp',
    type: 'item'
  },
  {
    id: 'tubestreamapp',
    text: 'TubeStream',
    icon: 'image/youtube.webp',
    type: 'item'
  },
  {
    id: 'watercolourapp',
    text: 'Watercolour',
    icon: 'image/watercolour.webp',
    type: 'item'
  },
  {
    id: 'utilities-group',
    text: 'Utilities',
    type: 'group',
    items: [
      { id: 'letterpad', text: 'LetterPad', icon: 'image/file.webp' },
      { id: 'calcapp', text: 'Calculator', icon: 'image/calculator.webp' },
      { id: 'keyboard', text: 'Keyboard', icon: 'image/keyboard.webp' },
      { id: 'sysset', text: 'Desktop Settings', icon: 'image/gears.webp' },
      { id: 'storageapp', text: 'Storage Manager', icon: 'image/drive_c.webp' },
      // { id: 'osupdateapp', text: 'OS Update', icon: 'image/power.webp' },
      { id: 'abtcomp', text: 'About This Computer', icon: 'image/info.webp' }
    ]
  },
  {
    id: 'games-group',
    text: 'Games',
    type: 'group',
    items: [
      { id: 'solapp', text: 'Solitaire', icon: 'image/solitaire.webp' },
      { id: 'chessapp', text: 'Guillotine Chess', icon: 'image/guillotine_chess.webp' },
      { id: 'bombapp', text: 'Bombbroomer', icon: 'image/bombbroomer.webp' },
      { id: 'pongapp', text: 'Pong', icon: 'image/pong.webp' },
      { id: 'snakeapp', text: 'Snake', icon: 'image/snake.webp' },
      { id: 'happyturdapp', text: 'Happy Turd', icon: 'image/happyturd.webp' }
    ]
  },
  {
    id: 'rstrtcomp',
    text: 'Restart',
    icon: 'image/power.webp',
    type: 'item',
    fixed: true // This item should always be last and not draggable
  }
];
  // Generate initial menu or restore from saved state
  restoreStartMenuOrder();

  // Start API probes in background
  initializeApiProbes();

  // Add keyboard navigation
  addStartMenuKeyboardNavigation();
}

// Make initialization function available globally
window.initializeStartMenu = initializeStartMenu;
window.initializeStartMenuDragDrop = initializeStartMenuDragDrop;
window.safeInitializeStartMenuDragDrop = safeInitializeStartMenuDragDrop;
window.restoreStartMenuOrder = restoreStartMenuOrder;
window.saveStartMenuOrder = saveStartMenuOrder;

// Debug function to check current state
window.debugStartMenuState = async function() {

  // Check DOM structure
  const startMenu = document.getElementById('start-menu');
  const menuList = startMenu?.querySelector('ul');
  const currentOrder = Array.from(menuList?.children || []).map(item => {
    // Extract text excluding context menu for debug output
    const tempItem = item.cloneNode(true);
    const contextMenu = tempItem.querySelector('.start-menu-context-menu');
    if (contextMenu) {
      contextMenu.remove();
    }
    return { id: item.id, text: tempItem.textContent?.trim() };
  });

  // Check global variables
  console.log('Global startMenuOrder:', typeof startMenuOrder !== 'undefined' ? startMenuOrder : 'undefined');
  console.log('Window startMenuOrder:', window.startMenuOrder);

  // Check storage
  try {
    const appState = await storage.getItem('appState');
    console.log('Storage appState:', appState);
  } catch (error) {
    console.error('Error reading from storage:', error);
  }

  console.log('DOM Order:', currentOrder);
};

// Test function to manually save current order
window.testSaveStartMenu = function() {
  saveStartMenuOrder().catch(error => {
    console.error('Test save failed:', error);
  });
};

// Simple test to save a test array
window.testBasicSave = async function() {
  window.startMenuOrder = ['test1', 'test2', 'test3'];

  if (typeof window.saveState === 'function') {
    try {
      await window.saveState();
      console.log('Basic save completed');
    } catch (error) {
      console.error('Basic save failed:', error);
    }
  } else {
    console.error('❌ window.saveState not available');
  }
};

// Test the actual DOM-based save
window.testRealSave = async function() {
  await saveStartMenuOrder();
};

// Test restoration
window.testRestore = function() {
  restoreStartMenuOrder();
};

// Add a comprehensive test function
window.testFullStartMenuFlow = async function() {

  // Step 1: Check initial state
  await window.debugStartMenuState();

  // Step 2: Initialize start menu
  initializeStartMenu();

  // Step 3: Check state after initialization
  await window.debugStartMenuState();

  // Step 4: Save a test order
  await window.testRealSave();

  // Step 5: Test restoration
  window.testRestore();

  // Step 6: Final state check
  await window.debugStartMenuState();

};

// New comprehensive test functions for dual storage approach
window.testStartMenuSave = async function() {

  // Create a test order
  const testOrder = ['app-calculator', 'app-chess', 'app-mediaplayer'];

  // Save using our function
  // Note: saveStartMenuOrder doesn't take arguments in the new implementation, it reads from DOM
  // So we need to mock the DOM or modify the function if we want to test with arbitrary data
  // For now, we'll just log that this test might not work as expected without DOM manipulation
  console.warn('testStartMenuSave: saveStartMenuOrder reads from DOM, so passing arguments is ignored.');

  await saveStartMenuOrder();

  // Verify in direct storage
  const directResult = await storage.getItem('startMenuOrder');

  // Verify in appState
  const appStateResult = await storage.getItem('appState');

  // Verify global variables

  return {
    testOrder,
    directResult,
    appStateResult: appStateResult?.startMenuOrder,
    globalResult: typeof startMenuOrder !== 'undefined' ? startMenuOrder : null,
    windowResult: window.startMenuOrder
  };
};

window.testStartMenuRestore = async function() {

  // Clear global variables first
  if (typeof window !== 'undefined') {
    window.startMenuOrder = [];
  }
  try {
    if (typeof startMenuOrder !== 'undefined') {
      startMenuOrder = [];
    }
  } catch (e) {
    console.warn('Could not clear global startMenuOrder');
  }


  // Now restore
  await restoreStartMenuOrder();

  // Check results
  const results = {
    globalResult: typeof startMenuOrder !== 'undefined' ? startMenuOrder : null,
    windowResult: window.startMenuOrder,
    menuHTML: document.getElementById('start-menu')?.innerHTML.substring(0, 200) + '...'
  };

  return results;
};

window.debugStorageContents = async function() {

  try {
    const appState = await storage.getItem('appState');
    const directStartMenu = await storage.getItem('startMenuOrder');


    return {
      appState,
      directStartMenu,
      globalStartMenu: typeof startMenuOrder !== 'undefined' ? startMenuOrder : null,
      windowStartMenu: window.startMenuOrder
    };
  } catch (error) {
    console.error('❌ Error debugging storage:', error);
    return { error: error.message };
  }
};

// Track initialization state to prevent duplicate initialization
// This is now handled in state.js and drag_drop.js
document.addEventListener('DOMContentLoaded', () => {
  // Don't initialize immediately - wait for state restoration
});

// Also initialize when the start menu is shown (in case DOM wasn't ready)
// This function was in the original file but not exported or attached to window
function reinitializeStartMenuDragDrop() {
  initializeStartMenuDragDrop();
}
