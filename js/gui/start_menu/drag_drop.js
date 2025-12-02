import { generateStartMenuHTML } from './render.js';
import { handleStartMenuItemClick } from './actions.js';
import { saveStartMenuOrder } from './persistence.js';
import { dragState, isStartMenuInitialized, setStartMenuInitialized } from './state.js';

// Initialize Start menu drag and drop functionality
export function initializeStartMenuDragDrop() {
  // First, generate the start menu HTML
  generateStartMenuHTML();

  const startMenu = document.getElementById('start-menu');
  if (!startMenu) {
    console.warn('Start menu element not found');
    return false;
  }

  // Get all draggable menu items (excluding fixed items like restart)
  const mainMenuItems = startMenu.querySelectorAll('ul > li:not(.group):not(#rstrtcomp)');
  const submenuItems = startMenu.querySelectorAll('.submenu-item');


  // Make main menu items draggable
  mainMenuItems.forEach(item => {
    makeStartMenuItemDraggable(item);
  });

  // Make submenu items draggable
  submenuItems.forEach(item => {
    makeSubmenuItemDraggable(item);
  });

  // Setup drop zones
  setupStartMenuDropZones();

  return true;
}

// Safe initialization that prevents duplicates
export function safeInitializeStartMenuDragDrop() {
  if (isStartMenuInitialized) {
    return true;
  }
  const success = initializeStartMenuDragDrop();
  if (success) {
    setStartMenuInitialized(true);
  }
  return success;
}

// Setup drop zones for the start menu
export function setupStartMenuDropZones() {
  // This function sets up any additional drop zone behaviors if needed
  // For now, individual drag handlers manage their own drop logic
  const startMenu = document.getElementById('start-menu');
  if (!startMenu) return;

  // Ensure submenus stay open during drag operations
  startMenu.addEventListener('dragover', (e) => {
    const group = e.target.closest('.group');
    if (group && dragState.isDragging) {
      // Keep submenu visible during drag
      const submenu = group.querySelector('[data-submenu-container]');
      if (submenu) {
        submenu.classList.remove('hidden');
        submenu.classList.add('block');
      }
    }
  });

  // Reset submenu visibility when drag ends
  startMenu.addEventListener('dragleave', (e) => {
    if (!dragState.isDragging) {
      const submenus = startMenu.querySelectorAll('[data-submenu-container]');
      submenus.forEach(submenu => {
        submenu.classList.add('hidden');
        submenu.classList.remove('block');
      });
    }
  });

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

// Make a submenu item draggable
export function makeSubmenuItemDraggable(item) {
  const dragThreshold = 5;
  let hasMovedBeyondThreshold = false;

  item.addEventListener('pointerdown', pointerDownHandler);

  function pointerDownHandler(e) {
    if (e.button !== 0) return; // Only handle left mouse button

    dragState.startY = e.clientY;
    dragState.startX = e.clientX;
    dragState.draggedElement = item;
    dragState.draggedFromGroup = item.getAttribute('data-parent-group');
    hasMovedBeyondThreshold = false;

    // Store item data for potential group transfers
    const icon = item.querySelector('img')?.src || '';
    // Get text content excluding context menu - clone the element and remove context menu to get clean text
    const tempItem = item.cloneNode(true);
    const contextMenu = tempItem.querySelector('.start-menu-context-menu');
    if (contextMenu) {
      contextMenu.remove();
    }
    const text = tempItem.textContent.trim();
    dragState.draggedItemData = {
      id: item.id,
      text: text,
      icon: icon,
      parentGroup: dragState.draggedFromGroup
    };

    document.addEventListener('pointermove', pointerMoveHandler);
    document.addEventListener('pointerup', pointerUpHandler);
    document.addEventListener('pointercancel', pointerUpHandler);

    // Prevent default to avoid text selection
    e.preventDefault();
  }

  function pointerMoveHandler(e) {
    if (!e.isPrimary) return;

    const moveDistance = Math.sqrt(
      Math.pow(e.clientY - dragState.startY, 2) +
      Math.pow(e.clientX - dragState.startX, 2)
    );

    if (!dragState.isDragging && moveDistance > dragThreshold) {
      // Start dragging
      dragState.isDragging = true;
      hasMovedBeyondThreshold = true;
      startSubmenuDragOperation(item, e);
    }

    if (dragState.isDragging) {
      updateSubmenuDropIndicator(e);
    }
  }

  function pointerUpHandler(e) {
    if (!e.isPrimary) return;

    document.removeEventListener('pointermove', pointerMoveHandler);
    document.removeEventListener('pointerup', pointerUpHandler);
    document.removeEventListener('pointercancel', pointerUpHandler);

    if (dragState.isDragging) {
      completeSubmenuDragOperation(e);
    }

    // Reset state
    resetDragState();
    hasMovedBeyondThreshold = false;
  }
}

// Make a Start menu item draggable
export function makeStartMenuItemDraggable(item) {
  const dragThreshold = 5;
  let hasMovedBeyondThreshold = false;

  // Items already have cursor-grab and select-none classes from HTML
  item.addEventListener('pointerdown', pointerDownHandler);

  function pointerDownHandler(e) {
    if (e.button !== 0) return; // Only handle left mouse button

    dragState.startY = e.clientY;
    dragState.draggedElement = item;
    hasMovedBeyondThreshold = false;

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
      hasMovedBeyondThreshold = true;
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
    } else if (!hasMovedBeyondThreshold) {
      // It was a click, not a drag
      // handleStartMenuItemClick(item.id); // Handled by click listener
    }

    // Reset state
    resetDragState();
    hasMovedBeyondThreshold = false;
  }
}

export function resetDragState() {
  if (dragState.placeholder) {
    dragState.placeholder.remove();
  }

  // Reset any dragged element classes
  if (dragState.draggedElement) {
    dragState.draggedElement.classList.remove('opacity-50', 'cursor-grabbing');
    dragState.draggedElement.classList.add('cursor-grab');
  }

  // Hide all context menus during drag operations
  document.querySelectorAll('.start-menu-context-menu').forEach(menu => {
    menu.style.display = 'none';
    menu.classList.add('hidden');
  });

  dragState.isDragging = false;
  dragState.draggedElement = null;
  dragState.draggedFromGroup = null;
  dragState.placeholder = null;
  dragState.startY = 0;
  dragState.startX = 0;
  dragState.draggedItemData = null;
}

export function startSubmenuDragOperation(item, e) {
  // Hide all context menus when drag starts
  document.querySelectorAll('.start-menu-context-menu').forEach(menu => {
    menu.style.display = 'none';
    menu.classList.add('hidden');
  });

  // Apply visual feedback
  item.classList.add('opacity-50', 'cursor-grabbing');
  item.classList.remove('cursor-grab');

  // Create placeholder for submenu items
  dragState.placeholder = document.createElement('li');
  dragState.placeholder.className = 'submenu-placeholder h-8 bg-blue-100 border-2 border-dashed border-blue-500 rounded my-0.5 px-4 py-1';
  dragState.placeholder.innerHTML = '<span class="text-yellow-600 text-sm"></span>';

  // Insert placeholder after the dragged item
  item.parentNode.insertBefore(dragState.placeholder, item.nextSibling);
}

export function updateSubmenuDropIndicator(e) {
  if (!dragState.placeholder || !dragState.draggedItemData) return;

  const startMenu = document.getElementById('start-menu');

  // Check if we're over a submenu
  const elementUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
  const submenuContainer = elementUnderPointer?.closest('[data-submenu-container]');
  const submenuItem = elementUnderPointer?.closest('.submenu-item');
  const mainMenuItem = elementUnderPointer?.closest('ul > li:not(.group)');

  if (submenuContainer) {
    // Dragging over a submenu - find insertion point
    const targetGroupId = submenuContainer.getAttribute('data-group-id');
    const submenuItems = Array.from(submenuContainer.querySelectorAll('.submenu-item')).filter(
      item => item !== dragState.draggedElement && !item.classList.contains('submenu-placeholder')
    );

    let insertTarget = null;
    let insertBefore = true;

    // Find the closest submenu item
    for (let i = 0; i < submenuItems.length; i++) {
      const item = submenuItems[i];
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;

      if (e.clientY < itemCenter) {
        insertTarget = item;
        insertBefore = true;
        break;
      } else if (i === submenuItems.length - 1) {
        insertTarget = item;
        insertBefore = false;
      }
    }

    // Move placeholder to submenu
    if (insertTarget) {
      if (insertBefore) {
        submenuContainer.insertBefore(dragState.placeholder, insertTarget);
      } else {
        submenuContainer.insertBefore(dragState.placeholder, insertTarget.nextSibling);
      }
    } else {
      // Empty submenu or append to end
      submenuContainer.appendChild(dragState.placeholder);
    }
  } else if (mainMenuItem && !mainMenuItem.classList.contains('group')) {
    // Dragging over main menu area - convert to main menu item
    const mainMenuList = startMenu.querySelector('ul');
    const mainMenuItems = Array.from(mainMenuList.children).filter(
      item => item !== dragState.draggedElement &&
               !item.classList.contains('start-menu-placeholder') &&
               !item.classList.contains('group') &&
               item.id !== 'rstrtcomp'
    );

    // Create a different placeholder for main menu
    if (!dragState.placeholder.classList.contains('start-menu-placeholder')) {
      dragState.placeholder.className = 'start-menu-placeholder h-10 bg-indigo-100 border-2 border-dashed border-indigo-500 rounded my-0.5';
      dragState.placeholder.innerHTML = '';
    }

    let insertTarget = null;
    let insertBefore = true;

    // Find the closest menu item based on mouse Y position
    for (let i = 0; i < mainMenuItems.length; i++) {
      const item = mainMenuItems[i];
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;

      if (e.clientY < itemCenter) {
        insertTarget = item;
        insertBefore = true;
        break;
      } else if (i === mainMenuItems.length - 1) {
        insertTarget = item;
        insertBefore = false;
      }
    }

    // Move placeholder to the appropriate position
    if (insertTarget) {
      if (insertBefore) {
        mainMenuList.insertBefore(dragState.placeholder, insertTarget);
      } else {
        mainMenuList.insertBefore(dragState.placeholder, insertTarget.nextSibling);
      }
    } else {
      // Find restart item and insert before it
      const restartItem = mainMenuList.querySelector('#rstrtcomp');
      if (restartItem) {
        mainMenuList.insertBefore(dragState.placeholder, restartItem);
      }
    }
  }
}

export function completeSubmenuDragOperation(e) {
  if (!dragState.placeholder || !dragState.draggedElement || !dragState.draggedItemData) {
    return;
  }


  // Remove visual feedback
  dragState.draggedElement.classList.remove('opacity-50', 'cursor-grabbing');

  const targetContainer = dragState.placeholder.parentNode;
  const isMovingToMainMenu = targetContainer.tagName === 'UL' && !targetContainer.hasAttribute('data-submenu-container');
  const targetGroupId = targetContainer.getAttribute('data-group-id');

  if (isMovingToMainMenu) {
    // Moving from submenu to main menu

    // Remove from original submenu
    dragState.draggedElement.remove();

    // Create new main menu item
    const newMainItem = document.createElement('li');
    newMainItem.id = dragState.draggedItemData.id;
    newMainItem.className = 'px-4 py-2 hover:bg-gray-50 cursor-grab select-none flex items-center';
    newMainItem.innerHTML = `
      <img src="${dragState.draggedItemData.icon}" class="h-6 w-6 inline mr-2" alt="${dragState.draggedItemData.text}">
      ${dragState.draggedItemData.text}
    `;

    // Add click handler
    newMainItem.addEventListener('click', () => handleStartMenuItemClick(newMainItem.id));

    // Insert at placeholder position
    targetContainer.insertBefore(newMainItem, dragState.placeholder);
    dragState.placeholder.remove();

    // Make the new item draggable
    makeStartMenuItemDraggable(newMainItem);

  } else if (targetGroupId && targetGroupId !== dragState.draggedFromGroup) {
    // Moving between submenus

    // Remove from original submenu
    dragState.draggedElement.remove();

    // Create new submenu item
    const newSubmenuItem = document.createElement('li');
    newSubmenuItem.id = dragState.draggedItemData.id;
    newSubmenuItem.className = 'px-4 py-2 hover:bg-gray-50 cursor-grab select-none flex items-center submenu-item';
    newSubmenuItem.setAttribute('data-submenu-item', '');
    newSubmenuItem.setAttribute('data-parent-group', targetGroupId);
    newSubmenuItem.innerHTML = `
      <img src="${dragState.draggedItemData.icon}" class="h-6 w-6 inline mr-2" alt="${dragState.draggedItemData.text}">
      ${dragState.draggedItemData.text}
    `;

    // Add click handler
    newSubmenuItem.addEventListener('click', () => handleStartMenuItemClick(newSubmenuItem.id));

    // Insert at placeholder position
    targetContainer.insertBefore(newSubmenuItem, dragState.placeholder);
    dragState.placeholder.remove();

    // Make the new item draggable
    makeSubmenuItemDraggable(newSubmenuItem);
  } else {
    // Normal submenu reordering
    dragState.draggedElement.classList.add('cursor-grab');
    targetContainer.insertBefore(dragState.draggedElement, dragState.placeholder);
    dragState.placeholder.remove();
  }

  // Save the changes
  setTimeout(async () => {
    try {
      await saveStartMenuOrder();
    } catch (error) {
      console.error('Failed to save start menu order after drag:', error);
    }
  }, 10);
}

export function startDragOperation(item, e) {
  // Hide all context menus when drag starts
  document.querySelectorAll('.start-menu-context-menu').forEach(menu => {
    menu.style.display = 'none';
    menu.classList.add('hidden');
  });

  // Apply visual feedback
  item.classList.add('opacity-50', 'cursor-grabbing');
  item.classList.remove('cursor-grab');

  // Create placeholder with Tailwind classes
  dragState.placeholder = document.createElement('li');
  dragState.placeholder.className = 'start-menu-placeholder h-10 bg-indigo-100 border-2 border-dashed border-indigo-500 rounded my-0.5';

  // Insert placeholder after the dragged item
  item.parentNode.insertBefore(dragState.placeholder, item.nextSibling);
}

export function updateDragPosition(e) {
  // This function could be used to create a floating drag preview if desired
  // For now, we'll keep the item in place and just show the placeholder
}

export function updateDropIndicator(e) {
  if (!dragState.placeholder) return;

  const startMenu = document.getElementById('start-menu');

  // Check if we're over a submenu (for main menu items being dragged into submenus)
  const elementUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
  const submenuContainer = elementUnderPointer?.closest('[data-submenu-container]');

  if (submenuContainer && dragState.draggedElement && !dragState.draggedElement.classList.contains('submenu-item')) {
    // Main menu item being dragged over a submenu
    const targetGroupId = submenuContainer.getAttribute('data-group-id');
    const submenuItems = Array.from(submenuContainer.querySelectorAll('.submenu-item')).filter(
      item => !item.classList.contains('submenu-placeholder')
    );

    // Change placeholder style for submenu
    if (!dragState.placeholder.classList.contains('submenu-placeholder')) {
      dragState.placeholder.className = 'submenu-placeholder h-8 bg-blue-100 border-2 border-dashed border-blue-500 rounded my-0.5 px-4 py-1';
      dragState.placeholder.innerHTML = '<span class="text-yellow-600 text-sm"></span>';
    }

    let insertTarget = null;
    let insertBefore = true;

    // Find insertion point in submenu
    for (let i = 0; i < submenuItems.length; i++) {
      const item = submenuItems[i];
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;

      if (e.clientY < itemCenter) {
        insertTarget = item;
        insertBefore = true;
        break;
      } else if (i === submenuItems.length - 1) {
        insertTarget = item;
        insertBefore = false;
      }
    }

    // Move placeholder to submenu
    if (insertTarget) {
      if (insertBefore) {
        submenuContainer.insertBefore(dragState.placeholder, insertTarget);
      } else {
        submenuContainer.insertBefore(dragState.placeholder, insertTarget.nextSibling);
      }
    } else {
      // Empty submenu or append to end
      submenuContainer.appendChild(dragState.placeholder);
    }

    return;
  }

  // Default behavior for main menu area
  const menuList = startMenu.querySelector('ul');
  const menuItems = Array.from(menuList.children).filter(child =>
    child !== dragState.draggedElement &&
    !child.classList.contains('start-menu-placeholder') &&
    !child.classList.contains('group') &&
    child.id !== 'rstrtcomp'
  );

  // Ensure placeholder is styled for main menu
  if (!dragState.placeholder.classList.contains('start-menu-placeholder')) {
    dragState.placeholder.className = 'start-menu-placeholder h-10 bg-indigo-100 border-2 border-dashed border-indigo-500 rounded my-0.5';
    dragState.placeholder.innerHTML = '';
  }

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
      insertTarget = item;
      insertBefore = false;
    }
  }

  // Move placeholder to the appropriate position
  if (insertTarget) {
    if (insertBefore) {
      menuList.insertBefore(dragState.placeholder, insertTarget);
    } else {
      menuList.insertBefore(dragState.placeholder, insertTarget.nextSibling);
    }
  } else {
    // Find restart item and insert before it
    const restartItem = menuList.querySelector('#rstrtcomp');
    if (restartItem) {
      menuList.insertBefore(dragState.placeholder, restartItem);
    }
  }
}

export function completeDragOperation(e) {
  if (!dragState.placeholder || !dragState.draggedElement) {
    return;
  }

  // Remove visual feedback using Tailwind classes
  dragState.draggedElement.classList.remove('opacity-50', 'cursor-grabbing');

  const targetContainer = dragState.placeholder.parentNode;
  const isMovingToSubmenu = targetContainer.hasAttribute('data-submenu-container');
  const targetGroupId = targetContainer.getAttribute('data-group-id');

  if (isMovingToSubmenu) {
    // Moving main menu item to submenu

    // Get item data before removing - exclude context menu from text
    const tempElement = dragState.draggedElement.cloneNode(true);
    const contextMenu = tempElement.querySelector('.start-menu-context-menu');
    if (contextMenu) {
      contextMenu.remove();
    }
    const itemData = {
      id: dragState.draggedElement.id,
      text: tempElement.textContent.trim(),
      icon: dragState.draggedElement.querySelector('img')?.src || ''
    };

    // Remove from main menu
    dragState.draggedElement.remove();

    // Create new submenu item
    const newSubmenuItem = document.createElement('li');
    newSubmenuItem.id = itemData.id;
    newSubmenuItem.className = 'px-4 py-2 hover:bg-gray-50 cursor-grab select-none flex items-center submenu-item';
    newSubmenuItem.setAttribute('data-submenu-item', '');
    newSubmenuItem.setAttribute('data-parent-group', targetGroupId);
    newSubmenuItem.innerHTML = `
      <img src="${itemData.icon}" class="h-6 w-6 inline mr-2" alt="${itemData.text}">
      ${itemData.text}
    `;

    // Add click handler
    newSubmenuItem.addEventListener('click', () => handleStartMenuItemClick(newSubmenuItem.id));

    // Insert at placeholder position
    targetContainer.insertBefore(newSubmenuItem, dragState.placeholder);
    dragState.placeholder.remove();

    // Make the new item draggable
    makeSubmenuItemDraggable(newSubmenuItem);

  } else {
    // Normal main menu reordering
    dragState.draggedElement.classList.add('cursor-grab');
    targetContainer.insertBefore(dragState.draggedElement, dragState.placeholder);
    dragState.placeholder.remove();
  }


  // Add a small delay to ensure DOM is settled before saving
  setTimeout(async () => {
    try {
      await saveStartMenuOrder();
    } catch (error) {
      console.error('Failed to save start menu order after drag:', error);
    }
  }, 10);
}
