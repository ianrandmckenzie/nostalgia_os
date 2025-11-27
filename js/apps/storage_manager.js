import { storage } from '../os/indexeddb_storage.js';
import { safeSetHTML, escapeHTML } from '../utils/sanitizer.js';
import { createWindow, showDialogBox } from '../gui/window.js';
import { makeWin95Button, makeWin95Prompt } from '../gui/main.js';
import { restart } from '../os/restart.js';

export function launchStorageManager() {
  const storageWindow = createWindow(
    'Storage Manager',
    '<div id="storage-content" style="padding: 20px;">Loading storage information...</div>',
    false,
    'storage-window',
    false,
    false,
    { type: 'integer', width: 600, height: 500 },
    'default'
  );

  // Load storage data after window is created
  setTimeout(loadStorageData, 100);
}

export async function loadStorageData() {
  const contentDiv = document.getElementById('storage-content');
  if (!contentDiv) return;

  try {
    // Get storage quota and usage
    const storageEstimate = await navigator.storage.estimate();
    const quotaInMB = (storageEstimate.quota / (1024 * 1024)).toFixed(2);
    const usageInMB = (storageEstimate.usage / (1024 * 1024)).toFixed(2);
    const availableInMB = ((storageEstimate.quota - storageEstimate.usage) / (1024 * 1024)).toFixed(2);
    const usagePercentage = ((storageEstimate.usage / storageEstimate.quota) * 100).toFixed(1);

    // Analyze stored data
    const dataAnalysis = await analyzeStoredData();

    const html = `
      <div class="storage-manager">
        <h2 class="text-xl font-bold mb-4">Storage Information</h2>

        <!-- Storage Capacity -->
        <div class="mb-6 p-4 bg-gray-100 rounded">
          <h3 class="text-lg font-semibold mb-2">Storage Capacity</h3>
          <div class="mb-2">
            <div class="flex justify-between mb-1">
              <span>Used: ${usageInMB} MB</span>
              <span>Available: ${availableInMB} MB</span>
            </div>
            <div class="w-full bg-gray-300 rounded-full h-4">
              <div class="bg-blue-500 h-4 rounded-full" style="width: ${usagePercentage}%"></div>
            </div>
            <div class="text-sm text-gray-600 mt-1">
              ${usagePercentage}% of ${quotaInMB} MB total capacity used
            </div>
          </div>
        </div>

        <!-- Data Categories -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3">Data Categories</h3>
          <div class="grid grid-cols-2 gap-4">
            ${generateCategoryCard('App Data', dataAnalysis.appData, 'bg-blue-100')}
            ${generateCategoryCard('Media Files', dataAnalysis.mediaData, 'bg-green-100')}
            ${generateCategoryCard('Files & Folders', dataAnalysis.fileData, 'bg-yellow-100')}
            ${generateCategoryCard('Miscellaneous', dataAnalysis.miscData, 'bg-gray-100')}
          </div>
        </div>

        <!-- Detailed Breakdown -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold mb-3">Detailed Breakdown</h3>
          <div class="bg-white border rounded p-3">
            ${generateDetailedBreakdown(dataAnalysis)}
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex gap-3">
          <div id="refresh-btn-container"></div>
          <div id="cleanup-btn-container"></div>
          <div id="restore-btn-container"></div>
        </div>
      </div>
    `;

    contentDiv.innerHTML = html;

    // Check if any apps are missing from Start menu
    const missingAppsInfo = await checkForMissingApps();

    // Create Windows-style buttons
    const refreshBtn = makeWin95Button('Refresh Data');
    refreshBtn.onclick = refreshStorageData;
    document.getElementById('refresh-btn-container').appendChild(refreshBtn);

    const cleanupBtn = makeWin95Button('Cleanup Options');
    cleanupBtn.onclick = openCleanupWindow;
    document.getElementById('cleanup-btn-container').appendChild(cleanupBtn);

    // Create restore button - enabled only if apps are missing
    const restoreBtn = makeWin95Button('Restore All Applications');
    restoreBtn.onclick = restoreAllApplications;
    if (missingAppsInfo.count === 0) {
      restoreBtn.disabled = true;
      restoreBtn.title = 'All applications are already in the Start menu';
      restoreBtn.style.opacity = '0.6';
      restoreBtn.style.cursor = 'not-allowed';
    } else {
      restoreBtn.title = `Restore ${missingAppsInfo.count} missing applications to Start menu`;
    }
    document.getElementById('restore-btn-container').appendChild(restoreBtn);
  } catch (error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500';
    errorDiv.textContent = `Error loading storage data: ${error.message}`;
    contentDiv.innerHTML = '';
    contentDiv.appendChild(errorDiv);
  }
}

function generateCategoryCard(title, data, bgClass) {
  const sizeInKB = (data.totalSize / 1024).toFixed(1);
  return `
    <div class="p-4 ${bgClass} rounded">
      <h4 class="font-semibold">${title}</h4>
      <div class="text-2xl font-bold">${data.count}</div>
      <div class="text-sm text-gray-600">items (${sizeInKB} KB)</div>
    </div>
  `;
}

function generateDetailedBreakdown(analysis) {
  let html = '<div class="space-y-2 text-sm">';

  // App Data breakdown
  if (analysis.appData.breakdown.length > 0) {
    html += '<div><strong>App Data:</strong></div>';
    analysis.appData.breakdown.forEach(item => {
      html += `<div class="ml-4">• ${item.name}: ${item.count} items</div>`;
    });
  }

  // Media Data breakdown
  if (analysis.mediaData.breakdown.length > 0) {
    html += '<div class="mt-3"><strong>Media Files:</strong></div>';
    analysis.mediaData.breakdown.forEach(item => {
      const sizeInKB = (item.size / 1024).toFixed(1);
      html += `<div class="ml-4">• ${item.type}: ${item.count} files (${sizeInKB} KB)</div>`;
    });
  }

  // File System breakdown
  if (analysis.fileData.breakdown.length > 0) {
    html += '<div class="mt-3"><strong>Files & Folders:</strong></div>';
    analysis.fileData.breakdown.forEach(item => {
      html += `<div class="ml-4">• ${item.name}: ${item.count} items</div>`;
    });
  }

  html += '</div>';
  return html;
}

async function analyzeStoredData() {
  const analysis = {
    appData: { count: 0, totalSize: 0, breakdown: [] },
    mediaData: { count: 0, totalSize: 0, breakdown: [] },
    fileData: { count: 0, totalSize: 0, breakdown: [] },
    miscData: { count: 0, totalSize: 0, breakdown: [] }
  };

  await analyzeStorage(analysis);

  // Analyze IndexedDB
  await analyzeIndexedDB(analysis);

  return analysis;
}

async function analyzeStorage(analysis) {
  try {
    const appStateData = await storage.getItem('appState');
    const appState = appStateData || {};
    const appStateSize = JSON.stringify(appState).length;

    // File system data
    if (appState.fileSystemState) {
      const fileSystemSize = JSON.stringify(appState.fileSystemState).length;
      analysis.fileData.totalSize += fileSystemSize;

      // Count files and folders
      const fs = appState.fileSystemState;
      if (fs.folders) {
        Object.values(fs.folders).forEach(drive => {
          countFilesAndFolders(drive, analysis.fileData);
        });
      }
    }

    // Window states
    if (appState.windowStates) {
      const windowSize = JSON.stringify(appState.windowStates).length;
      analysis.appData.totalSize += windowSize;
      analysis.appData.count += Object.keys(appState.windowStates).length;
      analysis.appData.breakdown.push({
        name: 'Window States',
        count: Object.keys(appState.windowStates).length
      });
    }

    // Desktop icons
    if (appState.desktopIconsState) {
      const iconSize = JSON.stringify(appState.desktopIconsState).length;
      analysis.appData.totalSize += iconSize;
      analysis.appData.count += Object.keys(appState.desktopIconsState).length;
      analysis.appData.breakdown.push({
        name: 'Desktop Icons',
        count: Object.keys(appState.desktopIconsState).length
      });
    }

    // Desktop settings
    if (appState.desktopSettings) {
      const settingsSize = JSON.stringify(appState.desktopSettings).length;
      analysis.appData.totalSize += settingsSize;
      analysis.appData.count += 1;
      analysis.appData.breakdown.push({
        name: 'Desktop Settings',
        count: 1
      });
    }
  } catch (error) {
    console.error('Error analyzing storage:', error);
  }
}

function countFilesAndFolders(item, fileData) {
  if (!item || typeof item !== 'object') return;

  if (item.type === 'folder') {
    fileData.count++;
    if (item.contents) {
      Object.values(item.contents).forEach(subItem => {
        countFilesAndFolders(subItem, fileData);
      });
    }
  } else if (item.type === 'ugc-file') {
    fileData.count++;
    // Check if it's a media file
    const mediaTypes = ['mp3', 'mp4', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'wav', 'webm'];
    if (mediaTypes.includes(item.content_type)) {
      // This will be counted in media data analysis
    }
  } else {
    // Check if it's a direct folder structure
    Object.values(item).forEach(subItem => {
      if (subItem && typeof subItem === 'object') {
        countFilesAndFolders(subItem, fileData);
      }
    });
  }
}

async function analyzeIndexedDB(analysis) {
  try {
    // Check for media player database
    const databases = await indexedDB.databases();

    for (const dbInfo of databases) {
      if (dbInfo.name === 'media_player_db') {
        await analyzeMediaPlayerDB(analysis);
      } else {
        // Other databases count as misc
        analysis.miscData.count += 1;
        analysis.miscData.breakdown.push({
          name: `Database: ${dbInfo.name}`,
          count: 1
        });
      }
    }
  } catch (error) {
    console.error('Error analyzing IndexedDB:', error);
  }
}

async function analyzeMediaPlayerDB(analysis) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('media_player_db');

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['songs'], 'readonly');
      const store = transaction.objectStore('songs');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const songs = getAllRequest.result;
        const mediaBreakdown = {};

        songs.forEach(song => {
          const fileType = song.type || 'unknown';
          if (!mediaBreakdown[fileType]) {
            mediaBreakdown[fileType] = { count: 0, size: 0 };
          }
          mediaBreakdown[fileType].count++;
          if (song.file && song.file.size) {
            mediaBreakdown[fileType].size += song.file.size;
            analysis.mediaData.totalSize += song.file.size;
          }
          analysis.mediaData.count++;
        });

        // Add breakdown details
        Object.entries(mediaBreakdown).forEach(([type, data]) => {
          analysis.mediaData.breakdown.push({
            type: type.toUpperCase(),
            count: data.count,
            size: data.size
          });
        });

        db.close();
        resolve();
      };

      getAllRequest.onerror = () => {
        db.close();
        reject(getAllRequest.error);
      };
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export function refreshStorageData() {
  const contentDiv = document.getElementById('storage-content');
  if (contentDiv) {
    contentDiv.innerHTML = 'Refreshing storage information...';
    setTimeout(loadStorageData, 100);
  }
}

// Create a menu/form button with Win-95 raised edges
// Create a dropdown with Win-95 styling
export function makeWin95Dropdown(options, selectedValue = null, onChange = null) {
  const select = document.createElement('select');
  select.className = 'bg-white border-t-2 border-l-2 border-black border-b-2 border-r-2 border-gray-300 px-2 py-1';
  select.setAttribute('aria-label', 'Select storage cleanup option');
  select.setAttribute('title', 'Choose which type of data to clean up');

  // Add options to the dropdown
  options.forEach(option => {
    const optionElement = document.createElement('option');

    // Handle both string options and object options with value/text
    if (typeof option === 'string') {
      optionElement.value = option;
      optionElement.textContent = option;
    } else {
      optionElement.value = option.value;
      optionElement.textContent = option.text || option.value;
    }

    // Set selected if this matches the selectedValue
    if (selectedValue !== null && optionElement.value === selectedValue) {
      optionElement.selected = true;
    }

    select.appendChild(optionElement);
  });

  // Add change event listener if provided
  if (onChange && typeof onChange === 'function') {
    select.addEventListener('change', (e) => onChange(e.target.value, e));
  }

  return select;
}

export function openCleanupWindow() {
  const cleanupWindow = createWindow(
    'Storage Cleanup',
    '<div id="cleanup-content" style="padding: 20px;">Loading cleanup options...</div>',
    false,
    'storage-cleanup-window',
    false,
    false,
    { type: 'integer', width: 400, height: 340 },
    'default'
  );

  // Bring window to front (highest z-index)
  setTimeout(() => {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) => getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl );
    cleanupWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
  }, 50);

  // Load cleanup options after window is created
  setTimeout(loadCleanupOptions, 100);
}

function loadCleanupOptions() {
  const contentDiv = document.getElementById('cleanup-content');
  if (!contentDiv) return;

  const html = `
    <div class="cleanup-options">
      <h3 class="text-lg font-semibold mb-4">Storage Cleanup Options</h3>
      <p class="text-sm text-gray-600 mb-4">Choose what data to clear:</p>

      <div class="space-y-3">
        <div id="clear-media-btn-container"></div>
        <div id="clear-desktop-btn-container"></div>
        <div id="full-restart-btn-container"></div>
      </div>
    </div>
  `;

  contentDiv.innerHTML = html;

  // Create Windows-style buttons for cleanup options
  const clearMediaBtn = makeWin95Button('Clear Media Player Data');
  clearMediaBtn.onclick = clearMediaPlayer;
  clearMediaBtn.className += ' w-full mb-2';
  document.getElementById('clear-media-btn-container').appendChild(clearMediaBtn);

  const clearDesktopBtn = makeWin95Button('Reset Desktop Settings');
  clearDesktopBtn.onclick = clearDesktopSettings;
  clearDesktopBtn.className += ' w-full mb-2';
  document.getElementById('clear-desktop-btn-container').appendChild(clearDesktopBtn);

  const fullRestartBtn = makeWin95Button('Factory Reset');
  fullRestartBtn.onclick = fullSystemRestart;
  fullRestartBtn.className += ' w-full mb-2';
  // Make this button look more dangerous
  fullRestartBtn.style.backgroundColor = '#ffcccc';
  document.getElementById('full-restart-btn-container').appendChild(fullRestartBtn);
}

async function clearMediaPlayer() {
  try {
    await new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('media_player_db');
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = reject;
    });

    // Also clear media files from file system
    const fs = getFileSystemStateSync();
    if (fs.folders['C://Media']) {
      fs.folders['C://Media'] = {};
      setFileSystemState(fs);
      saveState();
    }

    showDialogBox('Media player data cleared successfully!', 'info');
    refreshStorageData();
  } catch (error) {
    showDialogBox('Error clearing media player data: ' + error.message, 'error');
  }
}

async function clearDesktopSettings() {
  const appStateData = await storage.getItem('appState');
  const appState = appStateData || {};
  appState.desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };
  appState.desktopIconsState = {};
  appState.startMenuOrder = [];
  await storage.setItem('appState', appState);

  showDialogBox('Desktop settings reset successfully!', 'info');
  refreshStorageData();
}

// Check for missing applications in Start menu
async function checkForMissingApps() {
  try {
    // Get the complete list of default applications from start menu
    const defaultApps = [
      { id: 'mycomp', text: 'My Computer', icon: 'image/computer.webp' },
      { id: 'suggestionboxapp', text: 'Suggestion Box', icon: 'image/mail.webp' },
      { id: 'mediaapp', text: 'Media Player', icon: 'image/video.webp' },
      { id: 'watercolourapp', text: 'Watercolour', icon: 'image/watercolour.webp' },
      { id: 'letterpad', text: 'LetterPad', icon: 'image/file.webp' },
      { id: 'calcapp', text: 'Calculator', icon: 'image/calculator.webp' },
      { id: 'keyboard', text: 'Keyboard', icon: 'image/keyboard.webp' },
      { id: 'sysset', text: 'System Settings', icon: 'image/gears.webp' },
      { id: 'storageapp', text: 'Storage Manager', icon: 'image/drive_c.webp' },
      { id: 'abtcomp', text: 'About This Computer', icon: 'image/info.webp' },
      { id: 'solapp', text: 'Solitaire', icon: 'image/solitaire.webp' },
      { id: 'chessapp', text: 'Guillotine Chess', icon: 'image/guillotine_chess.webp' },
      { id: 'bombapp', text: 'Bombbroomer', icon: 'image/bombbroomer.webp' },
      { id: 'pongapp', text: 'Pong', icon: 'image/pong.webp' },
      { id: 'snakeapp', text: 'Snake', icon: 'image/snake.webp' },
      { id: 'happyturdapp', text: 'Happy Turd', icon: 'image/happyturd.webp' }
    ];

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

    // Create a set of all currently visible app IDs
    const visibleAppIds = new Set();

    // Check main menu items
    currentOrder.forEach(orderItem => {
      if (typeof orderItem === 'string') {
        visibleAppIds.add(orderItem);
      } else if (orderItem && orderItem.type === 'group' && orderItem.items) {
        // Check submenu items
        orderItem.items.forEach(subItem => {
          if (subItem && subItem.id) {
            visibleAppIds.add(subItem.id);
          }
        });
      }
    });

    // Find missing apps
    const missingApps = defaultApps.filter(app => !visibleAppIds.has(app.id));


    return {
      count: missingApps.length,
      apps: missingApps
    };
  } catch (error) {
    console.error('Error checking for missing apps:', error);
    return { count: 0, apps: [] };
  }
}

// Restore all missing applications to the Start menu
async function restoreAllApplications() {
  try {

    // Check what apps are missing
    const missingAppsInfo = await checkForMissingApps();

    if (missingAppsInfo.count === 0) {
      if (typeof showDialogBox === 'function') {
        showDialogBox('All applications are already present in the Start menu.', 'info');
      } else {
        alert('All applications are already present in the Start menu.');
      }
      return;
    }

    // Show confirmation dialog
    const confirmMessage = `This will restore ${missingAppsInfo.count} missing applications to the Start menu:\n\n${missingAppsInfo.apps.map(app => `• ${app.text}`).join('\n')}\n\nProceed?`;

    if (typeof showDialogBox === 'function') {
      // Use OS-style dialog
      showDialogBox(confirmMessage, 'confirmation', async () => {
        await performAppRestore(missingAppsInfo.apps);
      });
    } else {
      // Fallback to browser confirm
      if (confirm(confirmMessage)) {
        await performAppRestore(missingAppsInfo.apps);
      }
    }
  } catch (error) {
    console.error('❌ Error in restoreAllApplications:', error);
    if (typeof showDialogBox === 'function') {
      showDialogBox('Failed to restore applications: ' + error.message, 'error');
    } else {
      alert('Failed to restore applications: ' + error.message);
    }
  }
}

// Perform the actual restore operation
async function performAppRestore(missingApps) {
  try {

    // Get current start menu order
    let currentOrder = [];
    try {
      const directOrder = await storage.getItem('startMenuOrder');
      if (directOrder && Array.isArray(directOrder)) {
        currentOrder = [...directOrder];
      } else {
        currentOrder = (typeof startMenuOrder !== 'undefined') ? [...startMenuOrder] : [...(window.startMenuOrder || [])];
      }
    } catch (error) {
      currentOrder = (typeof startMenuOrder !== 'undefined') ? [...startMenuOrder] : [...(window.startMenuOrder || [])];
    }

    // Define default groupings for restored apps
    const defaultGroupings = {
      'letterpad': 'utilities-group',
      'calcapp': 'utilities-group',
      'sysset': 'utilities-group',
      'storageapp': 'utilities-group',
      'abtcomp': 'utilities-group',
      'solapp': 'games-group',
      'chessapp': 'games-group',
      'bombapp': 'games-group',
      'pongapp': 'games-group',
      'snakeapp': 'games-group'
    };

    // Process missing apps
    missingApps.forEach(missingApp => {
      const targetGroup = defaultGroupings[missingApp.id];

      if (targetGroup) {
        // Add to appropriate group
        let groupFound = false;
        currentOrder = currentOrder.map(orderItem => {
          if (typeof orderItem === 'object' && orderItem.type === 'group' && orderItem.id === targetGroup) {
            groupFound = true;
            return {
              ...orderItem,
              items: [...(orderItem.items || []), {
                id: missingApp.id,
                text: missingApp.text,
                icon: missingApp.icon
              }]
            };
          }
          return orderItem;
        });

        // If group doesn't exist, create it
        if (!groupFound) {
          const groupData = getDefaultGroupData(targetGroup);
          if (groupData) {
            groupData.items = [{ id: missingApp.id, text: missingApp.text, icon: missingApp.icon }];
            // Insert before restart item if it exists
            const restartIndex = currentOrder.findIndex(item => item === 'rstrtcomp');
            if (restartIndex !== -1) {
              currentOrder.splice(restartIndex, 0, groupData);
            } else {
              currentOrder.push(groupData);
            }
          }
        }
      } else {
        // Add as main menu item
        // Insert before restart item if it exists
        const restartIndex = currentOrder.findIndex(item => item === 'rstrtcomp');
        if (restartIndex !== -1) {
          currentOrder.splice(restartIndex, 0, missingApp.id);
        } else {
          currentOrder.push(missingApp.id);
        }
      }
    });

    // Update global state
    window.startMenuOrder = currentOrder;
    if (typeof startMenuOrder !== 'undefined') {
      startMenuOrder = currentOrder;
    }

    // Save to storage
    await storage.setItem('startMenuOrder', currentOrder);

    // Also save to appState
    if (typeof saveState === 'function') {
      await saveState();
    }

    // Regenerate start menu if the function exists
    if (typeof generateStartMenuHTML === 'function') {
      generateStartMenuHTML();
    } else if (typeof window.generateStartMenuHTML === 'function') {
      window.generateStartMenuHTML();
    }

    // Re-initialize drag and drop
    if (typeof safeInitializeStartMenuDragDrop === 'function') {
      setTimeout(() => {
        safeInitializeStartMenuDragDrop();
      }, 50);
    } else if (typeof window.safeInitializeStartMenuDragDrop === 'function') {
      setTimeout(() => {
        window.safeInitializeStartMenuDragDrop();
      }, 50);
    }

    // Show success message
    if (typeof showDialogBox === 'function') {
      showDialogBox(`Successfully restored ${missingApps.length} applications to the Start menu.`, 'info');
    } else {
      alert(`Successfully restored ${missingApps.length} applications to the Start menu.`);
    }

    // Refresh the Storage Manager to update the restore button
    setTimeout(() => {
      refreshStorageData();
    }, 500);


  } catch (error) {
    console.error('❌ Error performing app restore:', error);
    if (typeof showDialogBox === 'function') {
      showDialogBox('Failed to restore applications: ' + error.message, 'error');
    } else {
      alert('Failed to restore applications: ' + error.message);
    }
  }
}

// Get default group data structure
function getDefaultGroupData(groupId) {
  const defaultGroups = {
    'utilities-group': {
      id: 'utilities-group',
      text: 'Utilities',
      type: 'group',
      items: []
    },
    'games-group': {
      id: 'games-group',
      text: 'Games',
      type: 'group',
      items: []
    }
  };

  return defaultGroups[groupId] || null;
}

export function fullSystemRestart() {
  showDialogBox(
    'This will completely wipe the entire hard drive and reset the system to factory defaults. All your files, settings, and data will be permanently deleted.',
    'confirmation',
    () => {
      // If confirmed in the OS dialog, show a real browser confirmation as final warning
      if (confirm('⚠️ FINAL WARNING ⚠️\n\nThis will permanently delete EVERYTHING you have ever saved in this application:\n\n• All uploaded files and media\n• All documents and folders\n• All settings and customizations\n• All application data\n\nThis action cannot be undone!\n\nAre you absolutely sure you want to proceed?')) {
        performFactoryReset();
      }
    },
    () => {
      // Cancel button was clicked - do nothing
    }
  );
}

function performFactoryReset() {
  // Clear all storage
  storage.clearSync();

  // Clear IndexedDB for media player
  const deleteRequest = indexedDB.deleteDatabase("media_player_db");
  deleteRequest.onsuccess = () => {
  };
  deleteRequest.onerror = (event) => {
    console.error("Factory reset: Error clearing media player database:", event);
  };

  // Reset state objects
  windowStates = {};
  desktopIconsState = {};
  startMenuOrder = [];
  desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };

  // Reload the page
  window.location.reload();
}
