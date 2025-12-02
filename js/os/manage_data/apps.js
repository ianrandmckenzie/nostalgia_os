import { windowStates } from './state.js';
import { loadStorageData } from '../../apps/storage_manager.js';
import { initializeTubeStreamUI } from '../../apps/tube_stream.js';
import { initializeMailboxUI } from '../../apps/mailbox.js';
import { refreshUpdateCheck } from '../../apps/os_update.js';
import { getFileSystemStateSync } from '../../apps/file_explorer/storage.js';
import { isCustomApp, restoreCustomApp } from '../../apps/custom_apps.js';

// Initialize app-specific functionality for restored windows
export async function initializeRestoredApp(windowId) {
  // Add a small delay to ensure all scripts are loaded
  await new Promise(resolve => setTimeout(resolve, 50));

  // Mapping of window IDs to their initialization functions
  const appInitializers = {
    'storage-window': () => {
      // Storage Manager needs to load storage data
      if (typeof loadStorageData === 'function') {
        setTimeout(loadStorageData, 100);
      } else {
        console.warn('loadStorageData function not available for storage window restoration');
      }
    },
    'calculator': () => {
      // Calculator needs UI reconstruction
      const calcWindow = document.getElementById('calculator');
      if (calcWindow) {
        const content = calcWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          initializeCalculatorUI(calcWindow);
        } else {
        }
      }
    },
    'mediaplayer': () => {
      // Media Player needs UI reconstruction
      const playerWindow = document.getElementById('mediaplayer');
      if (playerWindow) {
        const content = playerWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          initializeMediaPlayerUI(playerWindow);
        } else {
        }
      }
    },
    'bombbroomer': () => {
      // Bombbroomer needs UI reconstruction
      const gameWindow = document.getElementById('bombbroomer');
      if (gameWindow) {
        const content = gameWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializeBombbroomerUI === 'function') {
            initializeBombbroomerUI(gameWindow);
          } else {
            console.warn('initializeBombbroomerUI function not available');
          }
        } else {
        }
      }
    },
    'solitaire': () => {
      // Solitaire needs UI reconstruction
      const gameWindow = document.getElementById('solitaire');
      if (gameWindow) {
        const content = gameWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          initializeSolitaireUI(gameWindow);
        } else {
        }
      }
    },
    'chess': () => {
      // Chess needs UI reconstruction
      const chessWindow = document.getElementById('chess');
      if (chessWindow) {
        const content = chessWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializeChessUI === 'function') {
            initializeChessUI(chessWindow);
          } else {
            console.warn('initializeChessUI function not available');
          }
        } else {
        }
      }
    },
    'compost-bin': () => {
      // Compost Bin needs to be reinitialized completely
      const compostWindow = document.getElementById('compost-bin');
      if (compostWindow) {
        const content = compostWindow.querySelector('.p-2');

        if (content && needsReinitialization(content)) {
          // Clear existing content and reinitialize the Compost Bin
          content.innerHTML = '';
          content.className = 'p-2 bg-gray-100 h-full flex flex-col';

          // Create the compost bin interface
          const binContainer = document.createElement('div');
          binContainer.className = 'h-full flex flex-col';

          // Header with bin info
          const header = document.createElement('div');
          header.className = 'bg-gray-200 border-b border-gray-400 p-2 flex justify-between items-center';

          const binInfo = document.createElement('div');
          binInfo.className = 'text-sm';
          const fs = getFileSystemStateSync();

          // Use unified structure: look for compost bin in fs.folders['C://Desktop']
          const desktopItems = fs.folders['C://Desktop'] || {};
          const compostBin = desktopItems['compostbin'];
          const itemCount = Object.keys(compostBin?.contents || {}).length;
          binInfo.textContent = `Compost Bin - ${itemCount} item(s)`;

          const binActions = document.createElement('div');
          binActions.className = 'flex space-x-2';

          const emptyBinBtn = document.createElement('button');
          emptyBinBtn.className = 'px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs';
          emptyBinBtn.textContent = 'Empty Bin';
          if (typeof emptyCompostBin === 'function') {
            emptyBinBtn.addEventListener('click', emptyCompostBin);
          }

          binActions.appendChild(emptyBinBtn);
          header.appendChild(binInfo);
          header.appendChild(binActions);

          // Content area
          const contentArea = document.createElement('div');
          contentArea.className = 'flex-1 bg-white border border-gray-400 p-2 overflow-auto';
          contentArea.id = 'compost-bin-content';

          // Load compost bin contents
          if (typeof loadCompostBinContents === 'function') {
            loadCompostBinContents(contentArea);
          } else {
            console.warn('🗑️ loadCompostBinContents function not available');
          }

          binContainer.appendChild(header);
          binContainer.appendChild(contentArea);
          content.appendChild(binContainer);
        } else {
          // Content exists, just try to reload the contents
          const contentArea = compostWindow.querySelector('#compost-bin-content');
          if (contentArea && typeof loadCompostBinContents === 'function') {
            loadCompostBinContents(contentArea);
            if (typeof updateCompostBinHeader === 'function') {
              updateCompostBinHeader(compostWindow);
            }
          } else {
            console.warn('Compost bin content area not found or loadCompostBinContents not available');
          }
        }
      } else {
        console.warn('🗑️ Compost bin window not found during restoration');
      }
    },
    'snake': () => {
      const snakeWindow = document.getElementById('snake');
      if (snakeWindow) {
        const content = snakeWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializeSnakeUI === 'function') {
            initializeSnakeUI(snakeWindow);
          } else {
            console.warn('initializeSnakeUI function not available for restoration');
          }
        }
      }
    },
    'pong': () => {
      const pongWindow = document.getElementById('pong');
      if (pongWindow) {
        const content = pongWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializePongUI === 'function') {
            initializePongUI(pongWindow);
          } else {
            console.warn('initializePongUI function not available for restoration');
          }
        }
      }
    },
    'happyturd': () => {
      const htWindow = document.getElementById('happyturd');
      if (htWindow) {
        const content = htWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          if (typeof initializeHappyTurdUI === 'function') {
            initializeHappyTurdUI(htWindow);
          } else {
            console.warn('initializeHappyTurdUI function not available for restoration');
          }
        }
      }
    },
    'watercolour': () => {
      // Watercolour needs UI reconstruction
      const watercolourWindow = document.getElementById('watercolour');
      if (watercolourWindow) {
        const content = watercolourWindow.querySelector('.p-2');
        if (needsReinitialization(content)) {
          initializeWatercolourUI(watercolourWindow);
        } else {
          // Even if content exists, we need to ensure event handlers and global functions are set up
          if (typeof initializeWatercolour === 'function') {
            initializeWatercolour();
          } else {
            // If initializeWatercolour is not available, call initializeWatercolourUI to load it
            initializeWatercolourUI(watercolourWindow);
          }
        }
      }
    },
    'keyboard-app': () => {
      // Rebuild keyboard app UI after restore
      const kbWindow = document.getElementById('keyboard-app');
      if (kbWindow) {
        if (typeof window.initializeKeyboardApp === 'function') {
          window.initializeKeyboardApp('keyboard-app');
        } else {
          console.warn('initializeKeyboardApp function not available for keyboard-app restoration');
        }
      }
    },
    'tubestream': () => {
      // TubeStream needs its interface initialized
      const win = document.getElementById('tubestream');
      if (win && typeof initializeTubeStreamUI === 'function') {
        initializeTubeStreamUI(win);
      }
    },
    'mailbox': () => {
      const win = document.getElementById('mailbox');
      if (win && typeof initializeMailboxUI === 'function') {
        initializeMailboxUI(win);
      }
    },
    'os-update-window': () => {
      if (typeof refreshUpdateCheck === 'function') {
        refreshUpdateCheck();
      }
    },
    'explorer-window': () => {
      // File Explorer needs to restore its current path
      const explorerWindow = document.getElementById('explorer-window');
      if (explorerWindow) {
        if (typeof initializeFileExplorerUI === 'function') {
          initializeFileExplorerUI(explorerWindow);
        } else {
          if (typeof restoreFileExplorerState === 'function') {
            setTimeout(restoreFileExplorerState, 100);
          }
        }
      }
    }
  };

  // Call the appropriate initializer if it exists
  if (appInitializers[windowId]) {
    try {
      appInitializers[windowId]();
    } catch (error) {
      console.warn(`Failed to initialize restored app ${windowId}:`, error);
    }
  } else if (isCustomApp(windowId)) {
    // Handle custom apps restoration
    try {
      await restoreCustomApp(windowId);
    } catch (error) {
      console.warn(`Failed to restore custom app ${windowId}:`, error);
    }
  } else {
    // Check if this is a file window that might contain a LetterPad editor
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
      const letterpadEditor = windowElement.querySelector('.letterpad_editor');
      if (letterpadEditor) {
        try {
          if (typeof initializeLetterPad === 'function') {
            await initializeLetterPad(letterpadEditor);
          } else {
            console.warn('initializeLetterPad function not available');
          }
        } catch (error) {
          console.warn(`Failed to initialize LetterPad editor in window ${windowId}:`, error);
        }
      }
    }
  }
}

// Helper function to check if app content needs reinitialization
export function needsReinitialization(content) {
  if (!content) return true;

  const html = content.innerHTML.trim();

  // Empty content
  if (!html) return true;

  // Only whitespace or basic structure
  if (html.length < 50 && !html.includes('button') && !html.includes('canvas') && !html.includes('input')) {
    return true;
  }

  // Check for specific app indicators that suggest proper initialization
  if (content.querySelector('button, canvas, input[type="text"], .game-board, #media-container, #game-grid, #calc-display, #compost-bin-content')) {
    return false; // Has proper app elements
  }

  return true; // Needs reinitialization
}

// Helper function to reinitialize app content in existing window
export function reinitializeApp(windowId, launchFunction) {
  if (typeof launchFunction !== 'function') {
    console.warn(`Launch function not available for ${windowId}`);
    return;
  }

  const existingWindow = document.getElementById(windowId);
  if (!existingWindow) {
    console.warn(`Window ${windowId} not found for reinitialization`);
    return;
  }

  try {
    // Temporarily change the window ID to avoid conflicts
    const tempId = windowId + '-temp-' + Date.now();
    existingWindow.id = tempId;

    // Call the launch function - it will create a new window
    launchFunction();

    // Get the newly created window
    const newWindow = document.getElementById(windowId);
    if (newWindow && newWindow !== existingWindow) {
      // Copy the content from new window to existing window
      const existingContent = existingWindow.querySelector('.p-2');
      const newContent = newWindow.querySelector('.p-2');

      if (existingContent && newContent) {
        existingContent.innerHTML = newContent.innerHTML;
        existingContent.className = newContent.className;
      }

      // Remove the new window and its tab
      newWindow.remove();
      const newTab = document.getElementById('tab-' + windowId);
      if (newTab) newTab.remove();

      // Remove the entry from windowStates that was created by the new window
      delete windowStates[windowId];
    }

    // Restore the original window ID
    existingWindow.id = windowId;

  } catch (error) {
    // Restore window ID if something went wrong
    if (existingWindow && existingWindow.id !== windowId) {
      existingWindow.id = windowId;
    }
    console.error(`Failed to reinitialize ${windowId}:`, error);
  }
}
