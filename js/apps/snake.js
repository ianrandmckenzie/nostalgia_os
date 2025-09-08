import { createWindow, bringToFront } from '../gui/window.js';
import { storage } from '../os/indexeddb_storage.js';

export function launchSnake() {
  const existingWindow = document.getElementById('snake');
  if (existingWindow) {
    bringToFront(existingWindow);
    return;
  }

  const win = createWindow(
    'Snake',
    '',
    false,
    'snake',
    false,
    false,
    { type: 'integer', width: 620, height: 520 },
    'App',
    null,
    'black'
  );

  initializeSnakeUI(win).catch(console.error);
}

export async function initializeSnakeUI(win) {
  if (!win) {
    win = document.getElementById('snake');
    if (!win) return; // nothing to init
  }
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-black h-full overflow-hidden flex flex-col items-center';
  content.innerHTML = '';

  const hud = document.createElement('div');
  hud.className = 'w-full flex items-center justify-between text-white px-2 pb-2';
  hud.style.fontFamily = 'monospace';
  hud.innerHTML = `<div>Score: <span id="snake-score">0</span></div><div id="snake-status">Playing</div><div>High: <span id="snake-high-score">0</span></div>`;

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'flex-1 flex items-center justify-center w-full';
  const canvas = document.createElement('canvas');
  canvas.id = 'snake-canvas';
  canvas.width = 560;
  canvas.height = 420;
  canvas.style.background = '#000';
  canvas.style.border = '2px inset #666';
  canvasContainer.appendChild(canvas);

  const hint = document.createElement('div');
  hint.className = 'text-xs text-gray-300 pt-2';
  hint.textContent = 'Controls: Arrow keys or W/A/S/D. Press R to restart.';

  content.appendChild(hud);
  content.appendChild(canvasContainer);
  content.appendChild(hint);

  const ctx = canvas.getContext('2d');

  // Grid-based snake
  const gridSize = 20;
  const cols = Math.floor(canvas.width / gridSize);
  const rows = Math.floor(canvas.height / gridSize);

  let snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
  let dir = { x: 1, y: 0 };
  let food = null;
  let score = 0;
  let highScore = 0;
  let running = true;
  let speed = 8; // moves per second
  let lastUpdate = 0;
  let rafId = null;

  // Load high score
  highScore = await storage.getItem('snake-high-score') || 0;

  function placeFood() {
    let ok = false;
    while (!ok) {
      const fx = Math.floor(Math.random() * cols);
      const fy = Math.floor(Math.random() * rows);
      ok = !snake.some(s => s.x === fx && s.y === fy);
      if (ok) food = { x: fx, y: fy };
    }
  }

  function resetGame() {
    snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
    dir = { x: 1, y: 0 };
    score = 0;
    running = true;
    speed = 8;
    placeFood();
    updateHUD();
  }

  function updateHUD() {
    const scoreEl = document.getElementById('snake-score');
    const statusEl = document.getElementById('snake-status');
    const lenEl = document.getElementById('snake-length');
    const highEl = document.getElementById('snake-high-score');
    if (scoreEl) scoreEl.textContent = String(score);
    if (statusEl) statusEl.textContent = running ? 'Playing' : 'Game Over';
    if (lenEl) lenEl.textContent = String(snake.length);
    if (highEl) highEl.textContent = String(highScore);
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw food
    if (food) {
      ctx.fillStyle = '#e3342f';
      ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
    }

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      ctx.fillStyle = (i % 2 === 0) ? '#7ed957' : '#5aa83d';
      ctx.fillRect(s.x * gridSize, s.y * gridSize, gridSize - 1, gridSize - 1);
    }
  }

  function step() {
    if (!running) return;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wrap-around behavior
    if (head.x < 0) head.x = cols - 1;
    if (head.x >= cols) head.x = 0;
    if (head.y < 0) head.y = rows - 1;
    if (head.y >= rows) head.y = 0;

    // Collision with self
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      running = false;
      updateHUD();
      return;
    }

    snake.unshift(head);

    // Eat food
    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      if (score > highScore) {
        highScore = score;
        storage.setItemSync('snake-high-score', highScore);
        // Send high score to Devvit if in Devvit context
        if (window.isDevvit) {
          window.parent.postMessage({
            type: 'setGameScore',
            data: { game: 'snake', score: highScore }
          }, '*');
        }
      }
      // slightly increase speed every few points
      if (score % 5 === 0) speed = Math.min(20, speed + 1);
      placeFood();
    } else {
      snake.pop();
    }

    updateHUD();
  }

  let accumulator = 0;
  function gameLoop(ts) {
    if (!lastUpdate) lastUpdate = ts;
    let dt = ts - lastUpdate;
    if (dt > 1000) dt = 1000; // tab was backgrounded; cap
    lastUpdate = ts;
    accumulator += dt;
    const interval = 1000 / speed;
    let stepped = false;
    while (accumulator >= interval) {
      step();
      accumulator -= interval;
      stepped = true;
    }
    if (stepped) draw();
    rafId = requestAnimationFrame(gameLoop);
  }

  function keyDownHandler(e) {
    const key = e.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      if (dir.y === 0) dir = { x: 0, y: -1 };
    }
    if (key === 'ArrowDown' || key === 's' || key === 'S') {
      if (dir.y === 0) dir = { x: 0, y: 1 };
    }
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (dir.x === 0) dir = { x: -1, y: 0 };
    }
    if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (dir.x === 0) dir = { x: 1, y: 0 };
    }
    if (key === 'r' || key === 'R') {
      resetGame();
    }
  }

  canvas.addEventListener('click', () => canvas.focus());
  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';

  document.addEventListener('keydown', keyDownHandler);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'snake') {
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

  // Start game
  resetGame();
  draw();
  rafId = requestAnimationFrame(gameLoop);
}

// Expose for restoration
if (typeof window !== 'undefined') {
  window.initializeSnakeUI = initializeSnakeUI;
}
