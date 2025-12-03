import { setupDesktopDrop } from '../apps/file_explorer/drag_and_drop.js';
import { openFileExplorerForImageSelection } from './main.js';

// Import from sub-modules
import { makeIconDraggable } from './desktop/drag_drop.js';
import { updateDesktopSettings, applyDesktopSettings, getSettingsContent } from './desktop/settings.js';
import { renderDesktopIcons } from './desktop/icons.js';
import { initializeMobileInteractions } from './desktop/mobile.js';

// Re-export functions
export { makeIconDraggable, updateDesktopSettings, applyDesktopSettings, getSettingsContent, renderDesktopIcons };

// Initialize mobile interactions
initializeMobileInteractions();

// Make renderDesktopIcons globally available for file management operations
if (typeof window !== 'undefined') {
  window.renderDesktopIcons = renderDesktopIcons;
  window.makeIconDraggable = makeIconDraggable;
  window.applyDesktopSettings = applyDesktopSettings;

  // Initialize desktop drop functionality
  setupDesktopDrop();
}

// Event listeners for background image selection
document.addEventListener('click', e => {
  if (e.target.closest('#bg-image-select-btn')) {
    openFileExplorerForImageSelection((imageData, fileInfo) => {
        const nameDisplay = document.getElementById('bgImageName');
        const valueInput = document.getElementById('bgImageValue');
        if (nameDisplay) nameDisplay.textContent = fileInfo.name;
        if (valueInput) valueInput.value = imageData;
    });
  }

  if (e.target.closest('#bg-image-clear-btn')) {
      const nameDisplay = document.getElementById('bgImageName');
      const valueInput = document.getElementById('bgImageValue');
      if (nameDisplay) nameDisplay.textContent = 'None';
      if (valueInput) valueInput.value = '';
  }
});
