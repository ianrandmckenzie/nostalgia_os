import { startMenuOrder, saveState, setFileSystemState } from '../os/manage_data.js';
import { storage } from '../os/indexeddb_storage.js';

// Start Menu Drag and Drop Functionality

// Default start menu configuration
const DEFAULT_START_MENU_ITEMS = [
  {
    id: 'mycomp',
    text: 'My Computer',
    icon: 'image/computer.webp',
    type: 'item'
  },
  // {
  //   id: 'mailapp',
  //   text: 'Mailbox',
  //   icon: 'image/mail.webp',
  //   type: 'item'
  // },
  {
    id: 'mediaapp',
    text: 'Media Player',
    icon: 'image/video.webp',
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
      { id: 'sysset', text: 'System Settings', icon: 'image/gears.webp' },
      { id: 'storageapp', text: 'Storage Manager', icon: 'image/drive_c.webp' },
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
      { id: 'bombapp', text: 'Bombbroomer', icon: 'image/bombbroomer.webp' }
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

// Global drag state
let dragState = {
  isDragging: false,
  draggedElement: null,
  draggedFromGroup: null, // Track which group an item was dragged from
  placeholder: null,
  startY: 0,
  startX: 0,
  draggedItemData: null // Store the item data being dragged
};

// Generate start menu HTML from configuration
function generateStartMenuHTML() {
  const menuContainer = document.getElementById('start-menu');
  if (!menuContainer) {
    console.error('Start menu container not found');
    return;
  }

  // Get the current order or use default
  const currentOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);
  let itemsToRender = [...DEFAULT_START_MENU_ITEMS];

  // If we have a saved order, rearrange items accordingly
  if (currentOrder && currentOrder.length > 0) {
    const orderedItems = [];
    const processedItemIds = new Set();

    // Process saved order
    currentOrder.forEach(orderItem => {
      if (typeof orderItem === 'string') {
        // Simple item ID
        const defaultItem = DEFAULT_START_MENU_ITEMS.find(item => item.id === orderItem);
        if (defaultItem) {
          orderedItems.push(defaultItem);
          processedItemIds.add(orderItem);
        }
      } else if (orderItem && orderItem.type === 'group') {
        // Dynamic group with custom items
        let baseGroup = DEFAULT_START_MENU_ITEMS.find(item =>
          item.type === 'group' && (item.id === orderItem.id || item.text === orderItem.name)
        );

        if (baseGroup) {
          // Create dynamic group with saved items
          const dynamicGroup = {
            ...baseGroup,
            items: orderItem.items || baseGroup.items
          };
          orderedItems.push(dynamicGroup);
          processedItemIds.add(baseGroup.id);
        } else {
          // This group doesn't exist in defaults anymore, but we can still recreate it
          orderedItems.push({
            id: orderItem.id || `custom-group-${Date.now()}`,
            text: orderItem.name,
            type: 'group',
            items: orderItem.items || []
          });
        }
      }
    });

    // Add any remaining default items that weren't in the saved order
    DEFAULT_START_MENU_ITEMS.forEach(item => {
      if (!processedItemIds.has(item.id) && !item.fixed) {
        orderedItems.push(item);
      }
    });

    // Always add fixed items (like restart) at the end
    DEFAULT_START_MENU_ITEMS.forEach(item => {
      if (item.fixed) {
        orderedItems.push(item);
      }
    });

    itemsToRender = orderedItems;
  }

  // Generate HTML
  const ul = document.createElement('ul');

  itemsToRender.forEach(item => {
    if (item.type === 'item') {
      const li = createMenuItem(item);
      ul.appendChild(li);
    } else if (item.type === 'group') {
      const li = createGroupItem(item);
      ul.appendChild(li);
    }
  });

  // Clear existing menu and add new one
  menuContainer.innerHTML = '';
  menuContainer.appendChild(ul);

}

function createMenuItem(item) {
  const li = document.createElement('li');
  li.id = item.id;
  li.className = item.fixed
    ? 'px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center relative'
    : 'px-4 py-2 hover:bg-gray-50 cursor-grab select-none flex items-center relative';

  // Add ARIA role for accessibility
  li.setAttribute('role', 'menuitem');
  li.setAttribute('tabindex', '-1');
  li.setAttribute('aria-label', item.text);

  li.innerHTML = `
    <img src="${item.icon}" class="h-6 w-6 inline mr-2" alt="${item.text} icon">
    ${item.text}
  `;

  // Add click handler for the item
  li.addEventListener('click', (e) => {
    // Don't handle click if context menu is visible
    if (li.querySelector('.start-menu-context-menu')?.style.display !== 'none') {
      return;
    }
    handleStartMenuItemClick(item.id);
  });

  // Add context menu support (not for fixed items like restart)
  if (!item.fixed) {
    setupContextMenu(li, item, false);
  }

  return li;
}

function createGroupItem(item) {
  const li = document.createElement('li');
  li.className = 'group relative';
  li.setAttribute('data-group-id', item.id);

  let submenuItems = '';
  item.items.forEach(subItem => {
    submenuItems += `
      <li id="${subItem.id}" class="px-4 py-2 hover:bg-gray-50 cursor-grab select-none flex items-center submenu-item relative" data-submenu-item data-parent-group="${item.id}" role="menuitem" tabindex="-1" aria-label="${subItem.text}">
        <img src="${subItem.icon}" class="h-6 w-6 inline mr-2" alt="${subItem.text} icon">
        ${subItem.text}
      </li>
    `;
  });

  li.innerHTML = `
    <a href="#" data-submenu-trigger class="px-4 py-2 hover:bg-gray-50 cursor-grab select-none flex items-center justify-between" role="menuitem" tabindex="-1" aria-label="${item.text}" aria-haspopup="true" aria-expanded="false">
      <div class="flex items-center">
        ${item.text}
      </div>
      <span class="md:rotate-0 text-xs">&#9654;</span>
    </a>
    <ul class="submenu hidden pl-4 bg-gray-100 md:pl-0 md:absolute md:left-full md:bottom-0 md:w-48 md:bg-white md:border md:border-gray-500 md:shadow-lg" data-submenu-container data-group-id="${item.id}" role="menu">
      ${submenuItems}
    </ul>
  `;

  // Add click handlers and context menus for submenu items
  const submenuItemElements = li.querySelectorAll('ul li');
  submenuItemElements.forEach((subLi, index) => {
    subLi.addEventListener('click', (e) => {
      // Don't handle click if context menu is visible
      if (subLi.querySelector('.start-menu-context-menu')?.style.display !== 'none') {
        return;
      }
      handleStartMenuItemClick(subLi.id);
    });

    // Add context menu support for submenu items
    const subItemData = item.items[index];
    if (subItemData) {
      setupContextMenu(subLi, subItemData, true, item.id);
    }
  });

  // Add responsive submenu behavior
  const submenuTrigger = li.querySelector('[data-submenu-trigger]');
  const submenuContainer = li.querySelector('[data-submenu-container]');

  if (submenuTrigger && submenuContainer) {
    let hoverTimeout;

    // Check if device has hover capability (desktop)
    const hasHover = window.matchMedia('(hover: hover)').matches;

    if (hasHover) {
      // Desktop behavior: hover to show submenu to the right
      li.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        submenuContainer.classList.remove('hidden');
        submenuContainer.classList.add('block');
      });

      li.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          submenuContainer.classList.add('hidden');
          submenuContainer.classList.remove('block');
        }, 100);
      });
    } else {
      // Mobile behavior: tap to toggle submenu below
      submenuTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isVisible = !submenuContainer.classList.contains('hidden');

        // Hide all other submenus first
        document.querySelectorAll('[data-submenu-container]').forEach(menu => {
          if (menu !== submenuContainer) {
            menu.classList.add('hidden');
            menu.classList.remove('block');
          }
        });

        // Toggle this submenu
        if (isVisible) {
          submenuContainer.classList.add('hidden');
          submenuContainer.classList.remove('block');
        } else {
          submenuContainer.classList.remove('hidden');
          submenuContainer.classList.add('block');
        }
      });
    }
  }

  return li;
}

// Handle start menu item clicks
function handleStartMenuItemClick(itemId) {
  // Don't handle clicks if we're in a drag operation
  if (dragState.isDragging) {
    return;
  }

  // Close the start menu first
  if (typeof toggleStartMenu === 'function') {
    toggleStartMenu();
  } else {
    // Fallback to manually closing the menu
    const menu = document.getElementById('start-menu');
    if (menu) {
      menu.classList.add('hidden');
    }
  }

  // Handle different item types
  switch (itemId) {
    case 'mycomp':
      if (typeof openExplorer === 'function') openExplorer('C://');
      break;
    case 'abtcomp':
      if (typeof openAboutWindow === 'function') openAboutWindow();
      break;
    case 'sysset':
      if (typeof openNav === 'function') openNav('Settings', '', { type: 'integer', width: 600, height: 400 }, 'Settings');
      break;
    case 'storageapp':
      if (typeof openApp === 'function') openApp('storage');
      break;
    // case 'mailapp':
    //   if (typeof launchMailbox === 'function') launchMailbox();
    //   break;
    case 'watercolourapp':
      if (typeof openApp === 'function') openApp('watercolour');
      break;
    case 'letterpad':
      if (typeof createNewFile === 'function') {
        createNewFile(null, 'C://Documents', (newFileId) => {
          if (typeof openFile === 'function') openFile(newFileId, { target: document.body });
        });
      }
      break;
    case 'calcapp':
      if (typeof openApp === 'function') openApp('calculator');
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
    case 'mediaapp':
      if (typeof openApp === 'function') openApp('mediaplayer');
      break;
    case 'rstrtcomp':
      if (typeof restart === 'function') restart();
      break;
    default:
      console.warn('Unknown start menu item clicked:', itemId);
  }
}

// Setup context menu for start menu items
function setupContextMenu(menuItem, itemData, isSubmenuItem = false, parentGroupId = null) {
  let contextMenuTimer;
  let isContextMenuVisible = false;

  // Define items that cannot be uninstalled
  const protectedItems = ['mycomp', 'storageapp', 'sysset'];
  const canUninstall = !protectedItems.includes(itemData.id);

  // Create context menu element
  const contextMenu = document.createElement('div');
  contextMenu.className = 'start-menu-context-menu absolute hidden bg-gray-100 border-r border-t border-b border-gray-500 z-50 w-48';
  contextMenu.style.display = 'none';

  // Build context menu HTML conditionally
  let contextMenuHTML = `
    <div class="context-menu-item px-4 py-2 hover:bg-gray-50 cursor-pointer select-none flex items-center" data-action="open">
      Open
    </div>
    <div class="context-menu-item px-4 py-2 hover:bg-gray-50 cursor-pointer select-none flex items-center" data-action="shortcut">
      Create shortcut
    </div>`;

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
        if (!isContextMenuVisible && !dragState.isDragging) {
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
        if (!touchMoved && !isContextMenuVisible) {
          e.preventDefault();
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

// Handle context menu actions
function handleContextMenuAction(action, itemData, isSubmenuItem, parentGroupId) {
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
        // Fallback to manually closing the menu
        const startMenu = document.getElementById('start-menu');
        if (startMenu) {
          startMenu.classList.add('hidden');
        }
      }
      break;

    case 'uninstall':
      confirmUninstall(itemData, isSubmenuItem, parentGroupId);
      // Close start menu after action using proper toggle function
      if (typeof toggleStartMenu === 'function') {
        toggleStartMenu();
      } else {
        // Fallback to manually closing the menu
        const startMenu = document.getElementById('start-menu');
        if (startMenu) {
          startMenu.classList.add('hidden');
        }
      }
      break;
  }
}

// Create desktop shortcut
async function createDesktopShortcut(itemData) {
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
function confirmUninstall(itemData, isSubmenuItem, parentGroupId) {
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

async function performUninstall(itemData, isSubmenuItem, parentGroupId) {
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
        if (typeof orderItem === 'object' && orderItem.type === 'group' && orderItem.id === parentGroupId) {
          return {
            ...orderItem,
            items: orderItem.items.filter(subItem => subItem.id !== itemData.id)
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
        return true; // Keep group items as-is
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

// Initialize Start menu drag and drop functionality
function initializeStartMenuDragDrop() {
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

// Setup drop zones for the start menu
function setupStartMenuDropZones() {
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
        submenu.classList.remove('block');
        // Don't add 'hidden' class as it conflicts with lg:group-hover:block
        // The initial 'hidden' class in the HTML is sufficient
      });
    }
  });
}// Make a submenu item draggable
function makeSubmenuItemDraggable(item) {
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
function makeStartMenuItemDraggable(item) {
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
      // This was a click, not a drag - handle the click
      // Note: The click event will be handled by the click listener we added to the item
      // So we don't need to do anything here
    }

    // Reset state
    resetDragState();
    hasMovedBeyondThreshold = false;
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

function startSubmenuDragOperation(item, e) {
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

function updateSubmenuDropIndicator(e) {
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
        break;
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

    // Find insertion point in main menu
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
        break;
      }
    }

    // Move placeholder to main menu
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
      } else {
        mainMenuList.appendChild(dragState.placeholder);
      }
    }
  }
}

function completeSubmenuDragOperation(e) {
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
    // Moving between different submenus

    // Remove from original location
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

  } else if (targetGroupId === dragState.draggedFromGroup) {
    // Reordering within same submenu
    targetContainer.insertBefore(dragState.draggedElement, dragState.placeholder);
    dragState.placeholder.remove();
  }

  // Save the changes
  setTimeout(async () => {
    try {
      await saveStartMenuOrder();
    } catch (error) {
      console.error('❌ Failed to save submenu changes:', error);
    }
  }, 10);
}

function startDragOperation(item, e) {
  // Hide all context menus when drag starts
  document.querySelectorAll('.start-menu-context-menu').forEach(menu => {
    menu.style.display = 'none';
    menu.classList.add('hidden');
  });

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
      dragState.placeholder.innerHTML = '<span class="text-blue-600 text-sm"></span>';
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
        break;
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
  } else {
    // Find restart item and insert before it
    const restartItem = menuList.querySelector('#rstrtcomp');
    if (restartItem) {
      menuList.insertBefore(dragState.placeholder, restartItem);
    }
  }
}

function completeDragOperation(e) {
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
      // Save the new order (async)
      await saveStartMenuOrder();
    } catch (error) {
      console.error('❌ Failed to save start menu order:', error);
    }
  }, 10);
}

async function saveStartMenuOrder() {

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
      // Regular main menu item
      newOrder.push(item.id);
    } else if (item.classList.contains('group')) {
      // Handle submenu groups - capture the current structure
      const groupId = item.getAttribute('data-group-id');
      const trigger = item.querySelector('[data-submenu-trigger]');
      const submenuContainer = item.querySelector('[data-submenu-container]');

      if (trigger && submenuContainer && groupId) {
        // Extract group name excluding any context menu text
        const tempTrigger = trigger.cloneNode(true);
        const contextMenu = tempTrigger.querySelector('.start-menu-context-menu');
        if (contextMenu) {
          contextMenu.remove();
        }
        const groupName = tempTrigger.textContent.trim();
        const submenuItems = Array.from(submenuContainer.querySelectorAll('.submenu-item')).map(subItem => {
          // Extract submenu item text excluding context menu
          const tempSubItem = subItem.cloneNode(true);
          const subContextMenu = tempSubItem.querySelector('.start-menu-context-menu');
          if (subContextMenu) {
            subContextMenu.remove();
          }
          return {
            id: subItem.id,
            text: tempSubItem.textContent.trim(),
            icon: subItem.querySelector('img')?.src || ''
          };
        });

        const groupData = {
          type: 'group',
          id: groupId,
          name: groupName,
          items: submenuItems
        };

        newOrder.push(groupData);

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
      // In case of reference error, the global variable doesn't exist
    }
  }

  // Save to storage - use direct storage for start menu order
  try {
    // Save directly to storage first
    await storage.setItem('startMenuOrder', newOrder);

    // Also save to appState for consistency (but don't rely on it)
    if (typeof saveState === 'function') {
      await saveState();
    } else if (typeof window.saveState === 'function') {
      await window.saveState();
    } else {
      console.warn('⚠ saveState function not available, only saved directly');
    }

    // Verify the direct save was successful
    try {
      const savedOrder = await storage.getItem('startMenuOrder');
      if (JSON.stringify(savedOrder) === JSON.stringify(newOrder)) {
      } else {
        console.warn('⚠ Start menu order mismatch in direct storage after save');
      }
    } catch (verifyError) {
      console.warn('Could not verify direct save:', verifyError);
    }
  } catch (error) {
    console.error('Failed to save start menu order:', error);
  }

}

async function restoreStartMenuOrder() {
  // First, try to load directly from storage
  let currentStartMenuOrder = [];

  try {
    const directOrder = await storage.getItem('startMenuOrder');
    if (directOrder && Array.isArray(directOrder)) {
      currentStartMenuOrder = directOrder;
    } else {
      // Fallback to global variables
      currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);
    }
  } catch (error) {
    console.warn('⚠ Failed to load from direct storage, using global variables:', error);
    currentStartMenuOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);
  }


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

  // Check storage
  try {
    const appState = await storage.getItem('appState');
  } catch (error) {
    console.error('Error reading from storage:', error);
  }

  // Check if functions exist

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
      console.error('❌ Basic save failed:', error);
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

// Initialize start menu on page load
export function initializeStartMenu() {

  // Generate initial menu or restore from saved state
  restoreStartMenuOrder();

}

// Make initialization function available globally
window.initializeStartMenu = initializeStartMenu;

// Add a comprehensive test function
window.testFullStartMenuFlow = async function() {

  // Step 1: Check initial state
  await debugStartMenuState();

  // Step 2: Initialize start menu
  initializeStartMenu();

  // Step 3: Check state after initialization
  await debugStartMenuState();

  // Step 4: Save a test order
  await testRealSave();

  // Step 5: Test restoration
  testRestore();

  // Step 6: Final state check
  await debugStartMenuState();

};

// New comprehensive test functions for dual storage approach
window.testStartMenuSave = async function() {

  // Create a test order
  const testOrder = ['app-calculator', 'app-chess', 'app-mediaplayer'];

  // Save using our function
  await saveStartMenuOrder(testOrder);

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

function focusMenuItem(index, showSubmenu = false) {
  const menuItems = document.querySelectorAll('#start-menu [role="menuitem"]');

  // Remove focus from all items
  menuItems.forEach(item => {
    item.classList.remove('bg-blue-100', 'focus-visible');
    item.setAttribute('tabindex', '-1');

    // Update aria-expanded for submenu triggers
    if (item.hasAttribute('aria-haspopup')) {
      item.setAttribute('aria-expanded', 'false');
    }
  });

  // Hide all submenus initially (unless we're explicitly showing one)
  document.querySelectorAll('[data-submenu-container]').forEach(submenu => {
    submenu.classList.add('hidden');
    submenu.classList.remove('block');
  });

  // Focus the current item
  if (menuItems[index]) {
    const currentItem = menuItems[index];
    currentItem.classList.add('bg-blue-100', 'focus-visible');
    currentItem.setAttribute('tabindex', '0');
    currentItem.focus();

    // Only show submenu if explicitly requested (opt-in behavior)
    if (showSubmenu && currentItem.hasAttribute('data-submenu-trigger')) {
      // Find the corresponding submenu container
      const parentLi = currentItem.closest('li');
      const submenuContainer = parentLi?.querySelector('[data-submenu-container]');

      if (submenuContainer) {
        // Show the submenu
        submenuContainer.classList.remove('hidden');
        submenuContainer.classList.add('block');

        // Update aria-expanded
        currentItem.setAttribute('aria-expanded', 'true');
      }
    }

    // If this is a submenu item, ensure its parent submenu is visible
    if (currentItem.hasAttribute('data-submenu-item')) {
      const parentGroup = currentItem.getAttribute('data-parent-group');
      if (parentGroup) {
        const parentSubmenu = document.querySelector(`[data-submenu-container][data-group-id="${parentGroup}"]`);
        if (parentSubmenu) {
          parentSubmenu.classList.remove('hidden');
          parentSubmenu.classList.add('block');

          // Also update the parent trigger's aria-expanded
          const parentTrigger = parentSubmenu.closest('li')?.querySelector('[data-submenu-trigger]');
          if (parentTrigger) {
            parentTrigger.setAttribute('aria-expanded', 'true');
          }
        }
      }
    }

    // Scroll into view if needed
    currentItem.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }
}export function addStartMenuKeyboardNavigation() {
  let currentIndex = 0;
  let menuItems = [];
  let isInSubmenu = false; // Track if we're currently navigating within a submenu

  // Add global keyboard listener for Windows/Cmd key to open start menu
  document.addEventListener('keydown', function(e) {
    // Check for Windows key (Meta key) on both Windows and macOS
    if (e.key === 'Meta' || e.key === 'OS') {
      e.preventDefault();
      const startMenu = document.getElementById('start-menu');
      const startButton = document.getElementById('start-button');

      if (startMenu && startButton) {
        // Toggle start menu
        if (startMenu.classList.contains('hidden')) {
          // Open start menu
          if (typeof toggleStartMenu === 'function') {
            toggleStartMenu();
          } else {
            // Fallback to manually opening the menu
            startMenu.classList.remove('hidden');
          }
          // Small delay to ensure menu is rendered before focusing
          setTimeout(resetNavigation, 10);
        } else {
          // Close start menu
          if (typeof toggleStartMenu === 'function') {
            toggleStartMenu();
          } else {
            // Fallback to manually closing the menu
            startMenu.classList.add('hidden');
          }
          startButton.focus();
        }
      }
    }
  });

  // Function to refresh menu items (needed when menu content changes)
  function refreshMenuItems() {
    menuItems = Array.from(document.querySelectorAll('#start-menu [role="menuitem"]'));
    return menuItems;
  }

  // Function to get only main menu items (excluding submenu items)
  function getMainMenuItems() {
    return menuItems.filter(item => !item.hasAttribute('data-submenu-item'));
  }

  // Function to get submenu items for a specific group
  function getSubmenuItems(groupId) {
    return menuItems.filter(item =>
      item.hasAttribute('data-submenu-item') &&
      item.getAttribute('data-parent-group') === groupId
    );
  }

  // Function to reset navigation when menu opens
  function resetNavigation() {
    refreshMenuItems();
    currentIndex = 0;
    isInSubmenu = false; // Reset submenu state
    if (menuItems.length > 0) {
      focusMenuItem(currentIndex);
    }
  }

  // Listen for start menu opening
  const startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.addEventListener('click', () => {
      // Small delay to ensure menu is rendered
      setTimeout(resetNavigation, 10);
    });
  }

  document.addEventListener('keydown', function(e) {
    const startMenu = document.getElementById('start-menu');
    if (!startMenu || startMenu.classList.contains('hidden')) {
      return; // Menu is not open
    }

    refreshMenuItems(); // Ensure we have current menu items

    if (menuItems.length === 0) {
      return; // No menu items to navigate
    }

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isInSubmenu) {
          // Navigate within submenu items only
          const currentItem = menuItems[currentIndex];
          const parentGroup = currentItem.getAttribute('data-parent-group');
          const submenuItems = getSubmenuItems(parentGroup);
          const currentSubmenuIndex = submenuItems.indexOf(currentItem);
          const nextSubmenuIndex = (currentSubmenuIndex + 1) % submenuItems.length;
          const nextItem = submenuItems[nextSubmenuIndex];
          currentIndex = menuItems.indexOf(nextItem);
        } else {
          // Navigate within main menu items only
          const mainMenuItems = getMainMenuItems();
          const currentItem = menuItems[currentIndex];
          const currentMainIndex = mainMenuItems.indexOf(currentItem);
          const nextMainIndex = (currentMainIndex + 1) % mainMenuItems.length;
          const nextItem = mainMenuItems[nextMainIndex];
          currentIndex = menuItems.indexOf(nextItem);
        }
        focusMenuItem(currentIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isInSubmenu) {
          // Navigate within submenu items only
          const currentItem = menuItems[currentIndex];
          const parentGroup = currentItem.getAttribute('data-parent-group');
          const submenuItems = getSubmenuItems(parentGroup);
          const currentSubmenuIndex = submenuItems.indexOf(currentItem);
          const prevSubmenuIndex = (currentSubmenuIndex - 1 + submenuItems.length) % submenuItems.length;
          const prevItem = submenuItems[prevSubmenuIndex];
          currentIndex = menuItems.indexOf(prevItem);
        } else {
          // Navigate within main menu items only
          const mainMenuItems = getMainMenuItems();
          const currentItem = menuItems[currentIndex];
          const currentMainIndex = mainMenuItems.indexOf(currentItem);
          const prevMainIndex = (currentMainIndex - 1 + mainMenuItems.length) % mainMenuItems.length;
          const prevItem = mainMenuItems[prevMainIndex];
          currentIndex = menuItems.indexOf(prevItem);
        }
        focusMenuItem(currentIndex);
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Only work if current item is a focused submenu trigger
        if (menuItems[currentIndex] &&
            menuItems[currentIndex].hasAttribute('data-submenu-trigger') &&
            menuItems[currentIndex].classList.contains('focus-visible')) {

          const parentLi = menuItems[currentIndex].closest('li');
          const submenuContainer = parentLi?.querySelector('[data-submenu-container]');
          const submenuItems = submenuContainer?.querySelectorAll('[role="menuitem"]');

          if (submenuItems && submenuItems.length > 0) {
            // Find the first submenu item in our main menuItems array
            for (let i = 0; i < menuItems.length; i++) {
              if (submenuItems[0] === menuItems[i]) {
                currentIndex = i;
                isInSubmenu = true; // Mark that we're now in a submenu
                // Focus the submenu item and ensure its parent submenu is visible
                focusMenuItem(currentIndex);
                break;
              }
            }
          }
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // If current item is in a submenu, navigate back to parent and hide submenu
        if (menuItems[currentIndex] && menuItems[currentIndex].hasAttribute('data-submenu-item')) {
          const parentGroup = menuItems[currentIndex].getAttribute('data-parent-group');
          if (parentGroup) {
            // Find the parent submenu trigger
            for (let i = 0; i < menuItems.length; i++) {
              const item = menuItems[i];
              if (item.hasAttribute('data-submenu-trigger')) {
                const parentLi = item.closest('li');
                const groupId = parentLi?.getAttribute('data-group-id');
                if (groupId === parentGroup) {
                  currentIndex = i;
                  isInSubmenu = false; // Mark that we're back in main menu
                  // Focus the parent but don't show submenu (showSubmenu = false)
                  focusMenuItem(currentIndex, false);
                  break;
                }
              }
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (menuItems[currentIndex]) {
          menuItems[currentIndex].click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        // Close the start menu
        if (startMenu) {
          startMenu.classList.add('hidden');
          startButton?.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        if (isInSubmenu) {
          // Go to first item in current submenu
          const currentItem = menuItems[currentIndex];
          const parentGroup = currentItem.getAttribute('data-parent-group');
          const submenuItems = getSubmenuItems(parentGroup);
          if (submenuItems.length > 0) {
            const firstItem = submenuItems[0];
            currentIndex = menuItems.indexOf(firstItem);
          }
        } else {
          // Go to first main menu item
          const mainMenuItems = getMainMenuItems();
          if (mainMenuItems.length > 0) {
            const firstItem = mainMenuItems[0];
            currentIndex = menuItems.indexOf(firstItem);
          }
        }
        focusMenuItem(currentIndex);
        break;
      case 'End':
        e.preventDefault();
        if (isInSubmenu) {
          // Go to last item in current submenu
          const currentItem = menuItems[currentIndex];
          const parentGroup = currentItem.getAttribute('data-parent-group');
          const submenuItems = getSubmenuItems(parentGroup);
          if (submenuItems.length > 0) {
            const lastItem = submenuItems[submenuItems.length - 1];
            currentIndex = menuItems.indexOf(lastItem);
          }
        } else {
          // Go to last main menu item
          const mainMenuItems = getMainMenuItems();
          if (mainMenuItems.length > 0) {
            const lastItem = mainMenuItems[mainMenuItems.length - 1];
            currentIndex = menuItems.indexOf(lastItem);
          }
        }
        focusMenuItem(currentIndex);
        break;
    }
  });

  // Initial setup
  refreshMenuItems();
}
