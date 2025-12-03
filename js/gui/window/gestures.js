import { cycleWindows, completeCurrentWindowCycle, handleTabSwipe } from './cycling.js';
import { minimizeWindow, toggleFullScreen } from './state.js';

// --- Touch Gesture Support (mobile-friendly shortcuts) ---
// Adds:
// - Swipe left/right on taskbar tabs area to cycle windows (Alt+Tab equivalent)
// - Two-finger tap on desktop to show desktop (minimize all)
// - Two-finger swipe on window header: up = maximize/restore, down = minimize
// This runs once on touch-capable devices.
(function setupTouchGesturesOnce(){
  if (typeof window === 'undefined') return;
  if (window.__touchGesturesSetup) return;
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  window.__touchGesturesSetup = true;

  // Helper: add horizontal swipe detection
  function addHorizontalSwipe(el, { threshold = 50, onLeft, onRight } = {}) {
    if (!el) return;
    let startX = 0, startY = 0, moved = false;
    el.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; moved = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      moved = true;
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
          // Horizontal swipe
          if (dx < 0 && typeof onLeft === 'function') onLeft(e);
          if (dx > 0 && typeof onRight === 'function') onRight(e);
        }
      }
    }, { passive: true });
  }

  // Helper: two-finger tap (quick) detection
  function addTwoFingerTap(el, { maxDuration = 300, maxMove = 15, onTap } = {}) {
    if (!el) return;
    let startTime = 0;
    let startTouches = [];
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        startTime = Date.now();
        startTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
      } else {
        startTime = 0; startTouches = [];
      }
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (!startTime) return;
      const duration = Date.now() - startTime;
      if (duration > maxDuration) { startTime = 0; return; }
      // Check movement
      const changed = e.changedTouches;
      if (!changed || changed.length < 1) { startTime = 0; return; }
      let moved = false;
      Array.from(changed).forEach((t, i) => {
        const ref = startTouches[i] || startTouches[0];
        if (!ref) return;
        if (Math.hypot(t.clientX - ref.x, t.clientY - ref.y) > maxMove) moved = true;
      });
      if (!moved && typeof onTap === 'function') {
        onTap(e);
      }
      startTime = 0; startTouches = [];
    }, { passive: true });
  }

  // Helper: two-finger vertical swipe on headers
  function addTwoFingerHeaderSwipe({ threshold = 60 } = {}) {
    let startY = 0; let active = false; let targetWinId = null;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const header = e.target.closest('.cursor-move');
        if (header) {
          startY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          active = true;
          const win = header.closest('[role="dialog"]');
          targetWinId = win ? win.id : null;
        }
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      // passive true, do not block scroll unless we detect big gesture on header
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!active) return;
      const header = e.target.closest('.cursor-move');
      if (!header) { active = false; targetWinId = null; return; }
      const avgY = (e.changedTouches[0]?.clientY ?? startY);
      const dy = avgY - startY;
      const winId = targetWinId;
      active = false; targetWinId = null;
      if (!winId) return;
      if (dy > threshold) {
        // Swipe down: minimize
        if (typeof minimizeWindow === 'function') minimizeWindow(winId);
      } else if (dy < -threshold) {
        // Swipe up: maximize/restore
        if (typeof toggleFullScreen === 'function') toggleFullScreen(winId);
      }
    }, { passive: true });
  }

  // 1) Taskbar swipe: cycle windows. Left = previous, Right = next.
  const tabs = document.getElementById('window-tabs');
  addHorizontalSwipe(tabs, {
    onLeft: () => {
      handleTabSwipe('left');
    },
    onRight: () => {
      handleTabSwipe('right');
    }
  });

  // 2) Two-finger tap on desktop to show desktop (minimize all)
  const desktop = document.getElementById('desktop-stage') || document.body;
  addTwoFingerTap(desktop, { onTap: () => { try { if (typeof window.minimizeAllWindows === 'function') window.minimizeAllWindows(); } catch(_){} } });

  // 3) Two-finger swipe on window header to minimize/maximize
  addTwoFingerHeaderSwipe();

  // 4) Global long-press => synthesize contextmenu (for desktop, explorer, items, taskbar tabs)
  (function setupGlobalLongPressToContextMenu(){
    let pressTimer = null;
    let startX = 0, startY = 0;
    let moved = false;
    let startTarget = null;
    const LONG_PRESS_MS = 500;
    const MOVE_CANCEL = 12; // px

    function clearTimer(){ if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }

    // Add CSS class to prevent default context menu on long press if supported
    if (document.body) document.body.classList.add('no-context-menu');

    document.addEventListener('touchstart', (e) => {
      // Don't block multi-touch gestures
      if (!e.touches || e.touches.length !== 1) { clearTimer(); return; }

      // Ignore editable fields
      const t = e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]');
      if (t) { clearTimer(); return; }

      const touch = e.touches[0];
      startX = touch.clientX; startY = touch.clientY;
      moved = false;
      startTarget = e.target;
      clearTimer();

      pressTimer = setTimeout(() => {
        // Determine target at press point (in case DOM changed)
        const targetAtPoint = document.elementFromPoint(startX, startY) || startTarget || document.body;

        // Dispatch custom contextmenu event
        const evt = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: startX,
          clientY: startY
        });
        targetAtPoint.dispatchEvent(evt);

        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate(50);

        clearTimer();
      }, LONG_PRESS_MS);
    }, { passive: true });

    // Prevent default context menu on long press for non-editable elements
    document.addEventListener('contextmenu', (e) => {
      // Always prevent default browser menu on touch devices
      // This is critical for the "Long Press" gesture to work without browser interference
      if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
         // Allow inputs to have native menu if needed, but usually we want our own
         const isInput = e.target.closest('input, textarea, [contenteditable="true"]');
         if (!isInput) {
           e.preventDefault();
         }
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!pressTimer || !e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - startX) > MOVE_CANCEL || Math.abs(t.clientY - startY) > MOVE_CANCEL) {
        moved = true; clearTimer();
      }
    }, { passive: true });

    document.addEventListener('touchend', () => { clearTimer(); }, { passive: true });
    document.addEventListener('touchcancel', () => { clearTimer(); }, { passive: true });
  })();
})();
