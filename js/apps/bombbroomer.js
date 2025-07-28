import { storage } from '../os/indexeddb_storage.js';
import { createWindow } from '../gui/window.js';

export function launchBombbroomer() {
  // Check if bombbroomer window already exists
  const existingWindow = document.getElementById('bombbroomer');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  // Create the bombbroomer window
  const win = createWindow(
    'Bombbroomer',
    '',
    false,
    'bombbroomer',
    false,
    false,
    { type: 'integer', width: 400, height: 490 },
    'App',
    null,
    'gray'
  );

  // Initialize the game UI
  initializeBombbroomerUI(win).catch(error => {
    console.error('Error initializing Bombbroomer:', error);
  });
}

// Separate function to initialize the Bombbroomer UI (for restoration)
export async function initializeBombbroomerUI(win) {
  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-gray-200 h-full overflow-hidden';

  // Clear any existing content
  content.innerHTML = '';

  // Try to load saved game state
  let gameState = await loadBombbroomerGameState();

  // If no saved state, create default state
  if (!gameState) {
    gameState = {
      grid: [],
      gameStarted: false,
      gameOver: false,
      gameWon: false,
      bombs: 10,
      flaggedCount: 0,
      rows: 9,
      cols: 9,
      firstClick: true,
      timer: 0,
      timerInterval: null
    };
  }

  // Create game layout
  const gameContainer = document.createElement('div');
  gameContainer.className = 'flex flex-col h-full bg-gray-200 pb-4';

  // Menu bar
  const menuBar = document.createElement('div');
  menuBar.className = 'bg-gray-200 border-b-2 border-gray-400 p-1 flex items-center space-x-4';
  menuBar.style.borderStyle = 'inset';

  const gameMenu = document.createElement('button');
  gameMenu.className = 'px-2 py-1 hover:bg-gray-300 text-sm border border-transparent hover:border-gray-400';
  gameMenu.textContent = 'Game';
  gameMenu.setAttribute('aria-label', 'Game menu options');
  gameMenu.setAttribute('title', 'Access game options and settings');

  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'px-2 py-1 hover:bg-gray-300 text-sm border border-transparent hover:border-gray-400';
  newGameBtn.textContent = 'New Game';
  newGameBtn.setAttribute('aria-label', 'Start new game');
  newGameBtn.setAttribute('title', 'Start a new minesweeper game');
  newGameBtn.addEventListener('click', async () => await startNewGame());

  // menuBar.appendChild(gameMenu); // doesn't do anything right now
  menuBar.appendChild(newGameBtn);

  // Status bar
  const statusBar = document.createElement('div');
  statusBar.className = 'bg-gray-200 border-2 border-gray-400 p-2 flex justify-between items-center';
  statusBar.style.borderStyle = 'inset';

  const bombCounter = document.createElement('div');
  bombCounter.className = 'bg-black text-red-500 px-2 py-1 font-mono text-lg border-2 border-gray-500';
  bombCounter.style.borderStyle = 'inset';
  bombCounter.id = 'bomb-counter';
  bombCounter.textContent = '010';

  const faceButton = document.createElement('button');
  faceButton.className = 'w-8 h-8 bg-gray-200 border-2 border-gray-400 text-lg hover:bg-gray-300';
  faceButton.style.borderStyle = 'outset';
  faceButton.id = 'face-button';
  faceButton.textContent = '🙂';
  faceButton.setAttribute('aria-label', 'New game - Click to restart');
  faceButton.setAttribute('title', 'Click to start a new game');
  faceButton.addEventListener('click', async () => await startNewGame());

  const timerDisplay = document.createElement('div');
  timerDisplay.className = 'bg-black text-red-500 px-2 py-1 font-mono text-lg border-2 border-gray-500';
  timerDisplay.style.borderStyle = 'inset';
  timerDisplay.id = 'timer-display';
  timerDisplay.textContent = '000';

  statusBar.appendChild(bombCounter);
  statusBar.appendChild(faceButton);
  statusBar.appendChild(timerDisplay);

  // Game grid container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'flex-1 p-4 flex items-center justify-center';

  const gameGrid = document.createElement('div');
  gameGrid.className = 'grid grid-cols-9 gap-0 border-2 border-gray-400 bg-gray-300';
  gameGrid.style.borderStyle = 'inset';
  gameGrid.id = 'game-grid';

  gridContainer.appendChild(gameGrid);

  gameContainer.appendChild(menuBar);
  gameContainer.appendChild(statusBar);
  gameContainer.appendChild(gridContainer);
  content.appendChild(gameContainer);

  // Initialize grid
  function initializeGrid() {
    gameState.grid = [];
    gameState.gameStarted = false;
    gameState.gameOver = false;
    gameState.gameWon = false;
    gameState.flaggedCount = 0;
    gameState.firstClick = true;
    gameState.timer = 0;

    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }

    for (let row = 0; row < gameState.rows; row++) {
      gameState.grid[row] = [];
      for (let col = 0; col < gameState.cols; col++) {
        gameState.grid[row][col] = {
          isBomb: false,
          isRevealed: false,
          isFlagged: false,
          neighborCount: 0
        };
      }
    }

    updateDisplay();
    renderGrid();
  }

  // Place bombs on the grid (avoiding first click position)
  function placeBombs(excludeRow, excludeCol) {
    let bombsPlaced = 0;
    while (bombsPlaced < gameState.bombs) {
      const row = Math.floor(Math.random() * gameState.rows);
      const col = Math.floor(Math.random() * gameState.cols);

      if (!gameState.grid[row][col].isBomb && !(row === excludeRow && col === excludeCol)) {
        gameState.grid[row][col].isBomb = true;
        bombsPlaced++;
      }
    }

    // Calculate neighbor counts
    for (let row = 0; row < gameState.rows; row++) {
      for (let col = 0; col < gameState.cols; col++) {
        if (!gameState.grid[row][col].isBomb) {
          gameState.grid[row][col].neighborCount = countNeighborBombs(row, col);
        }
      }
    }
  }

  // Count bombs in neighboring cells
  function countNeighborBombs(row, col) {
    let count = 0;
    for (let r = Math.max(0, row - 1); r <= Math.min(gameState.rows - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(gameState.cols - 1, col + 1); c++) {
        if (r !== row || c !== col) {
          if (gameState.grid[r][c].isBomb) {
            count++;
          }
        }
      }
    }
    return count;
  }

  // Render the game grid
  function renderGrid() {
    const gameGrid = document.getElementById('game-grid');
    gameGrid.innerHTML = '';

    for (let row = 0; row < gameState.rows; row++) {
      for (let col = 0; col < gameState.cols; col++) {
        const cell = document.createElement('button');
        cell.className = 'w-8 h-8 border border-gray-500 bg-gray-200 text-sm font-bold flex items-center justify-center';
        cell.style.borderStyle = 'outset';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.setAttribute('aria-label', `Cell row ${row + 1}, column ${col + 1}`);
        cell.setAttribute('title', `Minesweeper cell at row ${row + 1}, column ${col + 1}`);

        const cellData = gameState.grid[row][col];

        if (cellData.isRevealed) {
          cell.style.borderStyle = 'inset';
          cell.className = cell.className.replace('bg-gray-200', 'bg-gray-300');

          if (cellData.isBomb) {
            cell.textContent = '💣';
            cell.style.backgroundColor = gameState.gameOver ? '#ff0000' : '#gray-300';
          } else if (cellData.neighborCount > 0) {
            cell.textContent = cellData.neighborCount;
            // Color code numbers like classic Minesweeper
            const colors = ['', '#0000ff', '#008000', '#ff0000', '#800080', '#800000', '#008080', '#000000', '#808080'];
            cell.style.color = colors[cellData.neighborCount] || '#000000';
          }
        } else if (cellData.isFlagged) {
          cell.textContent = '🚩';
        }

        // Add event listeners
        cell.addEventListener('click', async (e) => await handleCellClick(e, row, col));
        cell.addEventListener('contextmenu', async (e) => await handleRightClick(e, row, col));

        gameGrid.appendChild(cell);
      }
    }
  }

  // Handle left click on cell
  async function handleCellClick(e, row, col) {
    e.preventDefault();

    if (gameState.gameOver || gameState.gameWon) return;

    const cell = gameState.grid[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    // First click - place bombs
    if (gameState.firstClick) {
      placeBombs(row, col);
      gameState.firstClick = false;
      gameState.gameStarted = true;
      startTimer();
    }

    // Reveal cell
    if (cell.isBomb) {
      await gameOver();
    } else {
      revealCell(row, col);
      await checkWinCondition();
    }

    renderGrid();
    await saveBombbroomerGameState(gameState); // Save state after each move
  }

  // Handle right click (flag/unflag)
  async function handleRightClick(e, row, col) {
    e.preventDefault();

    if (gameState.gameOver || gameState.gameWon) return;

    const cell = gameState.grid[row][col];
    if (cell.isRevealed) return;

    if (cell.isFlagged) {
      cell.isFlagged = false;
      gameState.flaggedCount--;
    } else {
      cell.isFlagged = true;
      gameState.flaggedCount++;
    }

    updateDisplay();
    renderGrid();
    await saveBombbroomerGameState(gameState); // Save state after flagging
  }

  // Reveal a cell and potentially cascade
  function revealCell(row, col) {
    const cell = gameState.grid[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    // If no neighboring bombs, reveal all neighbors
    if (cell.neighborCount === 0) {
      for (let r = Math.max(0, row - 1); r <= Math.min(gameState.rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(gameState.cols - 1, col + 1); c++) {
          if (r !== row || c !== col) {
            revealCell(r, c);
          }
        }
      }
    }
  }

  // Start the timer
  function startTimer() {
    gameState.timerInterval = setInterval(async () => {
      gameState.timer++;
      updateDisplay();
      await saveBombbroomerGameState(gameState); // Save state with updated timer
    }, 1000);
  }

  // Game over
  async function gameOver() {
    gameState.gameOver = true;
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }

    // Reveal all bombs
    for (let row = 0; row < gameState.rows; row++) {
      for (let col = 0; col < gameState.cols; col++) {
        if (gameState.grid[row][col].isBomb) {
          gameState.grid[row][col].isRevealed = true;
        }
      }
    }

    await saveBombbroomerGameState(gameState); // Save final game over state
    document.getElementById('face-button').textContent = '😵';
    setTimeout(() => {
      showDialogBox('Game Over! Try again?', 'confirmation');
    }, 500);
  }

  // Check win condition
  async function checkWinCondition() {
    let revealedCount = 0;
    for (let row = 0; row < gameState.rows; row++) {
      for (let col = 0; col < gameState.cols; col++) {
        if (gameState.grid[row][col].isRevealed && !gameState.grid[row][col].isBomb) {
          revealedCount++;
        }
      }
    }

    const totalSafeCells = (gameState.rows * gameState.cols) - gameState.bombs;
    if (revealedCount === totalSafeCells) {
      gameState.gameWon = true;
      if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
      }
      await saveBombbroomerGameState(gameState); // Save final win state
      document.getElementById('face-button').textContent = '😎';
      setTimeout(() => {
        showDialogBox('Congratulations! You won!', 'confirmation');
      }, 500);
    }
  }

  // Update display counters
  function updateDisplay() {
    const bombCounter = document.getElementById('bomb-counter');
    const timerDisplay = document.getElementById('timer-display');

    const remainingBombs = gameState.bombs - gameState.flaggedCount;
    bombCounter.textContent = remainingBombs.toString().padStart(3, '0');

    timerDisplay.textContent = Math.min(gameState.timer, 999).toString().padStart(3, '0');
  }

  // Start new game
  async function startNewGame() {
    document.getElementById('face-button').textContent = '🙂';
    initializeGrid();
    await clearBombbroomerGameState(); // Clear saved state when starting new game
  }

  // Restore saved game
  function restoreGame() {
    // Update face button based on game state
    const faceButton = document.getElementById('face-button');
    if (gameState.gameOver) {
      faceButton.textContent = '😵';
    } else if (gameState.gameWon) {
      faceButton.textContent = '😎';
    } else {
      faceButton.textContent = '🙂';
    }

    // Restart timer if game is in progress and not finished
    if (gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
      startTimer();
    }

    // Update display and render grid
    updateDisplay();
    renderGrid();
  }

  // Cleanup when window is closed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'bombbroomer') {
          if (gameState.timerInterval) clearInterval(gameState.timerInterval);
          observer.disconnect();
        }
      });
    });
  });

  observer.observe(document.getElementById('windows-container'), {
    childList: true
  });

  // Initialize the game
  if (gameState.grid.length === 0) {
    // No saved game, start new
    startNewGame();
  } else {
    // Restore saved game
    restoreGame();
  }
}

// Save game state to IndexedDB
async function saveBombbroomerGameState(gameState) {
  try {
    // Create a clean copy without the timer interval
    const stateToSave = {
      ...gameState,
      timerInterval: null // Don't save the interval
    };
    await storage.setItem('bombbroomer_gameState', stateToSave);
  } catch (error) {
    console.warn('Failed to save Bombbroomer game state:', error);
  }
}

// Load game state from IndexedDB
async function loadBombbroomerGameState() {
  try {
    const savedState = await storage.getItem('bombbroomer_gameState');
    if (savedState) {
      const gameState = savedState;
      // Ensure timerInterval is null when loading
      gameState.timerInterval = null;
      return gameState;
    }
  } catch (error) {
    console.warn('Failed to load Bombbroomer game state:', error);
  }
  return null;
}

// Clear saved game state
async function clearBombbroomerGameState() {
  try {
    await storage.removeItem('bombbroomer_gameState');
  } catch (error) {
    console.warn('Failed to clear Bombbroomer game state:', error);
  }
}
