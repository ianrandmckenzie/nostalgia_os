// Desktop panning & touch window drag support
// Minimum virtual desktop size based on iPad Air landscape (2360x1640 CSS approx -> we'll standardize)
// We'll use 1180x820 as base logical size and scale up if viewport larger.

const MIN_WIDTH = 1180; // half of 2360 for reasonable scale
const MIN_HEIGHT = 820; // half of 1640

let stageEl; // desktop-stage
let windowsContainer;

// Enhance window dragging for touch (single finger on header still moves individual window)
function enableTouchWindowDragging() {
  document.addEventListener('touchstart', (e) => {
    const header = e.target.closest('.cursor-move');
    if (!header) return;
    const win = header.closest('#windows-container > div');
    if (!win) return;
    const state = window.windowStates?.[win.id];
    if (state?.fullScreen) return; // no dragging when fullscreen
    // Only one finger for window drag
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = win.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    function moveHandler(ev) {
      if (ev.touches.length !== 1) return;
      const t = ev.touches[0];

      // Adjust for scroll position
      const scrollLeft = stageEl ? stageEl.scrollLeft : 0;
      const scrollTop = stageEl ? stageEl.scrollTop : 0;

      win.style.left = (t.clientX + scrollLeft - offsetX) + 'px';
      win.style.top = (t.clientY + scrollTop - offsetY) + 'px';
      ev.preventDefault();
    }

    function endHandler(ev) {
      window.removeEventListener('touchmove', moveHandler, { passive: false });
      window.removeEventListener('touchend', endHandler);
      const st = window.windowStates?.[win.id];
      if (st) {
        st.position = { left: win.style.left, top: win.style.top };
        if (window.saveState) window.saveState();
      }
    }
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', endHandler, { passive: false });
  }, { passive: true });
}

export function initializeDesktopPan() {
  stageEl = document.getElementById('desktop-stage');
  windowsContainer = document.getElementById('windows-container');
  if (!stageEl || !windowsContainer) return;

  // Ensure base size on the content container, not the scroll container
  windowsContainer.style.minWidth = MIN_WIDTH + 'px';
  windowsContainer.style.minHeight = MIN_HEIGHT + 'px';

  // Enable touch dragging for windows
  enableTouchWindowDragging();
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.initializeDesktopPan = initializeDesktopPan;
}
