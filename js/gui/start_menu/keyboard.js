// Clear keyboard focus styling from all menu items
export function clearKeyboardFocus() {
  const menuItems = document.querySelectorAll('#start-menu [role="menuitem"]');
  menuItems.forEach(item => {
    item.classList.remove('bg-gray-50', 'focus-visible', 'keyboard-focused');
    item.setAttribute('tabindex', '-1');
    item.blur(); // Remove focus from the element
  });
  // Also reset any keyboard navigation state if available
  if (window.startMenuKeyboardNavState) {
    window.startMenuKeyboardNavState.setKeyboardNavigating(false);
  }
}

export function focusMenuItem(index, showSubmenu = false) {
  const menuItems = document.querySelectorAll('#start-menu [role="menuitem"]');

  // Remove focus from all items
  menuItems.forEach(item => {
    item.classList.remove('bg-gray-50', 'focus-visible', 'keyboard-focused');
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
    currentItem.classList.add('bg-gray-50', 'focus-visible', 'keyboard-focused');
    currentItem.setAttribute('tabindex', '0');
    currentItem.focus();

    // Only show submenu if explicitly requested (opt-in behavior)
    if (showSubmenu && currentItem.hasAttribute('data-submenu-trigger')) {
      const submenu = currentItem.nextElementSibling;
      if (submenu) {
        submenu.classList.remove('hidden');
        submenu.classList.add('block');
        currentItem.setAttribute('aria-expanded', 'true');
      }
    }

    // If this is a submenu item, ensure its parent submenu is visible
    if (currentItem.hasAttribute('data-submenu-item')) {
      const parentSubmenu = currentItem.closest('[data-submenu-container]');
      if (parentSubmenu) {
        parentSubmenu.classList.remove('hidden');
        parentSubmenu.classList.add('block');

        // Also highlight the parent trigger
        const parentItem = parentSubmenu.parentElement.querySelector('[data-submenu-trigger]');
        if (parentItem) {
          parentItem.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // Scroll into view if needed
    currentItem.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }
}

export function addStartMenuKeyboardNavigation() {
  let currentIndex = 0;
  let menuItems = [];
  let isInSubmenu = false; // Track if we're currently navigating within a submenu
  let isKeyboardNavigating = false; // Track if we're actively using keyboard navigation

  // Expose keyboard navigation state globally for coordination with mouse events
  window.startMenuKeyboardNavState = {
    isKeyboardNavigating: () => isKeyboardNavigating,
    setKeyboardNavigating: (value) => { isKeyboardNavigating = value; }
  };

  // Clear keyboard focus styling from all menu items
  function clearKeyboardFocusLocal() {
    const menuItems = document.querySelectorAll('#start-menu [role="menuitem"]');
    menuItems.forEach(item => {
      item.classList.remove('bg-gray-50', 'focus-visible', 'keyboard-focused');
      item.setAttribute('tabindex', '-1');
      item.blur();
    });
    isKeyboardNavigating = false;
  }

  // Modified focus function that marks keyboard navigation state
  function focusMenuItemLocal(index, showSubmenu = false) {
    isKeyboardNavigating = true;
    focusMenuItem(index, showSubmenu);
  }

  // Add global keyboard listener for Windows/Cmd key to open start menu
  document.addEventListener('keydown', function(e) {
    // Check for Windows key (Meta key) on both Windows and macOS
    // But ignore on Mac to prevent interfering with OS shortcuts
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    if ((e.key === 'Meta' || e.key === 'OS') && !isMac) {
      e.preventDefault();
      if (typeof toggleStartMenu === 'function') {
        toggleStartMenu();

        // If opening, focus first item
        const startMenu = document.getElementById('start-menu');
        if (startMenu && !startMenu.classList.contains('hidden')) {
          setTimeout(() => {
            resetNavigation();
            focusMenuItemLocal(0);
          }, 50);
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
      // Don't auto-focus, wait for user interaction
    }
  }

  // Listen for start menu opening
  const startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.addEventListener('click', () => {
      // Reset navigation when clicked
      resetNavigation();
    });
  }

  document.addEventListener('keydown', function(e) {
    const startMenu = document.getElementById('start-menu');
    if (!startMenu || startMenu.classList.contains('hidden')) return;

    refreshMenuItems(); // Ensure we have current menu items

    if (menuItems.length === 0) return;

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isKeyboardNavigating) {
          isKeyboardNavigating = true;
          focusMenuItemLocal(currentIndex);
        } else {
          if (isInSubmenu) {
            // In submenu: move to next item in this submenu
            const currentItem = menuItems[currentIndex];
            const groupId = currentItem.getAttribute('data-parent-group');
            const submenuItems = getSubmenuItems(groupId);
            const subIndex = submenuItems.indexOf(currentItem);

            if (subIndex < submenuItems.length - 1) {
              // Move to next item in submenu
              const nextItem = submenuItems[subIndex + 1];
              currentIndex = menuItems.indexOf(nextItem);
              focusMenuItemLocal(currentIndex);
            }
          } else {
            // In main menu: move to next main item
            const mainItems = getMainMenuItems();
            const currentItem = menuItems[currentIndex];

            // If current item is in submenu (shouldn't happen if isInSubmenu is false, but safety check)
            if (currentItem.hasAttribute('data-submenu-item')) {
              isInSubmenu = true;
              return;
            }

            const mainIndex = mainItems.indexOf(currentItem);
            if (mainIndex < mainItems.length - 1) {
              const nextItem = mainItems[mainIndex + 1];
              currentIndex = menuItems.indexOf(nextItem);
              focusMenuItemLocal(currentIndex);
            }
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isKeyboardNavigating) {
          isKeyboardNavigating = true;
          focusMenuItemLocal(currentIndex);
        } else {
          if (isInSubmenu) {
            // In submenu: move to previous item
            const currentItem = menuItems[currentIndex];
            const groupId = currentItem.getAttribute('data-parent-group');
            const submenuItems = getSubmenuItems(groupId);
            const subIndex = submenuItems.indexOf(currentItem);

            if (subIndex > 0) {
              // Move to previous item in submenu
              const prevItem = submenuItems[subIndex - 1];
              currentIndex = menuItems.indexOf(prevItem);
              focusMenuItemLocal(currentIndex);
            }
          } else {
            // In main menu: move to previous main item
            const mainItems = getMainMenuItems();
            const currentItem = menuItems[currentIndex];
            const mainIndex = mainItems.indexOf(currentItem);

            if (mainIndex > 0) {
              const prevItem = mainItems[mainIndex - 1];
              currentIndex = menuItems.indexOf(prevItem);
              focusMenuItemLocal(currentIndex);
            }
          }
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        const currentItemRight = menuItems[currentIndex];

        // If on a group item, enter submenu
        if (currentItemRight.hasAttribute('data-submenu-trigger')) {
          const groupId = currentItemRight.nextElementSibling.getAttribute('data-group-id');
          const submenuItems = getSubmenuItems(groupId);

          if (submenuItems.length > 0) {
            isInSubmenu = true;
            currentIndex = menuItems.indexOf(submenuItems[0]);
            focusMenuItemLocal(currentIndex, true);
          }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        const currentItemLeft = menuItems[currentIndex];

        // If in submenu, return to parent group item
        if (currentItemLeft.hasAttribute('data-submenu-item')) {
          const groupId = currentItemLeft.getAttribute('data-parent-group');
          // Find the parent trigger
          const parentTrigger = document.querySelector(`[data-submenu-container][data-group-id="${groupId}"]`)
            ?.previousElementSibling;

          if (parentTrigger) {
            isInSubmenu = false;
            currentIndex = menuItems.indexOf(parentTrigger);
            focusMenuItemLocal(currentIndex);
          }
        }
        break;

      case 'Enter':
      case ' ': // Spacebar
        e.preventDefault();
        if (menuItems[currentIndex]) {
          // Simulate click
          menuItems[currentIndex].click();
        }
        break;

      case 'Escape':
        e.preventDefault();
        // Close start menu
        if (typeof toggleStartMenu === 'function') {
          toggleStartMenu();
        }
        break;

      case 'Tab':
        // Allow default tab behavior but update our index
        setTimeout(() => {
          const focused = document.activeElement;
          const index = menuItems.indexOf(focused);
          if (index !== -1) {
            currentIndex = index;
            isKeyboardNavigating = true;

            // Update submenu state
            if (focused.hasAttribute('data-submenu-item')) {
              isInSubmenu = true;
            } else {
              isInSubmenu = false;
            }
          }
        }, 0);
        break;
    }
  });

  // Initial setup
  refreshMenuItems();
}
