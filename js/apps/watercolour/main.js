import { createWindow } from '../../gui/window.js';

export async function launchWatercolour() {
  // Check if watercolour window already exists
  const existingWindow = document.getElementById('watercolour');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  const content = getWatercolourHTML();
  const win = createWindow('Watercolour', content, false, 'watercolour', false, false, { type: 'integer', width: 700, height: 440 }, 'app', null, 'white');

  // Initialize the watercolour UI
  initializeWatercolourUI(win);
}

// Separate function to initialize the Watercolour UI (for restoration)
export async function initializeWatercolourUI(win) {

  // Load the watercolour logic immediately for restoration
  await initializeWatercolour();
}

export function getWatercolourHTML() {
  return `
<div id="watercolour-container" style="background-color: #f3f4f6; position: relative; height: calc(100% - 0.25rem); margin-top: -0.5rem; margin: 0; padding: 0;">
  <!-- Top Menu Bar -->
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background-color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); border-bottom: 1px solid #e5e7eb;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <!-- File Dropdown Menu -->
      <div style="position: relative;">
        <button id="fileMenuBtn" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem; border: 1px solid #d1d5db; background-color: white; cursor: pointer; display: flex; align-items: center; gap: 0.25rem;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'" onclick="toggleFileDropdown(event)">
          File
          <svg style="width: 0.75rem; height: 0.75rem; pointer-events: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="fileDropdown" style="position: absolute; left: 0; top: 100%; margin-top: 0.25rem; width: 10rem; background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 50; display: none;">
          <button id="loadBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">Open...</button>
          <button id="newBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">New</button>
          <button id="saveAsBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">Save</button>
          <button id="exportBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">Export...</button>
        </div>
      </div>

      <button id="undoBtn" style="padding: 0.5rem; border-radius: 0.25rem; border: 1px solid #d1d5db; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">
        <svg style="height: 1rem; width: 1rem; display: inline;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path style="opacity: 0.4;" d="M97.6 97.6c87.5-87.5 229.3-87.5 316.8 0C458.1 141.3 480 198.7 480 256s-21.9 114.7-65.6 158.4c-87.5 87.5-229.3 87.5-316.8 0l45.3-45.3c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L97.6 97.6z" />
          <path d="M176 224l24-24L40 40 16 64l0 160H176z" />
        </svg>
        Undo
      </button>
      <button id="redoBtn" style="padding: 0.5rem; border-radius: 0.25rem; border: 1px solid #d1d5db; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">
        <svg style="height: 1rem; width: 1rem; display: inline;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path style="opacity: 0.4;" d="M32 256c0 57.3 21.9 114.7 65.6 158.4c87.5 87.5 229.3 87.5 316.8 0l-45.3-45.3c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0c15.1-15.1 30.2-30.2 45.3-45.3c-87.5-87.5-229.3-87.5-316.8 0C53.9 141.3 32 198.7 32 256z" />
          <path d="M336 224l-24-24L472 40l24 24 0 160H336z" />
        </svg>
        Redo
      </button>
    </div>
    <div id="status" style="font-size: 0.75rem; color: #6b7280;">
      Tool: Brush | x: 0, y: 0
    </div>
  </div>

  <!-- Main Content Area -->
  <div style="display: flex;">
    <!-- Left Toolbar -->
    <div style="width: 3rem; padding: 0.5rem; background-color: white; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 0.5rem;">
      <button data-tool="brush" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='#f3f4f6'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/brush.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Brush</span>
      </button>
      <button data-tool="line" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='white'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/line.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Line</span>
      </button>
      <button data-tool="rectangle" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='white'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/rectangle.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Rectangle</span>
      </button>
      <button data-tool="ellipse" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='white'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/ellipse.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Ellipse</span>
      </button>
      <button data-tool="eraser" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='white'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/eraser.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Eraser</span>
      </button>
      <button data-tool="fill" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='white'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/fill.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Fill</span>
      </button>
      <button data-tool="picker" class="tool-btn" style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: white; cursor: pointer;" onmouseover="this.style.backgroundColor='#e5e7eb'" onmouseout="this.style.backgroundColor='white'">
        <img style="height: 1.5rem; width: 1.5rem;" src="./js/apps/watercolour/icons/picker.svg">
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Picker</span>
      </button>
    </div>

    <!-- Canvas Container -->
    <div style="flex: 1; position: relative;">
      <canvas id="watercolourCanvas" width="420" height="300" style="background: white; margin: 0.5rem; margin-bottom: 2rem; position: absolute; inset: 0; border: 1px solid #d1d5db;"></canvas>
    </div>

    <!-- Right Panel: Color Palette & Stroke Size -->
    <div style="width: 8rem; padding: 0.5rem; background-color: white; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 1rem;">
      <!-- Color Palette -->
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem;">
          <!-- 16 predefined colors -->
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #000000;" data-color="#000000"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #808080;" data-color="#808080"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #800000;" data-color="#800000"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #FF0000;" data-color="#FF0000"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #808000;" data-color="#808000"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #FFFF00;" data-color="#FFFF00"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #008000;" data-color="#008000"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #00FF00;" data-color="#00FF00"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #008080;" data-color="#008080"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #00FFFF;" data-color="#00FFFF"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #000080;" data-color="#000080"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #0000FF;" data-color="#0000FF"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #800080;" data-color="#800080"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #FF00FF;" data-color="#FF00FF"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #FFFFFF;" data-color="#FFFFFF"></div>
          <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.125rem; cursor: pointer; border: 1px solid #d1d5db; background-color: #C0C0C0;" data-color="#C0C0C0"></div>
        </div>
        <input id="colorPicker" type="color" style="width: 100%;" />
      </div>
      <!-- Stroke Size -->
      <div>
        <label for="strokeSize" style="font-size: 0.875rem;">Size</label>
        <input id="strokeSize" type="range" min="1" max="50" value="5" style="width: 100%;" aria-label="Brush stroke size" title="Adjust brush stroke size" />
      </div>
    </div>
  </div>

  <!-- Hidden text input for Text Tool -->
  <input type="text" id="textInput" style="position: absolute; border: 1px solid #9ca3af; padding: 0.25rem; display: none; font-size: 16px; line-height: 1; color: #000;" />
</div>
`;
}

export async function initializeWatercolour() {
  // Add global functions for inline event handlers
  window.toggleFileDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('fileDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('fileDropdown');
    const button = document.getElementById('fileMenuBtn');
    if (dropdown && button && !button.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Get canvas and create context with the willReadFrequently flag
  const canvas = document.getElementById('watercolourCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Initialize with default state - will be updated when restored
  let watercolourState = null;

  // Global state variables (use defaults, will be updated by restore)
  let painting = false;
  let currentTool = 'brush';
  let startX, startY;
  let activeColor = '#000000';
  let strokeSize = 5;
  let savedImage = null; // Will be set when state is restored
  let backupCanvas = null; // Offscreen canvas for shape previews
  let currentFile = null; // Track the currently opened/saved file {name, path, data}
  const textInput = document.getElementById('textInput');
  const strokeSizeInput = document.getElementById('strokeSize');
  const colorPicker = document.getElementById('colorPicker');
  let undoStack = [];
  let redoStack = [];

  strokeSizeInput.addEventListener('input', (e) => {
    strokeSize = e.target.value;
    ctx.lineWidth = strokeSize;
    if (currentTool === 'text' && textInput.style.display === 'block') {
      textInput.style.fontSize = `${strokeSize * 4}px`;
    }
    saveWatercolourState().catch(console.error); // Save state after stroke size change
  });

  // Whenever the color changes, update the canvas styles and, if the text tool is active, update the input color.
  colorPicker.addEventListener('change', (e) => {
    activeColor = e.target.value;
    ctx.strokeStyle = activeColor;
    ctx.fillStyle = activeColor;
    if (currentTool === 'text' && textInput.style.display === 'block') {
      textInput.style.color = activeColor;
    }
    saveWatercolourState().catch(console.error); // Save state after color change
  });

  window.addEventListener('resize', resizeCanvas);
  // Don't call resizeCanvas immediately - let restoreWatercolourState handle initial setup

  // Prevent Scrolling (Global)
  document.body.addEventListener("touchmove", (e) => {
    if (painting) e.preventDefault(); // Block touch scrolling
  }, { passive: false });

  document.addEventListener("wheel", (e) => {
    if (painting) e.preventDefault(); // Block mouse wheel scrolling
  }, { passive: false });

  // Tool button event listeners: add active state and update canvas cursor
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('bg-gray-100'));
      btn.classList.add('bg-gray-100');

      currentTool = btn.getAttribute('data-tool');
      // Set canvas cursor with hotspot at 12,12 (assuming 24x24 icon)
      canvas.style.cursor = `url("./icons/resized_${currentTool}.png"), auto`;
      saveWatercolourState().catch(console.error); // Save state after tool change
    });
  });

  // Stroke size update
  document.getElementById('strokeSize').addEventListener('input', (e) => {
    strokeSize = e.target.value;
    ctx.lineWidth = strokeSize;
  });

  // Color picker update
  document.getElementById('colorPicker').addEventListener('change', (e) => {
    activeColor = e.target.value;
    ctx.strokeStyle = activeColor;
    ctx.fillStyle = activeColor;
  });

  // Color palette selection
  document.querySelectorAll('[data-color]').forEach(el => {
    el.addEventListener('click', () => {
      activeColor = el.getAttribute('data-color');
      ctx.strokeStyle = activeColor;
      ctx.fillStyle = activeColor;
      document.getElementById('colorPicker').value = activeColor;
      saveWatercolourState().catch(console.error); // Save state after color selection
    });
  });

  // File menu functionality - work with existing button structure
  let fileMenuInitRetries = 0;
  const maxRetries = 3;

  function initializeFileMenu() {
    fileMenuInitRetries++;

    if (fileMenuInitRetries > maxRetries) {
      // Work with the existing buttons that we know exist
      initializeExistingButtons();
      return;
    }

    // Try to find dropdown elements first
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileDropdown = document.getElementById('fileDropdown');
    const saveAsBtn = document.getElementById('saveAsBtn');

    if (fileMenuBtn && fileDropdown && saveAsBtn) {
      initializeDropdownMenu();
      return;
    }

    setTimeout(initializeFileMenu, 200);
  }

  function initializeExistingButtons() {
    const loadBtn = document.getElementById('loadBtn');
    const newBtn = document.getElementById('newBtn');
    const exportBtn = document.getElementById('exportBtn');

    if (!loadBtn || !newBtn || !exportBtn) {
      console.error('Could not find expected buttons');
      return;
    }

    loadBtn.addEventListener('click', () => {
      loadWatercolourDrawing();
    });

    newBtn.addEventListener('click', () => {
      showDialogBox('Clear canvas? Unsaved work will be lost.', 'confirmation',
        () => {
          const cssWidth = canvas.offsetWidth;
          const cssHeight = canvas.offsetHeight;
          ctx.clearRect(0, 0, cssWidth, cssHeight);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, cssWidth, cssHeight);
          savedImage = canvas.toDataURL();
          commitState();
          currentFile = null;
        }
      );
    });

    exportBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL();
      link.click();
    });

  }

  function initializeDropdownMenu() {
    const fileMenuBtn = document.getElementById('fileMenuBtn');
    const fileDropdown = document.getElementById('fileDropdown');
    const saveAsBtn = document.getElementById('saveAsBtn');
    const loadBtn = document.getElementById('loadBtn');
    const newBtn = document.getElementById('newBtn');
    const exportBtn = document.getElementById('exportBtn');

    // Toggle dropdown visibility
    fileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!fileMenuBtn.contains(e.target) && !fileDropdown.contains(e.target)) {
        fileDropdown.classList.add('hidden');
      }
    });

    // Close dropdown when clicking menu items
    fileDropdown.addEventListener('click', () => {
      fileDropdown.classList.add('hidden');
    });

    saveAsBtn.addEventListener('click', async () => {
      await saveAsNewFile();
    });

    loadBtn.addEventListener('click', () => {
      loadWatercolourDrawing();
    });

    newBtn.addEventListener('click', () => {
      showDialogBox('Clear canvas? Unsaved work will be lost.', 'confirmation',
        () => {
          const cssWidth = canvas.offsetWidth;
          const cssHeight = canvas.offsetHeight;
          ctx.clearRect(0, 0, cssWidth, cssHeight);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, cssWidth, cssHeight);
          savedImage = canvas.toDataURL();
          commitState();
        }
      );
    });

    exportBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }

  // Try multiple methods to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFileMenu);
  } else {
    // DOM is already loaded
    initializeFileMenu();
  }

  // Mouse event handlers for canvas
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const pos = getCanvasCoordinates(e);
    startX = pos.x;
    startY = pos.y;
    // Handle fill tool immediately on mousedown
    if (currentTool === 'fill') {
      commitState();
      floodFill(pos.x, pos.y, activeColor);
      savedImage = canvas.toDataURL();
      commitState();
      return; // Exit early; no need to set painting flag
    }
    painting = true;

    if (currentTool === 'brush' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    } else if (['line', 'rectangle', 'ellipse'].includes(currentTool)) {
      // Create backup offscreen canvas for shape previews
      backupCanvas = document.createElement('canvas');
      backupCanvas.width = canvas.width;
      backupCanvas.height = canvas.height;
      const backupCtx = backupCanvas.getContext('2d');
      backupCtx.drawImage(canvas, 0, 0);
    } else if (currentTool === 'text') {
      const pos = getCanvasCoordinates(e);
      // If input is already active, commit the previous text before opening a new one.
      if (textInput.style.display === 'block') {
        commitText();
        return;
      }

      // Position and show the text input
      const rect = canvas.getBoundingClientRect();
      textInput.style.left = rect.left + pos.x + 'px';
      textInput.style.top = rect.top + pos.y + 'px';
      textInput.style.display = 'block';

      // Match input styling to the strokeSize/color
      textInput.style.fontSize = `${strokeSize * 4}px`;
      textInput.style.color = activeColor;

      // Store coordinates so commitText() knows where to draw
      textInput.dataset.x = pos.x;
      textInput.dataset.y = pos.y;

      // Focus after display
      setTimeout(() => {
        textInput.focus();
        textInput.onblur = commitText;
      }, 0);

      textInput.onkeydown = (evt) => {
        if (evt.key === 'Enter') commitText();
      };
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const pos = getCanvasCoordinates(e);
    updateStatus(pos.x, pos.y);
    if (!painting) return;
    e.preventDefault();

    if (currentTool === 'brush') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = 'white';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.strokeStyle = activeColor;
    } else if (['line', 'rectangle', 'ellipse'].includes(currentTool)) {
      // For shape preview: restore backup and draw preview
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      if (backupCanvas) {
        ctx.drawImage(backupCanvas, 0, 0, cssWidth, cssHeight);
      }
      drawPreview(pos.x, pos.y);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    const pos = getCanvasCoordinates(e);
    if (painting && ['line', 'rectangle', 'ellipse'].includes(currentTool)) {
      drawPreview(pos.x, pos.y, true);
    }
    painting = false;
    // Update saved image after stroke/shape is finalized
    savedImage = canvas.toDataURL();
    commitState();
    backupCanvas = null;
  });

  // Canvas click for Fill and Color Picker tools using adjusted coordinates
  canvas.addEventListener('click', (e) => {
    const pos = getCanvasCoordinates(e);
    if (currentTool === 'picker') {
      const ratio = window.devicePixelRatio || 1;
      const pixel = ctx.getImageData(Math.floor(pos.x * ratio), Math.floor(pos.y * ratio), 1, 1).data;
      const pickedColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
      activeColor = pickedColor;
      ctx.strokeStyle = activeColor;
      ctx.fillStyle = activeColor;
      document.getElementById('colorPicker').value = activeColor;
      saveWatercolourState().catch(console.error); // Save state after color picking
    }
  });

  // Undo button event listener
  document.getElementById('undoBtn').addEventListener('click', () => {
    if (undoStack.length > 1) {
      // Remove current state and push it to redo
      const currentState = undoStack.pop();
      redoStack.push(currentState);
      const previousState = undoStack[undoStack.length - 1];
      restoreState(previousState);
      savedImage = previousState;
      saveWatercolourState().catch(console.error); // Save state after undo
    }
  });

  // Redo button event listener
  document.getElementById('redoBtn').addEventListener('click', () => {
    if (redoStack.length) {
      const state = redoStack.pop();
      undoStack.push(state);
      restoreState(state);
      savedImage = state;
      saveWatercolourState().catch(console.error); // Save state after redo
    }
  });

  // Commit current canvas state: push onto undo stack and clear redo stack.
  function commitState() {
    const state = canvas.toDataURL();
    undoStack.push(state);
    // Also update savedImage if other parts use it.
    savedImage = state;
    // Clear redo stack on new action
    redoStack = [];
    // Save the overall watercolour state
    saveWatercolourState().catch(console.error);
  }

  // Restore a state from a data URL
  function restoreState(state) {
    const img = new Image();
    img.src = state;
    img.alt = 'Watercolour painting canvas state';
    img.onload = () => {
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
    };
  }

  // Helper: Get canvas coordinates relative to the element
  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // Canvas initialization with retina support
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth;
    const cssHeight = canvas.offsetHeight;

    // Save current canvas content before resizing
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    // Explicitly set the CSS size so that the drawn pixels match the layout
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Restore the canvas content at the new size
    if (savedImage) {
      const img = new Image();
      img.src = savedImage;
      img.alt = 'Saved watercolour painting for canvas restoration';
      img.onload = () => {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      }
    } else {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }
  }

  // Update status bar
  function updateStatus(x, y) {
    const status = document.getElementById('status');
    status.textContent = `Tool: ${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)} | x: ${Math.floor(x)}, y: ${Math.floor(y)}`;
  }

  function commitText() {
    // Grab the stored coordinates
    const x = parseFloat(textInput.dataset.x);
    const y = parseFloat(textInput.dataset.y);
    const text = textInput.value;

    textInput.style.display = 'none';
    textInput.value = '';
    textInput.onblur = null;

    // Draw text on canvas
    ctx.fillStyle = activeColor;
    ctx.font = `${strokeSize * 4}px sans-serif`;
    ctx.textBaseline = 'top'; // Aligns text's top edge to (x, y)
    ctx.fillText(text, x, y);
    commitState();
  }

  // Draw preview shape (line, rectangle, ellipse)
  function drawPreview(x2, y2, finalize = false) {
    const x = startX;
    const y = startY;
    const w = x2 - startX;
    const h = y2 - startY;
    ctx.lineWidth = strokeSize;
    ctx.strokeStyle = activeColor;
    ctx.fillStyle = activeColor;

    if (currentTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (currentTool === 'rectangle') {
      ctx.strokeRect(x, y, w, h);
    } else if (currentTool === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // If finalize is true, the shape is committed
  }
  // Flood fill function: fills contiguous region starting from (x, y)
  // with fillColor (a hex string) using a stack-based algorithm.
  function floodFill(x, y, fillColor) {
    // Get the device pixel ratio to correctly work with getImageData
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;
    // Retrieve the full canvas image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert the provided hex color to RGB components
    const fillRgb = hexToRgb(fillColor);
    const fillR = fillRgb.r;
    const fillG = fillRgb.g;
    const fillB = fillRgb.b;

    // Convert (x, y) to physical canvas coordinates
    const startX = Math.floor(x * ratio);
    const startY = Math.floor(y * ratio);
    const startPos = (startY * width + startX) * 4;

    // Get the color at the starting pixel
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // If the fill color is the same as the starting pixel's color, exit early.
    if (startR === fillR && startG === fillG && startB === fillB) {
      return;
    }

    // Initialize the stack with the starting pixel
    const pixelStack = [[startX, startY]];

    while (pixelStack.length) {
      const [x0, y0] = pixelStack.pop();

      // Move upward to find the top boundary of the area to fill
      let currentY = y0;
      while (currentY >= 0 && matchStartColor(data, x0, currentY, width, startR, startG, startB, startA)) {
        currentY--;
      }
      currentY++;

      // Variables to track whether we have already added neighboring pixels
      let reachLeft = false;
      let reachRight = false;

      // Move downward, filling pixels and queuing left/right neighbors
      while (currentY < height && matchStartColor(data, x0, currentY, width, startR, startG, startB, startA)) {
        const pixelPos = (currentY * width + x0) * 4;
        // Set the pixel to the fill color
        data[pixelPos] = fillR;
        data[pixelPos + 1] = fillG;
        data[pixelPos + 2] = fillB;
        data[pixelPos + 3] = 255; // Fully opaque

        // Check left neighbor
        if (x0 > 0) {
          if (matchStartColor(data, x0 - 1, currentY, width, startR, startG, startB, startA)) {
            if (!reachLeft) {
              pixelStack.push([x0 - 1, currentY]);
              reachLeft = true;
            }
          } else {
            reachLeft = false;
          }
        }

        // Check right neighbor
        if (x0 < width - 1) {
          if (matchStartColor(data, x0 + 1, currentY, width, startR, startG, startB, startA)) {
            if (!reachRight) {
              pixelStack.push([x0 + 1, currentY]);
              reachRight = true;
            }
          } else {
            reachRight = false;
          }
        }

        currentY++;
      }
    }

    // Write the updated pixel data back to the canvas
    ctx.putImageData(imageData, 0, 0);
  }

  // Helper function to compare the color at (x, y) in the data array
  function matchStartColor(data, x, y, width, r, g, b, a) {
    const index = (y * width + x) * 4;
    return (
      data[index] === r &&
      data[index + 1] === g &&
      data[index + 2] === b &&
      data[index + 3] === a
    );
  }

  // Helper: Compare colors (ignoring alpha) with tolerance
  function colorsMatch(a, b, tolerance = 0) {
    return Math.abs(a[0] - b.r) <= tolerance &&
      Math.abs(a[1] - b.g) <= tolerance &&
      Math.abs(a[2] - b.b) <= tolerance;
  }

  // Helper: Convert hex to RGB object
  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    let bigint = parseInt(hex, 16);
    if (hex.length === 3) {
      return {
        r: (bigint >> 8) * 17,
        g: ((bigint >> 4) & 0xF) * 17,
        b: (bigint & 0xF) * 17
      };
    } else {
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    }
  }

  // Helper: Convert RGB to hex string
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  async function saveAsNewFile() {
    try {
      // Get canvas as data URL
      const dataURL = canvas.toDataURL('image/png');

      // Check if we have access to the global storage and file system functions
      const storage = globalStorage;
      const addFileToFileSystem = globalAddFileToFileSystem;

      if (!storage) {
        showDialogBox('Cannot access storage. Please ensure the main OS is loaded.', 'error');
        return;
      }


      // Store in IndexedDB using the existing storage system
      const timestamp = Date.now();
      const storageKey = `watercolour_drawing_${timestamp}`;

      // Save to IndexedDB
      await storage.setItem(storageKey, dataURL);

      // Prompt for filename and save to file system
      makeWin95Prompt('Enter a filename for your drawing:', `drawing_${timestamp}.png`,
        async (fileName) => {
          if (fileName) {
            // Ensure .png extension
            const finalFileName = fileName.endsWith('.png') ? fileName : fileName + '.png';

            // Get the current folder path
            const currentPath = getCurrentFolderPath();

            // Add file to file system
            if (addFileToFileSystem) {
              // Create a blob from the dataURL to simulate a file object
              const response = await fetch(dataURL);
              const blob = await response.blob();
              const file = new File([blob], finalFileName, { type: 'image/png' });

              const result = await addFileToFileSystem(finalFileName, dataURL, currentPath, 'png', file);

              // Update current file tracking
              currentFile = {
                name: finalFileName,
                path: currentPath,
                storageKey: storageKey,
                data: dataURL
              };

              // Force refresh of views
              if (refreshExplorerViews) {
                refreshExplorerViews();
              }

              if (currentPath === 'C://Desktop' && renderDesktopIcons) {
                renderDesktopIcons();
              }

              showDialogBox(`Drawing saved as "${finalFileName}" in ${currentPath}!`, 'info');
            } else {
              showDialogBox('File system not available. Drawing saved to storage only.', 'info');
            }
          } else {
            showDialogBox('Drawing saved to storage but not added to file system.', 'info');
          }
        },
        () => {
          // User canceled - drawing is still saved to storage, just not to file system
          showDialogBox('Drawing saved to storage but not added to file system.', 'info');
        }
      );
    } catch (error) {
      console.error('Error saving drawing:', error);
      showDialogBox('Error saving drawing: ' + error.message, 'error');
    }
  }

  function loadWatercolourDrawing() {
    // Open file explorer to let user choose an image
    if (openFileExplorerForImageSelection) {
      openFileExplorerForImageSelection((imageData, fileInfo) => {
        if (imageData) {
          loadImageOntoCanvas(imageData, fileInfo);
        }
      });
    } else {
      // Fallback: try to open a file explorer window
      if (createWindow && getExplorerWindowContent) {
        // Store the callback on the window so the file explorer can call it
        window.watercolourLoadCallback = (imageData, fileInfo) => {
          if (imageData) {
            loadImageOntoCanvas(imageData, fileInfo);
          }
        };

        // Open file explorer
        const explorerContent = getExplorerWindowContent('C://Documents');
        createWindow('Select Image - File Explorer', explorerContent, true, 'explorer-watercolour-load', false, false, { type: 'integer', width: 600, height: 500 }, 'file-explorer');

        showDialogBox('Select an image file from the file explorer to load it onto the canvas.', 'info');
      } else {
        showDialogBox('File explorer not available. Please ensure the main OS is loaded.', 'error');
      }
    }
  }

  function loadImageOntoCanvas(imageData, fileInfo = null) {

    const img = new Image();
    img.alt = 'Image to be loaded onto watercolour canvas';
    img.onload = () => {
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;

      // Clear canvas and set white background
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // Calculate scaling to fit image while maintaining aspect ratio
      const scale = Math.min(cssWidth / img.width, cssHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // Center the image
      const x = (cssWidth - scaledWidth) / 2;
      const y = (cssHeight - scaledHeight) / 2;

      // Draw the image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // Update saved state
      savedImage = canvas.toDataURL();
      commitState();
    };
    img.onerror = () => {
      console.error('Error loading selected image.');
      showDialogBox('Error loading selected image.', 'error');
    };
    img.src = imageData;
    img.alt = 'User-selected image to import into watercolour canvas';
  }

  function getCurrentFolderPath() {
    // Try to get the current folder path from a file explorer window
    if (parent && parent.document) {
      const explorerWindows = parent.document.querySelectorAll('.file-explorer-window');
      if (explorerWindows.length > 0) {
        // Use the most recent file explorer window
        const latestExplorer = explorerWindows[explorerWindows.length - 1];
        const currentPath = latestExplorer.getAttribute('data-current-path');
        if (currentPath) {
          return currentPath;
        }
      }
    }

    // Default to Documents folder
    return 'C://Documents';
  }

  // State Management Functions
  async function saveWatercolourState() {
    try {
      const state = {
        currentTool: currentTool,
        activeColor: activeColor,
        strokeSize: strokeSize,
        canvasData: canvas.toDataURL(),
        currentFile: currentFile,
        undoStack: undoStack.slice(-10), // Keep only last 10 undo states to avoid storage overflow
        redoStack: redoStack.slice(-10)
      };
      await storage.setItem('watercolour_state', state);
    } catch (error) {
      console.warn('Failed to save Watercolour state:', error);
      // Fallback to sync method if async fails
      try {
        const state = {
          currentTool: currentTool,
          activeColor: activeColor,
          strokeSize: strokeSize,
          canvasData: canvas.toDataURL(),
          currentFile: currentFile,
          undoStack: undoStack.slice(-10),
          redoStack: redoStack.slice(-10)
        };
        storage.setItemSync('watercolour_state', state);
      } catch (fallbackError) {
        console.error('Failed to save Watercolour state with fallback:', fallbackError);
      }
    }
  }

  async function loadWatercolourState() {
    try {
      const savedState = await storage.getItem('watercolour_state');
      if (savedState) {
        return savedState;
      }
    } catch (error) {
      console.warn('Failed to load Watercolour state:', error);
      // Fallback to sync method if async fails
      try {
        const savedState = storage.getItemSync('watercolour_state');
        if (savedState) {
          return savedState;
        }
      } catch (fallbackError) {
        console.warn('Failed to load Watercolour state with fallback:', fallbackError);
      }
    }
    return null;
  }

  async function clearWatercolourState() {
    try {
      await storage.removeItem('watercolour_state');
    } catch (error) {
      console.warn('Failed to clear Watercolour state:', error);
      // Fallback to sync method if async fails
      try {
        storage.removeItemSync('watercolour_state');
      } catch (fallbackError) {
        console.error('Failed to clear Watercolour state with fallback:', fallbackError);
      }
    }
  }

  // Restore canvas and UI state
  async function restoreWatercolourState() {
    // Load saved state first
    watercolourState = await loadWatercolourState();

    // Update global variables from saved state
    if (watercolourState) {
      currentTool = watercolourState.currentTool || 'brush';
      activeColor = watercolourState.activeColor || '#000000';
      strokeSize = watercolourState.strokeSize || 5;
      currentFile = watercolourState.currentFile || null;
      undoStack = watercolourState.undoStack || [];
      redoStack = watercolourState.redoStack || [];
    }

    // First, properly initialize the canvas dimensions
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth;
    const cssHeight = canvas.offsetHeight;
    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Restore UI elements to saved state
    if (strokeSizeInput) {
      strokeSizeInput.value = strokeSize;
    }
    if (colorPicker) {
      colorPicker.value = activeColor;
    }

    // Set canvas properties
    ctx.strokeStyle = activeColor;
    ctx.fillStyle = activeColor;
    ctx.lineWidth = strokeSize;

    // Restore active tool button
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('bg-gray-100');
      if (btn.getAttribute('data-tool') === currentTool) {
        btn.classList.add('bg-gray-100');
      }
    });

    // Restore canvas content if available
    const savedImage = watercolourState?.canvasData;
    if (savedImage) {
      const img = new Image();
      img.alt = 'Saved watercolour canvas state for restoration';
      img.onload = function() {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      };
      img.src = savedImage;
    } else {
      // If no saved image, fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      commitState();
    }
  }

  await restoreWatercolourState();
}
