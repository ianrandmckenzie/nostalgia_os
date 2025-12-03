import { windowStates, saveState } from '../../os/manage_data.js';

// Function to get app icon based on window ID or title
export function getAppIcon(windowId, title) {
  // Check if this is a custom app with a stored icon
  const windowElement = document.getElementById(windowId);
  if (windowElement && windowElement.dataset.customAppIcon) {
    return windowElement.dataset.customAppIcon;
  }

  // Map of app window IDs to their icons
  const appIconMap = {
    'calculator': 'image/calculator.webp',
    'mediaplayer': 'image/video.webp',
    'bombbroomer': 'image/bombbroomer.webp',
    'solitaire': 'image/solitaire.webp',
    'pong': 'image/pong.webp',
    'snake': 'image/snake.webp',
    'happyturd': 'image/happyturd.webp',
    'chess': 'image/guillotine_chess.webp',
    'mailbox': 'image/mail.webp',
    'watercolour': 'image/watercolour.webp',
    'compostbin': 'image/compost-bin.webp',
    'storage': 'image/drive_c.webp',
    'explorer-window': 'image/computer.webp',
    'tubestream': 'image/youtube.webp'
  };

  // Map of window titles to their icons (for navigation windows and other special cases)
  const titleIconMap = {
    'Settings': 'image/gears.webp',
    'Desktop Settings': 'image/gears.webp',
    'About This Computer': 'image/info.webp',
    'My Computer': 'image/computer.webp',
    'File Explorer': 'image/computer.webp',
    'Media Player': 'image/video.webp',
    'Calculator': 'image/calculator.webp',
    'Bombbroomer': 'image/bombbroomer.webp',
    'Solitaire': 'image/solitaire.webp',
    'Pong': 'image/pong.webp',
    'Snake': 'image/snake.webp',
    'Happy Turd': 'image/happyturd.webp',
    'Guillotine Chess': 'image/guillotine_chess.webp',
    'Chess': 'image/guillotine_chess.webp',
    'Mail Box': 'image/mail.webp',
    'Watercolour': 'image/watercolour.webp',
    'Compost Bin': 'image/compost-bin.webp',
    'Storage Manager': 'image/drive_c.webp',
    'TubeStream': 'image/youtube.webp',
    'Security Policy': 'image/info.webp'
  };

  // Check by window ID first
  if (appIconMap[windowId]) {
    return appIconMap[windowId];
  }

  // Check by title
  if (titleIconMap[title]) {
    return titleIconMap[title];
  }

  // Special handling for file windows that may have IDs like file names
  if (windowId && windowId.includes('-')) {
    // Check if this might be a file window
    const lowerTitle = title.toLowerCase();
    const lowerWindowId = windowId.toLowerCase();

    // Image files
    if (lowerTitle.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i) ||
        lowerWindowId.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i)) {
      return 'image/image.webp';
    }

    // Video files
    if (lowerTitle.match(/\.(mp4|webm|avi|mov|mkv)$/i) ||
        lowerWindowId.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
      return 'image/video.webp';
    }

    // Audio files
    if (lowerTitle.match(/\.(mp3|wav|ogg|m4a|flac)$/i) ||
        lowerWindowId.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
      return 'image/audio.webp';
    }

    // Text/Document files
    if (lowerTitle.match(/\.(txt|md|doc|docx)$/i) ||
        lowerWindowId.match(/\.(txt|md|doc|docx)$/i) ||
        lowerTitle.includes('letterpad')) {
      return 'image/file.webp';
    }

    // HTML files
    if (lowerTitle.match(/\.(html|htm)$/i) ||
        lowerWindowId.match(/\.(html|htm)$/i)) {
      return 'image/html.webp';
    }
  }

  // Default icons for common window title patterns
  if (title.includes('LetterPad') || title.includes('.md') || title.includes('.txt')) {
    return 'image/file.webp';
  }

  if (title.includes('.jpg') || title.includes('.png') || title.includes('.gif') ||
      title.includes('.webp') || title.includes('.jpeg') || title.includes('.bmp') ||
      title.includes('.avif')) {
    return 'image/image.webp';
  }

  if (title.includes('.mp4') || title.includes('.webm') || title.includes('.avi') ||
      title.includes('.mov') || title.includes('.mkv')) {
    return 'image/video.webp';
  }

  if (title.includes('.mp3') || title.includes('.wav') || title.includes('.ogg') ||
      title.includes('.m4a') || title.includes('.flac')) {
    return 'image/audio.webp';
  }

  if (title.includes('.html') || title.includes('.htm')) {
    return 'image/html.webp';
  }

  // Return null for unknown window types (will fall back to text-only)
  return null;
}

// --- Mobile/ViewPort Safety Helpers ---
export function clampWindowToViewport(win) {
  if (!win) return;
  const state = windowStates[win.id];
  if (state && state.fullScreen) return; // skip fullscreen
  const vpWidth = window.innerWidth;
  const vpHeight = window.innerHeight - 48; // minus taskbar
  // Current size
  const rect = win.getBoundingClientRect();
  let changed = false;

  // Constrain width if bigger than viewport
  if (rect.width > vpWidth) {
    win.style.width = Math.max(350, vpWidth - 10) + 'px';
    changed = true;
  }

  // Constrain height if bigger than viewport (account for window header)
  const headerHeight = 30; // Approximate header height
  const maxHeight = vpHeight - headerHeight - 10; // 10px padding
  if (rect.height > vpHeight) {
    win.style.height = Math.max(200, maxHeight) + 'px';
    changed = true;
  }

  // Update state dimensions if changed
  if (changed && state) {
    state.dimensions = {
      type: 'integer',
      width: parseInt(win.style.width),
      height: parseInt(win.style.height)
    };
  }

  // Reposition if off-screen (consider desktop-stage pan)
  let panX = 0, panY = 0;
  const stage = document.getElementById('desktop-stage');
  if (stage) {
    const tf = getComputedStyle(stage).transform;
    if (tf && tf !== 'none') {
      const m = tf.match(/matrix\(([^)]+)\)/);
      if (m) {
        const nums = m[1].split(',').map(n=>parseFloat(n.trim()));
        if (nums.length === 6) { panX = nums[4]; panY = nums[5]; }
      }
    }
  }
  const left = parseInt(win.style.left, 10) || 0;
  const top = parseInt(win.style.top, 10) || 0;
  let newLeft = left;
  let newTop = top;

  // Horizontal clamping
  if (left + rect.width < -panX + 50) { newLeft = -panX + 20; changed = true; }
  if (left > -panX + vpWidth - 50) { newLeft = -panX + vpWidth - rect.width - 20; changed = true; }

  // Vertical clamping (Handlebar visibility)
  // 1. Prevent handlebar from going above the top edge
  if (top < -panY) { newTop = -panY; changed = true; }

  // 2. Prevent handlebar from going below the bottom edge
  // Ensure at least 30px of the header is visible above the taskbar
  const maxTop = -panY + vpHeight - 30;
  if (newTop > maxTop) { newTop = maxTop; changed = true; }

  win.style.left = newLeft + 'px';
  win.style.top = newTop + 'px';
  if (changed && state) {
    state.position = { left: win.style.left, top: win.style.top };
    saveState();
  }
}

// Re-clamp all visible windows on resize (debounced)
let clampTimer = null;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (clampTimer) cancelAnimationFrame(clampTimer);
    clampTimer = requestAnimationFrame(() => {
      document.querySelectorAll('#windows-container > div').forEach(w => clampWindowToViewport(w));
    });
  });
}
