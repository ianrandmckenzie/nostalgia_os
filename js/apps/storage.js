function launchStorage() {
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

async function loadStorageData() {
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
        </div>
      </div>
    `;

    contentDiv.innerHTML = html;

    // Create Windows-style buttons
    const refreshBtn = makeWin95Button('Refresh Data');
    refreshBtn.onclick = refreshStorageData;
    document.getElementById('refresh-btn-container').appendChild(refreshBtn);

    const cleanupBtn = makeWin95Button('Cleanup Options');
    cleanupBtn.onclick = openCleanupWindow;
    document.getElementById('cleanup-btn-container').appendChild(cleanupBtn);
  } catch (error) {
    contentDiv.innerHTML = `<div class="text-red-500">Error loading storage data: ${error.message}</div>`;
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

  // Analyze localStorage
  analyzeLocalStorage(analysis);

  // Analyze IndexedDB
  await analyzeIndexedDB(analysis);

  return analysis;
}

function analyzeLocalStorage(analysis) {
  try {
    const appState = JSON.parse(localStorage.getItem('appState') || '{}');
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
    console.error('Error analyzing localStorage:', error);
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

function refreshStorageData() {
  const contentDiv = document.getElementById('storage-content');
  if (contentDiv) {
    contentDiv.innerHTML = 'Refreshing storage information...';
    setTimeout(loadStorageData, 100);
  }
}

// Create a menu/form button with Win-95 raised edges
function makeWin95Button(label) {
  const btn  = document.createElement('button');
  btn.className = 'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
  const span = document.createElement('span');
  span.className = 'border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3';
  span.textContent = label;
  btn.appendChild(span);
  return btn;
}

function openCleanupWindow() {
  const cleanupWindow = createWindow(
    'Storage Cleanup',
    '<div id="cleanup-content" style="padding: 20px;">Loading cleanup options...</div>',
    false,
    'storage-cleanup-window',
    false,
    false,
    { type: 'integer', width: 400, height: 300 },
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
    const fs = getFileSystemState();
    if (fs.folders['C://'] && fs.folders['C://'].Music) {
      fs.folders['C://'].Music.contents = {};
      setFileSystemState(fs);
      saveState();
    }

    showDialogBox('Media player data cleared successfully!', 'info');
    refreshStorageData();
  } catch (error) {
    showDialogBox('Error clearing media player data: ' + error.message, 'error');
  }
}

function clearDesktopSettings() {
  const appState = JSON.parse(localStorage.getItem('appState') || '{}');
  appState.desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };
  appState.desktopIconsState = {};
  localStorage.setItem('appState', JSON.stringify(appState));

  showDialogBox('Desktop settings reset successfully!', 'info');
  refreshStorageData();
}

function fullSystemRestart() {
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
      console.log('Factory reset cancelled by user');
    }
  );
}

function performFactoryReset() {
  // Clear localStorage
  localStorage.clear();

  // Clear IndexedDB for media player
  const deleteRequest = indexedDB.deleteDatabase("media_player_db");
  deleteRequest.onsuccess = () => {
    console.log("Factory reset: Media player database cleared");
  };
  deleteRequest.onerror = (event) => {
    console.error("Factory reset: Error clearing media player database:", event);
  };

  // Reset state objects
  windowStates = {};
  desktopIconsState = {};
  desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };

  // Reload the page
  window.location.reload();
}
