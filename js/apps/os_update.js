import { storage } from '../os/indexeddb_storage.js';
import { createWindow, showDialogBox } from '../gui/window.js';
import { makeWin95Button } from '../gui/main.js';
import { getFileSystemState, setFileSystemState } from './file_explorer/storage.js';
import { saveState } from '../os/manage_data.js';

/**
 * OS Update App
 *
 * Checks for new default files and apps from the system manifest
 * and adds them to the user's system without overwriting existing data.
 */

let updateInProgress = false;

export function launchOSUpdate() {
  const updateWindow = createWindow(
    'OS Update',
    '<div id="os-update-content" style="padding: 20px;">Loading update information...</div>',
    false,
    'os-update-window',
    false,
    false,
    { type: 'integer', width: 600, height: 500 },
    'default'
  );

  // Load update data after window is created
  setTimeout(checkForUpdates, 100);
}

async function checkForUpdates() {
  const contentDiv = document.getElementById('os-update-content');
  if (!contentDiv) return;

  if (updateInProgress) {
    contentDiv.innerHTML = '<p class="text-yellow-600">An update is already in progress...</p>';
    return;
  }

  try {
    // Fetch the system manifest from the server
    const response = await fetch('./api/system_manifest.json');
    if (!response.ok) {
      throw new Error('Failed to fetch system manifest');
    }

    const manifest = await response.json();

    // Get current installed versions
    const installedVersions = await storage.getItem('installedVersions') || {
      systemVersion: '0.0.0',
      files: {},
      apps: {}
    };

    // Check for new files and apps
    const newFiles = [];
    const newApps = [];
    const updatedFiles = [];
    const updatedApps = [];

    // Check default files
    for (const file of manifest.defaultFiles) {
      const installedVersion = installedVersions.files[file.id];
      if (!installedVersion) {
        newFiles.push(file);
      } else if (compareVersions(file.version, installedVersion) > 0) {
        updatedFiles.push(file);
      }
    }

    // Check apps
    for (const app of manifest.apps) {
      const installedVersion = installedVersions.apps[app.id];
      if (!installedVersion) {
        newApps.push(app);
      } else if (compareVersions(app.version, installedVersion) > 0) {
        updatedApps.push(app);
      }
    }

    // Display update information
    displayUpdateInfo(manifest, installedVersions, newFiles, newApps, updatedFiles, updatedApps);

  } catch (error) {
    console.error('Error checking for updates:', error);
    contentDiv.innerHTML = `
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Error:</strong> Failed to check for updates. Please try again later.
        <br><small>${error.message}</small>
      </div>
    `;
  }
}

function displayUpdateInfo(manifest, installedVersions, newFiles, newApps, updatedFiles, updatedApps) {
  const contentDiv = document.getElementById('os-update-content');
  if (!contentDiv) return;

  const hasUpdates = newFiles.length > 0 || newApps.length > 0 || updatedFiles.length > 0 || updatedApps.length > 0;

  let html = `
    <div class="os-update-info">
      <h2 class="text-xl font-bold mb-4">System Update Check</h2>

      <div class="mb-6 p-4 bg-gray-100 rounded">
        <h3 class="text-lg font-semibold mb-2">Current System</h3>
        <p><strong>System Version:</strong> ${installedVersions.systemVersion || '0.0.0'}</p>
        <p><strong>Latest Version:</strong> ${manifest.version}</p>
        <p><strong>Installed Files:</strong> ${Object.keys(installedVersions.files).length}</p>
        <p><strong>Installed Apps:</strong> ${Object.keys(installedVersions.apps).length}</p>
      </div>
  `;

  if (hasUpdates) {
    html += `
      <div class="mb-6 p-4 bg-blue-100 border border-blue-400 rounded">
        <h3 class="text-lg font-semibold mb-2">✨ Updates Available!</h3>
    `;

    if (newFiles.length > 0) {
      html += `
        <div class="mb-3">
          <h4 class="font-semibold">New Default Files (${newFiles.length}):</h4>
          <ul class="list-disc list-inside ml-4">
            ${newFiles.map(f => `<li>${f.name} (v${f.version}) - ${f.description}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (updatedFiles.length > 0) {
      html += `
        <div class="mb-3">
          <h4 class="font-semibold">Updated Files (${updatedFiles.length}):</h4>
          <ul class="list-disc list-inside ml-4">
            ${updatedFiles.map(f => `<li>${f.name} (v${f.version})</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (newApps.length > 0) {
      html += `
        <div class="mb-3">
          <h4 class="font-semibold">New Applications (${newApps.length}):</h4>
          <ul class="list-disc list-inside ml-4">
            ${newApps.map(a => `<li>${a.name} (v${a.version})</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (updatedApps.length > 0) {
      html += `
        <div class="mb-3">
          <h4 class="font-semibold">Updated Applications (${updatedApps.length}):</h4>
          <ul class="list-disc list-inside ml-4">
            ${updatedApps.map(a => `<li>${a.name} (v${a.version})</li>`).join('')}
          </ul>
        </div>
      `;
    }

    html += `
        <p class="mt-3 text-sm text-gray-700">
          <strong>Note:</strong> Installing updates will add new files to your system.
          Your existing files and data will not be modified or deleted.
        </p>
      </div>
    `;

    html += `
      <div class="mb-4">
        <div id="install-update-btn-container"></div>
      </div>
    `;
  } else {
    html += `
      <div class="mb-6 p-4 bg-green-100 border border-green-400 rounded">
        <h3 class="text-lg font-semibold">✓ System is up to date!</h3>
        <p class="mt-2">You have the latest version of all files and applications.</p>
      </div>
    `;
  }

  html += `
    <div class="mt-6 flex gap-3">
      <div id="refresh-btn-container"></div>
    </div>
  </div>
  `;

  contentDiv.innerHTML = html;

  // Create buttons
  const refreshBtn = makeWin95Button('Check Again');
  refreshBtn.onclick = checkForUpdates;
  const refreshContainer = document.getElementById('refresh-btn-container');
  if (refreshContainer) {
    refreshContainer.appendChild(refreshBtn);
  }

  if (hasUpdates) {
    const installBtn = makeWin95Button('Install Updates');
    installBtn.onclick = () => installUpdates(manifest, newFiles, newApps, updatedFiles, updatedApps);
    const installContainer = document.getElementById('install-update-btn-container');
    if (installContainer) {
      installContainer.appendChild(installBtn);
    }
  }
}

async function installUpdates(manifest, newFiles, newApps, updatedFiles, updatedApps) {
  const contentDiv = document.getElementById('os-update-content');
  if (!contentDiv || updateInProgress) return;

  updateInProgress = true;

  contentDiv.innerHTML = `
    <div class="text-center py-8">
      <h2 class="text-xl font-bold mb-4">Installing Updates...</h2>
      <div class="mb-4">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
      <p class="text-gray-600">Please wait while we install the updates.</p>
      <div id="install-progress" class="mt-4 text-sm text-left max-w-md mx-auto"></div>
    </div>
  `;

  const progressDiv = document.getElementById('install-progress');
  const log = (message) => {
    if (progressDiv) {
      progressDiv.innerHTML += `<p class="text-gray-700">${message}</p>`;
      progressDiv.scrollTop = progressDiv.scrollHeight;
    }
  };

  try {
    // Get current installed versions
    const installedVersions = await storage.getItem('installedVersions') || {
      systemVersion: '0.0.0',
      files: {},
      apps: {}
    };

    // Install new and updated files
    const allFilesToInstall = [...newFiles, ...updatedFiles];
    if (allFilesToInstall.length > 0) {
      log(`Installing ${allFilesToInstall.length} file(s)...`);

      for (const file of allFilesToInstall) {
        try {
          await installDefaultFile(file);
          installedVersions.files[file.id] = file.version;
          log(`✓ Installed: ${file.name}`);
        } catch (error) {
          log(`✗ Failed to install ${file.name}: ${error.message}`);
          console.error('Error installing file:', file, error);
        }
      }
    }

    // Register new and updated apps
    const allAppsToRegister = [...newApps, ...updatedApps];
    if (allAppsToRegister.length > 0) {
      log(`Registering ${allAppsToRegister.length} app(s)...`);

      for (const app of allAppsToRegister) {
        installedVersions.apps[app.id] = app.version;
        log(`✓ Registered: ${app.name}`);
      }
    }

    // Update system version
    installedVersions.systemVersion = manifest.version;

    // Save installed versions
    await storage.setItem('installedVersions', installedVersions);

    log('✓ All updates installed successfully!');

    // Show success message
    setTimeout(() => {
      contentDiv.innerHTML = `
        <div class="text-center py-8">
          <h2 class="text-xl font-bold mb-4 text-green-600">✓ Updates Installed Successfully!</h2>
          <p class="mb-4">The following updates have been installed:</p>
          <div class="text-left max-w-md mx-auto mb-6">
            ${allFilesToInstall.length > 0 ? `<p>• ${allFilesToInstall.length} file(s) added</p>` : ''}
            ${allAppsToRegister.length > 0 ? `<p>• ${allAppsToRegister.length} app(s) registered</p>` : ''}
          </div>
          <p class="text-sm text-gray-600 mb-4">
            Check your Documents and Media folders to see the new files!
          </p>
          <div id="close-btn-container"></div>
        </div>
      `;

      const closeBtn = makeWin95Button('Close');
      closeBtn.onclick = () => {
        const updateWindow = document.getElementById('os-update-window');
        if (updateWindow) {
          updateWindow.remove();
        }
      };
      const closeContainer = document.getElementById('close-btn-container');
      if (closeContainer) {
        closeContainer.appendChild(closeBtn);
      }

      updateInProgress = false;
    }, 1000);

  } catch (error) {
    console.error('Error installing updates:', error);
    contentDiv.innerHTML = `
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> Failed to install updates.
        <br><small>${error.message}</small>
      </div>
    `;
    updateInProgress = false;
  }
}

async function installDefaultFile(fileConfig) {
  try {
    // Fetch the file content from the server
    const response = await fetch(`./${fileConfig.path}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${fileConfig.path}`);
    }

    // Get file system state
    const fs = await getFileSystemState();

    // Check if file already exists in the target folder
    const targetFolder = fs.folders[fileConfig.targetFolder];
    if (!targetFolder) {
      throw new Error(`Target folder not found: ${fileConfig.targetFolder}`);
    }

    // Check if file with this ID already exists
    const existingFile = Object.values(targetFolder).find(item =>
      item.id === fileConfig.id || item.name === fileConfig.name
    );

    if (existingFile) {
      // File already exists, update version only
      existingFile.version = fileConfig.version;
      existingFile.description = fileConfig.description;
      await setFileSystemState(fs);
      await saveState();
      return;
    }

    // Determine if it's a text or binary file
    const isTextFile = ['md', 'txt', 'html'].includes(fileConfig.contentType);

    let fileData;
    let fileEntry;

    if (isTextFile) {
      // Text file - store content directly
      const text = await response.text();

      fileEntry = {
        id: fileConfig.id,
        name: fileConfig.name,
        type: 'ugc-file',
        fullPath: `${fileConfig.targetFolder}/${fileConfig.id}`,
        content_type: fileConfig.contentType,
        icon: fileConfig.icon,
        contents: text,
        version: fileConfig.version,
        description: fileConfig.description,
        isDefault: true,
        isSystemFile: true
      };
    } else {
      // Binary file (image, audio) - store as data URL in IndexedDB
      const blob = await response.blob();
      const dataURL = await blobToDataURL(blob);

      // Store in IndexedDB
      await storage.setItem(`file_data_${fileConfig.id}`, dataURL);

      fileEntry = {
        id: fileConfig.id,
        name: fileConfig.name,
        type: 'ugc-file',
        fullPath: `${fileConfig.targetFolder}/${fileConfig.id}`,
        content_type: fileConfig.contentType,
        icon: fileConfig.icon,
        contents: '',
        version: fileConfig.version,
        description: fileConfig.description,
        isDefault: true,
        isSystemFile: true,
        isLargeFile: true,
        storageLocation: 'indexeddb',
        dataURL: dataURL
      };
    }

    // Add to file system
    targetFolder[fileConfig.id] = fileEntry;
    await setFileSystemState(fs);
    await saveState();

  } catch (error) {
    console.error('Error installing default file:', fileConfig, error);
    throw error;
  }
}

// Helper function to convert Blob to Data URL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Compare semantic versions (e.g., "1.2.3" vs "1.2.4")
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

export function refreshUpdateCheck() {
  checkForUpdates();
}
