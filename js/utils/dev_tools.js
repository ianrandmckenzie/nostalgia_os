import { storage } from '../os/indexeddb_storage.js';
import { createWindow } from '../gui/window.js';

export async function showDevDataModal() {
  const appState = await storage.getItem('appState');
  const jsonString = JSON.stringify(appState, null, 2);

  const content = `
    <div class="flex flex-col h-full p-4">
      <h2 class="text-lg font-bold mb-2">Developer Data Export</h2>
      <p class="mb-2 text-sm">Copy this JSON to create a default data set.</p>
      <textarea id="dev-data-export" class="flex-1 w-full p-2 border border-gray-400 font-mono text-xs mb-4" readonly>${jsonString}</textarea>
      <div class="flex justify-end space-x-2">
        <button id="copy-dev-data" class="px-4 py-2 bg-gray-200 border-2 border-gray-400 hover:bg-gray-300 active:border-gray-600">Copy to Clipboard</button>
        <button id="close-dev-data" class="px-4 py-2 bg-gray-200 border-2 border-gray-400 hover:bg-gray-300 active:border-gray-600">Close</button>
      </div>
    </div>
  `;

  const winId = 'dev-data-modal';
  createWindow('Developer Data', content, false, winId, false, true, { width: 600, height: 500 });

  // Add event listeners
  setTimeout(() => {
    const copyBtn = document.getElementById('copy-dev-data');
    const closeBtn = document.getElementById('close-dev-data');
    const textarea = document.getElementById('dev-data-export');

    if (copyBtn && textarea) {
      copyBtn.addEventListener('click', () => {
        textarea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const win = document.getElementById(winId);
        if (win) {
            // Use the global closeWindow if available, or remove element
            if (window.closeWindow) {
                window.closeWindow(winId);
            } else {
                win.remove();
                const taskbarItem = document.getElementById(`taskbar-${winId}`);
                if (taskbarItem) taskbarItem.remove();
            }
        }
      });
    }
  }, 100);
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showDevDataModal = showDevDataModal;
}
