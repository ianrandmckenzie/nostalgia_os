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

  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const newBtn = document.getElementById('newBtn');
  const exportBtn = document.getElementById('exportBtn');

  if (!saveBtn || !loadBtn || !newBtn || !exportBtn) {
    console.error('Could not find expected buttons');
    return;
  }

  // Convert Save button to Save As functionality since we don't have separate buttons
  saveBtn.addEventListener('click', async () => {
    await saveAsNewFile();
  });

  loadBtn.addEventListener('click', () => {
    loadWatercolourDrawing();
  });

  newBtn.addEventListener('click', () => {
    if (confirm('Clear canvas? Unsaved work will be lost.')) {
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      savedImage = canvas.toDataURL();
      commitState();
      currentFile = null;
    }
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
  const saveBtn = document.getElementById('saveBtn');
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

  // File menu button event listeners
  saveBtn.addEventListener('click', async () => {
    if (currentFile) {
      await saveToCurrentFile();
    }
  });

  saveAsBtn.addEventListener('click', async () => {
    await saveAsNewFile();
  });

  loadBtn.addEventListener('click', () => {
    loadWatercolourDrawing();
  });

  newBtn.addEventListener('click', () => {
    if (confirm('Clear canvas? Unsaved work will be lost.')) {
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      savedImage = canvas.toDataURL();
      commitState();
      currentFile = null;
      if (window.updateSaveButtonState) {
        window.updateSaveButtonState();
      }
    }
  });

  exportBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  });

  // Update Save button state based on whether we have a current file
  function updateSaveButtonState() {
    const currentSaveBtn = document.getElementById('saveBtn');
    if (currentSaveBtn) {
      if (currentFile) {
        currentSaveBtn.disabled = false;
        currentSaveBtn.title = `Save to ${currentFile.name}`;
      } else {
        currentSaveBtn.disabled = true;
        currentSaveBtn.title = 'No file loaded - use Save As... instead';
      }
    } else {
      console.error('Save button not found in DOM');
    }
  }

  // Make updateSaveButtonState available globally
  window.updateSaveButtonState = updateSaveButtonState;

  // Initial save button state
  updateSaveButtonState();
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

// New save functions for File menu
async function saveToCurrentFile() {
  if (!currentFile) {
    console.error('saveToCurrentFile called but no current file exists');
    return;
  }

  try {
    // Get canvas as data URL
    const dataURL = canvas.toDataURL('image/png');

    // Check if we have access to the global storage and file system functions
    const storage = globalStorage;
    const addFileToFileSystem = globalAddFileToFileSystem;

    if (!storage) {
      alert('Cannot access storage. Please ensure the main OS is loaded.');
      return;
    }

    // Update in IndexedDB if we have a storage key
    if (currentFile.storageKey) {
      await storage.setItem(currentFile.storageKey, dataURL);
    }

    // Update in file system
    if (addFileToFileSystem) {
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const file = new File([blob], currentFile.name, { type: 'image/png' });

      const result = await addFileToFileSystem(currentFile.name, dataURL, currentFile.path, 'png', file);

      // Force refresh of views
      if (refreshExplorerViews) {
        refreshExplorerViews();
      }

      if (currentFile.path === 'C://Desktop' && renderDesktopIcons) {
        renderDesktopIcons();
      }

      // Update current file data
      currentFile.data = dataURL;

      alert(`"${currentFile.name}" saved successfully!`);
    } else {
      alert('File system not available. Could not save file.');
    }
  } catch (error) {
    console.error('Error saving to current file:', error);
    alert('Error saving file: ' + error.message);
  }
}

async function saveAsNewFile() {
  // This function is the same as the original saveWatercolourDrawing but updates currentFile
  try {
    // Get canvas as data URL
    const dataURL = canvas.toDataURL('image/png');

    // Check if we have access to the global storage and file system functions
    const storage = globalStorage;
    const addFileToFileSystem = globalAddFileToFileSystem;

    if (!storage) {
      alert('Cannot access storage. Please ensure the main OS is loaded.');
      return;
    }


    // Store in IndexedDB using the existing storage system
    const timestamp = Date.now();
    const storageKey = `watercolour_drawing_${timestamp}`;

    // Save to IndexedDB
    await storage.setItem(storageKey, dataURL);

    // Prompt for filename and save to file system
    const fileName = prompt('Enter a filename for your drawing:', `drawing_${timestamp}.png`);
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
        if (window.updateSaveButtonState) {
          window.updateSaveButtonState();
        }

        // Force refresh of views
        if (refreshExplorerViews) {
          refreshExplorerViews();
        }

        if (currentPath === 'C://Desktop' && renderDesktopIcons) {
          renderDesktopIcons();
        }

        alert(`Drawing saved as "${finalFileName}" in ${currentPath}!`);
      } else {
        alert('File system not available. Drawing saved to storage only.');
      }
    } else {
      alert('Drawing saved to storage but not added to file system.');
    }
  } catch (error) {
    console.error('Error saving drawing:', error);
    alert('Error saving drawing: ' + error.message);
  }
}

// Watercolour save and load functions
async function saveWatercolourDrawing() {
  try {
    // Get canvas as data URL
    const dataURL = canvas.toDataURL('image/png');

    // Check if we have access to the parent window's storage
    const parentStorage = parent?.globalStorage || parent?.storage;
    const parentAddFileToFileSystem = parent?.globalAddFileToFileSystem || parent?.addFileToFileSystem;

    if (!parentStorage) {
      alert('Cannot access storage. Please ensure the main OS is loaded.');
      return;
    }


    // Store in IndexedDB using the existing storage system
    const timestamp = Date.now();
    const storageKey = `watercolour_drawing_${timestamp}`;

    // Save to IndexedDB
    await parentStorage.setItem(storageKey, dataURL);

    // Prompt for filename and save to file system
    const fileName = prompt('Enter a filename for your drawing:', `drawing_${timestamp}.png`);
    if (fileName) {
      // Ensure .png extension
      const finalFileName = fileName.endsWith('.png') ? fileName : fileName + '.png';

      // Get the current folder path from the parent window
      const currentPath = getCurrentFolderPath();

      // Add file to file system
      if (parentAddFileToFileSystem) {
        // Create a blob from the dataURL to simulate a file object
        const response = await fetch(dataURL);
        const blob = await response.blob();
        const file = new File([blob], finalFileName, { type: 'image/png' });

        const result = parentAddFileToFileSystem(finalFileName, dataURL, currentPath, 'png', file);

        // Force refresh of views
        if (parent.refreshExplorerViews) {
          parent.refreshExplorerViews();
        }

        if (currentPath === 'C://Desktop' && parent.renderDesktopIcons) {
          parent.renderDesktopIcons();
        }

        alert(`Drawing saved as "${finalFileName}" in ${currentPath}!`);
      } else {
        alert('File system not available. Drawing saved to storage only.');
      }
    } else {
      alert('Drawing saved to storage but not added to file system.');
    }
  } catch (error) {
    console.error('Error saving drawing:', error);
    alert('Error saving drawing: ' + error.message);
  }
}function loadWatercolourDrawing() {
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

      alert('Select an image file from the file explorer to load it onto the canvas.');
    } else {
      alert('File explorer not available. Please ensure the main OS is loaded.');
    }
  }
}

function loadImageOntoCanvas(imageData, fileInfo = null) {

  const img = new Image();
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

    // Track the loaded file for Save functionality
    // When loading an image, we're creating a new drawing based on that image,
    // not opening an existing drawing file for editing
    currentFile = null; // Clear current file since this is a new drawing
    if (window.updateSaveButtonState) {
      window.updateSaveButtonState();
    }
  };
  img.onerror = () => {
    console.error('Error loading selected image.');
    alert('Error loading selected image.');
  };
  img.src = imageData;
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
