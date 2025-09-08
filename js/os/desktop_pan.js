// Desktop panning & touch window drag support
// Minimum virtual desktop size based on iPad Air landscape (2360x1640 CSS approx -> we'll standardize)
// We'll use 1180x820 as base logical size and scale up if viewport larger.

const MIN_WIDTH = 1180; // half of 2360 for reasonable scale
const MIN_HEIGHT = 820; // half of 1640

let pan = { x: 0, y: 0 };
let startPan = null;
let activeTouches = new Map();
let isTwoFingerPanning = false;
let stageEl; // desktop-stage
let windowsContainer;

// Track current transform to avoid layout thrash
function applyPan() {
  if (!stageEl) return;
  stageEl.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
}

function clampPan() {
  if (!stageEl) return;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight - 40; // minus taskbar
  const deskW = Math.max(MIN_WIDTH, vpW);
  const deskH = Math.max(MIN_HEIGHT, vpH);
  // Limit so you can't pan beyond edges (keep at least some stage visible)
  const maxX = 0;
  const maxY = 0;
  const minX = Math.min(0, vpW - deskW);
  const minY = Math.min(0, vpH - deskH);
  if (pan.x > maxX) pan.x = maxX;
  if (pan.y > maxY) pan.y = maxY;
  if (pan.x < minX) pan.x = minX;
  if (pan.y < minY) pan.y = minY;
}

function handleTouchStart(e) {
  if (!stageEl.contains(e.target)) return;
  for (const t of e.changedTouches) {
    activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
  }
  if (activeTouches.size === 2) {
    // Begin two-finger pan if touches are on desktop background or header bars (not fullscreen)
    const headersOk = Array.from(e.touches).every(t => {
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (!el) return false;
      const win = el.closest('#windows-container > div');
      if (!win) return true; // desktop area
      // Only allow if touching header bar and window not fullscreen
      const header = el.closest('.cursor-move');
      const state = window.windowStates?.[win.id];
      return !!header && state && !state.fullScreen;
    });
    if (headersOk) {
      isTwoFingerPanning = true;
      startPan = { ...pan };
      e.preventDefault();
    }
  }
}

function handleTouchMove(e) {
  if (!isTwoFingerPanning) return;
  if (e.touches.length !== 2) return endPan();
  // Average movement
  const points = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
  const avgX = (points[0].x + points[1].x) / 2;
  const avgY = (points[0].y + points[1].y) / 2;
  const prevPoints = Array.from(activeTouches.values());
  if (prevPoints.length < 2) return;
  const prevAvgX = (prevPoints[0].x + prevPoints[1].x) / 2;
  const prevAvgY = (prevPoints[0].y + prevPoints[1].y) / 2;
  const dx = avgX - prevAvgX;
  const dy = avgY - prevAvgY;
  pan.x += dx;
  pan.y += dy;
  clampPan();
  applyPan();
  // Update stored positions
  activeTouches.clear();
  for (const t of e.touches) activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
  e.preventDefault();
}

function handleTouchEnd(e) {
  for (const t of e.changedTouches) {
    activeTouches.delete(t.identifier);
  }
  if (activeTouches.size < 2) endPan();
}

function endPan() {
  isTwoFingerPanning = false;
  startPan = null;
}

// Enhance window dragging for touch (single finger on header still moves individual window)
function enableTouchWindowDragging() {
  document.addEventListener('touchstart', (e) => {
    const header = e.target.closest('.cursor-move');
    if (!header) return;
    const win = header.closest('#windows-container > div');
    if (!win) return;
    const state = window.windowStates?.[win.id];
    if (state?.fullScreen) return; // no dragging when fullscreen
    // Only one finger for window drag (ignore if multi-touch to allow pan)
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = win.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    function moveHandler(ev) {
      if (ev.touches.length !== 1) return;
      const t = ev.touches[0];
      // Adjust for current pan offset (since stage is translated)
      const desktopOffsetX = -pan.x;
      const desktopOffsetY = -pan.y;
      win.style.left = (t.clientX + desktopOffsetX - offsetX) + 'px';
      win.style.top = (t.clientY + desktopOffsetY - offsetY) + 'px';
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
  if (!stageEl) return;
  // Ensure base size
  stageEl.style.minWidth = MIN_WIDTH + 'px';
  stageEl.style.minHeight = MIN_HEIGHT + 'px';
  // Touch handlers
  stageEl.addEventListener('touchstart', handleTouchStart, { passive: false });
  stageEl.addEventListener('touchmove', handleTouchMove, { passive: false });
  stageEl.addEventListener('touchend', handleTouchEnd, { passive: false });
  stageEl.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  enableTouchWindowDragging();
  // Recalculate clamp on resize
  window.addEventListener('resize', () => { clampPan(); applyPan(); });
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.initializeDesktopPan = initializeDesktopPan;
}
