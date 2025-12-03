import { createWindow } from './creation.js';
import { bringToFront, closeWindow } from './state.js';
import { toggleButtonActiveState } from '../main.js';
import { updateDesktopSettings } from '../desktop.js';

export function showDialogBox(message, dialogType, onConfirm = null, onCancel = null, options = {}) {
  // Treat both 'confirmation' and legacy 'confirm' as confirmation prompts. Add 'prompt' type.
  const isConfirmationType = dialogType === 'confirmation' || dialogType === 'confirm';
  const isPrompt = dialogType === 'prompt';
  // Use promptWindow- prefix for any confirmation/prompt style dialog (transient, not persisted)
  const uniqueWindowId = (isConfirmationType || isPrompt ? 'promptWindow-' : 'dialogWindow-') + Date.now();

  // Determine if this is a confirmation dialog that needs OK/Cancel buttons
  const isConfirmationDialog = isConfirmationType && (onConfirm || onCancel);

  // Create the HTML content as a string instead of DOM elements
  let dialogContent;

  if (isPrompt) {
    const defaultValue = options.defaultValue || '';
    dialogContent = `
      <div class="flex flex-col p-4 h-full justify-between">
        <div class="mb-4">
          <p class="text-sm mb-3">${message}</p>
          <input type="text" id="${uniqueWindowId}-input" value="${defaultValue.replace(/"/g,'&quot;')}" class="w-full px-2 py-1 border-2 border-gray-400 bg-white" style="border-top-color:#808080; border-left-color:#808080; border-bottom-color:#ffffff; border-right-color:#ffffff; border-style: inset;" aria-label="Text input for prompt dialog" title="Enter your response here" />
        </div>
        <div class="flex gap-2 justify-center">
          <button id="${uniqueWindowId}-ok-button" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">OK</span></button>
          <button id="${uniqueWindowId}-cancel-button" class="bg-gray-200 border-t-2 border-l-2 border-gray-300"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span></button>
        </div>
      </div>
    `;
  } else if (isConfirmationDialog) {
    dialogContent = `
      <div class="text-center p-4">
        <h2 class="text-lg mb-4">${message}</h2>
        <div class="flex gap-2 justify-center">
          <button id="${uniqueWindowId}-ok-button" class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300" style="border-style: outset;">
            OK
          </button>
          <button id="${uniqueWindowId}-cancel-button" class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300" style="border-style: outset;">
            Cancel
          </button>
        </div>
      </div>
    `;
  } else {
    dialogContent = `
      <div class="text-center p-4">
        <h2 class="text-lg mb-4">${message}</h2>
        <button id="${uniqueWindowId}-button" class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300" style="border-style: outset;">
          OK
        </button>
      </div>
    `;
  }

  let title = '⚠️ Information';
  if (isPrompt) {
    title = '💬 Input Required';
    announceToScreenReader(message, 'polite');
  } else if (isConfirmationType) {
    title = isConfirmationDialog ? '⚠️ Confirmation' : '✅ Success';
    announceToScreenReader(message, 'polite');
  } else if (dialogType === 'error') {
    title = '⚠️ Error';
    // Create audio dynamically
    const errorAudio = new Audio('./audio/error-pop-up.mp3');
    errorAudio.play().catch(e => console.log("Audio play failed", e));
    announceToScreenReader(message, 'assertive');
  }

  const dialogWindow = createWindow(title, dialogContent, false, uniqueWindowId, false, false, { type: 'integer', width: 350, height: 180 }, "default");

  // Ensure dialog is always on top by bringing it to front immediately
  // Use both immediate call and a slight delay to handle any race conditions
  bringToFront(dialogWindow);
  setTimeout(() => {
    bringToFront(dialogWindow);
  }, 10);

  // Add event listeners after the window is created
  setTimeout(() => {
    if (isPrompt) {
      const okButton = document.getElementById(`${uniqueWindowId}-ok-button`);
      const cancelButton = document.getElementById(`${uniqueWindowId}-cancel-button`);
      const inputField = document.getElementById(`${uniqueWindowId}-input`);

      if (inputField) {
        setTimeout(() => { inputField.focus(); inputField.select(); }, 10);
        inputField.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const value = inputField.value;
            closeWindow(uniqueWindowId);
            if (onConfirm) onConfirm(value);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closeWindow(uniqueWindowId);
            if (onCancel) onCancel(null);
          }
        });
      }

      if (okButton) {
        okButton.addEventListener('click', () => {
          const value = inputField ? inputField.value : '';
          closeWindow(uniqueWindowId);
          if (onConfirm) onConfirm(value);
        });
      }
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          if (onCancel) onCancel(null);
        });
      }
    } else if (isConfirmationDialog) {
      const okButton = document.getElementById(`${uniqueWindowId}-ok-button`);
      const cancelButton = document.getElementById(`${uniqueWindowId}-cancel-button`);

      if (okButton) {
        okButton.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          if (onConfirm) onConfirm();
        });
      }

      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          if (onCancel) onCancel();
        });
      }
  } else {
      const button = document.getElementById(`${uniqueWindowId}-button`);
      if (button) {
        button.addEventListener('click', () => {
          closeWindow(uniqueWindowId);
          // For backward compatibility, if onConfirm is provided for non-confirmation dialogs, call it
          if (onConfirm) onConfirm();
        });
      }
    }
  }, 100);

  return dialogWindow;
}

export function announceToScreenReader(message, priority = 'polite') {
  const announcer = document.getElementById(priority === 'assertive' ? 'sr-alerts' : 'sr-announcements');
  if (announcer) {
    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}

// Event listener for settings apply button
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const btn = e.target.closest('#settings-apply-button');
    if (!btn) return;

    e.stopPropagation();

    showDialogBox(
      'Are you sure you want to apply these desktop settings changes?',
      'confirmation',
      () => {
        // Confirmed - apply the settings
        toggleButtonActiveState('settings-apply-button', 'Applied!');
        setTimeout(() => {
          toggleButtonActiveState('settings-apply-button', 'Apply');
        }, 1000);

        updateDesktopSettings();

        showDialogBox(
          'Your settings have successfully been saved!',
          'info'
        );
      }
    );
  });
}
