// Get canvas and create context with the willReadFrequently flag
const canvas = document.getElementById('watercolourCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Global state variables
let painting = false;
let currentTool = 'brush';
let startX, startY;
let activeColor = '#000000';
let strokeSize = 5;
let savedImage = null; // Holds the committed canvas state (data URL)
let backupCanvas = null; // Offscreen canvas for shape previews
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
});

// Whenever the color changes, update the canvas styles and, if the text tool is active, update the input color.
colorPicker.addEventListener('change', (e) => {
  activeColor = e.target.value;
  ctx.strokeStyle = activeColor;
  ctx.fillStyle = activeColor;
  if (currentTool === 'text' && textInput.style.display === 'block') {
    textInput.style.color = activeColor;
  }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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
  });
});

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
  }
});

// Menu actions
document.getElementById('newBtn').addEventListener('click', () => {
  if (confirm('Clear canvas? Unsaved work will be lost.')) {
    const cssWidth = canvas.offsetWidth;
    const cssHeight = canvas.offsetHeight;
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    savedImage = canvas.toDataURL();
    commitState();
  }
});

document.getElementById('saveBtn').addEventListener('click', () => {
  localStorage.setItem('appState.paint', canvas.toDataURL());
  alert('Drawing saved!');
});

document.getElementById('loadBtn').addEventListener('click', () => {
  const dataUrl = localStorage.getItem('appState.paint');
  if (dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      savedImage = canvas.toDataURL();
      commitState();
    }
  } else {
    alert('No saved drawing found.');
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = canvas.toDataURL();
  link.click();
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
  }
});

// Redo button event listener
document.getElementById('redoBtn').addEventListener('click', () => {
  if (redoStack.length) {
    const state = redoStack.pop();
    undoStack.push(state);
    restoreState(state);
    savedImage = state;
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
  canvas.width = cssWidth * ratio;
  canvas.height = cssHeight * ratio;
  // Explicitly set the CSS size so that the drawn pixels match the layout
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  // Restore previously saved image if any
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
    commitState();
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
