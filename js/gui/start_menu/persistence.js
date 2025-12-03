import { generateStartMenuHTML } from './render.js';
import { safeInitializeStartMenuDragDrop } from './drag_drop.js';
import { storage } from '../../os/indexeddb_storage.js';
import { getCustomAppsForStartMenu } from '../../apps/custom_apps.js';

export async function saveStartMenuOrder() {

  // Check if we're still initializing (race condition protection)
  if (typeof window.isInitializing !== 'undefined' && window.isInitializing) {
    return;
  }

  const startMenu = document.getElementById('start-menu');
  const menuList = startMenu.querySelector('ul');
  const menuItems = Array.from(menuList.children);

  // Build the order array with item IDs and submenu structures
  const newOrder = [];

  menuItems.forEach(item => {
    if (item.id && !item.classList.contains('group') && item.id !== 'rstrtcomp') {
      // Regular item
      newOrder.push(item.id);
    } else if (item.classList.contains('group')) {
      // Group with submenu
      const groupId = item.getAttribute('data-group-id');
      const submenuContainer = item.querySelector('[data-submenu-container]');

      if (submenuContainer) {
        const submenuItems = Array.from(submenuContainer.querySelectorAll('.submenu-item'));
        const submenuOrder = submenuItems.map(subItem => subItem.id);

        newOrder.push({
          type: 'group',
          id: groupId,
          items: submenuOrder
        });
      }
    }
  });

  // Sanity check: Don't save if the new order is empty or invalid
  if (!newOrder || newOrder.length === 0) {
    console.warn('Refusing to save empty start menu order - likely a race condition');
    return;
  }


  // Update global state - ensure both global and window references are updated
  if (typeof window !== 'undefined') {
    // Always update window reference first
    window.startMenuOrder = newOrder;

    // Also update global variable if it exists
    try {
      if (typeof startMenuOrder !== 'undefined') {
        startMenuOrder = newOrder;
      }
    } catch (e) {
      // Ignore strict mode errors
    }
  }

  // Save to storage - use direct storage for start menu order
  try {
    // Save directly to storage first
    await storage.setItem('startMenuOrder', newOrder);

    // Also save to appState for consistency (but don't rely on it)
    if (typeof saveState === 'function') {
      // We don't need to explicitly pass it if saveState reads from window.startMenuOrder
      // But if saveState takes arguments or we need to update a specific part of state:
      // This depends on how saveState is implemented. Assuming it reads global state.
      await saveState();
    } else {
      // Fallback if saveState not available
      const appState = await storage.getItem('appState') || {};
      appState.startMenuOrder = newOrder;
      await storage.setItem('appState', appState);
    }

    // Verify the direct save was successful
    try {
      const saved = await storage.getItem('startMenuOrder');
      if (!saved || saved.length === 0) {
        console.warn('Verification failed: startMenuOrder is empty in storage');
      }
    } catch (verifyError) {
      console.warn('Verification error:', verifyError);
    }
  } catch (error) {
    console.error('Failed to save start menu order:', error);
  }

}

/**
 * Merge new custom apps into the saved start menu order
 * This ensures that new custom apps appear in the menu even for returning users
 */
export function mergeNewCustomAppsIntoOrder(savedOrder) {
  // Get current custom apps
  // Assuming getCustomAppsForStartMenu is globally available
  const customAppsByLocation = typeof getCustomAppsForStartMenu === 'function' ? getCustomAppsForStartMenu() : {};

  // If no saved order, return empty to use default + custom apps logic
  if (!savedOrder || savedOrder.length === 0) {
    return savedOrder;
  }

  // Create a set of all existing item IDs in the saved order
  const existingIds = new Set();
  savedOrder.forEach(item => {
    if (typeof item === 'string') {
      existingIds.add(item);
    } else if (item.type === 'group' && item.items) {
      item.items.forEach(subItem => existingIds.add(subItem));
    }
  });


  // Collect all new custom apps that aren't in the saved order
  const newCustomApps = [];

  // Check default location custom apps
  if (customAppsByLocation.default && customAppsByLocation.default.length > 0) {
    customAppsByLocation.default.forEach(app => {
      if (!existingIds.has(app.id)) {
        newCustomApps.push(app);
      }
    });
  }

  // Check custom apps in groups
  Object.keys(customAppsByLocation).forEach(location => {
    if (location === 'default') return;

    const apps = customAppsByLocation[location];
    apps.forEach(app => {
      if (!existingIds.has(app.id)) {
        // Add target location info to the app object for later placement
        app._targetLocation = location;
        newCustomApps.push(app);
      }
    });
  });

  // If no new apps, return original order
  if (newCustomApps.length === 0) {
    return savedOrder;
  }


  // Create a new order array with the new apps merged in
  const newOrder = [...savedOrder];

  // Map location names to group IDs
  const locationToGroupId = {
    'games': 'games-group',
    'utilities': 'utilities-group'
  };

  // Process each new custom app
  newCustomApps.forEach(app => {
    let inserted = false;

    // If the app has a target location/group
    if (app._targetLocation) {
      const targetGroupId = locationToGroupId[app._targetLocation.toLowerCase()];

      if (targetGroupId) {
        // Find the group in the order
        const groupIndex = newOrder.findIndex(item => typeof item === 'object' && item.id === targetGroupId);

        if (groupIndex >= 0) {
          // Add to existing group
          newOrder[groupIndex].items.push(app.id);
          inserted = true;
        }
      }
    }

    // If not inserted into a group, add as a standalone item before utilities group
    if (!inserted) {
      const utilitiesIndex = newOrder.findIndex(item => typeof item === 'object' && item.id === 'utilities-group');

      if (utilitiesIndex >= 0) {
        newOrder.splice(utilitiesIndex, 0, app.id);
      } else {
        // If utilities group not found, add before restart (last item)
        const restartIndex = newOrder.findIndex(item => item === 'rstrtcomp');
        if (restartIndex >= 0) {
          newOrder.splice(restartIndex, 0, app.id);
        } else {
          // Just append
          newOrder.push(app.id);
        }
      }
    }
  });

  return newOrder;
}

export async function restoreStartMenuOrder() {
  // First, try to load directly from storage
  let currentStartMenuOrder = [];

  try {
    const directOrder = await storage.getItem('startMenuOrder');
    if (directOrder && Array.isArray(directOrder)) {
      currentStartMenuOrder = directOrder;
    } else {
      // Fallback to appState
      const appState = await storage.getItem('appState');
      if (appState && appState.startMenuOrder) {
        currentStartMenuOrder = appState.startMenuOrder;
      }
    }
  } catch (error) {
    console.warn('⚠ Failed to load from direct storage, using global variables:', error);
    currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);
  }

  // Merge new custom apps into the saved order
  currentStartMenuOrder = mergeNewCustomAppsIntoOrder(currentStartMenuOrder);

  // Update global variables with the loaded order
  if (typeof window !== 'undefined') {
    window.startMenuOrder = currentStartMenuOrder;
  }
  try {
    if (typeof startMenuOrder !== 'undefined') {
      startMenuOrder = currentStartMenuOrder;
    }
  } catch (e) {
    // console.warn('Could not update global startMenuOrder variable');
  }

  // Always regenerate the menu (this handles both restoration and initial creation)
  generateStartMenuHTML();

  // Mark as initialized after successful restoration
  // We need to import setStartMenuInitialized from state.js but we can't easily due to circular deps if we are not careful
  // Instead, we rely on safeInitializeStartMenuDragDrop to handle initialization flag

  // Re-initialize drag and drop for the reordered items
  setTimeout(() => {
    safeInitializeStartMenuDragDrop();
  }, 50);

}
