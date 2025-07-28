import { getFileSystemState, saveState } from '../os/manage_data.js';
import { createWindow, closeWindow } from '../gui/window.js';
import { makeWin95Button } from '../gui/main.js';

// Central keyboard service - manages all keyboard shortcuts and remapping
class KeyboardService {
  constructor() {
    this.shortcuts = new Map();
    this.customMappings = new Map();
    this.isInitialized = false;
    this.preventDefaults = new Set();

    // Default keyboard shortcuts mapping
    this.defaultShortcuts = {
      // Global shortcuts
      'global.toggleStartMenu': { key: 'Meta', description: 'Open/Close Start Menu' },
      'global.cycleWindows': { key: 'Alt+Tab', description: 'Cycle through open windows' },
      'global.closeActiveWindow': { key: 'Alt+F4', description: 'Close active window' },
      'global.closeActiveWindow2': { key: 'Ctrl+W', description: 'Close active window (alternative)' },
      'global.minimizeActiveWindow': { key: 'Ctrl+M', description: 'Minimize active window' },
      'global.escapeAction': { key: 'Escape', description: 'Close menus and dialogs' },

      // Desktop shortcuts
      'desktop.activateIcon': { key: 'Enter', description: 'Activate selected desktop icon' },
      'desktop.activateIcon2': { key: 'Space', description: 'Activate selected desktop icon (alternative)' },
      'desktop.startDrag': { key: 'Ctrl+D', description: 'Start drag mode for desktop icon' },
      'desktop.cutIcon': { key: 'Ctrl+X', description: 'Cut desktop icon' },
      'desktop.pasteIcon': { key: 'Ctrl+V', description: 'Paste desktop icon' },
      'desktop.snapToGrid': { key: 'G', description: 'Snap icon to grid (while dragging)' },
      'desktop.escapeAction': { key: 'Escape', description: 'Cancel drag operation' },
      'desktop.moveUp': { key: 'ArrowUp', description: 'Move icon up' },
      'desktop.moveDown': { key: 'ArrowDown', description: 'Move icon down' },
      'desktop.moveLeft': { key: 'ArrowLeft', description: 'Move icon left' },
      'desktop.moveRight': { key: 'ArrowRight', description: 'Move icon right' },
      'desktop.fineMoveUp': { key: 'Shift+ArrowUp', description: 'Fine move icon up' },
      'desktop.fineMoveDown': { key: 'Shift+ArrowDown', description: 'Fine move icon down' },
      'desktop.fineMoveLeft': { key: 'Shift+ArrowLeft', description: 'Fine move icon left' },
      'desktop.fineMoveRight': { key: 'Shift+ArrowRight', description: 'Fine move icon right' },

      // Start menu shortcuts
      'startMenu.navigateDown': { key: 'ArrowDown', description: 'Navigate down in start menu' },
      'startMenu.navigateUp': { key: 'ArrowUp', description: 'Navigate up in start menu' },
      'startMenu.enterSubmenu': { key: 'ArrowRight', description: 'Enter submenu' },
      'startMenu.exitSubmenu': { key: 'ArrowLeft', description: 'Exit submenu' },
      'startMenu.activateItem': { key: 'Enter', description: 'Activate start menu item' },
      'startMenu.activateItem2': { key: 'Space', description: 'Activate start menu item (alternative)' },
      'startMenu.close': { key: 'Escape', description: 'Close start menu' },
      'startMenu.goToFirst': { key: 'Home', description: 'Go to first menu item' },
      'startMenu.goToLast': { key: 'End', description: 'Go to last menu item' },

      // File explorer shortcuts
      'fileExplorer.rename': { key: 'F2', description: 'Rename selected file' },
      'fileExplorer.delete': { key: 'Delete', description: 'Delete selected file' },
      'fileExplorer.open': { key: 'Enter', description: 'Open selected file' },
      'fileExplorer.navigateDown': { key: 'ArrowDown', description: 'Navigate down in file list' },
      'fileExplorer.navigateUp': { key: 'ArrowUp', description: 'Navigate up in file list' },
      'fileExplorer.openContextMenu': { key: 'ContextMenu', description: 'Open context menu' },
      'fileExplorer.openContextMenu2': { key: 'Shift+F10', description: 'Open context menu (alternative)' },
      'fileExplorer.openContextMenu3': { key: 'Ctrl+Space', description: 'Open context menu (alternative 2)' },

      // Context menu shortcuts
      'contextMenu.navigateDown': { key: 'ArrowDown', description: 'Navigate down in context menu' },
      'contextMenu.navigateUp': { key: 'ArrowUp', description: 'Navigate up in context menu' },
      'contextMenu.enterSubmenu': { key: 'ArrowRight', description: 'Enter context submenu' },
      'contextMenu.exitSubmenu': { key: 'ArrowLeft', description: 'Exit context submenu' },
      'contextMenu.activateItem': { key: 'Enter', description: 'Activate context menu item' },
      'contextMenu.activateItem2': { key: 'Space', description: 'Activate context menu item (alternative)' },
      'contextMenu.close': { key: 'Escape', description: 'Close context menu' },

      // Window controls
      'window.minimize': { key: 'Alt+F9', description: 'Minimize window' },
      'window.maximize': { key: 'Alt+F10', description: 'Maximize/restore window' },
      'window.close': { key: 'Alt+F4', description: 'Close window' },

      // Taskbar shortcuts
      'taskbar.activateButton': { key: 'Enter', description: 'Activate taskbar button' },
      'taskbar.activateButton2': { key: 'Space', description: 'Activate taskbar button (alternative)' },
      'taskbar.mediaControl': { key: 'Ctrl+Shift+M', description: 'Toggle media playback' },
      'taskbar.minimizeAll': { key: 'Ctrl+Shift+D', description: 'Show desktop (minimize all)' }
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    // Load custom mappings from storage
    await this.loadCustomMappings();

    // Set up shortcuts with custom mappings applied
    this.setupShortcuts();

    // Initialize centralized keyboard event handling
    this.setupGlobalKeyboardHandler();

    this.isInitialized = true;
    console.log('🎹 Keyboard service initialized with', this.shortcuts.size, 'shortcuts');
  }

  async loadCustomMappings() {
    try {
      const fs = await getFileSystemState();
      const keyboardConfig = fs.folders['C://Documents']?.['keyboard_config.json'];

      if (keyboardConfig && keyboardConfig.content) {
        const config = JSON.parse(keyboardConfig.content);
        this.customMappings = new Map(Object.entries(config.customMappings || {}));
        console.log('📋 Loaded', this.customMappings.size, 'custom keyboard mappings');
      }
    } catch (error) {
      console.warn('⚠️ Could not load keyboard config:', error);
    }
  }

  async saveCustomMappings() {
    try {
      const fs = await getFileSystemState();

      if (!fs.folders['C://Documents']) {
        fs.folders['C://Documents'] = {};
      }

      const config = {
        customMappings: Object.fromEntries(this.customMappings),
        timestamp: Date.now()
      };

      fs.folders['C://Documents']['keyboard_config.json'] = {
        id: 'keyboard_config.json',
        name: 'keyboard_config.json',
        type: 'file',
        content_type: 'json',
        content: JSON.stringify(config, null, 2),
        fullPath: 'C://Documents/keyboard_config.json'
      };

      await saveState();
      console.log('💾 Saved keyboard configuration');
    } catch (error) {
      console.error('❌ Failed to save keyboard config:', error);
    }
  }

  setupShortcuts() {
    this.shortcuts.clear();

    // Apply default shortcuts with any custom mappings
    for (const [actionId, shortcut] of Object.entries(this.defaultShortcuts)) {
      const customKey = this.customMappings.get(actionId);
      this.shortcuts.set(actionId, {
        ...shortcut,
        key: customKey || shortcut.key,
        isCustom: !!customKey
      });
    }
  }

  setupGlobalKeyboardHandler() {
    // Remove any existing handlers
    document.removeEventListener('keydown', this.globalHandler);

    // Create bound handler
    this.globalHandler = this.handleGlobalKeyboard.bind(this);

    // Add global keyboard event listener with high priority
    document.addEventListener('keydown', this.globalHandler, true);
  }

  handleGlobalKeyboard(event) {
    const keyCombo = this.getKeyCombo(event);
    const context = this.getContext(event);

    // Find matching shortcut
    for (const [actionId, shortcut] of this.shortcuts.entries()) {
      if (this.matchesKeyCombo(keyCombo, shortcut.key)) {
        // Check if action is appropriate for current context
        if (this.isActionValidForContext(actionId, context)) {
          event.preventDefault();
          event.stopPropagation();

          // Execute the action
          this.executeAction(actionId, event, context);
          return;
        }
      }
    }
  }

  getKeyCombo(event) {
    const parts = [];

    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');

    // Handle special keys
    let keyName = event.key;
    if (keyName === ' ') keyName = 'Space';

    parts.push(keyName);

    return parts.join('+');
  }

  matchesKeyCombo(eventCombo, shortcutKey) {
    // Normalize both combos for comparison
    const normalize = (combo) => combo.toLowerCase().replace(/\s+/g, '');
    return normalize(eventCombo) === normalize(shortcutKey);
  }

  getContext(event) {
    const target = event.target;
    const contexts = [];

    // Determine context based on focused element and DOM structure
    if (target.closest('#start-menu')) contexts.push('startMenu');
    if (target.closest('#context-menu')) contexts.push('contextMenu');
    if (target.closest('.file-explorer-window')) contexts.push('fileExplorer');
    if (target.closest('.draggable-icon')) contexts.push('desktop');
    if (target.closest('#window-tabs')) contexts.push('taskbar');
    if (target.closest('[role="dialog"]')) contexts.push('window');

    // Always include global context
    contexts.push('global');

    return contexts;
  }

  isActionValidForContext(actionId, contexts) {
    const actionContext = actionId.split('.')[0];
    return contexts.includes(actionContext) || actionContext === 'global';
  }

  async executeAction(actionId, event, contexts) {
    console.log('🎹 Executing keyboard action:', actionId);

    try {
      switch (actionId) {
        // Global actions
        case 'global.toggleStartMenu':
          if (typeof window.toggleStartMenu === 'function') {
            window.toggleStartMenu();
          }
          break;

        case 'global.cycleWindows':
          if (typeof window.cycleWindows === 'function') {
            window.cycleWindows();
          }
          break;

        case 'global.closeActiveWindow':
        case 'global.closeActiveWindow2':
          if (typeof window.closeActiveWindow === 'function') {
            window.closeActiveWindow();
          }
          break;

        case 'global.minimizeActiveWindow':
          if (typeof window.minimizeActiveWindow === 'function') {
            window.minimizeActiveWindow();
          }
          break;

        case 'global.escapeAction':
          this.handleGlobalEscape();
          break;

        // Desktop actions
        case 'desktop.activateIcon':
        case 'desktop.activateIcon2':
          this.handleDesktopActivate(event);
          break;

        case 'desktop.startDrag':
          this.handleDesktopStartDrag(event);
          break;

        case 'desktop.cutIcon':
          this.handleDesktopCut(event);
          break;

        case 'desktop.pasteIcon':
          this.handleDesktopPaste(event);
          break;

        case 'desktop.escapeAction':
          this.handleDesktopEscape(event);
          break;

        case 'desktop.moveUp':
        case 'desktop.moveDown':
        case 'desktop.moveLeft':
        case 'desktop.moveRight':
          this.handleDesktopMove(event, actionId);
          break;

        case 'desktop.fineMoveUp':
        case 'desktop.fineMoveDown':
        case 'desktop.fineMoveLeft':
        case 'desktop.fineMoveRight':
          this.handleDesktopFineMove(event, actionId);
          break;

        // Start menu actions
        case 'startMenu.navigateDown':
        case 'startMenu.navigateUp':
        case 'startMenu.enterSubmenu':
        case 'startMenu.exitSubmenu':
        case 'startMenu.activateItem':
        case 'startMenu.activateItem2':
        case 'startMenu.close':
        case 'startMenu.goToFirst':
        case 'startMenu.goToLast':
          this.handleStartMenuAction(actionId, event);
          break;

        // File explorer actions
        case 'fileExplorer.rename':
        case 'fileExplorer.delete':
        case 'fileExplorer.open':
        case 'fileExplorer.navigateDown':
        case 'fileExplorer.navigateUp':
        case 'fileExplorer.openContextMenu':
        case 'fileExplorer.openContextMenu2':
        case 'fileExplorer.openContextMenu3':
          this.handleFileExplorerAction(actionId, event);
          break;

        // Context menu actions
        case 'contextMenu.navigateDown':
        case 'contextMenu.navigateUp':
        case 'contextMenu.enterSubmenu':
        case 'contextMenu.exitSubmenu':
        case 'contextMenu.activateItem':
        case 'contextMenu.activateItem2':
        case 'contextMenu.close':
          this.handleContextMenuAction(actionId, event);
          break;

        // Window actions
        case 'window.minimize':
        case 'window.maximize':
        case 'window.close':
          this.handleWindowAction(actionId, event);
          break;

        // Taskbar actions
        case 'taskbar.activateButton':
        case 'taskbar.activateButton2':
        case 'taskbar.mediaControl':
        case 'taskbar.minimizeAll':
          this.handleTaskbarAction(actionId, event);
          break;

        default:
          console.warn('🎹 Unknown keyboard action:', actionId);
      }
    } catch (error) {
      console.error('❌ Error executing keyboard action:', actionId, error);
    }
  }

  // Action handlers
  handleGlobalEscape() {
    const startMenu = document.getElementById('start-menu');
    const contextMenu = document.getElementById('context-menu');

    if (startMenu && !startMenu.classList.contains('hidden')) {
      startMenu.classList.add('hidden');
      startMenu.setAttribute('aria-hidden', 'true');

      // Update focusability when hiding menu
      if (typeof window.updateStartMenuFocusability === 'function') {
        window.updateStartMenuFocusability(false);
      }

      const startButton = document.getElementById('start-button');
      if (startButton) {
        startButton.setAttribute('aria-expanded', 'false');
        startButton.focus();
      }
    }

    if (contextMenu && !contextMenu.classList.contains('hidden')) {
      contextMenu.classList.add('hidden');
    }
  }

  handleDesktopActivate(event) {
    const icon = event.target.closest('.draggable-icon');
    if (icon) {
      // Trigger double-click behavior
      icon.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }
  }

  handleDesktopStartDrag(event) {
    const icon = event.target.closest('.draggable-icon');
    if (icon && typeof window.startKeyboardDrag === 'function') {
      window.startKeyboardDrag(icon);
    }
  }

  handleDesktopCut(event) {
    const icon = event.target.closest('.draggable-icon');
    if (icon && typeof window.cutIcon === 'function') {
      window.cutIcon(icon);
    }
  }

  handleDesktopPaste(event) {
    if (typeof window.pasteIcon === 'function') {
      window.pasteIcon();
    }
  }

  handleDesktopEscape(event) {
    if (typeof window.endKeyboardDrag === 'function') {
      window.endKeyboardDrag(false);
    }
  }

  handleDesktopMove(event, actionId) {
    const icon = event.target.closest('.draggable-icon');
    if (!icon) return;

    const direction = actionId.split('.')[1].replace('move', '').toLowerCase();
    const directionMap = {
      'up': 'ArrowUp',
      'down': 'ArrowDown',
      'left': 'ArrowLeft',
      'right': 'ArrowRight'
    };

    if (typeof window.moveIconWithKeyboard === 'function') {
      window.moveIconWithKeyboard(icon, directionMap[direction]);
    }
  }

  handleDesktopFineMove(event, actionId) {
    const icon = event.target.closest('.draggable-icon');
    if (!icon) return;

    // Handle fine movement (Shift+Arrow equivalent)
    const direction = actionId.split('.')[1].replace('fineMove', '').toLowerCase();
    const currentLeft = parseInt(icon.style.left) || 0;
    const currentTop = parseInt(icon.style.top) || 0;
    const step = 5;

    let newLeft = currentLeft;
    let newTop = currentTop;

    switch (direction) {
      case 'up': newTop = Math.max(16, currentTop - step); break;
      case 'down': newTop = currentTop + step; break;
      case 'left': newLeft = Math.max(16, currentLeft - step); break;
      case 'right': newLeft = currentLeft + step; break;
    }

    icon.style.left = newLeft + 'px';
    icon.style.top = newTop + 'px';

    if (typeof window.constrainIconPosition === 'function') {
      window.constrainIconPosition(icon);
    }

    if (typeof window.desktopIconsState !== 'undefined') {
      window.desktopIconsState[icon.id] = {
        left: icon.style.left,
        top: icon.style.top
      };
    }

    if (typeof window.saveState === 'function') {
      window.saveState();
    }
  }

  handleStartMenuAction(actionId, event) {
    // Delegate to existing start menu keyboard navigation
    const action = actionId.split('.')[1];
    const startMenuNav = window.startMenuKeyboardNavState;

    if (startMenuNav && typeof startMenuNav.handleAction === 'function') {
      startMenuNav.handleAction(action, event);
    }
  }

  handleFileExplorerAction(actionId, event) {
    const action = actionId.split('.')[1];

    switch (action) {
      case 'rename':
        console.log('F2 - Rename functionality would trigger here');
        break;
      case 'delete':
        console.log('Delete - Delete functionality would trigger here');
        break;
      case 'open':
        const focusedItem = document.activeElement;
        if (focusedItem && focusedItem.classList.contains('file-item')) {
          focusedItem.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        }
        break;
      case 'navigateDown':
      case 'navigateUp':
        const direction = action === 'navigateDown' ? 'down' : 'up';
        const activeExplorer = document.querySelector('.file-explorer-window:focus-within');
        if (activeExplorer && typeof window.navigateFileList === 'function') {
          window.navigateFileList(direction, activeExplorer);
        }
        break;
      case 'openContextMenu':
      case 'openContextMenu2':
      case 'openContextMenu3':
        const target = event.target;
        const rect = target.getBoundingClientRect();
        const contextEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 2
        });
        target.dispatchEvent(contextEvent);
        break;
    }
  }

  handleContextMenuAction(actionId, event) {
    // Delegate to existing context menu navigation
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu && typeof window.handleContextMenuNavigation === 'function') {
      window.handleContextMenuNavigation(event, contextMenu);
    }
  }

  handleWindowAction(actionId, event) {
    const action = actionId.split('.')[1];
    const activeWindow = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');

    if (!activeWindow) return;

    const windowId = activeWindow.id;

    switch (action) {
      case 'minimize':
        if (typeof window.minimizeWindow === 'function') {
          window.minimizeWindow(windowId);
        }
        break;
      case 'maximize':
        if (typeof window.toggleFullScreen === 'function') {
          window.toggleFullScreen(windowId);
        }
        break;
      case 'close':
        if (typeof window.closeWindow === 'function') {
          window.closeWindow(windowId);
        }
        break;
    }
  }

  handleTaskbarAction(actionId, event) {
    const action = actionId.split('.')[1];

    switch (action) {
      case 'activateButton':
      case 'activateButton2':
        const button = event.target.closest('button');
        if (button) button.click();
        break;
      case 'mediaControl':
        if (typeof window.toggleMediaPlayback === 'function') {
          window.toggleMediaPlayback();
        }
        break;
      case 'minimizeAll':
        if (typeof window.minimizeAllWindows === 'function') {
          window.minimizeAllWindows();
        }
        break;
    }
  }

  // Public API methods
  remapShortcut(actionId, newKeyCombo) {
    if (!this.defaultShortcuts[actionId]) {
      throw new Error(`Unknown action: ${actionId}`);
    }

    this.customMappings.set(actionId, newKeyCombo);
    this.setupShortcuts();
    this.saveCustomMappings();
  }

  removeCustomMapping(actionId) {
    this.customMappings.delete(actionId);
    this.setupShortcuts();
    this.saveCustomMappings();
  }

  resetToDefaults() {
    this.customMappings.clear();
    this.setupShortcuts();
    this.saveCustomMappings();
  }

  getShortcuts() {
    return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
      id,
      ...shortcut
    }));
  }

  getShortcutsByContext() {
    const byContext = {};

    for (const [id, shortcut] of this.shortcuts.entries()) {
      const context = id.split('.')[0];
      if (!byContext[context]) byContext[context] = [];
      byContext[context].push({ id, ...shortcut });
    }

    return byContext;
  }
}

// Global keyboard service instance
const keyboardService = new KeyboardService();

// Export function to get initialized service
export async function getKeyboardService() {
  await keyboardService.initialize();
  return keyboardService;
}

// Keyboard app launcher
export async function launchKeyboard() {
  console.log('🎹 Starting keyboard app launch...');

  try {
    // Ensure keyboard service is initialized
    await keyboardService.initialize();
    console.log('🎹 Keyboard service initialized successfully');

    const existingWindow = document.getElementById('keyboard-app');
    if (existingWindow) {
      console.log('🎹 Existing keyboard window found, bringing to front');
      if (typeof window.bringToFront === 'function') {
        window.bringToFront(existingWindow);
      }
      return;
    }

    const windowId = 'keyboard-app';
    const content = getKeyboardAppHTML();
    console.log('🎹 Creating keyboard app window...');

    createWindow(
      'Keyboard Shortcuts',
      content,
      false,
      windowId,
      false,
      false,
      { type: 'integer', width: 800, height: 600 },
      'default'
    );

    console.log('🎹 Window created, initializing app...');
    // Initialize the app after window creation
    setTimeout(() => initializeKeyboardApp(windowId), 100);
  } catch (error) {
    console.error('❌ Failed to launch keyboard app:', error);
  }
}

function getKeyboardAppHTML() {
  return `
    <div class="keyboard-app h-full flex flex-col bg-gray-50">
      <div class="bg-blue-600 text-white p-3 flex items-center">
        <div class="w-8 h-8 bg-white bg-opacity-20 rounded mr-3 flex items-center justify-center">
          <span class="text-sm font-bold">⌨️</span>
        </div>
        <div>
          <h1 class="text-lg font-bold">Keyboard Shortcuts Manager</h1>
          <p class="text-sm opacity-90">Customize keyboard shortcuts for the entire system</p>
        </div>
      </div>

      <div class="flex-1 flex">
        <!-- Sidebar -->
        <div class="w-64 bg-white border-r border-gray-300 flex flex-col">
          <div class="p-3 border-b border-gray-200">
            <h2 class="font-bold text-gray-800">Categories</h2>
          </div>
          <div class="flex-1 overflow-y-auto">
            <div id="keyboard-categories" class="p-2 space-y-1">
              <!-- Categories will be populated here -->
            </div>
          </div>
          <div class="p-3 border-t border-gray-200 space-y-2">
            <div id="keyboard-reset-btn-container"></div>
            <div id="keyboard-export-btn-container"></div>
          </div>
        </div>

        <!-- Main content -->
        <div class="flex-1 flex flex-col">
          <div class="p-4 border-b border-gray-200 bg-gray-100">
            <div class="flex items-center justify-between">
              <div>
                <h2 id="keyboard-category-title" class="text-xl font-bold text-gray-800">Global Shortcuts</h2>
                <p id="keyboard-category-desc" class="text-sm text-gray-600">System-wide keyboard shortcuts</p>
              </div>
              <div class="flex items-center space-x-2">
                <input type="text" id="keyboard-search" placeholder="Search shortcuts..."
                       class="px-3 py-1 border border-gray-300 rounded text-sm">
                <div id="keyboard-help-btn-container"></div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div id="keyboard-shortcuts-list">
              <!-- Shortcuts list will be populated here -->
            </div>
          </div>
        </div>
      </div>

      <!-- Status bar -->
      <div class="bg-gray-200 border-t border-gray-300 px-4 py-2 text-sm text-gray-600">
        <div class="flex items-center justify-between">
          <span id="keyboard-status">Ready</span>
          <span id="keyboard-count">0 shortcuts loaded</span>
        </div>
      </div>
    </div>
  `;
}

function initializeKeyboardApp(windowId) {
  const keyboardWindow = document.getElementById(windowId);
  if (!keyboardWindow) {
    console.error('❌ Keyboard app window not found:', windowId);
    return;
  }

  console.log('🎹 Initializing keyboard app UI...');

  let currentCategory = 'global';
  let currentShortcutId = null;
  let capturedKey = null;

  // Initialize keyboard service
  keyboardService.initialize().then(() => {
    console.log('🎹 Keyboard service ready, populating UI...');
    populateCategories();
    showCategory('global');
    updateStatus('Keyboard service initialized');
  }).catch(error => {
    console.error('❌ Failed to initialize keyboard service:', error);
    updateStatus('Failed to initialize keyboard service');
  });

  function populateCategories() {
    const shortcuts = keyboardService.getShortcutsByContext();
    const categoriesContainer = keyboardWindow.querySelector('#keyboard-categories');

    const categoryNames = {
      global: 'Global',
      desktop: 'Desktop',
      startMenu: 'Start Menu',
      fileExplorer: 'File Explorer',
      contextMenu: 'Context Menu',
      window: 'Windows',
      taskbar: 'Taskbar'
    };

    const categoryIcons = {
      global: 'image/html.webp',
      desktop: 'image/desktop.webp',
      startMenu: 'image/door-icon.webp',
      fileExplorer: 'image/folder.webp',
      contextMenu: 'image/doc.webp',
      window: 'image/generic-window.webp',
      taskbar: 'image/desktop.webp'
    };

    categoriesContainer.innerHTML = '';

    Object.keys(shortcuts).forEach(category => {
      const button = document.createElement('button');
      button.className = 'w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm flex items-center space-x-2';

      const icon = document.createElement('img');
      icon.src = categoryIcons[category] || 'image/file.webp';
      icon.className = 'w-4 h-4';
      icon.alt = '';

      const text = document.createElement('span');
      text.textContent = categoryNames[category] || category;

      button.appendChild(icon);
      button.appendChild(text);
      button.onclick = () => showCategory(category);
      categoriesContainer.appendChild(button);
    });
  }

  function showCategory(category) {
    currentCategory = category;
    const shortcuts = keyboardService.getShortcutsByContext()[category] || [];

    // Update header
    const categoryNames = {
      global: 'Global Shortcuts',
      desktop: 'Desktop Shortcuts',
      startMenu: 'Start Menu Navigation',
      fileExplorer: 'File Explorer',
      contextMenu: 'Context Menus',
      window: 'Window Management',
      taskbar: 'Taskbar Controls'
    };

    const categoryDescs = {
      global: 'System-wide keyboard shortcuts',
      desktop: 'Desktop icon management and navigation',
      startMenu: 'Start menu navigation and activation',
      fileExplorer: 'File and folder operations',
      contextMenu: 'Context menu navigation',
      window: 'Window control operations',
      taskbar: 'Taskbar button and control shortcuts'
    };

    keyboardWindow.querySelector('#keyboard-category-title').textContent = categoryNames[category] || category;
    keyboardWindow.querySelector('#keyboard-category-desc').textContent = categoryDescs[category] || '';

    // Update active category button
    keyboardWindow.querySelectorAll('#keyboard-categories button').forEach(btn => {
      btn.classList.remove('bg-blue-100', 'border-blue-300');
    });

    const activeBtn = Array.from(keyboardWindow.querySelectorAll('#keyboard-categories button'))
      .find(btn => {
        const span = btn.querySelector('span');
        return span && span.textContent === (categoryNames[category] || category);
      });
    if (activeBtn) {
      activeBtn.classList.add('bg-blue-100', 'border-blue-300');
    }

    // Populate shortcuts list
    populateShortcutsList(shortcuts);
    updateStatus(`Showing ${shortcuts.length} shortcuts in ${categoryNames[category]}`);
    keyboardWindow.querySelector('#keyboard-count').textContent = `${shortcuts.length} shortcuts`;
  }

  function populateShortcutsList(shortcuts) {
    const container = keyboardWindow.querySelector('#keyboard-shortcuts-list');
    container.innerHTML = '';

    if (shortcuts.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500 py-8">No shortcuts in this category</div>';
      return;
    }

    shortcuts.forEach(shortcut => {
      const item = document.createElement('div');
      item.className = 'bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow';

      const isCustom = shortcut.isCustom;
      const defaultKey = keyboardService.defaultShortcuts[shortcut.id]?.key || '';

      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <h3 class="font-medium text-gray-800">${shortcut.description}</h3>
              ${isCustom ? '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Custom</span>' : ''}
            </div>
            <p class="text-sm text-gray-500 mt-1">Action: ${shortcut.id}</p>
            ${isCustom ? `<p class="text-xs text-gray-400 mt-1">Default: ${defaultKey}</p>` : ''}
          </div>
          <div class="flex items-center space-x-2">
            <code class="bg-gray-100 px-3 py-1 rounded font-mono text-sm">${shortcut.key}</code>
            <div class="edit-shortcut-btn" data-shortcut-id="${shortcut.id}"></div>
            ${isCustom ? `<div class="reset-shortcut-btn" data-shortcut-id="${shortcut.id}"></div>` : ''}
          </div>
        </div>
      `;

      container.appendChild(item);

      // Create Win95 buttons for this item
      const editBtnContainer = item.querySelector('.edit-shortcut-btn');
      const editBtn = makeWin95Button('Edit');
      editBtn.onclick = () => editShortcut(shortcut.id);
      editBtnContainer.appendChild(editBtn);

      if (isCustom) {
        const resetBtnContainer = item.querySelector('.reset-shortcut-btn');
        const resetBtn = makeWin95Button('Reset');
        resetBtn.onclick = () => resetShortcut(shortcut.id);
        resetBtnContainer.appendChild(resetBtn);
      }
    });
  }

  function editShortcut(shortcutId) {
    currentShortcutId = shortcutId;
    capturedKey = null;

    const shortcut = keyboardService.shortcuts.get(shortcutId);
    const shortcutName = shortcut ? shortcut.description : shortcutId;

    // Create key capture window
    const captureWindowId = 'keyboard-capture-window';
    const content = `
      <div class="p-4 bg-gray-100 h-full flex flex-col">
        <h3 class="text-lg font-bold mb-4">Remap Shortcut</h3>
        <p class="mb-4">Remapping: <strong>${shortcutName}</strong></p>
        <div class="flex-1 flex items-center justify-center">
          <div id="keyboard-capture-display" class="text-xl font-mono bg-white p-6 border-2 border-gray-400 text-center min-w-64" style="border-style: inset;">
            Press any key combination...
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-4 text-center">
          Press the key combination you want to assign.<br>
          Press Escape to cancel.
        </p>
        <div class="flex justify-center space-x-2">
          <div id="keyboard-capture-cancel-btn"></div>
          <div id="keyboard-capture-save-btn"></div>
        </div>
      </div>
    `;

    createWindow(
      'Capture Key Combination',
      content,
      false,
      captureWindowId,
      false,
      false,
      { type: 'integer', width: 400, height: 250 },
      'default'
    );

    // Initialize the capture window
    setTimeout(() => {
      const captureWindow = document.getElementById(captureWindowId);
      if (!captureWindow) return;

      // Create Win95 buttons
      const cancelBtnContainer = captureWindow.querySelector('#keyboard-capture-cancel-btn');
      const saveBtnContainer = captureWindow.querySelector('#keyboard-capture-save-btn');

      const cancelBtn = makeWin95Button('Cancel');
      cancelBtn.onclick = () => {
        cancelCapture();
        closeWindow(captureWindowId);
      };
      cancelBtnContainer.appendChild(cancelBtn);

      const saveBtn = makeWin95Button('Save');
      saveBtn.disabled = true;
      saveBtn.onclick = () => {
        saveCapture();
        closeWindow(captureWindowId);
      };
      saveBtnContainer.appendChild(saveBtn);

      // Set up key capture
      document.addEventListener('keydown', captureKeyHandler, true);

      // Focus the window
      captureWindow.focus();
    }, 100);
  }

  function captureKeyHandler(event) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      cancelCapture();
      closeWindow('keyboard-capture-window');
      return;
    }

    capturedKey = keyboardService.getKeyCombo(event);

    const captureWindow = document.getElementById('keyboard-capture-window');
    if (!captureWindow) return;

    const display = captureWindow.querySelector('#keyboard-capture-display');
    const saveBtnContainer = captureWindow.querySelector('#keyboard-capture-save-btn');

    display.textContent = capturedKey;

    // Enable the save button
    const saveBtn = saveBtnContainer.querySelector('button');
    if (saveBtn) saveBtn.disabled = false;
  }

  function cancelCapture() {
    document.removeEventListener('keydown', captureKeyHandler, true);
    currentShortcutId = null;
    capturedKey = null;
  }

  function saveCapture() {
    if (!currentShortcutId || !capturedKey) return;

    try {
      keyboardService.remapShortcut(currentShortcutId, capturedKey);
      showCategory(currentCategory); // Refresh the list
      updateStatus(`Shortcut updated: ${currentShortcutId} → ${capturedKey}`);
    } catch (error) {
      updateStatus(`Error: ${error.message}`);
    }

    cancelCapture();
  }

  function resetShortcut(shortcutId) {
    keyboardService.removeCustomMapping(shortcutId);
    showCategory(currentCategory); // Refresh the list
    updateStatus(`Shortcut reset to default: ${shortcutId}`);
  }

  function resetAllShortcuts() {
    if (typeof window.showDialogBox === 'function') {
      window.showDialogBox(
        'Are you sure you want to reset all shortcuts to their defaults? This cannot be undone.',
        'confirm',
        (result) => {
          if (result) {
            keyboardService.resetToDefaults();
            showCategory(currentCategory); // Refresh the list
            updateStatus('All shortcuts reset to defaults');
          }
        }
      );
    } else {
      // Fallback for systems without showDialogBox
      if (confirm('Are you sure you want to reset all shortcuts to their defaults? This cannot be undone.')) {
        keyboardService.resetToDefaults();
        showCategory(currentCategory); // Refresh the list
        updateStatus('All shortcuts reset to defaults');
      }
    }
  }

  function exportSettings() {
    const config = {
      customMappings: Object.fromEntries(keyboardService.customMappings),
      timestamp: Date.now(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyboard-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);

    updateStatus('Settings exported successfully');
  }

  function updateStatus(message) {
    keyboardWindow.querySelector('#keyboard-status').textContent = message;
  }

  function showSearchResults(query, filteredShortcuts) {
    // Update header to show search results
    keyboardWindow.querySelector('#keyboard-category-title').textContent = `Search Results for "${query}"`;
    keyboardWindow.querySelector('#keyboard-category-desc').textContent = `Found ${filteredShortcuts.length} shortcuts across all categories`;

    // Clear active category selection
    keyboardWindow.querySelectorAll('#keyboard-categories button').forEach(btn => {
      btn.classList.remove('bg-blue-100', 'border-blue-300');
    });

    // Populate search results with category context
    populateSearchResults(filteredShortcuts);
    updateStatus(`${filteredShortcuts.length} shortcuts found for "${query}"`);
    keyboardWindow.querySelector('#keyboard-count').textContent = `${filteredShortcuts.length} shortcuts found`;
  }

  function populateSearchResults(shortcuts) {
    const container = keyboardWindow.querySelector('#keyboard-shortcuts-list');
    container.innerHTML = '';

    if (shortcuts.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500 py-8">No shortcuts found matching your search</div>';
      return;
    }

    // Group shortcuts by category for better organization
    const shortcutsByCategory = {};
    shortcuts.forEach(shortcut => {
      const category = shortcut.id.split('.')[0];
      if (!shortcutsByCategory[category]) {
        shortcutsByCategory[category] = [];
      }
      shortcutsByCategory[category].push(shortcut);
    });

    const categoryNames = {
      global: 'Global',
      desktop: 'Desktop',
      startMenu: 'Start Menu',
      fileExplorer: 'File Explorer',
      contextMenu: 'Context Menu',
      window: 'Windows',
      taskbar: 'Taskbar'
    };

    const categoryIcons = {
      global: 'image/html.webp',
      desktop: 'image/desktop.webp',
      startMenu: 'image/door-icon.webp',
      fileExplorer: 'image/folder.webp',
      contextMenu: 'image/doc.webp',
      window: 'image/generic-window.webp',
      taskbar: 'image/desktop.webp'
    };

    // Display shortcuts grouped by category
    Object.keys(shortcutsByCategory).forEach(category => {
      const categoryShortcuts = shortcutsByCategory[category];

      // Category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'mb-2 mt-4 first:mt-0';
      categoryHeader.innerHTML = `
        <h3 class="text-sm font-bold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1 flex items-center space-x-2">
          <img src="${categoryIcons[category] || 'image/file.webp'}" class="w-4 h-4" alt="">
          <span>${categoryNames[category] || category} (${categoryShortcuts.length})</span>
        </h3>
      `;
      container.appendChild(categoryHeader);

      // Shortcuts in this category
      categoryShortcuts.forEach(shortcut => {
        const item = document.createElement('div');
        item.className = 'bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow';

        const isCustom = shortcut.isCustom;
        const defaultKey = keyboardService.defaultShortcuts[shortcut.id]?.key || '';

        item.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h3 class="font-medium text-gray-800">${shortcut.description}</h3>
                ${isCustom ? '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Custom</span>' : ''}
              </div>
              <p class="text-sm text-gray-500 mt-1">Action: ${shortcut.id}</p>
              ${isCustom ? `<p class="text-xs text-gray-400 mt-1">Default: ${defaultKey}</p>` : ''}
            </div>
            <div class="flex items-center space-x-2">
              <code class="bg-gray-100 px-3 py-1 rounded font-mono text-sm">${shortcut.key}</code>
              <div class="edit-shortcut-btn" data-shortcut-id="${shortcut.id}"></div>
              ${isCustom ? `<div class="reset-shortcut-btn" data-shortcut-id="${shortcut.id}"></div>` : ''}
            </div>
          </div>
        `;

        container.appendChild(item);

        // Create Win95 buttons for this item
        const editBtnContainer = item.querySelector('.edit-shortcut-btn');
        const editBtn = makeWin95Button('Edit');
        editBtn.onclick = () => editShortcut(shortcut.id);
        editBtnContainer.appendChild(editBtn);

        if (isCustom) {
          const resetBtnContainer = item.querySelector('.reset-shortcut-btn');
          const resetBtn = makeWin95Button('Reset');
          resetBtn.onclick = () => resetShortcut(shortcut.id);
          resetBtnContainer.appendChild(resetBtn);
        }
      });
    });
  }

  function setupSearch() {
    const searchInput = keyboardWindow.querySelector('#keyboard-search');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();

      if (!query.trim()) {
        // If search is empty, show current category
        showCategory(currentCategory);
        return;
      }

      // Search across all shortcuts, not just current category
      const allShortcuts = keyboardService.getShortcuts();
      const filtered = allShortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query) ||
        shortcut.id.toLowerCase().includes(query)
      );

      showSearchResults(query, filtered);
    });
  }

  // Event listeners
  // Create Win95 buttons for the main interface
  const resetBtnContainer = keyboardWindow.querySelector('#keyboard-reset-btn-container');
  const exportBtnContainer = keyboardWindow.querySelector('#keyboard-export-btn-container');
  const helpBtnContainer = keyboardWindow.querySelector('#keyboard-help-btn-container');

  const resetBtn = makeWin95Button('Reset All to Defaults');
  resetBtn.onclick = resetAllShortcuts;
  resetBtn.style.width = '100%';
  resetBtnContainer.appendChild(resetBtn);

  const exportBtn = makeWin95Button('Export Settings');
  exportBtn.onclick = exportSettings;
  exportBtn.style.width = '100%';
  exportBtnContainer.appendChild(exportBtn);

  const helpBtn = makeWin95Button('Help');
  helpBtn.onclick = () => {
    if (typeof window.showDialogBox === 'function') {
      window.showDialogBox(`
        <h3>Keyboard Shortcuts Help</h3>
        <p><strong>Editing Shortcuts:</strong> Click "Edit" next to any shortcut to assign a new key combination.</p>
        <p><strong>Resetting:</strong> Use "Reset" to restore a shortcut to its default, or "Reset All" for everything.</p>
        <p><strong>Key Combinations:</strong> You can use Ctrl, Alt, Shift, and Meta (Windows/Cmd) keys with letters, numbers, and function keys.</p>
        <p><strong>Search:</strong> Use the search box to quickly find specific shortcuts.</p>
        <p><strong>Export:</strong> Save your custom shortcuts to a file for backup or sharing.</p>
      `, 'info');
    }
  };
  helpBtnContainer.appendChild(helpBtn);

  setupSearch();
}

// Initialize the keyboard service when the module loads
if (typeof window !== 'undefined') {
  window.keyboardService = keyboardService;

// Auto-initialize when the service is first used
// This way we avoid initialization before the file system is ready
}
