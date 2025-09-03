import { createWindow } from '../gui/window.js';

export function launchHappyTurd() {
  const existingWindow = document.getElementById('happyturd');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  const win = createWindow(
    'Happy Turd',
    '',
    false,
    'happyturd',
    false,
    false,
    { type: 'integer', width: 360, height: 640 },
    'App',
    null,
    'black'
  );

  initializeHappyTurdUI(win).catch(console.error);
}

export async function initializeHappyTurdUI(win) {
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-black h-full overflow-hidden flex flex-col items-center';
  content.innerHTML = '';

  const hud = document.createElement('div');
  hud.className = 'w-full flex items-center justify-between text-white px-2 pb-2';
  hud.style.fontFamily = 'monospace';
  hud.innerHTML = `<div></div><div id="happyturd-score">0</div><div id="happyturd-status">Playing</div>`;

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'flex-1 flex items-center justify-center w-full';
  const canvas = document.createElement('canvas');
  canvas.id = 'happyturd-canvas';
  canvas.width = 320;
  canvas.height = 480;
  canvas.style.background = '#87ceeb';
  canvas.style.border = '2px inset #666';
  canvasContainer.appendChild(canvas);

  const hint = document.createElement('div');
  hint.className = 'text-xs text-gray-800 pt-2';
  hint.textContent = 'Controls: Click or Space to flap. Avoid the pipes.';

  content.appendChild(hud);
  content.appendChild(canvasContainer);
  content.appendChild(hint);

  const ctx = canvas.getContext('2d');

  // Game variables
  let score = 0;
  let best = 0;
  const gravity = 0.45;
  const flapStrength = -8.5;
  let vy = 0;
  let x = 60;
  let y = canvas.height / 2;
  const turdSize = 28; // used for collision box

  const pipes = [];
  const pipeWidth = 52;
  const gapSize = 130;
  let spawnTimer = 0;
  const spawnInterval = 90; // frames

  let running = true;
  let rafId = null;

  function spawnPipe() {
    const topHeight = 40 + Math.random() * (canvas.height - gapSize - 120);
    pipes.push({ x: canvas.width, top: topHeight, passed: false });
  }

  function resetGame() {
    score = 0;
    vy = 0;
    y = canvas.height / 2;
    pipes.length = 0;
    spawnTimer = 0;
    running = true;
    updateHUD();
  }

  function updateHUD() {
    const scoreEl = document.getElementById('happyturd-score');
    const statusEl = document.getElementById('happyturd-status');
    if (scoreEl) scoreEl.textContent = String(score);
    if (statusEl) statusEl.textContent = running ? 'Playing' : 'Game Over';
  }

  function drawTurd(cx, cy) {
    // Draw a poo emoji centered at (cx, cy)
    ctx.font = `${turdSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💩', cx, cy + 2); // slight vertical tweak
  }

  function draw() {
    // Sky background
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Pipes
    ctx.fillStyle = '#2f9e44';
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.top + gapSize, pipeWidth, canvas.height - (pipe.top + gapSize) - 40);
    });

    // Turd
    drawTurd(x, y);
  }

  function checkCollision() {
    // Floor
    if (y + turdSize / 2 >= canvas.height - 40) return true;
    if (y - turdSize / 2 <= 0) return true;

    // Pipes
    for (const pipe of pipes) {
      const left = pipe.x;
      const right = pipe.x + pipeWidth;
      const top = pipe.top;
      const bottom = pipe.top + gapSize;

      // Simple circle/rect overlap via bounding boxes
      if (x + turdSize / 2 > left && x - turdSize / 2 < right) {
        if (y - turdSize / 2 < top || y + turdSize / 2 > bottom) return true;
      }
    }
    return false;
  }

  function update() {
    if (!running) return;

    // Physics
    vy += gravity;
    y += vy;

    // Pipes movement
    for (const pipe of pipes) {
      pipe.x -= 2.2;
      if (!pipe.passed && pipe.x + pipeWidth < x) {
        pipe.passed = true;
        score += 1;
        updateHUD();
      }
    }

    // Remove offscreen pipes
    while (pipes.length && pipes[0].x + pipeWidth < -10) pipes.shift();

    // Spawn pipes
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnPipe();
    }

    // Check collisions
    if (checkCollision()) {
      running = false;
      best = Math.max(best, score);
      updateHUD();
    }
  }

  function gameLoop() {
    update();
    draw();
    rafId = requestAnimationFrame(gameLoop);
  }

  function flap() {
    if (!running) {
      resetGame();
      return;
    }
    vy = flapStrength;
  }

  function keyDownHandler(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      flap();
    }
    if (e.key === 'r' || e.key === 'R') {
      resetGame();
    }
  }

  canvas.addEventListener('click', () => flap());
  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';

  document.addEventListener('keydown', keyDownHandler);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'happyturd') {
          cleanup();
          observer.disconnect();
        }
      });
    });
  });
  observer.observe(document.getElementById('windows-container'), { childList: true });

  function cleanup() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    document.removeEventListener('keydown', keyDownHandler);
  }

  // Start
  resetGame();
  rafId = requestAnimationFrame(gameLoop);
}
