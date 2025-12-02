import { windowStates, saveState } from '../../os/manage_data.js';
import { bringToFront } from './state.js';

export function makeDraggable(el) {
  const header = el.querySelector('.cursor-move');
  if (!header) return;
  header.addEventListener('mousedown', function (e) {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    // Determine current pan offset from desktop-stage transform if present
    let panX = 0, panY = 0;
    const stage = document.getElementById('desktop-stage');
    if (stage) {
      const transform = getComputedStyle(stage).transform;
      if (transform && transform !== 'none') {
        const parts = transform.match(/matrix\(([^)]+)\)/);
        if (parts && parts[1]) {
          const nums = parts[1].split(',').map(n => parseFloat(n.trim()));
          if (nums.length === 6) { panX = nums[4]; panY = nums[5]; }
        }
      }
    }
    function mouseMoveHandler(e) {
      // Adjust for pan (stage translated by panX/panY)
      let newLeft = (e.clientX - offsetX - panX);
      let newTop = (e.clientY - offsetY - panY);

      // Vertical clamping (Handlebar visibility)
      const vpHeight = window.innerHeight - 48;
      const maxTop = -panY + vpHeight - 30;

      if (newTop < -panY) newTop = -panY;
      if (newTop > maxTop) newTop = maxTop;

      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    }
    function mouseUpHandler() {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      if (windowStates[el.id]) {
        windowStates[el.id].position = { left: el.style.left, top: el.style.top };
        saveState();
      }
    }
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    bringToFront(el);
  });
}

export function makeResizable(el) {
  const resizer = document.createElement('div');
  // Make the resizer clearly above transient drag clones (z=1000) and easier to grab
  resizer.className = 'absolute bottom-0 right-0 w-6 h-6 cursor-se-resize';
  resizer.style.background = 'rgba(0,0,0,0.2)';
  resizer.style.zIndex = '1100';
  resizer.style.pointerEvents = 'auto';
  // Add a subtle border to make it more visible
  resizer.style.borderTop = '1px solid rgba(255,255,255,0.2)';
  resizer.style.borderLeft = '1px solid rgba(255,255,255,0.05)';
  el.appendChild(resizer);
  resizer.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
    const startHeight = parseInt(document.defaultView.getComputedStyle(el).height, 10);
    function doDrag(e) {
      const newWidth = Math.max(startWidth + e.clientX - startX, 350);
      const newHeight = Math.max(startHeight + e.clientY - startY, 200);
      el.style.width = newWidth + 'px';
      el.style.height = newHeight + 'px';
    }
    function stopDrag() {
      document.documentElement.removeEventListener('mousemove', doDrag, false);
      document.documentElement.removeEventListener('mouseup', stopDrag, false);
      windowStates[el.id].dimensions = { type: 'integer', width: parseInt(el.style.width), height: parseInt(el.style.height) };
      saveState();
    }
    document.documentElement.addEventListener('mousemove', doDrag, false);
    document.documentElement.addEventListener('mouseup', stopDrag, false);
  });
}
