// Shared game pause controller for window-focused pausing & page visibility
// Usage:
//   const pause = createPauseController({ windowId: 'pong', container: canvasParent });
//   In rAF loop: pause.recompute(); if (!pause.paused) { ...update/draw... }
//   On cleanup: pause.destroy();

export function createPauseController({ windowId, container, overlayText = 'Paused', overlayZ = 50 }) {
  if (!container) throw new Error('Pause controller: container required');
  // Ensure container positioning for overlay stacking
  const prevPos = container.style.position;
  if (!prevPos || prevPos === 'static') {
    container.style.position = 'relative';
  }

  // Overlay element
  const overlay = document.createElement('div');
  overlay.className = 'game-pause-overlay';
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    display: 'none',
    background: 'rgba(0,0,0,0.55)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '36px',
    fontWeight: 'bold',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: String(overlayZ),
    pointerEvents: 'none'
  });
  overlay.textContent = overlayText;
  container.appendChild(overlay);

  let paused = false;
  let destroyed = false;

  function getTopWindowId() {
    const wins = Array.from(document.querySelectorAll('#windows-container > div'))
      .filter(w => w.style.display !== 'none' && w.id !== 'taskbar');
    if (!wins.length) return null;
    wins.sort((a, b) => (parseInt(b.style.zIndex) || 0) - (parseInt(a.style.zIndex) || 0));
    return wins[0].id || null;
  }

  function recompute() {
    if (destroyed) return;
    const shouldPause = document.hidden || getTopWindowId() !== windowId;
    if (shouldPause !== paused) {
      paused = shouldPause;
      overlay.style.display = paused ? 'flex' : 'none';
    }
  }

  function handleVisibility() { recompute(); }
  document.addEventListener('visibilitychange', handleVisibility);

  // Mutation observer: watches for window removal / z-index changes via node reordering
  const winContainer = document.getElementById('windows-container');
  let observer = null;
  if (winContainer && 'MutationObserver' in window) {
    observer = new MutationObserver(() => {
      // Microtask -> schedule recompute next frame for updated z-indices
      requestAnimationFrame(recompute);
    });
    observer.observe(winContainer, { childList: true, subtree: false });
  }

  function destroy() {
    destroyed = true;
    document.removeEventListener('visibilitychange', handleVisibility);
    if (observer) observer.disconnect();
    if (overlay && overlay.parentElement === container) {
      overlay.remove();
    }
    if (prevPos === '' || prevPos === 'static') {
      // leave container position as relative (could be needed by others) - so no revert
    }
  }

  return {
    get paused() { return paused; },
    overlay,
    recompute,
    destroy
  };
}
