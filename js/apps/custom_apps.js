/**
 * Custom Apps Generator
 *
 * This module loads custom apps from custom_branding/custom_apps.json
 * and dynamically integrates them into the OS.
 */

import { createWindow, bringToFront } from '../gui/window.js';

// Store loaded custom apps
let customApps = [];

/**
 * Load custom apps from the JSON configuration file
 */
export async function loadCustomApps() {
  try {
    console.log('🔍 Loading custom apps from /custom_branding/custom_apps.json');
    const response = await fetch('/custom_branding/custom_apps.json');
    if (!response.ok) {
      console.warn('No custom apps configuration found');
      return [];
    }

    const data = await response.json();
    customApps = data.apps || [];

    console.log(`✅ Loaded ${customApps.length} custom app(s):`, customApps.map(a => a.title));
    return customApps;
  } catch (error) {
    console.error('❌ Failed to load custom apps:', error);
    return [];
  }
}

/**
 * Get all loaded custom apps
 */
export function getCustomApps() {
  return customApps;
}

/**
 * Generate a unique ID for a custom app
 */
function generateCustomAppId(app) {
  // Remove .html extension and sanitize filename
  const baseId = app.html_file.replace(/\.html$/, '').replace(/[^a-z0-9-]/gi, '-');
  return `custom-${baseId}`;
}

/**
 * Get a specific custom app by ID
 */
export function getCustomAppById(appId) {
  return customApps.find(app => {
    const generatedId = generateCustomAppId(app);
    return generatedId === appId;
  });
}

/**
 * Launch a custom app
 */
export function launchCustomApp(appId) {
  console.log(`🚀 Launching custom app: ${appId}`);
  const app = getCustomAppById(appId);

  if (!app) {
    console.error(`❌ Custom app not found: ${appId}`);
    console.log('Available custom apps:', customApps.map(a => ({ id: generateCustomAppId(a), title: a.title })));
    return;
  }

  console.log(`✅ Found custom app:`, app.title);
  const windowId = generateCustomAppId(app);

  // Check for existing window - must be in windows-container, not just any element with this ID
  const windowsContainer = document.getElementById('windows-container');
  const existingWindow = windowsContainer?.querySelector(`#${windowId}`);

  if (existingWindow) {
    console.log('♻️ Window already exists, bringing to front');
    bringToFront(existingWindow);
    return;
  }

  console.log('✨ No existing window, creating new one');

  // Get the icon path
  const iconPath = app.app_icon ? `/custom_branding/${app.app_icon}` : './image/file.webp';

  console.log('📦 Creating window with params:', {
    title: app.title,
    windowId,
    icon: iconPath
  });

  // Create window with icon parameter
  const win = createWindow(
    app.title,
    '',
    false,
    windowId,
    false,
    app.compostable === 'true' || app.compostable === true,
    { type: 'integer', width: 800, height: 600 },
    'App',
    null,
    'white',
    null,
    iconPath
  );

  console.log('📦 Window created:', win ? 'success' : 'FAILED', win?.id);

  // Load HTML content
  loadCustomAppContent(win, app).catch(console.error);
}

/**
 * Load the HTML content for a custom app
 */
async function loadCustomAppContent(win, app) {
  if (!win) {
    console.error('Window element not found');
    return;
  }

  const content = win.querySelector('.p-2');
  if (!content) {
    console.error('Content container not found in window');
    return;
  }

  try {
    // Load HTML file from custom_branding folder
    const response = await fetch(`/custom_branding/${app.html_file}`);

    if (!response.ok) {
      throw new Error(`Failed to load ${app.html_file}: ${response.statusText}`);
    }

    const html = await response.text();

    content.className = 'overflow-auto h-full';
    content.innerHTML = html;

    // Execute any scripts in the loaded HTML
    const scripts = content.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

  } catch (error) {
    console.error(`❌ Failed to load custom app content:`, error);
    content.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-red-600 font-bold mb-2">Error Loading App</p>
          <p class="text-gray-600">${error.message}</p>
        </div>
      </div>
    `;
  }
}

/**
 * Get custom apps formatted for the file system
 * This creates file system entries for shortcuts
 */
export function getCustomAppsForFileSystem() {
  return customApps
    .filter(app => app.filepath) // Include all apps with a filepath
    .map(app => {
      const appId = generateCustomAppId(app);
      // Normalize the filepath - keep drive paths like C:// but remove single trailing slash
      let filepath = app.filepath;
      if (filepath.endsWith('/') && !filepath.endsWith('://')) {
        filepath = filepath.slice(0, -1);
      }
      return {
        id: appId,
        name: app.title,
        type: 'app',
        fullPath: `${filepath}/${appId}`,
        content_type: 'html',
        contents: {},
        icon: app.app_icon ? `/custom_branding/${app.app_icon}` : './image/file.webp',
        isCustomApp: true,
        customAppData: app
      };
    });
}

/**
 * Get custom apps formatted for the start menu
 * Groups apps by their start_menu_location
 */
export function getCustomAppsForStartMenu() {
  const apps = customApps.filter(app => {
    const startMenuValue = app.start_menu;
    const shouldInclude = startMenuValue === 'true' || startMenuValue === true || startMenuValue === 'True';
    return shouldInclude;
  });

  // Group by start_menu_location
  const grouped = apps.reduce((acc, app) => {
    const location = app.start_menu_location || 'default';
    if (!acc[location]) {
      acc[location] = [];
    }

    const appId = generateCustomAppId(app);
    acc[location].push({
      id: appId,
      text: app.title,
      icon: app.app_icon ? `/custom_branding/${app.app_icon}` : './image/file.webp',
      type: 'item',
      isCustomApp: true,
      customAppData: app
    });

    return acc;
  }, {});

  return grouped;
}

/**
 * Get apps that should open on page load
 */
export function getAutoOpenApps() {
  return customApps
    .filter(app => app.open_on_pageload === 'true' || app.open_on_pageload === true)
    .map(app => generateCustomAppId(app));
}

/**
 * Check if an app ID is a custom app
 */
export function isCustomApp(appId) {
  return appId.startsWith('custom-') && getCustomAppById(appId) !== undefined;
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.loadCustomApps = loadCustomApps;
  window.getCustomApps = getCustomApps;
  window.launchCustomApp = launchCustomApp;
  window.isCustomApp = isCustomApp;
}
