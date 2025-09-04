import { createWindow } from '../gui/window.js';
import { storage } from '../os/indexeddb_storage.js';

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
  content.className = 'p-2 bg-black h-full overflow-hidden flex flex-col';
  content.innerHTML = '';

  // Load difficulty setting
  let currentDifficulty = await storage.getItem('happyturd-difficulty') || 'medium';
  let gapSize = getGapSizeForDifficulty(currentDifficulty);

  // Load theme setting
  let currentTheme = await storage.getItem('happyturd-theme') || 'system';

  // Menu Bar
  const menuBar = document.createElement('div');
  menuBar.className = 'flex items-center justify-between px-2 py-1 bg-gray-800 border-b border-gray-600';
  menuBar.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="relative">
        <button id="difficultyMenuBtn" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded border border-gray-600 flex items-center gap-1" onclick="toggleDifficultyDropdown(event)">
          Difficulty
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="difficultyDropdown" class="absolute left-0 top-full mt-1 w-32 bg-gray-700 border border-gray-600 rounded shadow-lg z-50 hidden">
          <button class="w-full text-left px-3 py-2 text-white hover:bg-gray-600 flex items-center justify-between text-sm" onclick="setDifficulty('easy')">
            <span>Easy</span>
            <span id="easy-check" class="text-green-400 ${currentDifficulty === 'easy' ? '' : 'hidden'}">✓</span>
          </button>
          <button class="w-full text-left px-3 py-2 text-white hover:bg-gray-600 flex items-center justify-between text-sm" onclick="setDifficulty('medium')">
            <span>Medium</span>
            <span id="medium-check" class="text-green-400 ${currentDifficulty === 'medium' ? '' : 'hidden'}">✓</span>
          </button>
          <button class="w-full text-left px-3 py-2 text-white hover:bg-gray-600 flex items-center justify-between text-sm" onclick="setDifficulty('hard')">
            <span>Hard</span>
            <span id="hard-check" class="text-green-400 ${currentDifficulty === 'hard' ? '' : 'hidden'}">✓</span>
          </button>
        </div>
      </div>
      <div class="relative">
        <button id="themeMenuBtn" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded border border-gray-600 flex items-center gap-1" onclick="toggleThemeDropdown(event)">
          Theme
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="themeDropdown" class="absolute left-0 top-full mt-1 w-32 bg-gray-700 border border-gray-600 rounded shadow-lg z-50 hidden">
          <button class="w-full text-left px-3 py-2 text-white hover:bg-gray-600 flex items-center justify-between text-sm" onclick="setTheme('system')">
            <span>System</span>
            <span id="system-check" class="text-green-400 ${currentTheme === 'system' ? '' : 'hidden'}">✓</span>
          </button>
          <button class="w-full text-left px-3 py-2 text-white hover:bg-gray-600 flex items-center justify-between text-sm" onclick="setTheme('light')">
            <span>Light</span>
            <span id="light-check" class="text-green-400 ${currentTheme === 'light' ? '' : 'hidden'}">✓</span>
          </button>
          <button class="w-full text-left px-3 py-2 text-white hover:bg-gray-600 flex items-center justify-between text-sm" onclick="setTheme('dark')">
            <span>Dark</span>
            <span id="dark-check" class="text-green-400 ${currentTheme === 'dark' ? '' : 'hidden'}">✓</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const hud = document.createElement('div');
  hud.className = 'w-full flex items-center justify-between text-white px-2 pb-2';
  hud.style.fontFamily = 'monospace';
  hud.innerHTML = `<div>Best: <span id="happyturd-best">0</span></div><div id="happyturd-score">0</div><div id="happyturd-status">Playing</div>`;

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'flex-1 flex items-center justify-center w-full';
  const canvas = document.createElement('canvas');
  canvas.id = 'happyturd-canvas';
  canvas.width = 320;
  canvas.height = 480;
  canvas.style.background = '#87ceeb';
  canvas.style.border = '2px inset #666';
  canvasContainer.appendChild(canvas);

  // Intro screen overlay
  const introOverlay = document.createElement('div');
  introOverlay.id = 'happyturd-intro';
  introOverlay.className = 'absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10';
  introOverlay.style.display = 'flex';
  introOverlay.style.fontFamily = 'monospace';

  // Logo
  const logo = document.createElement('img');
  logo.src = '/image/happyturd.webp';
  logo.alt = 'Happy Turd Logo';
  logo.className = 'w-32 h-32 mb-8 drop-shadow-lg';

  // Title
  const title = document.createElement('h1');
  title.textContent = 'Happy Turd';
  title.className = 'text-white text-xl font-bold mb-8 text-center drop-shadow-lg';
  title.style.fontFamily = 'monospace';

  // Instructions
  const instructions = document.createElement('div');
  instructions.className = 'text-white text-sm mb-8 text-left max-w-xs drop-shadow';
  instructions.style.fontFamily = 'monospace';
  instructions.innerHTML = `
    <p class="mb-4">Help the turd fly through the pipes!</p>
    <p class="mb-2">• Click or press SPACE to flap</p>
    <p class="mb-2">• Avoid the pipes</p>
    <p class="mb-2">• Collect points by passing through pipes</p>
    <p class="mb-4">• Don't hit the ground, ceiling, or pipes</p>
  `;

  // Start button
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Game';
  startButton.className = 'px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-lg border-2 border-green-400 transition-colors drop-shadow-lg';
  startButton.style.fontFamily = 'monospace';
  startButton.onclick = () => startGame();

  introOverlay.appendChild(logo);
  introOverlay.appendChild(title);
  introOverlay.appendChild(instructions);
  introOverlay.appendChild(startButton);

  // Game Over screen overlay
  const gameOverOverlay = document.createElement('div');
  gameOverOverlay.id = 'happyturd-gameover';
  gameOverOverlay.className = 'absolute inset-0 bg-black/20 flex flex-col items-center justify-center z-10';
  gameOverOverlay.style.display = 'none';
  gameOverOverlay.style.fontFamily = 'monospace';
  gameOverOverlay.style.opacity = '0';
  gameOverOverlay.style.transition = 'opacity 200ms ease-in-out';

  // Game Over Title
  const gameOverTitle = document.createElement('h1');
  gameOverTitle.textContent = 'Game Over';
  gameOverTitle.className = 'text-white text-3xl font-bold mb-6 text-center drop-shadow-lg';
  gameOverTitle.style.fontFamily = 'monospace';

  // Score Display
  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'text-white text-xl mb-4 text-center drop-shadow';
  scoreDisplay.style.fontFamily = 'monospace';
  scoreDisplay.innerHTML = `
    <p class="mb-2">Score: <span id="gameover-score" class="text-yellow-400 font-bold">0</span></p>
    <p class="mb-2">Best: <span id="gameover-best" class="text-green-400 font-bold">0</span></p>
    <p id="new-high-score" class="text-red-400 font-bold text-lg" style="display: none;">🎉 New High Score! 🎉</p>
  `;

  // Try Again button
  const tryAgainButton = document.createElement('button');
  tryAgainButton.textContent = 'Try Again';
  tryAgainButton.className = 'px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg border-2 border-blue-400 transition-colors drop-shadow-lg mt-4';
  tryAgainButton.style.fontFamily = 'monospace';
  tryAgainButton.onclick = () => tryAgain();

  gameOverOverlay.appendChild(gameOverTitle);
  gameOverOverlay.appendChild(scoreDisplay);
  gameOverOverlay.appendChild(tryAgainButton);

  // Position overlay relative to canvas
  canvasContainer.style.position = 'relative';
  canvasContainer.appendChild(introOverlay);
  canvasContainer.appendChild(gameOverOverlay);

  content.appendChild(menuBar);
  content.appendChild(hud);
  content.appendChild(canvasContainer);

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

  // Game state
  let gameState = 'intro'; // 'intro' or 'playing'

  // Wing animation variables
  let wingFlapTimer = 0;
  let wingFlapCount = 0;
  const wingFlapDuration = 8; // frames for each flap
  const maxWingFlaps = 2; // flap twice per jump

  // Splatter animation variables
  let splatterParticles = [];
  let splatterActive = false;
  const splatterDuration = 120; // frames (2 seconds at 60fps)
  let splatterTimer = 0;

  // Load best score
  best = await storage.getItem('happyturd-best-score') || 0;

  // Difficulty helper function
  function getGapSizeForDifficulty(difficulty) {
    switch (difficulty) {
      case 'easy': return 260;
      case 'medium': return 195;
      case 'hard': return 130;
      default: return 195; // medium default
    }
  }

  // Difficulty dropdown functions
  window.toggleDifficultyDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('difficultyDropdown');
    dropdown.classList.toggle('hidden');
  };

  window.setDifficulty = async function(difficulty) {
    currentDifficulty = difficulty;
    gapSize = getGapSizeForDifficulty(difficulty);

    // Update checkboxes
    document.getElementById('easy-check').classList.toggle('hidden', difficulty !== 'easy');
    document.getElementById('medium-check').classList.toggle('hidden', difficulty !== 'medium');
    document.getElementById('hard-check').classList.toggle('hidden', difficulty !== 'hard');

    // Save to storage
    await storage.setItem('happyturd-difficulty', difficulty);

    // Hide dropdown
    document.getElementById('difficultyDropdown').classList.add('hidden');

    // Reset game with new difficulty
    resetGame();
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('difficultyDropdown');
    const button = document.getElementById('difficultyMenuBtn');
    if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Theme dropdown functions
  window.toggleThemeDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('themeDropdown');
    dropdown.classList.toggle('hidden');
  };

  window.setTheme = async function(theme) {
    currentTheme = theme;

    // Update checkboxes
    document.getElementById('system-check').classList.toggle('hidden', theme !== 'system');
    document.getElementById('light-check').classList.toggle('hidden', theme !== 'light');
    document.getElementById('dark-check').classList.toggle('hidden', theme !== 'dark');

    // Save to storage
    await storage.setItem('happyturd-theme', theme);

    // Hide dropdown
    document.getElementById('themeDropdown').classList.add('hidden');

    // Regenerate stars for new theme
    regenerateStars();

    // Trigger immediate redraw with new theme (no game reset needed)
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(gameLoop);
  };

  // Close theme dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('themeDropdown');
    const button = document.getElementById('themeMenuBtn');
    if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });

  const pipes = [];
  const pipeWidth = 52;
  let spawnTimer = 0;
  const spawnInterval = 90; // frames

  // Background elements
  let clouds = [];
  let hills = [];
  let mountains = [];
  let grass = [];
  let backgroundScroll = 0;

  // Theme detection based on user preference
  const getIsDarkMode = () => {
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    // 'system' - follow OS preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // Generate fixed stars for dark mode (regenerate when theme changes)
  let stars = [];
  const regenerateStars = () => {
    const isDark = getIsDarkMode();
    stars = isDark ? Array.from({length: 50}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.6), // Stars only in upper 60% of sky
      size: Math.random() * 2 + 0.5, // Small twinkling stars
      brightness: Math.random() * 0.5 + 0.5 // Random brightness
    })) : [];
  };
  regenerateStars(); // Initial generation

  // Fixed celestial body (sun or moon) in the background
  const celestialBody = {
    x: canvas.width * 0.8, // Fixed position in upper right
    y: 50,
    size: 35,
    rays: Array.from({length: 12}, (_, i) => ({
      angle: (i / 12) * Math.PI * 2, // Evenly spaced rays
      length: 35 * (0.8 + Math.random() * 0.4)
    }))
  };

  let running = true;
  let rafId = null;

  function spawnPipe() {
    const topHeight = 40 + Math.random() * (canvas.height - gapSize - 120);
    pipes.push({ x: canvas.width, top: topHeight, passed: false });
  }

  // Background generation functions
  function generateCloud() {
    const y = 20 + Math.random() * 100;
    const size = 20 + Math.random() * 30;
    clouds.push({
      x: canvas.width + Math.random() * 200,
      y: y,
      size: size,
      puffs: Array.from({length: 3 + Math.floor(Math.random() * 3)}, () => ({
        x: (Math.random() - 0.5) * size,
        y: (Math.random() - 0.5) * size * 0.5,
        radius: size * (0.3 + Math.random() * 0.4)
      }))
    });
  }

  function generateHill() {
    const baseY = canvas.height; // Lower to sit better on ground
    const width = 200 + Math.random() * 150;
    const height = 40 + Math.random() * 80;
    hills.push({
      x: canvas.width + Math.random() * 300,
      baseY: baseY,
      width: width,
      height: height,
      color: `hsl(${80 + Math.random() * 40}, ${30 + Math.random() * 20}%, ${30 + Math.random() * 30}%)` // Increased minimum lightness to 60%
    });
  }

  function generateMountain() {
    const baseY = canvas.height - 40;
    const height = 80 + Math.random() * 100;
    const width = 60 + Math.random() * 80;
    mountains.push({
      x: canvas.width + Math.random() * 500,
      baseY: baseY,
      height: height,
      width: width,
      peaks: Array.from({length: 2 + Math.floor(Math.random() * 3)}, () => ({
        offset: (Math.random() - 0.5) * width * 0.8,
        height: 0.7 + Math.random() * 0.3
      }))
    });
  }

  function generateGrass() {
    // Generate grass sprigs along the ground
    const numSprigs = 50 + Math.floor(Math.random() * 10);
    for (let i = 0; i < numSprigs; i++) {
      grass.push({
        x: Math.random() * canvas.width,
        height: 15 + Math.random() * 10
      });
    }
  }

  function createSplatter(cx, cy) {
    splatterParticles = [];
    splatterActive = true;
    splatterTimer = splatterDuration;

    // Create 15-20 splatter particles
    const particleCount = 15 + Math.floor(Math.random() * 6);
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      const size = 3 + Math.random() * 5;

      splatterParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2, // Some upward bias
        size: size,
        opacity: 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  function startGame() {
    gameState = 'playing';
    const introOverlay = document.getElementById('happyturd-intro');
    if (introOverlay) {
      introOverlay.style.display = 'none';
    }
    resetGame();
  }

  function tryAgain() {
    const gameOverOverlay = document.getElementById('happyturd-gameover');
    if (gameOverOverlay) {
      gameOverOverlay.style.opacity = '0';
      // Hide after fade out completes
      setTimeout(() => {
        gameOverOverlay.style.display = 'none';
      }, 200);
    }
    resetGame();
  }

  function resetGame() {
    score = 0;
    vy = 0;
    y = canvas.height / 2;
    pipes.length = 0;
    spawnTimer = 0;
    running = true;
    gameState = 'playing';
    updateHUD();

    // Hide game over overlay
    const gameOverOverlay = document.getElementById('happyturd-gameover');
    if (gameOverOverlay) {
      gameOverOverlay.style.opacity = '0';
      // Hide after fade out completes
      setTimeout(() => {
        gameOverOverlay.style.display = 'none';
      }, 200);
    }

    // Reset splatter animation
    splatterParticles = [];
    splatterActive = false;
    splatterTimer = 0;

    // Reset background elements
    clouds.length = 0;
    hills.length = 0;
    mountains.length = 0;
    grass.length = 0;
    backgroundScroll = 0;

    // Generate initial background elements
    for (let i = 0; i < 5; i++) generateCloud();
    for (let i = 0; i < 3; i++) generateHill();
    for (let i = 0; i < 4; i++) generateMountain();
    generateGrass();
  }

  function updateHUD() {
    const scoreEl = document.getElementById('happyturd-score');
    const statusEl = document.getElementById('happyturd-status');
    const bestEl = document.getElementById('happyturd-best');
    if (scoreEl) scoreEl.textContent = String(score);
    if (statusEl) {
      if (gameState === 'intro') {
        statusEl.textContent = 'Ready';
      } else {
        statusEl.textContent = running ? 'Playing' : 'Game Over';
      }
    }
    if (bestEl) bestEl.textContent = String(best);
  }

  function drawTurd(cx, cy) {
    // Draw wings behind (only during flap animation)
    if (wingFlapTimer > 0) {
      ctx.font = `${turdSize * 1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Left wing reversed
      ctx.save();
      ctx.translate(cx - turdSize * 0.4, cy);
      ctx.scale(-1, 1);
      ctx.fillText('🪽', 0, 0);
      ctx.restore();

      // Right wing normal
      ctx.fillText('🪽', cx + turdSize * 0.4, cy);
    }

    // Draw emoji based on game state
    const emoji = running ? '💩' : '☠️';
    ctx.font = `${turdSize}px serif`;
    ctx.fillText(emoji, cx, cy + 2); // slight vertical tweak
  }

  function draw() {
    // Get current theme state
    const currentIsDarkMode = getIsDarkMode();

    // Sky background with gradient (light or dark mode)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (currentIsDarkMode) {
      // Dark mode: deep black to midnight blue gradient
      gradient.addColorStop(0, '#000011'); // Deep black at top
      gradient.addColorStop(1, '#000033'); // Midnight blue at bottom
    } else {
      // Light mode: blue sky gradient
      gradient.addColorStop(0, '#87ceeb');
      gradient.addColorStop(1, '#4a90e2');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars in dark mode
    if (currentIsDarkMode) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw celestial body (sun or moon)
    if (currentIsDarkMode) {
      // Draw moon
      ctx.fillStyle = '#E6E6E6'; // Light gray moon
      ctx.beginPath();
      ctx.arc(celestialBody.x, celestialBody.y, celestialBody.size, 0, Math.PI * 2);
      ctx.fill();

      // Moon craters for texture
      ctx.fillStyle = '#CCCCCC';
      ctx.beginPath();
      ctx.arc(celestialBody.x - celestialBody.size * 0.2, celestialBody.y - celestialBody.size * 0.1, celestialBody.size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(celestialBody.x + celestialBody.size * 0.3, celestialBody.y + celestialBody.size * 0.2, celestialBody.size * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Moon face
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000'; // Ensure stroke is also black for the smile
      // Eyes
      ctx.beginPath();
      ctx.arc(celestialBody.x - celestialBody.size * 0.25, celestialBody.y - celestialBody.size * 0.15, celestialBody.size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(celestialBody.x + celestialBody.size * 0.25, celestialBody.y - celestialBody.size * 0.15, celestialBody.size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Smile or frown based on game state
      ctx.beginPath();
      if (running) {
        // Happy smile when game is running
        ctx.arc(celestialBody.x, celestialBody.y + celestialBody.size * 0.1, celestialBody.size * 0.3, 0, Math.PI);
      } else {
        // Sad frown when game is over
        ctx.arc(celestialBody.x, celestialBody.y + celestialBody.size * 0.25, celestialBody.size * 0.3, Math.PI, 0);
      }
      ctx.stroke();
    } else {
      // Draw sun
      // Draw sun rays
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      celestialBody.rays.forEach(ray => {
        const rayEndX = celestialBody.x + Math.cos(ray.angle) * ray.length;
        const rayEndY = celestialBody.y + Math.sin(ray.angle) * ray.length;
        ctx.moveTo(celestialBody.x, celestialBody.y);
        ctx.lineTo(rayEndX, rayEndY);
      });
      ctx.stroke();

      // Draw sun face
      ctx.fillStyle = '#FFFF00';
      ctx.beginPath();
      ctx.arc(celestialBody.x, celestialBody.y, celestialBody.size, 0, Math.PI * 2);
      ctx.fill();

      // Draw happy/sad face based on game state
      ctx.fillStyle = '#000';
      // Eyes
      ctx.beginPath();
      ctx.arc(celestialBody.x - celestialBody.size * 0.3, celestialBody.y - celestialBody.size * 0.2, celestialBody.size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(celestialBody.x + celestialBody.size * 0.3, celestialBody.y - celestialBody.size * 0.2, celestialBody.size * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Smile or frown based on game state
      ctx.beginPath();
      if (running) {
        // Happy smile when game is running
        ctx.arc(celestialBody.x, celestialBody.y + celestialBody.size * 0.1, celestialBody.size * 0.4, 0, Math.PI);
      } else {
        // Sad frown when game is over
        ctx.arc(celestialBody.x, celestialBody.y + celestialBody.size * 0.3, celestialBody.size * 0.4, Math.PI, 0);
      }
      ctx.stroke();
    }

    // Draw background elements (farthest to closest)
    // Mountains
    mountains.forEach(mountain => {
      // Create gradient from dark to light gray
      const mountainGradient = ctx.createLinearGradient(0, mountain.baseY - mountain.height, 0, mountain.baseY);
      mountainGradient.addColorStop(0, '#444'); // darker gray at top
      mountainGradient.addColorStop(1, '#888'); // lighter gray at bottom
      ctx.fillStyle = mountainGradient;

      ctx.beginPath();
      ctx.moveTo(mountain.x, mountain.baseY);
      // Sort peaks by offset to ensure proper left-to-right drawing
      mountain.peaks.sort((a, b) => a.offset - b.offset);
      mountain.peaks.forEach(peak => {
        ctx.lineTo(mountain.x + mountain.width/2 + peak.offset, mountain.baseY - mountain.height * peak.height);
      });
      ctx.lineTo(mountain.x + mountain.width, mountain.baseY);
      ctx.closePath();
      ctx.fill();
    });

    // Hills
    hills.forEach(hill => {
      // Create gradient from dark to light green
      const hillGradient = ctx.createLinearGradient(0, hill.baseY - hill.height, 0, hill.baseY);
      hillGradient.addColorStop(0, hill.color.replace(/hsl\(([^,]+), ([^,]+)%, ([^%]+)%\)/, (match, h, s, l) => {
        return `hsl(${h}, ${s}%, ${Math.max(60, parseInt(l))}%)`; // ensure minimum 60% lightness
      }));
      hillGradient.addColorStop(1, hill.color.replace(/hsl\(([^,]+), ([^,]+)%, ([^%]+)%\)/, (match, h, s, l) => {
        return `hsl(${h}, ${s}%, ${Math.min(90, parseInt(l) + 20)}%)`; // lighter at bottom
      }));
      ctx.fillStyle = hillGradient;

      ctx.beginPath();
      ctx.ellipse(hill.x + hill.width/2, hill.baseY, hill.width/2, hill.height, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    clouds.forEach(cloud => {
      cloud.puffs.forEach(puff => {
        ctx.beginPath();
        ctx.arc(cloud.x + puff.x, cloud.y + puff.y, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Ground with vertical gradient
    const groundGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    groundGradient.addColorStop(0, '#A0522D'); // lighter brown at top
    groundGradient.addColorStop(1, '#654321'); // darker brown at bottom
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Pipes
    pipes.forEach(pipe => {
      // Top pipe with horizontal gradient
      const topPipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
      topPipeGradient.addColorStop(0, '#1a5d2e'); // darker green on left
      topPipeGradient.addColorStop(0.3, '#2f9e44'); // main green
      topPipeGradient.addColorStop(0.7, '#2f9e44'); // main green
      topPipeGradient.addColorStop(1, '#1a5d2e'); // darker green on right
      ctx.fillStyle = topPipeGradient;
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);

      // Bottom pipe with horizontal gradient
      const bottomPipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
      bottomPipeGradient.addColorStop(0, '#1a5d2e'); // darker green on left
      bottomPipeGradient.addColorStop(0.3, '#2f9e44'); // main green
      bottomPipeGradient.addColorStop(0.7, '#2f9e44'); // main green
      bottomPipeGradient.addColorStop(1, '#1a5d2e'); // darker green on right
      ctx.fillStyle = bottomPipeGradient;
      ctx.fillRect(pipe.x, pipe.top + gapSize, pipeWidth, canvas.height - (pipe.top + gapSize) - 40);

      // Pipe end caps (lighter green rectangles, 1.3x width)
      const fitRadius = pipeWidth / 2;
      const capHeight = fitRadius * 0.8; // 2x the ellipse height
      const capWidth = pipeWidth * 1.3;
      const capOffset = (capWidth - pipeWidth) / 2; // to center the wider cap
      const centerX = pipe.x + pipeWidth / 2;

      // Top cap with horizontal gradient
      const topCapY = Math.max(0, pipe.top - capHeight);
      const topCapGradient = ctx.createLinearGradient(pipe.x - capOffset, 0, pipe.x - capOffset + capWidth, 0);
      topCapGradient.addColorStop(0, '#2a7a4a'); // darker light green on left
      topCapGradient.addColorStop(0.3, '#4ade80'); // main light green
      topCapGradient.addColorStop(0.7, '#4ade80'); // main light green
      topCapGradient.addColorStop(1, '#2a7a4a'); // darker light green on right
      ctx.fillStyle = topCapGradient;
      ctx.fillRect(pipe.x - capOffset, topCapY, capWidth, pipe.top - topCapY);

      // Bottom cap lip with horizontal gradient
      const bottomCapLipBottom = Math.min(canvas.height - 40, pipe.top + gapSize + capHeight);
      const bottomCapLipGradient = ctx.createLinearGradient(pipe.x - capOffset, 0, pipe.x - capOffset + capWidth, 0);
      bottomCapLipGradient.addColorStop(0, '#2a7a4a'); // darker light green on left
      bottomCapLipGradient.addColorStop(0.4, '#4ade80'); // main light green
      bottomCapLipGradient.addColorStop(0.6, '#4ade80'); // main light green
      bottomCapLipGradient.addColorStop(1, '#2a7a4a'); // darker light green on right
      ctx.fillStyle = bottomCapLipGradient;
      ctx.beginPath();
      ctx.ellipse(centerX, pipe.top + gapSize - (capOffset * 0.05), capWidth * 0.5, fitRadius * 0.5, 0, 0, Math.PI * 2);
      // ctx.fillRect(pipe.x - capOffset, pipe.top + gapSize - capOffset, capWidth, bottomCapLipBottom - (pipe.top + gapSize));
      ctx.fill();

      // Bottom cap with horizontal gradient
      const bottomCapBottom = Math.min(canvas.height - 40, pipe.top + gapSize + capHeight);
      const bottomCapGradient = ctx.createLinearGradient(pipe.x - capOffset, 0, pipe.x - capOffset + capWidth, 0);
      bottomCapGradient.addColorStop(0, '#2a7a4a'); // darker light green on left
      bottomCapGradient.addColorStop(0.3, '#4ade80'); // main light green
      bottomCapGradient.addColorStop(0.7, '#4ade80'); // main light green
      bottomCapGradient.addColorStop(1, '#2a7a4a'); // darker light green on right
      ctx.fillStyle = bottomCapGradient;
      ctx.fillRect(pipe.x - capOffset, pipe.top + gapSize, capWidth, bottomCapBottom - (pipe.top + gapSize));

      // Pipe openings (black ellipses at tips, clipped to cap ends)
      ctx.fillStyle = '#000';

      // Bottom opening - clipped to top of bottom cap
      ctx.save();
      ctx.beginPath();
      ctx.rect(pipe.x - capOffset, pipe.top + gapSize - (capOffset * 1.5), capWidth, capHeight * 0.6);
      ctx.beginPath();

      // Create asymmetrical ellipse: bulbous at top, gently curved at bottom (like pipe interior)
      const ellipseCenterX = centerX;
      const ellipseCenterY = pipe.top + gapSize - (capOffset * 0.3);
      const ellipseWidth = fitRadius;
      const ellipseHeight = fitRadius * 0.15;

      // Start at left side
      ctx.moveTo(ellipseCenterX - ellipseWidth, ellipseCenterY);

      // Top curve - bulbous (rounded outward like pipe opening)
      ctx.quadraticCurveTo(
        ellipseCenterX, ellipseCenterY - ellipseHeight * 2.5, // Control point well above for bulbous top
        ellipseCenterX + ellipseWidth, ellipseCenterY // Right side
      );

      // Bottom curve - gentle inward curve (like inner cylinder wall)
      ctx.quadraticCurveTo(
        ellipseCenterX, ellipseCenterY + ellipseHeight * 1.2, // Control point below for gentle inward curve
        ellipseCenterX - ellipseWidth, ellipseCenterY // Back to left side
      );

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Turd
    drawTurd(x, y);

    // Draw splatter particles
    if (splatterActive) {
      splatterParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        // Draw brown splatter particle
        ctx.fillStyle = '#8B4513'; // Saddle brown
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size, particle.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Add darker edge for depth
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw grass sprigs
    ctx.fillStyle = '#83d683'; // forest green
    grass.forEach(sprig => {
      // Draw simple grass blades scaled by height
      const bladeWidth = 4; // Base width for the blade
      const heightScale = sprig.height / 100; // Scale factor based on height

      ctx.beginPath();
      ctx.moveTo(sprig.x, canvas.height); // Start at ground level
      ctx.lineTo(sprig.x - bladeWidth * heightScale, canvas.height - 40 - sprig.height * 0.7); // Left curve
      ctx.lineTo(sprig.x + bladeWidth * 0.5 * heightScale, canvas.height - 40 - sprig.height * 0.9); // Top curve
      ctx.lineTo(sprig.x + bladeWidth * heightScale, canvas.height - 40 - sprig.height * 0.6); // Right curve
      ctx.closePath();
      ctx.fill();
    });
  }

  function checkCollision() {
    // Floor
    if (y + turdSize / 2 >= canvas.height - 40) return true;
    if (y - turdSize / 2 <= 0) return true;

    // Pipes
    for (const pipe of pipes) {
      const capOffset = (pipeWidth * 1.3 - pipeWidth) / 2;
      const left = pipe.x - capOffset;
      const right = pipe.x + pipeWidth + capOffset;
      const top = pipe.top;
      const bottom = pipe.top + gapSize;

      // Simple circle/rect overlap via bounding boxes
      if (x + turdSize / 2 > left && x - turdSize / 2 < right) {
        if (y - turdSize / 2 < top || y + turdSize / 2 > bottom) return true;
      }

      // Check pipe openings (ellipses)
      const fitRadius = pipeWidth / 2;
      const centerX = pipe.x + pipeWidth / 2;
      const openRadius = fitRadius * 0.3; // approximate

      // Top opening
      const dx3 = x - centerX;
      const dy3 = y - pipe.top;
      const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
      if (dist3 < turdSize / 2 + openRadius) return true;

      // Bottom opening
      const dx4 = x - centerX;
      const dy4 = y - (pipe.top + gapSize);
      const dist4 = Math.sqrt(dx4 * dx4 + dy4 * dy4);
      if (dist4 < turdSize / 2 + openRadius) return true;
    }
    return false;
  }

  function update() {
    if (!running) return;

    // Physics
    vy += gravity;
    y += vy;

    // Wing animation
    if (wingFlapTimer > 0) {
      wingFlapTimer--;
      if (wingFlapTimer === 0 && wingFlapCount > 0) {
        wingFlapCount--;
        if (wingFlapCount > 0) {
          wingFlapTimer = wingFlapDuration; // Start next flap
        }
      }
    }

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

    // Background movement and spawning
    backgroundScroll += 0.5; // Slow scroll for parallax

    // Move and remove offscreen background elements
    clouds.forEach(cloud => cloud.x -= 0.8);
    hills.forEach(hill => hill.x -= 1.2);
    mountains.forEach(mountain => mountain.x -= 0.6);
    grass.forEach(sprig => sprig.x -= 1.8); // Grass scrolls faster as it's front-most

    clouds = clouds.filter(cloud => cloud.x > -100);
    hills = hills.filter(hill => hill.x > -200);
    mountains = mountains.filter(mountain => mountain.x > -100);
    grass = grass.filter(sprig => sprig.x > 10); // Remove offscreen grass

    // Spawn new background elements
    if (Math.random() < 0.005) generateCloud();
    if (Math.random() < 0.003) generateHill();
    if (Math.random() < 0.004) generateMountain();
    if (Math.random() < 0.006) { // Slightly more frequent than mountains
      // Add a few grass sprigs at random positions
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        grass.push({
          x: canvas.width + Math.random() * 50,
          height: 15 + Math.random() * 10
        });
      }
    }

    // Check collisions
    if (checkCollision()) {
      running = false;
      const isNewHighScore = score > best;
      best = Math.max(best, score);
      storage.setItemSync('happyturd-best-score', best);
      updateHUD();

      // Update game over display
      const gameOverScoreEl = document.getElementById('gameover-score');
      const gameOverBestEl = document.getElementById('gameover-best');
      const newHighScoreEl = document.getElementById('new-high-score');

      if (gameOverScoreEl) gameOverScoreEl.textContent = String(score);
      if (gameOverBestEl) gameOverBestEl.textContent = String(best);
      if (newHighScoreEl) {
        newHighScoreEl.style.display = isNewHighScore ? 'block' : 'none';
      }

      // Show game over overlay with delay and fade-in
      const gameOverOverlay = document.getElementById('happyturd-gameover');
      if (gameOverOverlay) {
        // Delay for 500ms, then fade in over 200ms
        setTimeout(() => {
          gameOverOverlay.style.display = 'flex';
          // Force reflow to ensure display change takes effect
          gameOverOverlay.offsetHeight;
          gameOverOverlay.style.opacity = '1';
        }, 500);
      }

      // Trigger splatter animation
      createSplatter(x, y);
    }
  }

  function gameLoop() {
    if (gameState === 'playing') {
      update();
    }

    // Always update splatter particles if active
    if (splatterActive) {
      splatterParticles.forEach(particle => {
        // Apply gravity
        particle.vy += gravity * 0.3;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Update rotation
        particle.rotation += particle.rotationSpeed;

        // Fade out over time
        particle.opacity = splatterTimer / splatterDuration;
      });

      splatterTimer--;
      if (splatterTimer <= 0) {
        splatterActive = false;
        splatterParticles = [];
      }
    }

    draw();
    rafId = requestAnimationFrame(gameLoop);
  }

  function flap() {
    if (gameState === 'intro') {
      startGame();
      return;
    }

    if (!running) {
      tryAgain();
      return;
    }
    vy = flapStrength;

    // Trigger wing flap animation
    wingFlapTimer = wingFlapDuration;
    wingFlapCount = maxWingFlaps;
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

  // Start in intro mode
  updateHUD();
  rafId = requestAnimationFrame(gameLoop);
}
