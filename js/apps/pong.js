import { createWindow, bringToFront } from '../gui/window.js';
import { storage } from '../os/indexeddb_storage.js';
import { createPauseController } from '../utils/game_pause.js';

export function launchPong() {
  // Prevent duplicate window
  const existingWindow = document.getElementById('pong');
  if (existingWindow) {
    bringToFront(existingWindow);
    return;
  }

  const isMobile = window.innerWidth < 600;
  const width = isMobile ? Math.min(window.innerWidth - 20, 700) : 700;
  const height = isMobile ? Math.min(window.innerHeight - 60, 500) : 500;

  const win = createWindow(
    'Pong',
    '',
    false,
    'pong',
    false,
    false,
    { type: 'integer', width: width, height: height },
    'App',
    null,
    'black'
  );

  initializePongUI(win).catch(console.error);
}

export async function initializePongUI(win) {
  if (!win) {
    win = document.getElementById('pong');
    if (!win) return; // nothing to init
  }
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-black h-full overflow-hidden flex flex-col';
  content.innerHTML = '';

  // Header / score area
  const hud = document.createElement('div');
  hud.className = 'flex items-center justify-between text-white px-2 pb-2';
  hud.style.fontFamily = 'monospace';
  hud.innerHTML = `<div>🙋 Player</div><div id="pong-score">0 - 0</div><div>High: <span id="pong-high-score">0</span></div>`;

  // Canvas
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'flex-1 flex items-center justify-center';
  const canvas = document.createElement('canvas');
  canvas.id = 'pong-canvas';
  canvas.style.background = '#000';
  canvas.style.border = '2px inset #666';

  const isMobile = window.innerWidth < 600;
  canvas.width = isMobile ? Math.min(window.innerWidth - 40, 640) : 640;
  canvas.height = isMobile ? Math.min(window.innerHeight - 150, 360) : 360;

  canvasContainer.appendChild(canvas);

  // Controls hint
  const hint = document.createElement('div');
  hint.className = 'text-xs text-gray-300 pt-2';
  hint.textContent = isMobile ? 'Drag on screen to move paddle.' : 'Controls: W/S or Up/Down to move paddle. Click canvas to focus.';

  content.appendChild(hud);
  content.appendChild(canvasContainer);
  content.appendChild(hint);

  const ctx = canvas.getContext('2d');

  // Game state
  let playerScore = 0;
  let aiScore = 0;
  let highScore = 0;

  // Load high score
  highScore = await storage.getItem('pong-high-score') || 0;

  const state = {
    paddleHeight: 60,
    paddleWidth: 8,
    playerY: (canvas.height - 60) / 2,
    aiY: (canvas.height - 60) / 2,
    ballX: canvas.width / 2,
    ballY: canvas.height / 2,
    ballVX: 3,
    ballVY: 2,
    ballRadius: 6,
    upPressed: false,
    downPressed: false,
    running: true,
    rafId: null
  };
  const pause = createPauseController({ windowId: 'pong', container: canvasContainer, overlayZ: 10 });

  function resetBall(direction = 1) {
    state.ballX = canvas.width / 2;
    state.ballY = canvas.height / 2;
    state.ballVX = 3 * direction;
    state.ballVY = (Math.random() * 3 - 1.5);
  }

  function draw() {
    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Net
    ctx.fillStyle = '#444';
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.fillRect(canvas.width / 2 - 1, y + 5, 2, 10);
    }

    // Paddles
    ctx.fillStyle = '#fff';
    // Player (left)
    ctx.fillRect(20, state.playerY, state.paddleWidth, state.paddleHeight);
    // AI (right)
    ctx.fillRect(canvas.width - 20 - state.paddleWidth, state.aiY, state.paddleWidth, state.paddleHeight);

    // Ball
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, state.ballRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function update(scale) {
    // scale represents how many 60Hz frames this rAF covered (dt * 60)
    // Move player paddle (6 px per 60Hz frame)
    if (state.upPressed) state.playerY -= 6 * scale;
    if (state.downPressed) state.playerY += 6 * scale;
    state.playerY = Math.max(0, Math.min(canvas.height - state.paddleHeight, state.playerY));

    // Simple AI: follow the ball with some lag (3.2 px per frame baseline)
    const aiCenter = state.aiY + state.paddleHeight / 2;
    if (aiCenter < state.ballY - 10) state.aiY += 3.2 * scale;
    if (aiCenter > state.ballY + 10) state.aiY -= 3.2 * scale;
    state.aiY = Math.max(0, Math.min(canvas.height - state.paddleHeight, state.aiY));

    // Move ball (velocity values are per 60Hz frame)
    state.ballX += state.ballVX * scale;
    state.ballY += state.ballVY * scale;

    // Top / bottom collision
    if (state.ballY - state.ballRadius <= 0 || state.ballY + state.ballRadius >= canvas.height) {
      state.ballVY = -state.ballVY;
    }

    // Left paddle collision
    if (state.ballX - state.ballRadius <= 20 + state.paddleWidth) {
      if (state.ballY >= state.playerY && state.ballY <= state.playerY + state.paddleHeight) {
        state.ballVX = -state.ballVX;
        // tweak Y velocity based on hit position
        const delta = (state.ballY - (state.playerY + state.paddleHeight / 2)) / (state.paddleHeight / 2);
        state.ballVY += delta * 2;
        state.ballX = 20 + state.paddleWidth + state.ballRadius + 1;
      }
    }

    // Right paddle collision
    if (state.ballX + state.ballRadius >= canvas.width - 20 - state.paddleWidth) {
      if (state.ballY >= state.aiY && state.ballY <= state.aiY + state.paddleHeight) {
        state.ballVX = -state.ballVX;
        const delta = (state.ballY - (state.aiY + state.paddleHeight / 2)) / (state.paddleHeight / 2);
        state.ballVY += delta * 2;
        state.ballX = canvas.width - 20 - state.paddleWidth - state.ballRadius - 1;
      }
    }

    // Score
    if (state.ballX < 0) {
      aiScore += 1;
      updateScoreDisplay();
      resetBall(1);
    }
    if (state.ballX > canvas.width) {
      playerScore += 1;
      if (playerScore > highScore) {
        highScore = playerScore;
        storage.setItemSync('pong-high-score', highScore);
        // Send high score to Devvit if in Devvit context
        if (window.isDevvit) {
          window.parent.postMessage({
            type: 'setGameScore',
            data: { game: 'pong', score: highScore }
          }, '*');
        }
      }
      updateScoreDisplay();
      resetBall(-1);
    }
  }

  let lastTime = null;
  function gameLoop(ts) {
    if (!state.running) return;
  pause.recompute();
    if (lastTime == null) lastTime = ts;
    const dt = ts - lastTime; // ms
    lastTime = ts;
    // Convert to 60Hz frame scale; cap to avoid huge jumps when tab was inactive
    let scale = dt / (1000 / 60);
    if (scale > 3) scale = 3; // cap at 3 frames worth
  if (!pause.paused) {
      update(scale);
      draw();
    }
    state.rafId = requestAnimationFrame(gameLoop);
  }

  function updateScoreDisplay() {
    const scoreEl = document.getElementById('pong-score');
    const highEl = document.getElementById('pong-high-score');
    if (scoreEl) scoreEl.textContent = `${playerScore} - ${aiScore}`;
    if (highEl) highEl.textContent = String(highScore);
  }

  // Input
  function keyDownHandler(e) {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') state.upPressed = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') state.downPressed = true;
  }
  function keyUpHandler(e) {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') state.upPressed = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') state.downPressed = false;
  }

  // Touch controls
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling
    if (e.touches.length > 0) {
      const touchY = e.touches[0].clientY;
      const rect = canvas.getBoundingClientRect();
      const relativeY = touchY - rect.top;

      // Map touch position to paddle position
      // Center paddle on finger
      state.playerY = relativeY - state.paddleHeight / 2;

      // Clamp
      state.playerY = Math.max(0, Math.min(canvas.height - state.paddleHeight, state.playerY));
    }
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => {
     e.preventDefault();
  }, { passive: false });

  // Focus canvas on click so keyboard works
  canvas.addEventListener('click', () => canvas.focus());
  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';

  document.addEventListener('keydown', keyDownHandler);
  document.addEventListener('keyup', keyUpHandler);

  // MutationObserver to cleanup when window is removed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'pong') {
          cleanup();
          observer.disconnect();
        }
      });
    });
  });
  observer.observe(document.getElementById('windows-container'), { childList: true });

  function cleanup() {
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
  pause.destroy();
  }

  // Start
  resetBall(1);
  updateScoreDisplay();
  state.rafId = requestAnimationFrame(gameLoop);
}

// Expose for restoration
if (typeof window !== 'undefined') {
  window.initializePongUI = initializePongUI;
}
