// Start Menu Drag and Drop Functionality

// Global drag state
let dragState = {
  isDragging: false,
  draggedElement: null,
  placeholder: null,
  startY: 0
};

// Initialize Start menu drag and drop functionality
function initializeStartMenuDragDrop() {
  const startMenu = document.getElementById('start-menu');
  if (!startMenu) {
    console.warn('Start menu element not found');
    return false;
  }

  // Get all draggable menu items (excluding submenu items and the restart item)
  const menuItems = startMenu.querySelectorAll('ul > li:not(.group):not(#rstrtcomp)');

  if (menuItems.length === 0) {
    console.warn('No draggable menu items found');
    return false;
  }

  menuItems.forEach(item => {
    makeStartMenuItemDraggable(item);
  });

  // Setup drop zone for the main menu container
  setupStartMenuDropZone();
  return true;
}

// Make a Start menu item draggable
function makeStartMenuItemDraggable(item) {
  const dragThreshold = 5;

  // Items already have cursor-grab and select-none classes from HTML
  item.addEventListener('pointerdown', pointerDownHandler);

  function pointerDownHandler(e) {
    if (e.button !== 0) return; // Only handle left mouse button

    dragState.startY = e.clientY;
    dragState.draggedElement = item;

    document.addEventListener('pointermove', pointerMoveHandler);
    document.addEventListener('pointerup', pointerUpHandler);
    document.addEventListener('pointercancel', pointerUpHandler);

    // Prevent default to avoid text selection
    e.preventDefault();
  }

  function pointerMoveHandler(e) {
    if (!e.isPrimary) return;

    const moveDistance = Math.abs(e.clientY - dragState.startY);

    if (!dragState.isDragging && moveDistance > dragThreshold) {
      // Start dragging
      dragState.isDragging = true;
      startDragOperation(item, e);
    }

    if (dragState.isDragging) {
      updateDragPosition(e);
      updateDropIndicator(e);
    }
  }

  function pointerUpHandler(e) {
    if (!e.isPrimary) return;

    document.removeEventListener('pointermove', pointerMoveHandler);
    document.removeEventListener('pointerup', pointerUpHandler);
    document.removeEventListener('pointercancel', pointerUpHandler);

    if (dragState.isDragging) {
      completeDragOperation(e);
    }

    // Reset state
    resetDragState();
  }
}

function resetDragState() {
  if (dragState.placeholder) {
    dragState.placeholder.remove();
  }

  // Reset any dragged element classes
  if (dragState.draggedElement) {
    dragState.draggedElement.classList.remove('opacity-50', 'cursor-grabbing');
    dragState.draggedElement.classList.add('cursor-grab');
  }

  dragState.isDragging = false;
  dragState.draggedElement = null;
  dragState.placeholder = null;
  dragState.startY = 0;
}

function startDragOperation(item, e) {
  // Apply Tailwind classes for visual feedback
  item.classList.add('opacity-50', 'cursor-grabbing');
  item.classList.remove('cursor-grab');

  // Create placeholder with Tailwind classes
  dragState.placeholder = document.createElement('li');
  dragState.placeholder.className = 'start-menu-placeholder h-10 bg-indigo-100 border-2 border-dashed border-indigo-500 rounded my-0.5';

  // Insert placeholder after the dragged item
  item.parentNode.insertBefore(dragState.placeholder, item.nextSibling);
}

function updateDragPosition(e) {
  // This function could be used to create a floating drag preview if desired
  // For now, we'll keep the item in place and just show the placeholder
}

function updateDropIndicator(e) {
  if (!dragState.placeholder) return;

  const startMenu = document.getElementById('start-menu');
  const menuList = startMenu.querySelector('ul');
  const menuItems = Array.from(menuList.children).filter(child =>
    child !== dragState.draggedElement &&
    !child.classList.contains('start-menu-placeholder') &&
    !child.classList.contains('group') &&
    child.id !== 'rstrtcomp'
  );

  let insertTarget = null;
  let insertBefore = true;

  // Find the closest menu item based on mouse Y position
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;

    if (e.clientY < itemCenter) {
      insertTarget = item;
      insertBefore = true;
      break;
    } else if (i === menuItems.length - 1) {
      // After the last item
      insertTarget = item;
      insertBefore = false;
      break;
    }
  }

  // Move placeholder to the appropriate position
  if (insertTarget) {
    if (insertBefore) {
      menuList.insertBefore(dragState.placeholder, insertTarget);
    } else {
      menuList.insertBefore(dragState.placeholder, insertTarget.nextSibling);
    }
  }
}

function completeDragOperation(e) {
  if (!dragState.placeholder || !dragState.draggedElement) {
    return;
  }


  // Remove visual feedback using Tailwind classes
  dragState.draggedElement.classList.remove('opacity-50', 'cursor-grabbing');
  dragState.draggedElement.classList.add('cursor-grab');

  // Move the item to the placeholder position
  dragState.placeholder.parentNode.insertBefore(dragState.draggedElement, dragState.placeholder);
  dragState.placeholder.remove();

  // Save the new order (async)
  saveStartMenuOrder().catch(error => {
    console.error('Failed to save start menu order:', error);
  });
}

async function saveStartMenuOrder() {

  // Check if we're still initializing (race condition protection)
  if (typeof window.isInitializing !== 'undefined' && window.isInitializing) {
    return;
  }

  const startMenu = document.getElementById('start-menu');
  const menuList = startMenu.querySelector('ul');
  const menuItems = Array.from(menuList.children);

  // Build the order array with item IDs
  const newOrder = [];

  menuItems.forEach(item => {
    if (item.id && !item.classList.contains('group') && item.id !== 'rstrtcomp') {
      newOrder.push(item.id);
    } else if (item.classList.contains('group')) {
      // Handle submenu groups
      const trigger = item.querySelector('[data-submenu-trigger]');
      if (trigger) {
        const groupName = trigger.textContent.trim();
        newOrder.push({ type: 'group', name: groupName, element: item.outerHTML });
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
      if (typeof startMenuOrder !== 'undefined' || window.startMenuOrder) {
        startMenuOrder = newOrder;
      }
    } catch (e) {
      // In case of reference error, the global variable doesn't exist
      console.warn('Global startMenuOrder variable not accessible, using window reference only');
    }
  }


  // Save to storage
  try {
    if (typeof saveState === 'function') {
      await saveState();
    } else if (typeof window.saveState === 'function') {
      await window.saveState();
    } else {
      console.error('saveState function not available!');
      return; // Exit early if saveState is not available
    }
  } catch (error) {
    console.error('Failed to save start menu order:', error);
  }

}

function restoreStartMenuOrder() {
  // Get startMenuOrder from either global var or window object
  const currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);


  if (!currentStartMenuOrder || currentStartMenuOrder.length === 0) {
    return;
  }

  const startMenu = document.getElementById('start-menu');
  if (!startMenu) {
    console.warn('Start menu element not found during restoration');
    return;
  }

  const menuList = startMenu.querySelector('ul');
  if (!menuList) {
    console.warn('Menu list not found during restoration');
    return;
  }

  // Get current menu items
  const currentItems = Array.from(menuList.children);

  const itemsMap = new Map();

  // Create a map of current items by ID or type
  currentItems.forEach(item => {
    if (item.id && !item.classList.contains('group') && item.id !== 'rstrtcomp') {
      itemsMap.set(item.id, item);
    } else if (item.classList.contains('group')) {
      const trigger = item.querySelector('[data-submenu-trigger]');
      if (trigger) {
        const groupName = trigger.textContent.trim();
        itemsMap.set(`group-${groupName}`, item);
      }
    }
  });

  // Clear the menu list
  menuList.innerHTML = '';

  // Rebuild in the saved order
  currentStartMenuOrder.forEach(orderItem => {
    if (typeof orderItem === 'string') {
      // Simple menu item
      const item = itemsMap.get(orderItem);
      if (item) {
        menuList.appendChild(item);
        itemsMap.delete(orderItem);
      }
    } else if (orderItem && orderItem.type === 'group') {
      // Group item
      const item = itemsMap.get(`group-${orderItem.name}`);
      if (item) {
        menuList.appendChild(item);
        itemsMap.delete(`group-${orderItem.name}`);
      }
    }
  });

  // Add any remaining items that weren't in the saved order
  itemsMap.forEach(item => {
    if (item.id !== 'rstrtcomp') {
      menuList.appendChild(item);
    }
  });

  // Always add restart at the end
  const restartItem = currentItems.find(item => item.id === 'rstrtcomp');
  if (restartItem) {
    menuList.appendChild(restartItem);
  }


  // Mark as initialized after successful restoration
  isStartMenuInitialized = false; // Reset so we can re-initialize with new order

  // Re-initialize drag and drop for the reordered items
  setTimeout(() => {
    safeInitializeStartMenuDragDrop();
  }, 50);
}

function setupStartMenuDropZone() {
  const startMenu = document.getElementById('start-menu');
  if (!startMenu) return;

  // Add visual feedback during drag operations using Tailwind classes
  startMenu.addEventListener('dragover', (e) => {
    e.preventDefault();
    startMenu.classList.add('bg-indigo-50');
  });

  startMenu.addEventListener('dragleave', (e) => {
    if (!startMenu.contains(e.relatedTarget)) {
      startMenu.classList.remove('bg-indigo-50');
    }
  });

  startMenu.addEventListener('drop', (e) => {
    e.preventDefault();
    startMenu.classList.remove('bg-indigo-50');
  });
}

// Track initialization state to prevent duplicate initialization
let isStartMenuInitialized = false;

// Initialize when the DOM is ready, but only if not already initialized
document.addEventListener('DOMContentLoaded', () => {
  // Don't initialize immediately - wait for state restoration
});

// Also initialize when the start menu is shown (in case DOM wasn't ready)
function reinitializeStartMenuDragDrop() {
  initializeStartMenuDragDrop();
}

// Safe initialization that prevents duplicates
function safeInitializeStartMenuDragDrop() {
  if (isStartMenuInitialized) {
    return true;
  }
  const success = initializeStartMenuDragDrop();
  if (success) {
    isStartMenuInitialized = true;
  }
  return success;
}

// Export functions for global use
window.initializeStartMenuDragDrop = initializeStartMenuDragDrop;
window.safeInitializeStartMenuDragDrop = safeInitializeStartMenuDragDrop;
window.restoreStartMenuOrder = restoreStartMenuOrder;
window.saveStartMenuOrder = saveStartMenuOrder;

// Debug function to check current state
window.debugStartMenuState = async function() {

  try {
    const appState = await storage.getItem('appState');
  } catch (error) {
    console.error('Error reading from storage:', error);
  }

  const startMenu = document.getElementById('start-menu');
  const menuList = startMenu?.querySelector('ul');
  const currentOrder = Array.from(menuList?.children || []).map(item => item.id || item.className);
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

      // Test reading it back
      const appState = await storage.getItem('appState');
    } catch (error) {
      console.error('Basic save failed:', error);
    }
  } else {
    console.error('window.saveState not available');
  }
};
