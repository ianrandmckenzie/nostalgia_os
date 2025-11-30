// Custom scrollbar implementation for mobile devices (especially iOS)
// Provides always-visible, old-school styled scrollbars

let customScrollbars = null;

export function initializeCustomScrollbars() {
  // Only initialize on mobile devices
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;

  const stage = document.getElementById('desktop-stage');
  if (!stage) return;

  // Create scrollbar container
  customScrollbars = {
    stage,
    vertical: null,
    horizontal: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    scrollStart: { x: 0, y: 0 }
  };

  // Create vertical scrollbar
  createVerticalScrollbar();

  // Create horizontal scrollbar
  createHorizontalScrollbar();

  // Update scrollbars on scroll
  stage.addEventListener('scroll', updateScrollbars, { passive: true });

  // Update scrollbars on resize
  window.addEventListener('resize', () => {
    updateScrollbarSizes();
    updateScrollbars();
  });

  // Initial update
  updateScrollbarSizes();
  updateScrollbars();
}

function createVerticalScrollbar() {
  const { stage } = customScrollbars;

  // Create scrollbar track
  const track = document.createElement('div');
  track.id = 'custom-scrollbar-vertical';
  track.className = 'custom-scrollbar-track custom-scrollbar-vertical';
  track.style.opacity = '0'; // Start hidden

  // Create up button
  const upBtn = document.createElement('div');
  upBtn.className = 'custom-scrollbar-button custom-scrollbar-up';
  upBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2 L9 8 L1 8 Z" fill="black"/></svg>`;
  track.appendChild(upBtn);

  // Create scrollbar track area
  const trackArea = document.createElement('div');
  trackArea.className = 'custom-scrollbar-track-area';

  // Create thumb
  const thumb = document.createElement('div');
  thumb.className = 'custom-scrollbar-thumb';
  trackArea.appendChild(thumb);
  track.appendChild(trackArea);

  // Create down button
  const downBtn = document.createElement('div');
  downBtn.className = 'custom-scrollbar-button custom-scrollbar-down';
  downBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8 L9 2 L1 2 Z" fill="black"/></svg>`;
  track.appendChild(downBtn);

  document.body.appendChild(track);
  customScrollbars.vertical = { track, trackArea, thumb, upBtn, downBtn };

  // Add event listeners
  setupVerticalScrollbarEvents();
}

function createHorizontalScrollbar() {
  const { stage } = customScrollbars;

  // Create scrollbar track
  const track = document.createElement('div');
  track.id = 'custom-scrollbar-horizontal';
  track.className = 'custom-scrollbar-track custom-scrollbar-horizontal';
  track.style.opacity = '0'; // Start hidden

  // Create left button
  const leftBtn = document.createElement('div');
  leftBtn.className = 'custom-scrollbar-button custom-scrollbar-left';
  leftBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5 L8 9 L8 1 Z" fill="black"/></svg>`;
  track.appendChild(leftBtn);

  // Create scrollbar track area
  const trackArea = document.createElement('div');
  trackArea.className = 'custom-scrollbar-track-area';

  // Create thumb
  const thumb = document.createElement('div');
  thumb.className = 'custom-scrollbar-thumb';
  trackArea.appendChild(thumb);
  track.appendChild(trackArea);

  // Create right button
  const rightBtn = document.createElement('div');
  rightBtn.className = 'custom-scrollbar-button custom-scrollbar-right';
  rightBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M8 5 L2 9 L2 1 Z" fill="black"/></svg>`;
  track.appendChild(rightBtn);

  document.body.appendChild(track);
  customScrollbars.horizontal = { track, trackArea, thumb, leftBtn, rightBtn };

  // Add event listeners
  setupHorizontalScrollbarEvents();
}

function setupVerticalScrollbarEvents() {
  const { stage, vertical } = customScrollbars;
  const { thumb, upBtn, downBtn, trackArea } = vertical;

  // Thumb dragging
  thumb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    customScrollbars.isDragging = true;
    customScrollbars.dragStart.y = e.clientY;
    customScrollbars.scrollStart.y = stage.scrollTop;

    document.body.style.userSelect = 'none';
    thumb.style.cursor = 'grabbing';
  });

  // Up button
  let upInterval;
  upBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stage.scrollTop -= 40;
    upInterval = setInterval(() => {
      stage.scrollTop -= 40;
    }, 100);
  });
  upBtn.addEventListener('pointerup', () => clearInterval(upInterval));
  upBtn.addEventListener('pointerleave', () => clearInterval(upInterval));

  // Down button
  let downInterval;
  downBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stage.scrollTop += 40;
    downInterval = setInterval(() => {
      stage.scrollTop += 40;
    }, 100);
  });
  downBtn.addEventListener('pointerup', () => clearInterval(downInterval));
  downBtn.addEventListener('pointerleave', () => clearInterval(downInterval));

  // Track click
  trackArea.addEventListener('pointerdown', (e) => {
    if (e.target === thumb) return;
    e.preventDefault();

    const rect = trackArea.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const thumbRect = thumb.getBoundingClientRect();
    const thumbY = thumbRect.top - rect.top;

    if (clickY < thumbY) {
      stage.scrollTop -= stage.clientHeight * 0.9;
    } else {
      stage.scrollTop += stage.clientHeight * 0.9;
    }
  });
}

function setupHorizontalScrollbarEvents() {
  const { stage, horizontal } = customScrollbars;
  const { thumb, leftBtn, rightBtn, trackArea } = horizontal;

  // Thumb dragging
  thumb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    customScrollbars.isDragging = true;
    customScrollbars.dragStart.x = e.clientX;
    customScrollbars.scrollStart.x = stage.scrollLeft;

    document.body.style.userSelect = 'none';
    thumb.style.cursor = 'grabbing';
  });

  // Left button
  let leftInterval;
  leftBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stage.scrollLeft -= 40;
    leftInterval = setInterval(() => {
      stage.scrollLeft -= 40;
    }, 100);
  });
  leftBtn.addEventListener('pointerup', () => clearInterval(leftInterval));
  leftBtn.addEventListener('pointerleave', () => clearInterval(leftInterval));

  // Right button
  let rightInterval;
  rightBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stage.scrollLeft += 40;
    rightInterval = setInterval(() => {
      stage.scrollLeft += 40;
    }, 100);
  });
  rightBtn.addEventListener('pointerup', () => clearInterval(rightInterval));
  rightBtn.addEventListener('pointerleave', () => clearInterval(rightInterval));

  // Track click
  trackArea.addEventListener('pointerdown', (e) => {
    if (e.target === thumb) return;
    e.preventDefault();

    const rect = trackArea.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const thumbRect = thumb.getBoundingClientRect();
    const thumbX = thumbRect.left - rect.left;

    if (clickX < thumbX) {
      stage.scrollLeft -= stage.clientWidth * 0.9;
    } else {
      stage.scrollLeft += stage.clientWidth * 0.9;
    }
  });
}

// Global pointer events for dragging
document.addEventListener('pointermove', (e) => {
  if (!customScrollbars || !customScrollbars.isDragging) return;

  const { stage, vertical, horizontal, dragStart, scrollStart } = customScrollbars;

  // Vertical scrolling
  if (vertical && Math.abs(e.clientY - dragStart.y) > Math.abs(e.clientX - dragStart.x)) {
    const { trackArea } = vertical;
    const trackRect = trackArea.getBoundingClientRect();
    const deltaY = e.clientY - dragStart.y;
    const scrollRatio = stage.scrollHeight / trackRect.height;
    stage.scrollTop = scrollStart.y + (deltaY * scrollRatio);
  }
  // Horizontal scrolling
  else if (horizontal && Math.abs(e.clientX - dragStart.x) > Math.abs(e.clientY - dragStart.y)) {
    const { trackArea } = horizontal;
    const trackRect = trackArea.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const scrollRatio = stage.scrollWidth / trackRect.width;
    stage.scrollLeft = scrollStart.x + (deltaX * scrollRatio);
  }
});

document.addEventListener('pointerup', () => {
  if (!customScrollbars) return;

  if (customScrollbars.isDragging) {
    customScrollbars.isDragging = false;
    document.body.style.userSelect = '';

    if (customScrollbars.vertical) {
      customScrollbars.vertical.thumb.style.cursor = 'grab';
    }
    if (customScrollbars.horizontal) {
      customScrollbars.horizontal.thumb.style.cursor = 'grab';
    }
  }
});

function updateScrollbarSizes() {
  if (!customScrollbars) return;

  const { stage, vertical, horizontal } = customScrollbars;

  // Update vertical scrollbar
  if (vertical) {
    const { track, trackArea, thumb } = vertical;
    const hasVerticalScroll = stage.scrollHeight > stage.clientHeight;
    track.style.display = hasVerticalScroll ? 'flex' : 'none';

    if (hasVerticalScroll) {
      const thumbHeight = Math.max(40, (stage.clientHeight / stage.scrollHeight) * trackArea.clientHeight);
      thumb.style.height = thumbHeight + 'px';
    }
  }

  // Update horizontal scrollbar
  if (horizontal) {
    const { track, trackArea, thumb } = horizontal;
    const hasHorizontalScroll = stage.scrollWidth > stage.clientWidth;
    track.style.display = hasHorizontalScroll ? 'flex' : 'none';

    if (hasHorizontalScroll) {
      const thumbWidth = Math.max(40, (stage.clientWidth / stage.scrollWidth) * trackArea.clientWidth);
      thumb.style.width = thumbWidth + 'px';
    }
  }
}

function updateScrollbars() {
  if (!customScrollbars) return;

  const { stage, vertical, horizontal } = customScrollbars;

  // Update vertical scrollbar position
  if (vertical && vertical.track.style.display !== 'none') {
    const { trackArea, thumb } = vertical;
    const scrollRatio = stage.scrollTop / (stage.scrollHeight - stage.clientHeight);
    const maxThumbTop = trackArea.clientHeight - thumb.clientHeight;
    const thumbTop = scrollRatio * maxThumbTop;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }

  // Update horizontal scrollbar position
  if (horizontal && horizontal.track.style.display !== 'none') {
    const { trackArea, thumb } = horizontal;
    const scrollRatio = stage.scrollLeft / (stage.scrollWidth - stage.clientWidth);
    const maxThumbLeft = trackArea.clientWidth - thumb.clientWidth;
    const thumbLeft = scrollRatio * maxThumbLeft;
    thumb.style.transform = `translateX(${thumbLeft}px)`;
  }
}

// Function to show scrollbars (called after splash screen)
export function showCustomScrollbars() {
  if (!customScrollbars) return;

  if (customScrollbars.vertical) {
    customScrollbars.vertical.track.style.transition = 'opacity 0.3s ease';
    customScrollbars.vertical.track.style.opacity = '1';
  }

  if (customScrollbars.horizontal) {
    customScrollbars.horizontal.track.style.transition = 'opacity 0.3s ease';
    customScrollbars.horizontal.track.style.opacity = '1';
  }
}

// Function to hide scrollbars (called when window is maximized)
export function hideCustomScrollbars() {
  if (!customScrollbars) return;

  if (customScrollbars.vertical) {
    customScrollbars.vertical.track.style.transition = 'opacity 0.3s ease';
    customScrollbars.vertical.track.style.opacity = '0';
  }

  if (customScrollbars.horizontal) {
    customScrollbars.horizontal.track.style.transition = 'opacity 0.3s ease';
    customScrollbars.horizontal.track.style.opacity = '0';
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.initializeCustomScrollbars = initializeCustomScrollbars;
  window.showCustomScrollbars = showCustomScrollbars;
  window.hideCustomScrollbars = hideCustomScrollbars;
}
