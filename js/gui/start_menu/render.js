import { handleStartMenuItemClick } from './actions.js';
import { setupContextMenu } from './context_menu.js';
import { unavailableApps, dragState } from './state.js';
import { DEFAULT_START_MENU_ITEMS } from './constants.js';
import { clearKeyboardFocus } from './keyboard.js';
import { getCustomAppsForStartMenu } from '../../apps/custom_apps.js';

// Generate start menu HTML from configuration
export function generateStartMenuHTML() {
  const menuContainer = document.getElementById('start-menu');
  if (!menuContainer) {
    console.error('Start menu container not found');
    return;
  }

  // Get the current order or use default
  const currentOrder = (typeof startMenuOrder !== 'undefined') ? startMenuOrder : (window.startMenuOrder || []);

  // Merge default items with custom apps
  let itemsToRender = [...DEFAULT_START_MENU_ITEMS];

  // Insert custom apps into the menu
  try {
    // Assuming getCustomAppsForStartMenu is global
    const customAppsByLocation = typeof getCustomAppsForStartMenu === 'function' ? getCustomAppsForStartMenu() : {};

    // Add custom apps to 'default' location (insert before utilities group)
    if (customAppsByLocation.default && customAppsByLocation.default.length > 0) {
      const utilitiesIndex = itemsToRender.findIndex(item => item.id === 'utilities-group');
      const insertIndex = utilitiesIndex >= 0 ? utilitiesIndex : itemsToRender.length - 1;
      itemsToRender.splice(insertIndex, 0, ...customAppsByLocation.default);
    } else {
      // No default custom apps
    }

    // Track which custom apps are added to groups (to avoid duplicates in saved order processing)
    const customAppsInGroups = new Set();

    // Add custom apps to existing groups or create new groups
    Object.keys(customAppsByLocation).forEach(location => {
      if (location === 'default') return; // Already handled

      const apps = customAppsByLocation[location];
      if (apps.length === 0) return;

      // Map location names to group IDs
      const locationToGroupId = {
        'games': 'games-group',
        'utilities': 'utilities-group'
      };

      const groupId = locationToGroupId[location.toLowerCase()];

      if (groupId) {
        // Add to existing group
        const group = itemsToRender.find(item => item.id === groupId);
        if (group && group.items) {
          apps.forEach(app => {
            // Check if already exists
            if (!group.items.find(i => i.id === app.id)) {
              group.items.push(app);
              customAppsInGroups.add(app.id);
            }
          });
        }
      } else {
        // Create new group if needed (not implemented in original code, but good for future)
        // For now, just log
        // console.log('Unknown location for custom apps:', location);
      }
    });
  } catch (error) {
    console.error('Failed to load custom apps for start menu:', error);
  }

  // If we have a saved order, rearrange items accordingly
  if (currentOrder && currentOrder.length > 0) {
    const orderedItems = [];
    const processedItemIds = new Set();

    // Process saved order
    currentOrder.forEach(orderItem => {
      if (typeof orderItem === 'string') {
        // It's an item ID
        const item = itemsToRender.find(i => i.id === orderItem);
        if (item) {
          orderedItems.push(item);
          processedItemIds.add(item.id);
        }
      } else if (typeof orderItem === 'object' && orderItem.type === 'group') {
        // It's a group with specific order
        const group = itemsToRender.find(i => i.id === orderItem.id);
        if (group) {
          // Create a new group object to avoid mutating the original
          const newGroup = { ...group, items: [] };

          // Add items in the saved order
          if (orderItem.items && Array.isArray(orderItem.items)) {
            orderItem.items.forEach(subItemId => {
              const subItem = group.items.find(i => i.id === subItemId);
              if (subItem) {
                newGroup.items.push(subItem);
              }
            });

            // Add any new items that weren't in the saved order
            group.items.forEach(subItem => {
              if (!orderItem.items.includes(subItem.id)) {
                newGroup.items.push(subItem);
              }
            });
          } else {
            newGroup.items = group.items;
          }

          orderedItems.push(newGroup);
          processedItemIds.add(group.id);
        }
      }
    });

    // Add any remaining items (including custom apps) that weren't in the saved order
    itemsToRender.forEach(item => {
      if (!processedItemIds.has(item.id) && !item.fixed) {
        orderedItems.splice(orderedItems.length - 1, 0, item); // Insert before restart
      }
    });

    // Always add fixed items (like restart) at the end
    itemsToRender.forEach(item => {
      if (item.fixed) {
        // Remove if already added (shouldn't be, but safety first)
        const existingIndex = orderedItems.findIndex(i => i.id === item.id);
        if (existingIndex >= 0) orderedItems.splice(existingIndex, 1);
        orderedItems.push(item);
      }
    });

    itemsToRender = orderedItems;
  } else {
    // Use default order
  }

  // Generate HTML
  const ul = document.createElement('ul');

  itemsToRender.forEach(item => {
    // Skip unavailable items
    if (unavailableApps.has(item.id)) {
      return;
    }

    if (item.type === 'item') {
      const li = createMenuItem(item);
      ul.appendChild(li);
    } else if (item.type === 'group') {
      // Filter out unavailable items from group
      const availableItems = item.items.filter(subItem => !unavailableApps.has(subItem.id));

      if (availableItems.length > 0) {
        const groupItem = { ...item, items: availableItems };
        const li = createGroupItem(groupItem);
        ul.appendChild(li);
      }
    }
  });

  // Clear existing menu and add new one
  menuContainer.innerHTML = '';
  menuContainer.appendChild(ul);

  // Ensure proper focusability based on menu visibility
  if (typeof window.updateStartMenuFocusability === 'function') {
    const isMenuVisible = !menuContainer.classList.contains('hidden');
    window.updateStartMenuFocusability(isMenuVisible);
  }

}

export function createMenuItem(item) {
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
    const contextMenu = li.querySelector('.start-menu-context-menu');
    if (contextMenu && contextMenu.style.display !== 'none') {
      return;
    }

    handleStartMenuItemClick(item.id);
  });

  // Add mouse interaction handlers for consistent hover/focus experience
  li.addEventListener('mouseenter', () => {
    // Only clear keyboard focus if we're actively in keyboard navigation mode
    if (window.startMenuKeyboardNavState?.isKeyboardNavigating()) {
      clearKeyboardFocus();
    }
  });

  // Add context menu support (not for fixed items like restart)
  if (!item.fixed) {
    setupContextMenu(li, item, false);
  }

  return li;
}

export function createGroupItem(item) {
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

    // Add mouse interaction handlers for consistent hover/focus experience
    subLi.addEventListener('mouseenter', () => {
      // Only clear keyboard focus if we're actively in keyboard navigation mode
      if (window.startMenuKeyboardNavState?.isKeyboardNavigating()) {
        clearKeyboardFocus();
      }
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

  // Add mouse interaction handler to the submenu trigger
  if (submenuTrigger) {
    submenuTrigger.addEventListener('mouseenter', () => {
      // Only clear keyboard focus if we're actively in keyboard navigation mode
      if (window.startMenuKeyboardNavState?.isKeyboardNavigating()) {
        clearKeyboardFocus();
      }
    });
  }

  if (submenuTrigger && submenuContainer) {
    let hoverTimeout;

    // Check if device has hover capability (desktop)
    const hasHover = window.matchMedia('(hover: hover)').matches;

    if (hasHover) {
      // Desktop behavior: hover to show submenu to the right
      li.addEventListener('mouseenter', () => {
        if (!dragState.isDragging) {
          submenuContainer.classList.remove('hidden');
          submenuContainer.classList.add('block');
        }
      });

      li.addEventListener('mouseleave', () => {
        if (!dragState.isDragging) {
          submenuContainer.classList.add('hidden');
          submenuContainer.classList.remove('block');
        }
      });
    } else {
      // Mobile behavior: tap to toggle submenu below
      submenuTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Toggle this submenu
        if (submenuContainer.classList.contains('hidden')) {
          // Close other submenus first
          document.querySelectorAll('.submenu').forEach(el => {
            if (el !== submenuContainer) {
              el.classList.add('hidden');
              el.classList.remove('block');
            }
          });

          submenuContainer.classList.remove('hidden');
          submenuContainer.classList.add('block');
        } else {
          submenuContainer.classList.add('hidden');
          submenuContainer.classList.remove('block');
        }
      });
    }
  }

  return li;
}
