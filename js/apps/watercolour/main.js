async function launchWatercolour() {
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
async function initializeWatercolourUI(win) {
  console.log('Initializing Watercolour UI, window:', win);

  // Load the watercolour logic immediately for restoration
  await initializeWatercolour();
}

function getWatercolourHTML() {
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
          <button id="newBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">New</button>
          <button id="saveBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer; color: #9ca3af;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'" disabled>Save</button>
          <button id="saveAsBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">Save As...</button>
          <button id="loadBtn" style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; border-bottom: 1px solid #f3f4f6; cursor: pointer;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">Load Image</button>
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
        <input id="strokeSize" type="range" min="1" max="50" value="5" style="width: 100%;" />
      </div>
    </div>
  </div>

  <!-- Hidden text input for Text Tool -->
  <input type="text" id="textInput" style="position: absolute; border: 1px solid #9ca3af; padding: 0.25rem; display: none; font-size: 16px; line-height: 1; color: #000;" />
</div>
`;
}

async function initializeWatercolour() {
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

  // Load and execute the watercolour core logic
  try {
    const response = await fetch('./js/apps/watercolour/core.js');
    const coreScript = await response.text();

    // Execute the script in the current context
    eval(coreScript);

    // Restore the saved state after initialization
    setTimeout(async () => {
      if (typeof restoreWatercolourState === 'function') {
        await restoreWatercolourState();
      }
    }, 50);

    console.log('Watercolour initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Watercolour:', error);
  }
}
