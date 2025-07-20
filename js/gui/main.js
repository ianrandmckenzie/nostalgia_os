function toggleButtonActiveState(id, rename = null) {
  let btn;
  if (typeof id !== 'string') {
    btn = id;
  } else {
    btn = document.getElementById(id);
  }
  btn.classList.toggle('bg-gray-50');
  btn.classList.toggle('bg-gray-200');
  btn.classList.toggle('border-gray-300');
  btn.classList.toggle('border-black');
  const btnInner = btn.querySelector('span');
  btnInner.classList.toggle('border-gray-300');
  btnInner.classList.toggle('border-black');
  const btnImg = btn.querySelector('img');
  if (btnImg) {
    btnImg.classList.toggle('border-gray-300');
    btnImg.classList.toggle('border-black');
  }
  if (rename) {
    btnInner.innerHTML = rename;
  }
}

// Error!

function isOwnAppError(source) {
  if (!source) return true // sometimes source is null on same-origin scripts
  try {
    const srcUrl = new URL(source, location.href)
    return srcUrl.origin === location.origin
  } catch {
    return false
  }
}

function showErrorOverlay() {
  document.getElementById('error-overlay').classList.remove('hidden');
  document.getElementById('error-overlay').style.zIndex = '9999';

  // Add keydown event listener to reload page on any key press
  function handleKeyPress(event) {
    location.reload();
  }

  document.addEventListener('keydown', handleKeyPress, { once: true });
}

window.onerror = function(message, source, lineno, colno, error) {
  if (isOwnAppError(source)) showErrorOverlay()
}

window.addEventListener('unhandledrejection', function(event) {
  // These usually have no source, so assume they're from your app
  showErrorOverlay()
})

// Global helper function for Watercolour app to open file explorer for image selection
function openFileExplorerForImageSelection(callback) {
  // Store the callback globally so file selection can access it
  window.watercolourImageSelectionCallback = callback;
  window.watercolourSelectedFile = null; // Reset selection

  // Open file explorer
  if (typeof getExplorerWindowContent === 'function' && typeof createWindow === 'function') {
    const explorerContent = getExplorerWindowContent('C://Documents');
    createWindow('Select Image - File Explorer', explorerContent, true, 'explorer-image-select', false, false, { type: 'integer', width: 600, height: 550 }, 'file-explorer');

    // Add instructions and selection UI
    setTimeout(() => {
      const explorerWindow = document.getElementById('explorer-image-select');

      if (explorerWindow) {
        // Find the file-explorer-window div within the window and mark it for image selection mode
        const fileExplorerDiv = explorerWindow.querySelector('.file-explorer-window');

        if (fileExplorerDiv) {
          fileExplorerDiv.setAttribute('data-image-selection-mode', 'true');
        } else {
          console.error('Could not find .file-explorer-window div!');
        }

        // Add a notice at the top of the explorer
        const contentDiv = explorerWindow.querySelector('.p-2');
        if (contentDiv) {
          const notice = document.createElement('div');
          notice.className = 'bg-blue-100 border border-blue-300 text-blue-800 px-3 py-2 rounded mb-3 text-sm';
          notice.innerHTML = '<strong>Select an image:</strong> Click any image file (.png, .jpg, .jpeg, .gif, .webp) to select it, then click "Open Selected Image".';
          contentDiv.insertBefore(notice, contentDiv.firstChild);

          // Add selection UI at the bottom
          const selectionUI = document.createElement('div');
          selectionUI.className = 'mt-4 p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between';
          selectionUI.id = 'watercolour-selection-ui';
          selectionUI.innerHTML = `
            <div>
              <span id="selected-image-name" class="text-sm text-gray-600">No image selected</span>
            </div>
            <div class="flex gap-2">
              <button id="cancel-selection" class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
              <button id="open-selected-image" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled>Open Selected Image</button>
            </div>
          `;
          contentDiv.appendChild(selectionUI);

          // Add event listeners for the new buttons
          document.getElementById('cancel-selection').addEventListener('click', () => {
            window.watercolourImageSelectionCallback = null;
            window.watercolourSelectedFile = null;
            closeWindow('explorer-image-select');
          });

          document.getElementById('open-selected-image').addEventListener('click', () => {
            const selectedFile = window.watercolourSelectedFile;
            if (selectedFile && window.watercolourImageSelectionCallback) {
              handleWatercolourImageSelection(selectedFile);
            }
          });

        }
      } else {
        console.error('Explorer window not found!');
      }
    }, 100);
  } else {
    alert('File explorer functionality not available.');
  }
}
