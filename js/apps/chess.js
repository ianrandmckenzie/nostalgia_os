function launchChess() {
  // Check if chess window already exists
  const existingWindow = document.getElementById('chess');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  // Create the chess window
  const win = createWindow(
    'Guillotine Chess',
    '',
    false,
    'chess',
    false,
    false,
    { type: 'integer', width: 600, height: 690 },
    'App',
    null,
    'white'
  );

  // Initialize the chess UI
  initializeChessUI(win).catch(error => {
    console.error('Error initializing Chess:', error);
  });
}

// Separate function to initialize the Chess UI (for restoration)
async function initializeChessUI(win) {
  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-4 bg-white h-full overflow-hidden';

  // Clear any existing content
  content.innerHTML = '';

  // Try to load saved game state
  let gameState = await loadChessGameState();

  // If no saved state, create default state
  if (!gameState) {
    gameState = {
      board: initializeBoard(),
      currentPlayer: 'white',
      difficulty: 'easy',
      gameOver: false,
      winner: null,
      moveHistory: [],
      selectedSquare: null,
      possibleMoves: [],
      gameStarted: true,
      // Simplified state for Guillotine Chess
      enPassantTarget: null,
      halfMoveClock: 0,
      fullMoveNumber: 1
    };
  }

  // Create the chess UI
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full';

  // Game info bar
  const infoBar = document.createElement('div');
  infoBar.className = 'flex justify-between items-center mb-4 p-2 bg-gray-100 rounded';
  infoBar.innerHTML = `
    <div class="flex items-center space-x-4">
      <span class="font-semibold">Difficulty: <span id="difficulty-dropdown-container"></span></span>
      <span class="font-semibold">Turn: <span class="text-${gameState.currentPlayer === 'white' ? 'gray-800' : 'gray-600'}">${gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1)}</span></span>
    </div>
    <div class="space-x-2" id="button-container">
    </div>
  `;
  container.appendChild(infoBar);

  // Create and add the difficulty dropdown using makeWin95Dropdown
  const difficultyOptions = [
    { value: 'easy', text: 'Easy' },
    { value: 'medium', text: 'Medium' },
    { value: 'hard', text: 'Hard' }
  ];

  const difficultyDropdown = makeWin95Dropdown(
    difficultyOptions,
    gameState.difficulty,
    async (selectedValue) => {
      gameState.difficulty = selectedValue;
      await saveChessGameState(gameState);
    }
  );
  difficultyDropdown.id = 'difficulty-select';
  difficultyDropdown.className += ' ml-1';
  infoBar.querySelector('#difficulty-dropdown-container').appendChild(difficultyDropdown);

  // Create and add the New Game button using makeWin95Button
  const newGameBtn = makeWin95Button('New Game');
  newGameBtn.id = 'new-game-btn';
  infoBar.querySelector('#button-container').appendChild(newGameBtn);

  // Chess board
  const boardContainer = document.createElement('div');
  boardContainer.className = 'flex-1 flex items-center justify-center';

  const board = document.createElement('div');
  board.id = 'chess-board';
  board.className = 'grid grid-cols-8 border-4 border-gray-800';
  board.style.width = '480px';
  board.style.height = '480px';
  board.style.gap = '0';

  // Create board squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = `chess-square flex items-center justify-center cursor-pointer text-4xl font-bold select-none ${
        (row + col) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-600'
      }`;
      square.style.width = '60px';
      square.style.height = '60px';
      square.dataset.row = row;
      square.dataset.col = col;

      const piece = gameState.board[row][col];
      if (piece) {
        square.textContent = getPieceSymbol(piece);
        square.style.color = piece.color === 'white' ? '#000' : '#444';
      }

      // Add click event listener
      square.addEventListener('click', async () => await handleSquareClick(row, col, gameState, win));

      board.appendChild(square);
    }
  }

  boardContainer.appendChild(board);
  container.appendChild(boardContainer);

  // Game status
  const statusBar = document.createElement('div');
  statusBar.id = 'status-bar';
  statusBar.className = 'mt-4 p-2 text-center';

  if (gameState.gameOver) {
    statusBar.innerHTML = `<span class="text-lg font-bold text-green-600">Game Over! ${gameState.winner ? gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1) + ' wins!' : 'Draw!'}</span>`;
  } else {
    statusBar.innerHTML = `<span class="text-gray-600">Guillotine Chess: Capture the King to win! Kings can be captured like any other piece.</span>`;
  }

  container.appendChild(statusBar);

  // Add event listeners for control buttons
  infoBar.querySelector('#new-game-btn').addEventListener('click', async () => {
    gameState.board = initializeBoard();
    gameState.currentPlayer = 'white';
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.moveHistory = [];
    gameState.selectedSquare = null;
    gameState.possibleMoves = [];
    await saveChessGameState(gameState);
    updateChessUI(gameState, win);
  });

  content.appendChild(container);

  // Highlight selected square and possible moves
  updateBoardHighlights(gameState);

  // If it's AI's turn, make AI move
  if (gameState.currentPlayer === 'black' && !gameState.gameOver) {
    setTimeout(async () => await makeAIMove(gameState, win), 500);
  }
}

function updateChessUI(gameState, win) {
  // Update the difficulty dropdown
  const difficultySelect = win.querySelector('#difficulty-select');
  if (difficultySelect) {
    difficultySelect.value = gameState.difficulty;
  }

  // Update the turn display
  const turnSpan = win.querySelector('.text-gray-800, .text-gray-600');
  if (turnSpan && turnSpan.parentElement && turnSpan.parentElement.textContent.includes('Turn:')) {
    turnSpan.textContent = gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1);
    turnSpan.className = gameState.currentPlayer === 'white' ? 'text-gray-800' : 'text-gray-600';
  }

  // Update the board pieces
  const squares = document.querySelectorAll('.chess-square');
  squares.forEach(square => {
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = gameState.board[row][col];

    if (piece) {
      square.textContent = getPieceSymbol(piece);
      square.style.color = piece.color === 'white' ? '#000' : '#444';
    } else {
      square.textContent = '';
    }
  });

  // Update status bar
  const statusBar = win.querySelector('#status-bar');
  if (statusBar) {
    if (gameState.gameOver) {
      statusBar.innerHTML = `<span class="text-lg font-bold text-green-600">Game Over! ${gameState.winner ? gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1) + ' wins!' : 'Draw!'}</span>`;
    } else {
      statusBar.innerHTML = `<span class="text-gray-600">Guillotine Chess: Capture the King to win! Kings can be captured like any other piece.</span>`;
    }
  }

  // Clear highlights
  gameState.selectedSquare = null;
  gameState.possibleMoves = [];
  updateBoardHighlights(gameState);

  // If it's AI's turn, make AI move
  if (gameState.currentPlayer === 'black' && !gameState.gameOver) {
    setTimeout(async () => await makeAIMove(gameState, win), 500);
  }
}

function initializeBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Set up pieces
  const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  // Black pieces (top)
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: 'black' };
    board[1][col] = { type: 'pawn', color: 'black' };
  }

  // White pieces (bottom)
  for (let col = 0; col < 8; col++) {
    board[6][col] = { type: 'pawn', color: 'white' };
    board[7][col] = { type: backRank[col], color: 'white' };
  }

  return board;
}

function getPieceSymbol(piece) {
  const symbols = {
    'white': {
      'king': '♔',
      'queen': '♕',
      'rook': '♖',
      'bishop': '♗',
      'knight': '♘',
      'pawn': '♙'
    },
    'black': {
      'king': '♚',
      'queen': '♛',
      'rook': '♜',
      'bishop': '♝',
      'knight': '♞',
      'pawn': '♟'
    }
  };
  return symbols[piece.color][piece.type];
}

async function handleSquareClick(row, col, gameState, win) {
  if (gameState.gameOver || gameState.currentPlayer === 'black') return;

  const clickedPiece = gameState.board[row][col];

  // If a square is already selected
  if (gameState.selectedSquare) {
    const [selectedRow, selectedCol] = gameState.selectedSquare;

    // If clicking the same square, deselect
    if (selectedRow === row && selectedCol === col) {
      gameState.selectedSquare = null;
      gameState.possibleMoves = [];
      updateBoardHighlights(gameState);
      return;
    }

    // If clicking a valid move
    if (gameState.possibleMoves.some(move => move.row === row && move.col === col)) {
      makeMove(gameState, selectedRow, selectedCol, row, col);
      gameState.selectedSquare = null;
      gameState.possibleMoves = [];

      // Switch turn and save state
      gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      await saveChessGameState(gameState);

      // Check for game over
      if (isGameOver(gameState)) {
        gameState.gameOver = true;
        gameState.winner = getWinner(gameState);
      }

      // Update the UI instead of completely rebuilding
      updateChessUI(gameState, win);
      return;
    }
  }

  // If clicking on own piece, select it
  if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
    gameState.selectedSquare = [row, col];
    gameState.possibleMoves = getValidMoves(gameState, row, col);
    updateBoardHighlights(gameState);
  }
}

function updateBoardHighlights(gameState) {
  const squares = document.querySelectorAll('.chess-square');

  squares.forEach(square => {
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);

    // Reset classes
    square.className = `chess-square flex items-center justify-center cursor-pointer text-4xl font-bold select-none ${
      (row + col) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-600'
    }`;

    // Maintain the fixed size
    square.style.width = '60px';
    square.style.height = '60px';

    // Highlight selected square
    if (gameState.selectedSquare && gameState.selectedSquare[0] === row && gameState.selectedSquare[1] === col) {
      square.className += ' bg-blue-300';
    }

    // Highlight possible moves
    if (gameState.possibleMoves.some(move => move.row === row && move.col === col)) {
      square.className += ' bg-green-300';
    }
  });
}

function getValidMoves(gameState, row, col) {
  const piece = gameState.board[row][col];
  if (!piece) return [];

  const moves = [];

  switch (piece.type) {
    case 'pawn':
      moves.push(...getPawnMoves(gameState.board, row, col, piece.color));
      // Add en passant moves
      moves.push(...getEnPassantMoves(gameState, row, col));
      break;
    case 'rook':
      moves.push(...getRookMoves(gameState.board, row, col, piece.color));
      break;
    case 'knight':
      moves.push(...getKnightMoves(gameState.board, row, col, piece.color));
      break;
    case 'bishop':
      moves.push(...getBishopMoves(gameState.board, row, col, piece.color));
      break;
    case 'queen':
      moves.push(...getQueenMoves(gameState.board, row, col, piece.color));
      break;
    case 'king':
      moves.push(...getKingMoves(gameState.board, row, col, piece.color));
      // No castling in Guillotine Chess
      break;
  }

  return moves;
}

function getEnPassantMoves(gameState, row, col) {
  const piece = gameState.board[row][col];
  if (piece.type !== 'pawn' || !gameState.enPassantTarget) return [];

  const moves = [];
  const direction = piece.color === 'white' ? -1 : 1;
  const targetRow = gameState.enPassantTarget.row;
  const targetCol = gameState.enPassantTarget.col;

  // Check if the pawn can capture en passant
  if (row === targetRow - direction && Math.abs(col - targetCol) === 1) {
    moves.push({ row: targetRow, col: targetCol });
  }

  return moves;
}

function getCastlingMoves(gameState, row, col) {
  const piece = gameState.board[row][col];
  if (piece.type !== 'king') return [];

  const moves = [];

  // Check kingside castling
  if (canCastle(gameState, 'kingside')) {
    moves.push({ row: row, col: col + 2 });
  }

  // Check queenside castling
  if (canCastle(gameState, 'queenside')) {
    moves.push({ row: row, col: col - 2 });
  }

  return moves;
}

function getPawnMoves(board, row, col, color) {
  const moves = [];
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;

  // Forward move
  if (isValidSquare(row + direction, col) && !board[row + direction][col]) {
    moves.push({ row: row + direction, col });

    // Double move from start
    if (row === startRow && !board[row + 2 * direction][col]) {
      moves.push({ row: row + 2 * direction, col });
    }
  }

  // Captures
  for (const dcol of [-1, 1]) {
    const newRow = row + direction;
    const newCol = col + dcol;
    if (isValidSquare(newRow, newCol) && board[newRow][newCol] && board[newRow][newCol].color !== color) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

function getRookMoves(board, row, col, color) {
  const moves = [];
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [drow, dcol] of directions) {
    for (let i = 1; i < 8; i++) {
      const newRow = row + i * drow;
      const newCol = col + i * dcol;

      if (!isValidSquare(newRow, newCol)) break;

      if (!board[newRow][newCol]) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (board[newRow][newCol].color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
    }
  }

  return moves;
}

function getKnightMoves(board, row, col, color) {
  const moves = [];
  const knightMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  for (const [drow, dcol] of knightMoves) {
    const newRow = row + drow;
    const newCol = col + dcol;

    if (isValidSquare(newRow, newCol) && (!board[newRow][newCol] || board[newRow][newCol].color !== color)) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

function getBishopMoves(board, row, col, color) {
  const moves = [];
  const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [drow, dcol] of directions) {
    for (let i = 1; i < 8; i++) {
      const newRow = row + i * drow;
      const newCol = col + i * dcol;

      if (!isValidSquare(newRow, newCol)) break;

      if (!board[newRow][newCol]) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (board[newRow][newCol].color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
    }
  }

  return moves;
}

function getQueenMoves(board, row, col, color) {
  return [...getRookMoves(board, row, col, color), ...getBishopMoves(board, row, col, color)];
}

function getKingMoves(board, row, col, color) {
  const moves = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [drow, dcol] of directions) {
    const newRow = row + drow;
    const newCol = col + dcol;

    if (isValidSquare(newRow, newCol) && (!board[newRow][newCol] || board[newRow][newCol].color !== color)) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

function isValidSquare(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function makeMove(gameState, fromRow, fromCol, toRow, toCol) {
  const piece = gameState.board[fromRow][fromCol];
  const captured = gameState.board[toRow][toCol];

  // Clear en passant target from previous move
  gameState.enPassantTarget = null;

  // Check if a king is being captured - this wins the game!
  if (captured && captured.type === 'king') {
    gameState.gameOver = true;
    gameState.winner = piece.color;
  }

  // Handle en passant capture
  if (piece.type === 'pawn' && fromCol !== toCol && !captured) {
    const captureRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
    gameState.board[captureRow][toCol] = null; // Remove the captured pawn
  }

  // Handle pawn two-square move (set en passant target)
  if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
    const enPassantRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
    gameState.enPassantTarget = { row: enPassantRow, col: toCol };
  }

  // Handle pawn promotion
  if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
    // For now, always promote to queen (can be enhanced with user choice later)
    piece.type = 'queen';
  }

  // Update 50-move rule counter
  if (piece.type === 'pawn' || captured) {
    gameState.halfMoveClock = 0;
  } else {
    gameState.halfMoveClock++;
  }

  // Update full move number
  if (piece.color === 'black') {
    gameState.fullMoveNumber++;
  }

  // Make the move
  gameState.board[toRow][toCol] = piece;
  gameState.board[fromRow][fromCol] = null;

  // Add to move history
  gameState.moveHistory.push({
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    piece: { ...piece },
    captured: captured,
    enPassantTarget: gameState.enPassantTarget,
    halfMoveClock: gameState.halfMoveClock
  });
}

async function makeAIMove(gameState, win) {
  let move;

  switch (gameState.difficulty) {
    case 'easy':
      move = getRandomMove(gameState.board, 'black');
      break;
    case 'medium':
      move = getBestMove(gameState.board, 'black', 1);
      break;
    case 'hard':
      move = getBestMove(gameState.board, 'black', 2);
      break;
  }

  if (move) {
    makeMove(gameState, move.from.row, move.from.col, move.to.row, move.to.col);
    gameState.currentPlayer = 'white';

    // Check for game over
    if (isGameOver(gameState)) {
      gameState.gameOver = true;
      gameState.winner = getWinner(gameState);
    }

    await saveChessGameState(gameState);
    updateChessUI(gameState, win);
  }
}

function getRandomMove(board, color) {
  const allMoves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        // Create a minimal gameState for move generation
        const tempGameState = {
          board: board,
          enPassantTarget: null,
          currentPlayer: color
        };
        const moves = getValidMoves(tempGameState, row, col);
        for (const move of moves) {
          allMoves.push({
            from: { row, col },
            to: move
          });
        }
      }
    }
  }

  return allMoves.length > 0 ? allMoves[Math.floor(Math.random() * allMoves.length)] : null;
}

function getBestMove(board, color, depth) {
  // Simple minimax algorithm
  const allMoves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        // Create a minimal gameState for move generation
        const tempGameState = {
          board: board,
          enPassantTarget: null,
          currentPlayer: color
        };
        const moves = getValidMoves(tempGameState, row, col);
        for (const move of moves) {
          allMoves.push({
            from: { row, col },
            to: move,
            score: evaluateMove(board, { row, col }, move, color, depth)
          });
        }
      }
    }
  }

  if (allMoves.length === 0) return null;

  // Sort by score and return best move
  allMoves.sort((a, b) => b.score - a.score);
  return allMoves[0];
}

function evaluateMove(board, from, to, color, depth) {
  // Create a copy of the board
  const boardCopy = board.map(row => row.map(cell => cell ? { ...cell } : null));

  // Make the move
  const piece = boardCopy[from.row][from.col];
  const captured = boardCopy[to.row][to.col];
  boardCopy[to.row][to.col] = piece;
  boardCopy[from.row][from.col] = null;

  let score = 0;

  // Score for captured piece
  if (captured) {
    score += getPieceValue(captured.type);
  }

  // Basic positional scoring
  score += getPositionalScore(boardCopy, color);

  // If we have more depth, consider opponent's response
  if (depth > 1) {
    const opponentColor = color === 'white' ? 'black' : 'white';
    const opponentBestMove = getBestMove(boardCopy, opponentColor, depth - 1);
    if (opponentBestMove) {
      score -= opponentBestMove.score;
    }
  }

  return score;
}

function getPieceValue(type) {
  const values = {
    'pawn': 1,
    'knight': 3,
    'bishop': 3,
    'rook': 5,
    'queen': 9,
    'king': 100 // High value but capturable in Guillotine Chess
  };
  return values[type] || 0;
}

function getPositionalScore(board, color) {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        score += getPieceValue(piece.type);

        // Center control bonus
        if (row >= 3 && row <= 4 && col >= 3 && col <= 4) {
          score += 0.1;
        }
      }
    }
  }

  return score;
}

function isGameOver(gameState) {
  // Check if game is already marked as over (king captured)
  if (gameState.gameOver) {
    return true;
  }

  // Check if either king has been captured
  let whiteKingExists = false;
  let blackKingExists = false;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.type === 'king') {
        if (piece.color === 'white') whiteKingExists = true;
        if (piece.color === 'black') blackKingExists = true;
      }
    }
  }

  if (!whiteKingExists) {
    gameState.gameOver = true;
    gameState.winner = 'black';
    return true;
  }

  if (!blackKingExists) {
    gameState.gameOver = true;
    gameState.winner = 'white';
    return true;
  }

  // Check for stalemate (no legal moves) - this results in a draw
  const currentPlayer = gameState.currentPlayer;
  if (!hasAnyValidMoves(gameState, currentPlayer)) {
    gameState.gameOver = true;
    gameState.winner = 'draw';
    return true;
  }

  // Check for 50-move rule draw
  if (gameState.halfMoveClock >= 100) {
    gameState.gameOver = true;
    gameState.winner = 'draw';
    return true;
  }

  return false;
}

function hasAnyValidMoves(gameState, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.color === color) {
        const validMoves = getValidMoves(gameState, row, col);
        if (validMoves.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function isKingInCheck(gameState, color) {
  const kingPos = findKing(gameState.board, color);
  if (!kingPos) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';

  // Check if any opponent piece can attack the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.color === opponentColor) {
        const moves = getPieceAttacks(gameState.board, row, col);
        if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
          return true;
        }
      }
    }
  }

  return false;
}

function findKing(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

function hasAnyLegalMoves(gameState, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece && piece.color === color) {
        const legalMoves = getLegalMoves(gameState, row, col);
        if (legalMoves.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function getLegalMoves(gameState, row, col) {
  const piece = gameState.board[row][col];
  if (!piece) return [];

  const possibleMoves = getValidMoves(gameState, row, col);
  const legalMoves = [];

  // Test each move to see if it leaves the king in check
  for (const move of possibleMoves) {
    if (isMoveLegal(gameState, row, col, move.row, move.col)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

function isMoveLegal(gameState, fromRow, fromCol, toRow, toCol) {
  // Create a copy of the board state
  const testBoard = gameState.board.map(row => row.map(cell => cell ? { ...cell } : null));
  const piece = testBoard[fromRow][fromCol];

  // Make the move on the test board
  const capturedPiece = testBoard[toRow][toCol];
  testBoard[toRow][toCol] = piece;
  testBoard[fromRow][fromCol] = null;

  // Check if this move leaves the king in check
  const testGameState = { ...gameState, board: testBoard };
  return !isKingInCheck(testGameState, piece.color);
}

function canCastle(gameState, side) {
  const player = gameState.currentPlayer;
  const row = player === 'white' ? 7 : 0;

  // Check if king or rook has moved
  if (side === 'kingside') {
    if (gameState.kingMoved[player] || gameState.rookMoved[player].kingside) {
      return false;
    }
  } else {
    if (gameState.kingMoved[player] || gameState.rookMoved[player].queenside) {
      return false;
    }
  }

  // Check if king is in check
  if (isKingInCheck(gameState, player)) {
    return false;
  }

  // Check if squares between king and rook are empty and not under attack
  const kingCol = 4;
  const rookCol = side === 'kingside' ? 7 : 0;
  const direction = side === 'kingside' ? 1 : -1;

  for (let col = kingCol + direction; col !== rookCol; col += direction) {
    // Square must be empty
    if (gameState.board[row][col]) {
      return false;
    }

    // Square must not be under attack
    if (isSquareUnderAttack(gameState, row, col, player)) {
      return false;
    }
  }

  // King's destination square must not be under attack
  const kingDestCol = kingCol + (2 * direction);
  if (isSquareUnderAttack(gameState, row, kingDestCol, player)) {
    return false;
  }

  return true;
}

function isSquareUnderAttack(gameState, row, col, byOpponentOf) {
  const opponent = byOpponentOf === 'white' ? 'black' : 'white';

  // Check all opponent pieces to see if they can attack this square
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gameState.board[r][c];
      if (piece && piece.color === opponent) {
        if (canPieceAttackSquare(gameState, r, c, row, col)) {
          return true;
        }
      }
    }
  }

  return false;
}

function canPieceAttackSquare(gameState, fromRow, fromCol, toRow, toCol) {
  const piece = gameState.board[fromRow][fromCol];
  if (!piece) return false;

  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);

  switch (piece.type) {
    case 'pawn':
      const direction = piece.color === 'white' ? -1 : 1;
      // Pawns attack diagonally
      return rowDiff === direction && absColDiff === 1;

    case 'rook':
      if (rowDiff === 0 || colDiff === 0) {
        return isPathClear(gameState, fromRow, fromCol, toRow, toCol);
      }
      return false;

    case 'bishop':
      if (absRowDiff === absColDiff) {
        return isPathClear(gameState, fromRow, fromCol, toRow, toCol);
      }
      return false;

    case 'queen':
      if (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) {
        return isPathClear(gameState, fromRow, fromCol, toRow, toCol);
      }
      return false;

    case 'knight':
      return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);

    case 'king':
      return absRowDiff <= 1 && absColDiff <= 1 && !(rowDiff === 0 && colDiff === 0);

    default:
      return false;
  }
}

function isPathClear(gameState, fromRow, fromCol, toRow, toCol) {
  const rowDir = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
  const colDir = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

  let currentRow = fromRow + rowDir;
  let currentCol = fromCol + colDir;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (gameState.board[currentRow][currentCol] !== null) {
      return false;
    }
    currentRow += rowDir;
    currentCol += colDir;
  }

  return true;
}

function getPieceAttacks(board, row, col) {
  // Similar to getValidMoves but for attack patterns (doesn't check for check)
  const piece = board[row][col];
  if (!piece) return [];

  switch (piece.type) {
    case 'pawn':
      return getPawnAttacks(board, row, col, piece.color);
    case 'rook':
      return getRookMoves(board, row, col, piece.color);
    case 'knight':
      return getKnightMoves(board, row, col, piece.color);
    case 'bishop':
      return getBishopMoves(board, row, col, piece.color);
    case 'queen':
      return getQueenMoves(board, row, col, piece.color);
    case 'king':
      return getKingAttacks(board, row, col, piece.color);
    default:
      return [];
  }
}

function getPawnAttacks(board, row, col, color) {
  const attacks = [];
  const direction = color === 'white' ? -1 : 1;

  // Pawn attacks diagonally
  for (const dcol of [-1, 1]) {
    const newRow = row + direction;
    const newCol = col + dcol;
    if (isValidSquare(newRow, newCol)) {
      attacks.push({ row: newRow, col: newCol });
    }
  }

  return attacks;
}

function getKingAttacks(board, row, col, color) {
  const attacks = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [drow, dcol] of directions) {
    const newRow = row + drow;
    const newCol = col + dcol;

    if (isValidSquare(newRow, newCol)) {
      attacks.push({ row: newRow, col: newCol });
    }
  }

  return attacks;
}

function isInsufficientMaterial(gameState) {
  const pieces = { white: [], black: [] };

  // Collect all pieces
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col];
      if (piece) {
        pieces[piece.color].push(piece.type);
      }
    }
  }

  // Check for insufficient material patterns
  for (const color of ['white', 'black']) {
    const colorPieces = pieces[color].filter(p => p !== 'king');

    // King vs King
    if (colorPieces.length === 0) {
      const otherColor = color === 'white' ? 'black' : 'white';
      const otherPieces = pieces[otherColor].filter(p => p !== 'king');
      if (otherPieces.length === 0) return true;

      // King vs King + Bishop/Knight
      if (otherPieces.length === 1 && (otherPieces[0] === 'bishop' || otherPieces[0] === 'knight')) {
        return true;
      }
    }
  }

  return false;
}

function getWinner(gameState) {
  // Winner is determined by king capture or draw conditions
  return gameState.winner;
}

async function saveChessGameState(gameState) {
  try {
    await storage.setItem('chessGameState', gameState);
  } catch (error) {
    console.warn('Failed to save chess game state:', error);
  }
}

async function loadChessGameState() {
  try {
    const saved = await storage.getItem('chessGameState');
    return saved ? saved : null;
  } catch (error) {
    console.warn('Failed to load chess game state:', error);
    return null;
  }
}

function makeWin95Button(label) {
  const btn  = document.createElement('button');
  btn.className = 'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
  const span = document.createElement('span');
  span.className = 'border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3';
  span.textContent = label;
  btn.appendChild(span);
  return btn;
}

// Create a dropdown with Win-95 styling
function makeWin95Dropdown(options, selectedValue = null, onChange = null) {
  const select = document.createElement('select');
  select.className = 'bg-white border-t-2 border-l-2 border-black border-b-2 border-r-2 border-gray-300 px-2 py-1';

  // Add options to the dropdown
  options.forEach(option => {
    const optionElement = document.createElement('option');

    // Handle both string options and object options with value/text
    if (typeof option === 'string') {
      optionElement.value = option;
      optionElement.textContent = option;
    } else {
      optionElement.value = option.value;
      optionElement.textContent = option.text || option.value;
    }

    // Set selected if this matches the selectedValue
    if (selectedValue !== null && optionElement.value === selectedValue) {
      optionElement.selected = true;
    }

    select.appendChild(optionElement);
  });

  // Add change event listener if provided
  if (onChange && typeof onChange === 'function') {
    select.addEventListener('change', (e) => onChange(e.target.value, e));
  }

  return select;
}
