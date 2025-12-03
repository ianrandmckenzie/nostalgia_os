import { generateStartMenuHTML } from './render.js';
import { safeInitializeStartMenuDragDrop } from './drag_drop.js';
import { saveStartMenuOrder } from './persistence.js';
import { isCustomApp } from '../../apps/custom_apps.js'; // Assuming this export exists or is global. If global, remove import.
import { getFileSystemState, setFileSystemState, saveState } from '../../os/manage_data.js';
import { storage } from '../../os/indexeddb_storage.js';

// Handle start menu item clicks
export function handleStartMenuItemClick(itemId) {
  console.log('🔍 Start menu item clicked:', itemId);

  // Don't handle click if context menu is visible
  // This check is usually done in the event listener, but good to have here too

  // Close the start menu first
  if (typeof toggleStartMenu === 'function') {
    toggleStartMenu();
  } else {
    // Fallback to manually closing the menu
    const menu = document.getElementById('start-menu');
    if (menu) {
      menu.classList.add('hidden');
      menu.setAttribute('aria-hidden', 'true');

      // Update focusability when manually closing menu
      if (typeof window.updateStartMenuFocusability === 'function') {
        window.updateStartMenuFocusability(false);
      }

      const startButton = document.getElementById('start-button');
      if (startButton) {
        startButton.setAttribute('aria-expanded', 'false');
      }
    }
  }

  // Check if it's a custom app first
  // Assuming isCustomApp is global or imported
  if (typeof isCustomApp === 'function' && isCustomApp(itemId)) {
    if (typeof openApp === 'function') openApp(itemId);
    return;
  } else if (typeof window.isCustomApp === 'function' && window.isCustomApp(itemId)) {
     if (typeof openApp === 'function') openApp(itemId);
     return;
  }

  // Handle different item types
  switch (itemId) {
    case 'mycomp':
      if (typeof openExplorer === 'function') openExplorer();
      break;
    case 'abtcomp':
      if (typeof openAboutWindow === 'function') openAboutWindow();
      break;
    case 'sysset':
      if (typeof openNav === 'function') openNav();
      break;
    case 'storageapp':
      if (typeof openApp === 'function') openApp('storage_manager');
      break;
    case 'mailboxapp':
      if (typeof openApp === 'function') openApp('mailbox');
      break;
    // case 'mailapp':
    //   if (typeof launchMailbox === 'function') launchMailbox();
    //   break;
    case 'watercolourapp':
      if (typeof openApp === 'function') openApp('watercolour');
      break;
    case 'letterpad':
      if (typeof createNewFile === 'function') {
        createNewFile('txt');
        if (typeof openApp === 'function') openApp('letterpad');
      }
      break;
    case 'calcapp':
      if (typeof openApp === 'function') openApp('calculator');
      break;
    case 'keyboard':
      console.log('🔍 Keyboard case triggered, calling openApp');
      if (typeof openApp === 'function') openApp('keyboard');
      break;
    case 'solapp':
      if (typeof openApp === 'function') openApp('solitaire');
      break;
    case 'chessapp':
      if (typeof openApp === 'function') openApp('chess');
      break;
    case 'bombapp':
      if (typeof openApp === 'function') openApp('bombbroomer');
      break;
    case 'pongapp':
      if (typeof openApp === 'function') openApp('pong');
      break;
    case 'snakeapp':
      if (typeof openApp === 'function') openApp('snake');
      break;
    case 'happyturdapp':
      if (typeof openApp === 'function') openApp('happyturd');
      break;
    case 'mediaapp':
      if (typeof openApp === 'function') openApp('mediaplayer');
      break;
    case 'tubestreamapp':
      if (typeof openApp === 'function') openApp('tube_stream');
      break;
    case 'rstrtcomp':
      if (typeof restart === 'function') restart();
      break;
    default:
      console.warn('Unknown start menu item clicked:', itemId);
  }
}

// Create desktop shortcut
export async function createDesktopShortcut(itemData) {
  try {
    // Get the file system state
    const fs = await getFileSystemState();
    if (!fs.folders['C://Desktop']) {
      console.error('Desktop folder not found');
      if (typeof showDialogBox === 'function') {
        showDialogBox('Desktop folder not found', 'error');
      }
      return;
    }

    // Create a unique ID for the shortcut
    const shortcutId = `shortcut-${itemData.id}-${Date.now()}`;

    // Determine the appropriate icon
    let shortcutIcon = itemData.icon || 'image/file.webp';

    // Create the desktop shortcut item
    const shortcutItem = {
      id: shortcutId,
      name: itemData.text,
      type: 'app', // Desktop shortcuts are treated as apps
      fullPath: `C://Desktop/${shortcutId}`,
      content_type: 'html',
      contents: {},
      icon: shortcutIcon,
      isShortcut: true,
      targetId: itemData.id // Reference to the original item
    };

    // Add to desktop folder in unified structure
    fs.folders['C://Desktop'][shortcutId] = shortcutItem;

    // Save the updated file system
    await setFileSystemState(fs);
    await saveState();

    // Refresh desktop icons
    if (typeof renderDesktopIcons === 'function') {
      renderDesktopIcons();
    } else if (typeof window.renderDesktopIcons === 'function') {
      window.renderDesktopIcons();
    }


  } catch (error) {
    console.error('❌ Failed to create desktop shortcut:', error);
    if (typeof showDialogBox === 'function') {
      showDialogBox('Failed to create desktop shortcut', 'error');
    }
  }
}

// Confirm uninstall action
export function confirmUninstall(itemData, isSubmenuItem, parentGroupId) {
  const confirmMessage = `Are you sure you want to uninstall "${itemData.text}" from the Start menu?`;

  if (typeof showDialogBox === 'function') {
    // Use themed dialog box with confirmation
    showDialogBox(
      confirmMessage,
      'confirmation',
      () => {
        // Confirmed - proceed with uninstall
        performUninstall(itemData, isSubmenuItem, parentGroupId);
      },
      () => {
        // Cancelled - do nothing
      }
    );
  } else {
    // Fallback to browser confirm
    if (confirm(confirmMessage)) {
      performUninstall(itemData, isSubmenuItem, parentGroupId);
    }
  }
}

export async function performUninstall(itemData, isSubmenuItem, parentGroupId) {
  try {

    // Get current start menu order
    let currentOrder = [];
    try {
      const directOrder = await storage.getItem('startMenuOrder');
      if (directOrder && Array.isArray(directOrder)) {
        currentOrder = directOrder;
      } else {
        currentOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);
      }
    } catch (error) {
      currentOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);
    }

    if (isSubmenuItem && parentGroupId) {
      // Remove from submenu
      const newOrder = currentOrder.map(orderItem => {
        if (typeof orderItem === 'object' && orderItem.id === parentGroupId) {
          return {
            ...orderItem,
            items: orderItem.items.filter(id => id !== itemData.id)
          };
        }
        return orderItem;
      });

      // Update global state
      window.startMenuOrder = newOrder;
      if (typeof startMenuOrder !== 'undefined') {
        startMenuOrder = newOrder;
      }

      // Save to storage
      await storage.setItem('startMenuOrder', newOrder);

    } else {
      // Remove from main menu
      const newOrder = currentOrder.filter(orderItem => {
        if (typeof orderItem === 'string') {
          return orderItem !== itemData.id;
        }
        return true;
      });

      // Update global state
      window.startMenuOrder = newOrder;
      if (typeof startMenuOrder !== 'undefined') {
        startMenuOrder = newOrder;
      }

      // Save to storage
      await storage.setItem('startMenuOrder', newOrder);
    }

    // Also save to appState
    if (typeof saveState === 'function') {
      await saveState();
    }

    // Regenerate start menu
    generateStartMenuHTML();

    // Re-initialize drag and drop
    setTimeout(() => {
      safeInitializeStartMenuDragDrop();
    }, 50);

    if (typeof showDialogBox === 'function') {
      showDialogBox(`"${itemData.id}" has been uninstalled from the Start menu`, 'info');
    }


  } catch (error) {
    console.error('❌ Failed to uninstall item:', error);
    if (typeof showDialogBox === 'function') {
      showDialogBox('Failed to uninstall item', 'error');
    }
  }
}

// Handle context menu actions
export function handleContextMenuAction(action, itemData, isSubmenuItem, parentGroupId) {
  switch (action) {
    case 'open':
      handleStartMenuItemClick(itemData.id);
      break;

    case 'shortcut':
      createDesktopShortcut(itemData);
      // Close start menu after action using proper toggle function
      if (typeof toggleStartMenu === 'function') {
        toggleStartMenu();
      } else {
        const menu = document.getElementById('start-menu');
        if (menu) menu.classList.add('hidden');
      }
      break;

    case 'uninstall':
      confirmUninstall(itemData, isSubmenuItem, parentGroupId);
      // Close start menu after action using proper toggle function
      if (typeof toggleStartMenu === 'function') {
        toggleStartMenu();
      } else {
        const menu = document.getElementById('start-menu');
        if (menu) menu.classList.add('hidden');
      }
      break;
  }
}
