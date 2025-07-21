export function toggleButtonActiveState(id, rename = null) {
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
export function openFileExplorerForImageSelection(callback) {
  // Store the callback globally so file selection can access it
  window.watercolourImageSelectionCallback = callback;
  window.watercolourSelectedFile = null; // Reset selection

  // Open file explorer
  if (typeof getExplorerWindowContent === 'function' && typeof createWindow === 'function') {
    const explorerContent = getExplorerWindowContent('C://Documents');
    const explorerWindow = createWindow('Select Image - File Explorer', explorerContent, true, 'explorer-image-select', false, false, { type: 'integer', width: 600, height: 550 }, 'file-explorer');

    // Ensure this window has the highest z-index (but only by 1)
    setTimeout(() => {
      const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
      if (elementsWithZIndex.length > 0) {
        const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
          getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
        );
        explorerWindow.style.zIndex = `${parseInt(getComputedStyle(highestZIndex).zIndex) + 1}`;
      }
    }, 50);

    // Add instructions and selection UI
    setTimeout(() => {
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
          selectionUI.className = '-mt-2 p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between';
          selectionUI.id = 'watercolour-selection-ui';

          // Create button container
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'flex gap-2';

          // Create Win95 buttons
          const cancelBtn = makeWin95Button('Cancel');
          cancelBtn.id = 'cancel-selection';

          const openBtn = makeWin95Button('Open');
          openBtn.id = 'open-selected-image';
          openBtn.disabled = true;

          // Add disabled styling for the open button
          openBtn.style.opacity = '0.5';
          openBtn.style.cursor = 'not-allowed';

          buttonContainer.appendChild(cancelBtn);
          buttonContainer.appendChild(openBtn);

          selectionUI.innerHTML = `
            <div>
              <span id="selected-image-name" class="text-sm text-gray-600">No image selected</span>
            </div>
          `;
          selectionUI.appendChild(buttonContainer);
          contentDiv.appendChild(selectionUI);

          // Add event listeners for the new buttons
          cancelBtn.addEventListener('click', () => {
            window.watercolourImageSelectionCallback = null;
            window.watercolourSelectedFile = null;
            closeWindow('explorer-image-select');
          });

          openBtn.addEventListener('click', () => {
            const selectedFile = window.watercolourSelectedFile;
            if (selectedFile && window.watercolourImageSelectionCallback && !openBtn.disabled) {
              handleWatercolourImageSelection(selectedFile);
            }
          });

          // Add a global function to enable/disable the open button (for file explorer GUI to use)
          window.updateWatercolourImageSelectionButton = function(enabled) {
            if (enabled) {
              openBtn.disabled = false;
              openBtn.style.opacity = '1';
              openBtn.style.cursor = 'pointer';
            } else {
              openBtn.disabled = true;
              openBtn.style.opacity = '0.5';
              openBtn.style.cursor = 'not-allowed';
            }
          };

        }
      } else {
        console.error('Explorer window not found!');
      }
    }, 100);
  } else {
    showDialogBox('File explorer functionality not available.', 'error');
  }
}

// Create a menu/form button with Win-95 raised edges
export function makeWin95Button(label) {
  const btn  = document.createElement('button');
  btn.className = 'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
  const span = document.createElement('span');
  span.className = 'border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3';
  span.textContent = label;
  btn.appendChild(span);
  return btn;
}

// Windows 95-style prompt dialog replacement
export function makeWin95Prompt(message, defaultValue = '', onConfirm = null, onCancel = null) {
  const uniqueWindowId = 'promptWindow-' + Date.now();

  // Create the dialog window content
  const dialogWindow = createWindow('💬 Input Required', '', false, uniqueWindowId, false, false, { type: 'integer', width: 400, height: 200 }, "default");

  // Get the content area
  const contentDiv = dialogWindow.querySelector('.p-2');
  if (contentDiv) {
    // Clear existing content
    contentDiv.innerHTML = '';

    // Create the prompt content
    const promptContainer = document.createElement('div');
    promptContainer.className = 'flex flex-col p-4 h-full justify-between';

    // Message area
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-4';
    messageDiv.innerHTML = `<p class="text-sm mb-3">${message}</p>`;

    // Input field with Win95 styling
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.id = `${uniqueWindowId}-input`;
    inputField.value = defaultValue;
    inputField.className = 'w-full px-2 py-1 border-2 border-gray-400 bg-white';
    inputField.style.borderTopColor = '#808080';
    inputField.style.borderLeftColor = '#808080';
    inputField.style.borderBottomColor = '#ffffff';
    inputField.style.borderRightColor = '#ffffff';
    inputField.style.borderStyle = 'inset';

    messageDiv.appendChild(inputField);
    promptContainer.appendChild(messageDiv);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex gap-2 justify-center';

    // Create Win95 buttons
    const okBtn = makeWin95Button('OK');
    okBtn.id = `${uniqueWindowId}-ok-button`;

    const cancelBtn = makeWin95Button('Cancel');
    cancelBtn.id = `${uniqueWindowId}-cancel-button`;

    buttonContainer.appendChild(okBtn);
    buttonContainer.appendChild(cancelBtn);
    promptContainer.appendChild(buttonContainer);

    contentDiv.appendChild(promptContainer);

    // Focus on the input field
    setTimeout(() => {
      inputField.focus();
      inputField.select();
    }, 100);

    // Add event listeners
    setTimeout(() => {
      // OK button handler
      okBtn.addEventListener('click', () => {
        const inputValue = inputField.value;
        closeWindow(uniqueWindowId);
        if (onConfirm) onConfirm(inputValue);
      });

      // Cancel button handler
      cancelBtn.addEventListener('click', () => {
        closeWindow(uniqueWindowId);
        if (onCancel) onCancel(null);
      });

      // Enter key handler
      inputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const inputValue = inputField.value;
          closeWindow(uniqueWindowId);
          if (onConfirm) onConfirm(inputValue);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closeWindow(uniqueWindowId);
          if (onCancel) onCancel(null);
        }
      });
    }, 150);
  }

  // Ensure dialog is always on top
  bringToFront(dialogWindow);
  setTimeout(() => {
    bringToFront(dialogWindow);
  }, 10);

  return dialogWindow;
}
