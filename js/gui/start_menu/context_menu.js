import { handleContextMenuAction, handleStartMenuItemClick, createDesktopShortcut, confirmUninstall } from './actions.js';
import { dragState } from './state.js';

// Setup context menu for start menu items
export function setupContextMenu(menuItem, itemData, isSubmenuItem = false, parentGroupId = null) {
  let contextMenuTimer;
  let isContextMenuVisible = false;

  // Define items that cannot be uninstalled
  const protectedItems = ['mycomp', 'storageapp', 'sysset'];
  const canUninstall = !protectedItems.includes(itemData.id);

  // Define items that cannot have shortcuts
  const noShortcutItems = ['sysset', 'keyboard', 'abtcomp'];
  const canCreateShortcut = !noShortcutItems.includes(itemData.id);

  // Create context menu element
  const contextMenu = document.createElement('div');
  contextMenu.className = 'start-menu-context-menu absolute hidden bg-gray-100 border-r border-t border-b border-gray-500 z-50 w-48';
  contextMenu.style.display = 'none';

  // Build context menu HTML conditionally
  let contextMenuHTML = `
    <div class="context-menu-item px-4 py-2 hover:bg-gray-50 cursor-pointer select-none flex items-center" data-action="open">
      Open
    </div>`;

  if (canCreateShortcut) {
    contextMenuHTML += `
    <div class="context-menu-item px-4 py-2 hover:bg-gray-50 cursor-pointer select-none flex items-center" data-action="shortcut">
      Create shortcut
    </div>`;
  }

  // Only add uninstall option for non-protected items
  if (canUninstall) {
    contextMenuHTML += `
    <div class="context-menu-item px-4 py-2 hover:bg-gray-50 cursor-pointer select-none flex items-center text-red-600" data-action="uninstall">
      Uninstall
    </div>`;
  }

  contextMenu.innerHTML = contextMenuHTML;

  menuItem.appendChild(contextMenu);

  // Add context menu item click handlers
  contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = e.target.closest('.context-menu-item')?.dataset.action;
    if (action) {
      handleContextMenuAction(action, itemData, isSubmenuItem, parentGroupId);
      hideContextMenu(contextMenu);
    }
  });

  // Show context menu on hover (desktop) or long tap (mobile)
  let hoverTimer;

  menuItem.addEventListener('mouseenter', () => {
    if (!dragState.isDragging) {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        // Only show if still hovering and not dragging
        if (menuItem.matches(':hover') && !dragState.isDragging) {
          showContextMenu(contextMenu, menuItem);
        }
      }, 800); // Show after 800ms hover
    }
  });

  menuItem.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    setTimeout(() => {
      if (!contextMenu.matches(':hover')) {
        hideContextMenu(contextMenu);
      }
    }, 200);
  });

  // Hide when context menu loses hover
  contextMenu.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (!menuItem.matches(':hover')) {
        hideContextMenu(contextMenu);
      }
    }, 200);
  });

  // Touch support for mobile devices
  let touchTimer;
  let touchMoved = false;

  menuItem.addEventListener('touchstart', (e) => {
    if (!dragState.isDragging) {
      touchMoved = false;
      touchTimer = setTimeout(() => {
        if (!touchMoved && !dragState.isDragging) {
          showContextMenu(contextMenu, menuItem);
        }
      }, 500); // Show after 500ms touch
    }
  });

  menuItem.addEventListener('touchmove', () => {
    touchMoved = true;
    clearTimeout(touchTimer);
  });

  menuItem.addEventListener('touchend', () => {
    clearTimeout(touchTimer);
  });

  // Hide context menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && !menuItem.contains(e.target)) {
      hideContextMenu(contextMenu);
    }
  });

  function showContextMenu(menu, item) {
    // Hide any other visible context menus
    document.querySelectorAll('.start-menu-context-menu').forEach(otherMenu => {
      if (otherMenu !== menu) {
        otherMenu.style.display = 'none';
        otherMenu.classList.add('hidden');
      }
    });

    menu.style.display = 'block';
    menu.classList.remove('hidden');
    isContextMenuVisible = true;

    // Position the context menu
    const itemRect = item.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    // Position to the right of the item
    menu.style.left = `${item.offsetWidth}px`;
    menu.style.top = '-1px';

    // Adjust if it would go off screen
    const startMenuRect = document.getElementById('start-menu').getBoundingClientRect();
    if (itemRect.right + menuRect.width > window.innerWidth) {
      menu.style.left = `-${menuRect.width + 5}px`;
    }
  }

  function hideContextMenu(menu) {
    menu.style.display = 'none';
    menu.classList.add('hidden');
    isContextMenuVisible = false;
  }
}
