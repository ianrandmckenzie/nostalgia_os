import { desktopSettings, saveState } from '../../os/manage_data.js';

export function updateDesktopSettings() {
  const color = document.getElementById('bgColorInput').value;
  const image = document.getElementById('bgImageValue').value;
  const clockSec = document.getElementById('clockSecondsInput').checked;


  desktopSettings.bgColor = color;
  desktopSettings.bgImage = image;
  desktopSettings.clockSeconds = clockSec;
  applyDesktopSettings();
  saveState();

}

export function applyDesktopSettings() {
  const desktop = document.getElementById('desktop');
  const windowsContainer = document.getElementById('windows-container');

  // Apply to windows-container as it sits on top of desktop div
  const target = windowsContainer || desktop;

  if (desktopSettings.bgColor) {
    target.style.backgroundColor = desktopSettings.bgColor;
    // Also apply to desktop base for good measure
    if (desktop) desktop.style.backgroundColor = desktopSettings.bgColor;
  }

  if (desktopSettings.bgImage) {
    target.style.backgroundImage = `url(${desktopSettings.bgImage})`;
    target.style.backgroundSize = 'cover';
    target.style.backgroundRepeat = 'no-repeat';
    target.style.backgroundPosition = 'center';
  } else {
    target.style.backgroundImage = 'none';
  }
}

export function getSettingsContent() {
  const currentImage = desktopSettings.bgImage ? 'Custom Image Selected' : 'None';
  return `
    <div class="space-y-4">
      <div>
        <label for="bgColorInput" class="block text-sm font-medium">Desktop Background Color:</label>
        <input id="bgColorInput" type="color" value="${desktopSettings.bgColor}" class="border mt-1" aria-describedby="bgColorHelp" />
        <p id="bgColorHelp" class="text-xs text-gray-600 mt-1">Choose a color for your desktop background</p>
      </div>
      <div>
        <label class="block text-sm font-medium">Background Image:</label>
        <div class="flex items-center gap-2 mt-1">
            <span id="bgImageName" class="text-sm text-gray-800 border px-2 py-1 bg-gray-50 flex-grow truncate">${currentImage}</span>
            <button id="bg-image-select-btn" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 px-2 py-1 text-sm active:border-t-black active:border-l-black active:border-b-white active:border-r-white">Select...</button>
            <button id="bg-image-clear-btn" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 px-2 py-1 text-sm active:border-t-black active:border-l-black active:border-b-white active:border-r-white">Clear</button>
        </div>
        <p class="text-xs text-gray-600 mt-1">Select an image from your computer to use as wallpaper</p>
        <input type="hidden" id="bgImageValue" value="${desktopSettings.bgImage || ''}">
      </div>
      <div>
        <label for="clockSecondsInput" class="block text-sm font-medium">Show Seconds on Clock:</label>
        <input id="clockSecondsInput" type="checkbox" ${desktopSettings.clockSeconds ? "checked" : ""} class="mt-1" aria-describedby="clockSecondsHelp" />
        <p id="clockSecondsHelp" class="text-xs text-gray-600 mt-1">Display seconds in the taskbar clock</p>
      </div>
      <button id="settings-apply-button"
              class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"
              aria-label="Apply desktop settings changes">
        <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Apply</span>
      </button>
    </div>
  `;
}
