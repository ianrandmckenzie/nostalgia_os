import { storage } from '../os/indexeddb_storage.js';
import { createWindow } from '../gui/window.js';

export function launchSolitaire() {
  // Check if solitaire window already exists
  const existingWindow = document.getElementById('solitaire');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  // Create the solitaire window
  const win = createWindow(
    'Solitaire',
    '',
    false,
    'solitaire',
    false,
    false,
    { type: 'integer', width: 700, height: 500 },
    'App',
    null,
    'green'
  );

  // Initialize the game UI
  initializeSolitaireUI(win).catch(console.error);
}

// Separate function to initialize the Solitaire UI (for restoration)
export async function initializeSolitaireUI(win) {
  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-green-600 h-full overflow-hidden';
  content.style.backgroundImage = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)';

  // Clear any existing content
  content.innerHTML = '';

  // Try to load saved game state
  let gameState = await loadSolitaireGameState();

  // If no saved state, create default state
  if (!gameState) {
    gameState = {
      deck: [],
      waste: [],
      foundations: [[], [], [], []], // Hearts, Diamonds, Clubs, Spades
      tableaus: [[], [], [], [], [], [], []], // 7 columns
      score: 0,
      moves: 0,
      time: 0,
      gameStarted: false,
      selectedCard: null,
      selectedPile: null,
  dragElement: null,
  drawCount: 1
    };
  }

  let gameTimer = null;
  let highScore = await storage.getItem('solitaire-high-score') || 0;

  // Card suits and values
  const suits = ['♠', '♣', '♥', '♦'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suitColors = {'♠': 'black', '♣': 'black', '♥': 'red', '♦': 'red'};

  // Create game layout
  const gameContainer = document.createElement('div');
  gameContainer.className = 'flex flex-col h-full';

  // Menu bar
  const menuBar = document.createElement('div');
  menuBar.className = 'bg-gray-200 border-b border-gray-400 p-1 flex items-center space-x-4';

  const gameMenu = document.createElement('button');
  gameMenu.className = 'px-2 py-1 hover:bg-gray-300 text-sm border border-transparent hover:border-gray-400';
  gameMenu.textContent = 'Game';
  gameMenu.setAttribute('aria-label', 'Game menu options');
  gameMenu.setAttribute('title', 'Access game options and settings');

  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'px-2 py-1 hover:bg-gray-300 text-sm border border-transparent hover:border-gray-400';
  newGameBtn.textContent = 'New Game';
  newGameBtn.setAttribute('aria-label', 'Start new solitaire game');
  newGameBtn.setAttribute('title', 'Start a new game of solitaire');
  newGameBtn.addEventListener('click', startNewGame);

  // Difficulty selector (Easy = draw 1, Normal = draw 3)
  const difficultySelect = document.createElement('select');
  difficultySelect.className = 'ml-2 text-sm border rounded p-1 bg-white';
  const optEasy = document.createElement('option'); optEasy.value = '1'; optEasy.text = 'Easy (Draw 1)';
  const optNormal = document.createElement('option'); optNormal.value = '3'; optNormal.text = 'Normal (Draw 3)';
  difficultySelect.appendChild(optEasy);
  difficultySelect.appendChild(optNormal);
  difficultySelect.title = 'Select difficulty / draw count';
  // Initialize selection from gameState (default to 1)
  difficultySelect.value = gameState.drawCount ? String(gameState.drawCount) : '1';
  difficultySelect.addEventListener('change', (e) => {
    gameState.drawCount = parseInt(e.target.value, 10);
    saveSolitaireGameState(gameState).catch(console.error);
  });

  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'text-sm font-mono ml-auto flex space-x-4';
  scoreDisplay.innerHTML = `<span>Score: <span id="score">0</span></span><span>High: <span id="high-score">${highScore}</span></span><span>Time: <span id="time">0:00</span></span>`;

  // menuBar.appendChild(gameMenu); // doesn't do anything right now
  menuBar.appendChild(newGameBtn);
  menuBar.appendChild(difficultySelect);
  menuBar.appendChild(scoreDisplay);

  // Game area
  const gameArea = document.createElement('div');
  gameArea.className = 'flex-1 p-4 relative overflow-scroll';
  gameArea.id = 'solitaire-game-area';

  // Top row - deck, waste, and foundations
  const topRow = document.createElement('div');
  topRow.className = 'lg:flex justify-between mb-6';

  // Deck and waste area
  const deckArea = document.createElement('div');
  deckArea.className = 'flex space-x-4 mb-4 lg:mb-0';
  const deckSlot = document.createElement('div');
  deckSlot.className = 'w-16 h-24 border-2 border-gray-400 rounded bg-blue-800 flex items-center justify-center cursor-pointer';
  deckSlot.style.borderStyle = 'outset';
  deckSlot.id = 'deck-slot';
  deckSlot.addEventListener('click', drawFromDeck);

  const wasteSlot = document.createElement('div');
  wasteSlot.className = 'w-16 h-24 border-2 border-gray-400 rounded bg-green-700 relative';
  wasteSlot.style.borderStyle = 'inset';
  wasteSlot.id = 'waste-slot';

  deckArea.appendChild(deckSlot);
  deckArea.appendChild(wasteSlot);

  // Foundation slots
  const foundationArea = document.createElement('div');
  foundationArea.className = 'flex space-x-2';

  for (let i = 0; i < 4; i++) {
    const foundation = document.createElement('div');
    foundation.className = 'w-16 h-24 border-2 border-gray-400 rounded bg-green-700 relative';
    foundation.style.borderStyle = 'inset';
    foundation.id = `foundation-${i}`;
    foundation.dataset.foundationIndex = i;
    foundation.addEventListener('click', (e) => handleFoundationClick(e, i));
    foundationArea.appendChild(foundation);
  }

  topRow.appendChild(deckArea);
  topRow.appendChild(foundationArea);

  // Tableau area
  const tableauArea = document.createElement('div');
  tableauArea.className = 'flex space-x-2';

  for (let i = 0; i < 7; i++) {
    const column = document.createElement('div');
    column.className = 'w-16 min-h-32 relative';
    column.id = `tableau-${i}`;
    column.dataset.tableauIndex = i;
    column.addEventListener('click', (e) => handleTableauClick(e, i));
    tableauArea.appendChild(column);
  }

  gameArea.appendChild(topRow);
  gameArea.appendChild(tableauArea);

  gameContainer.appendChild(menuBar);
  gameContainer.appendChild(gameArea);
  content.appendChild(gameContainer);

  // Card creation function
  function createCard(suit, value, faceUp = true) {
    const card = document.createElement('div');
    card.className = `card absolute w-16 h-24 border border-gray-800 rounded bg-white cursor-pointer transition-all duration-200`;
  card.style.fontSize = '10px';
  // Use the system default serif stack for card text
  card.style.fontFamily = "ui-serif, Georgia, 'Cambria', 'Times New Roman', Times, serif";
    card.style.userSelect = 'none';
    card.style.pointerEvents = 'auto'; // Ensure pointer events work
    card.dataset.suit = suit;
    card.dataset.value = value;
    card.dataset.faceUp = faceUp;

    if (faceUp) {
      const color = suitColors[suit];
      card.style.color = color;
      card.innerHTML = `
        <div class="p-1 h-full flex flex-col justify-between">
          <div class="flex justify-between">
            <span class="font-bold">${value}</span>
            <span class="text-lg">${suit}</span>
          </div>
          <div class="text-center text-2xl">${suit}</div>
          <div class="flex justify-between rotate-180">
            <span class="font-bold">${value}</span>
            <span class="text-lg">${suit}</span>
          </div>
        </div>
      `;
    } else {
      card.style.background = 'linear-gradient(45deg, #000080, #0000cd)';
      card.style.color = 'white';
      card.innerHTML = `
        <div class="w-full h-full flex items-center justify-center text-xs">
          <div class="text-center">♠♥♦♣</div>
        </div>
      `;
    }

    // Add drag functionality for both mouse and touch
    card.addEventListener('mousedown', startDrag);
    card.addEventListener('touchstart', startDrag, { passive: false });
    card.addEventListener('dblclick', handleDoubleClick);

    return card;
  }

  // Initialize deck
  function initializeDeck() {
    gameState.deck = [];
    for (const suit of suits) {
      for (const value of values) {
        gameState.deck.push({ suit, value });
      }
    }
    // Shuffle deck
    for (let i = gameState.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
  }

  // Deal cards
  function dealCards() {
    // Clear all areas
    gameState.waste = [];
    gameState.foundations = [[], [], [], []];
    gameState.tableaus = [[], [], [], [], [], [], []];

    // Deal to tableaus
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = gameState.deck.pop();
        card.faceUp = row === col; // Only top card face up
        gameState.tableaus[col].push(card);
      }
    }

    renderGame();
    saveSolitaireGameState(gameState).catch(console.error); // Save state after dealing cards
  }

  // Render the game
  function renderGame() {
    // Clear all visual elements
    document.querySelectorAll('.card').forEach(card => card.remove());

    // Render deck
    const deckSlot = document.getElementById('deck-slot');
    if (gameState.deck.length > 0) {
      deckSlot.innerHTML = '🂠';
      deckSlot.style.fontSize = '40px';
      deckSlot.style.color = 'white';
    } else {
      deckSlot.innerHTML = '↻';
      deckSlot.style.fontSize = '24px';
      deckSlot.style.color = 'white';
    }

    // Render waste pile
    const wasteSlot = document.getElementById('waste-slot');
    wasteSlot.innerHTML = '';
    if (gameState.waste.length > 0) {
      const topCard = gameState.waste[gameState.waste.length - 1];
      const cardElement = createCard(topCard.suit, topCard.value, true);
      cardElement.classList.add('card');
      cardElement.style.position = 'absolute';
      cardElement.style.top = '0';
      cardElement.style.left = '0';
      wasteSlot.appendChild(cardElement);
    }

    // Render foundations
    for (let i = 0; i < 4; i++) {
      const foundation = document.getElementById(`foundation-${i}`);
      foundation.innerHTML = '';

      // Show suit placeholder
      const suitSymbol = suits[i];
      foundation.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-4xl text-gray-500 opacity-30">${suitSymbol}</div>`;

      if (gameState.foundations[i].length > 0) {
        const topCard = gameState.foundations[i][gameState.foundations[i].length - 1];
        const cardElement = createCard(topCard.suit, topCard.value, true);
        cardElement.classList.add('card');
        cardElement.style.position = 'absolute';
        cardElement.style.top = '0';
        cardElement.style.left = '0';
        foundation.appendChild(cardElement);
      }
    }

    // Render tableaus
    for (let col = 0; col < 7; col++) {
      const column = document.getElementById(`tableau-${col}`);
      column.innerHTML = '';

      // Add empty slot indicator
      if (gameState.tableaus[col].length === 0) {
        column.innerHTML = '<div class="w-16 h-24 border-2 border-gray-400 border-dashed rounded bg-green-700 opacity-50"></div>';
      }

      gameState.tableaus[col].forEach((card, index) => {
        const cardElement = createCard(card.suit, card.value, card.faceUp);
        cardElement.classList.add('card');
        cardElement.style.position = 'absolute';
        cardElement.style.top = `${index * 20}px`;
        cardElement.style.left = '0';
        cardElement.style.zIndex = index + 1;
        cardElement.dataset.tableauIndex = col;
        cardElement.dataset.cardIndex = index;
        column.appendChild(cardElement);
      });
    }

    updateScore();
  }

  // Draw from deck
  function drawFromDeck() {
    const drawCount = gameState.drawCount || 1;
    if (gameState.deck.length > 0) {
      // Draw up to drawCount cards
      for (let i = 0; i < drawCount; i++) {
        if (gameState.deck.length === 0) break;
        const card = gameState.deck.pop();
        card.faceUp = true;
        gameState.waste.push(card);
      }
      gameState.moves++;
    } else if (gameState.waste.length > 0) {
      // Reset deck from waste
      gameState.deck = gameState.waste.reverse();
      gameState.deck.forEach(card => card.faceUp = false);
      gameState.waste = [];
      gameState.moves++;
    }
    renderGame();
    saveSolitaireGameState(gameState).catch(console.error); // Save state after deck action
  }

  // Handle card dragging (for both mouse and touch)
  function startDrag(e) {
    // Find the card element (could be the target itself or a parent)
    let card = e.target;
    while (card && card !== document.body) {
      if (card.classList && card.classList.contains('card')) {
        break;
      }
      card = card.parentElement;
    }

    if (!card || !card.classList.contains('card') || card.dataset.faceUp !== 'true') {
      return;
    }

    // Prevent default browser action (scrolling, text selection)
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling up to window drag handlers

    // Use a transform-based, rAF-batched drag to avoid layout thrash and CSS transition jitter
    gameState.selectedCard = card;
    gameState.dragElement = card.cloneNode(true);
    gameState.dragElement.style.position = 'fixed';
    gameState.dragElement.style.pointerEvents = 'none';
    gameState.dragElement.style.zIndex = '1000';
    // Disable transitions on the clone so the browser won't animate left/top changes
    gameState.dragElement.style.transition = 'none';

    // We'll position with transform for GPU acceleration
    gameState.dragElement.style.left = '0';
    gameState.dragElement.style.top = '0';

    // Get initial coordinates from either mouse or touch event
    const initialPoint = e.type === 'touchstart' ? e.touches[0] : e;

    const offsetX = 32;
    const offsetY = 48;
    // Initial placement using translate3d
    gameState.dragElement.style.transform = `translate3d(${initialPoint.clientX - offsetX}px, ${initialPoint.clientY - offsetY}px, 0) rotate(5deg)`;

    document.body.appendChild(gameState.dragElement);
    card.style.opacity = '0.5';

    // Temporarily disable touch-action/scrolling while dragging
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.touchAction = 'none';

    let rafId = null;

    function dragMove(moveEvent) {
      // Prevent default for touch to avoid scroll jank
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const movePoint = moveEvent.type && moveEvent.type.startsWith('touch') ? moveEvent.touches[0] : moveEvent;

      if (!gameState.dragElement) return;

      // Batch DOM writes with requestAnimationFrame
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!gameState.dragElement) return;
        gameState.dragElement.style.transform = `translate3d(${movePoint.clientX - offsetX}px, ${movePoint.clientY - offsetY}px, 0) rotate(5deg)`;
      });
    }

    function dragEnd(endEvent) {
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', dragEnd);
      document.removeEventListener('touchmove', dragMove);
      document.removeEventListener('touchend', dragEnd);

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (gameState.dragElement && document.body.contains(gameState.dragElement)) {
        document.body.removeChild(gameState.dragElement);
        gameState.dragElement = null;
      }

      // restore touch-action
      document.body.style.touchAction = prevTouchAction || '';

      if (gameState.selectedCard) {
        gameState.selectedCard.style.opacity = '1';

        // For touchend, the touch point is in changedTouches
        const endPoint = endEvent.type === 'touchend' ? endEvent.changedTouches[0] : endEvent;

        // Find drop target. The clone is gone, so elementFromPoint will find what's underneath.
        const dropTarget = document.elementFromPoint(endPoint.clientX, endPoint.clientY);
        handleCardDrop(dropTarget);

        gameState.selectedCard = null;
      }
    }

    // Add listeners for both mouse and touch
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    // Use { passive: false } for touchmove so we can preventDefault
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
  }

  // Handle card drop
  function handleCardDrop(dropTarget) {
    const card = gameState.selectedCard;
    if (!card || !dropTarget) return;

    // Look for foundation or tableau targets by traversing up the DOM
    let target = dropTarget;
    let foundTarget = null;
    let targetType = null;

    // Traverse up to find a valid drop target
    while (target && target !== document.body) {
      // Check for foundation
      if (target.id && target.id.startsWith('foundation-')) {
        foundTarget = target;
        targetType = 'foundation';
        break;
      }
      // Check for tableau
      if (target.dataset && target.dataset.tableauIndex !== undefined) {
        foundTarget = target;
        targetType = 'tableau';
        break;
      }
      // Check if dropped on another card in tableau
      if (target.classList && target.classList.contains('card') && target.dataset.tableauIndex !== undefined) {
        foundTarget = target.parentElement;
        targetType = 'tableau';
        break;
      }
      target = target.parentElement;
    }

    if (foundTarget && targetType === 'foundation') {
      const foundationIndex = parseInt(foundTarget.dataset.foundationIndex);
      if (canMoveToFoundation(card, foundationIndex)) {
        moveCardToFoundation(card, foundationIndex);
      }
    } else if (foundTarget && targetType === 'tableau') {
      const tableauIndex = parseInt(foundTarget.dataset.tableauIndex);
      if (canMoveToTableau(card, tableauIndex)) {
        moveCardToTableau(card, tableauIndex);
      }
    }
  }

  // Double click to auto-move to foundation
  function handleDoubleClick(e) {
    let card = e.target;
    // Ensure we're acting on the card element itself
    while (card && !card.classList.contains('card')) {
        card = card.parentElement;
    }
    if (!card || card.dataset.faceUp !== 'true') return;

    // Try to move to appropriate foundation
    for (let i = 0; i < 4; i++) {
      if (canMoveToFoundation(card, i)) {
        moveCardToFoundation(card, i);
        return; // Exit after successful move
      }
    }
  }

  // Move validation and execution functions
  function canMoveToFoundation(cardElement, foundationIndex) {
    const suit = cardElement.dataset.suit;
    const value = cardElement.dataset.value;
    const foundation = gameState.foundations[foundationIndex];
    const foundationSuit = suits[foundationIndex];

    // Check if the suit matches the foundation's designated suit
    if (suit !== foundationSuit) {
        // Find the correct foundation for this suit
        const correctFoundationIndex = suits.indexOf(suit);
        if (correctFoundationIndex !== -1 && gameState.foundations[correctFoundationIndex].length === 0) {
            // Allow moving an Ace to its correct empty foundation, even if the wrong one was clicked
            return value === 'A';
        }
        return false;
    }

    // Check if it's the next value in sequence
    if (foundation.length === 0) {
      return value === 'A'; // Only the correct Ace can start its foundation
    } else {
      const topCard = foundation[foundation.length - 1];
      const currentValueIndex = values.indexOf(topCard.value);
      const newValueIndex = values.indexOf(value);
      return newValueIndex === currentValueIndex + 1;
    }
  }

  function canMoveToTableau(cardElement, tableauIndex) {
    const suit = cardElement.dataset.suit;
    const value = cardElement.dataset.value;
    const tableau = gameState.tableaus[tableauIndex];

    if (tableau.length === 0) {
      return value === 'K'; // Only Kings can go on empty tableaus
    }

    const topCard = tableau[tableau.length - 1];
    if (!topCard.faceUp) return false;

    // Must be different color and one value lower
    const currentColor = suitColors[topCard.suit];
    const newColor = suitColors[suit];
    const currentValueIndex = values.indexOf(topCard.value);
    const newValueIndex = values.indexOf(value);

    return currentColor !== newColor && newValueIndex === currentValueIndex - 1;
  }

  function moveCardToFoundation(cardElement, foundationIndex) {
    // Determine the correct foundation based on the card's suit
    const suit = cardElement.dataset.suit;
    const correctFoundationIndex = suits.indexOf(suit);

    if (correctFoundationIndex === -1) return; // Should not happen

    // Remove card from current location
    removeCardFromCurrentLocation(cardElement);

    // Add to the correct foundation
    const card = {
      suit: suit,
      value: cardElement.dataset.value,
      faceUp: true
    };
    gameState.foundations[correctFoundationIndex].push(card);

    gameState.moves++;
    gameState.score += 10;
    renderGame();
    checkWinCondition();
    saveSolitaireGameState(gameState).catch(console.error); // Save state after foundation move
  }

  function moveCardToTableau(cardElement, tableauIndex) {
    // Remove card from current location
    const cardsToMove = removeCardFromCurrentLocation(cardElement, true);

    // Add card(s) to tableau
    gameState.tableaus[tableauIndex].push(...cardsToMove);

    gameState.moves++;
    renderGame();
    saveSolitaireGameState(gameState).catch(console.error); // Save state after tableau move
  }

  function removeCardFromCurrentLocation(cardElement, moveStack = false) {
    const cardSuit = cardElement.dataset.suit;
    const cardValue = cardElement.dataset.value;

    // Check waste pile
    if (gameState.waste.length > 0 &&
        gameState.waste[gameState.waste.length - 1].suit === cardSuit &&
        gameState.waste[gameState.waste.length - 1].value === cardValue) {
      return [gameState.waste.pop()];
    }

    // Check tableaus
    for (let col = 0; col < 7; col++) {
      const tableau = gameState.tableaus[col];
      const cardIndex = tableau.findIndex(c => c.suit === cardSuit && c.value === cardValue);

      if (cardIndex !== -1) {
          const cardsToRemove = moveStack ? tableau.length - cardIndex : 1;
          const movedCards = tableau.splice(cardIndex, cardsToRemove);

          // Flip the new top card if it exists and is face down
          if (tableau.length > 0 && !tableau[tableau.length - 1].faceUp) {
            tableau[tableau.length - 1].faceUp = true;
            gameState.score += 5;
            saveSolitaireGameState(gameState).catch(console.error); // Save state after card flip
          }
          return movedCards;
      }
    }
    return []; // Should not happen if logic is correct
  }


  // Click handlers
  function handleFoundationClick(e, foundationIndex) {
    // Implementation for foundation clicks if needed
  }

  function handleTableauClick(e, tableauIndex) {
    // Implementation for tableau clicks if needed
  }

  // Update score display
  function updateScore() {
    document.getElementById('score').textContent = gameState.score;

    if (gameState.gameStarted) {
      const minutes = Math.floor(gameState.time / 60);
      const seconds = gameState.time % 60;
      document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Start new game
  function startNewGame() {
    gameState.score = 0;
    gameState.moves = 0;
    gameState.time = 0;
    gameState.gameStarted = true;

    if (gameTimer) clearInterval(gameTimer);
    gameTimer = setInterval(() => {
      gameState.time++;
      updateScore();
      saveSolitaireGameState(gameState).catch(console.error); // Save state with updated time
    }, 1000);

    initializeDeck();
    dealCards();
    clearSolitaireGameState().catch(console.error); // Clear saved state when starting new game
  }

  // Restore saved game
  function restoreGame() {
    // Restart timer if game is in progress
    if (gameState.gameStarted) {
      gameTimer = setInterval(() => {
        gameState.time++;
        updateScore();
        saveSolitaireGameState(gameState).catch(console.error); // Save state with updated time
      }, 1000);
    }

    // Update display and render game
    updateScore();
    renderGame();
  }

  // Check win condition
  function checkWinCondition() {
    const totalFoundationCards = gameState.foundations.reduce((sum, foundation) => sum + foundation.length, 0);
    if (totalFoundationCards === 52) {
      if (gameTimer) clearInterval(gameTimer);
      saveSolitaireGameState(gameState).catch(console.error); // Save final win state

      // Check for high score
      if (gameState.score > highScore) {
        highScore = gameState.score;
        storage.setItemSync('solitaire-high-score', highScore);
        document.getElementById('high-score').textContent = highScore;
        // Send high score to Devvit if in Devvit context
        if (window.isDevvit) {
          window.parent.postMessage({
            type: 'setGameScore',
            data: { game: 'solitaire', score: highScore }
          }, '*');
        }
      }

      setTimeout(() => {
        triggerWinAnimation();
      }, 500);
    }
  }

  // Cleanup when window is closed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'solitaire') {
          if (gameTimer) clearInterval(gameTimer);
          observer.disconnect();
        }
      });
    });
  });

  observer.observe(document.getElementById('windows-container'), {
    childList: true
  });

  // Start the game
  if (!gameState.gameStarted || gameState.deck.length === 0) {
    // No saved game or empty game, start new
    startNewGame();
  } else {
    // Restore saved game
    restoreGame();
  }
}

// Save game state to IndexedDB
async function saveSolitaireGameState(gameState) {
  try {
    // Create a clean copy without non-serializable elements
    const stateToSave = {
      ...gameState,
      selectedCard: null,
      selectedPile: null,
      dragElement: null
    };
    await storage.setItem('solitaire_gameState', stateToSave);
  } catch (error) {
    console.warn('Failed to save Solitaire game state:', error);
    // Fallback to sync method if async fails
    try {
      const stateToSave = {
        ...gameState,
        selectedCard: null,
        selectedPile: null,
        dragElement: null
      };
      storage.setItemSync('solitaire_gameState', stateToSave);
    } catch (fallbackError) {
      console.error('Failed to save Solitaire game state with fallback:', fallbackError);
    }
  }
}

// Load game state from IndexedDB
async function loadSolitaireGameState() {
  try {
    const savedState = await storage.getItem('solitaire_gameState');
    if (savedState) {
      const gameState = savedState;
      // Ensure non-serializable elements are reset
      gameState.selectedCard = null;
      gameState.selectedPile = null;
      gameState.dragElement = null;
      return gameState;
    }
  } catch (error) {
    console.warn('Failed to load Solitaire game state:', error);
    // Fallback to sync method if async fails
    try {
      const savedState = storage.getItemSync('solitaire_gameState');
      if (savedState) {
        const gameState = savedState;
        // Ensure non-serializable elements are reset
        gameState.selectedCard = null;
        gameState.selectedPile = null;
        gameState.dragElement = null;
        return gameState;
      }
    } catch (fallbackError) {
      console.warn('Failed to load Solitaire game state with fallback:', fallbackError);
    }
  }
  return null;
}

// Clear saved game state
async function clearSolitaireGameState() {
  try {
    await storage.removeItem('solitaire_gameState');
  } catch (error) {
    console.warn('Failed to clear Solitaire game state:', error);
    // Fallback to sync method if async fails
    try {
      storage.removeItemSync('solitaire_gameState');
    } catch (fallbackError) {
      console.error('Failed to clear Solitaire game state with fallback:', fallbackError);
    }
  }
}

/**
 * Triggers a full-screen cascading card animation with gravity, bounce and trail.
 * Call triggerWinAnimation() in the console to see it.
 */
function triggerWinAnimation() {
  // create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'solitaire-win-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    zIndex: 9999,
    pointerEvents: 'none'
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // physics & cards
  const suits = ['♠','♥','♣','♦'];
  const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suitColor = {'♠':'black','♣':'black','♥':'red','♦':'red'};
  const cards = [];
  const gravity = 0.2;
  const damping = 0.7;
  // size and visual tuning
  const cardWidth = 75;
  const cardHeight = 100;
  const trailAlpha = 0.02;
  let spawned = 0;

  // track animation state
  let animationId;
  let running = true;

  // spawn one card every 100ms
  const spawner = setInterval(() => {
    if (spawned === 52) return clearInterval(spawner);
    const suit = suits[spawned % 4];
    const value = values[Math.floor(spawned/4)];
    cards.push({
      x: Math.random()*canvas.width,
      y: -50,
      vx: (Math.random()-0.5)*4,
      vy: Math.random()*2,
      suit, value, color: suitColor[suit]
    });
    spawned++;
  }, 100);

  // animation loop
  function loop() {
    // trail effect: semi-transparent green
    ctx.fillStyle = `rgba(10,100,10,${trailAlpha})`;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    cards.forEach(c => {
      c.vy += gravity;
      c.x += c.vx;
      c.y += c.vy;
      // bounce at bottom
      if (c.y > canvas.height - cardHeight) {
        c.y = canvas.height - cardHeight;
        c.vy *= -damping;
      }
      // draw card rectangle
      ctx.fillStyle = 'white';
      ctx.fillRect(c.x, c.y, cardWidth, cardHeight);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(c.x, c.y, cardWidth, cardHeight);
      // draw value+suit
      ctx.fillStyle = c.color;
      ctx.font = '24px sans-serif';
      ctx.fillText(c.value + c.suit, c.x + 10, c.y + 30);
    });

    // schedule next frame if still running
    if (running) animationId = requestAnimationFrame(loop);
  }

  // start loop
  loop();

  // auto-cleanup after 10s
  setTimeout(() => {
    // stop spawning and animation
    running = false;
    clearInterval(spawner);
    cancelAnimationFrame(animationId);
    document.body.removeChild(canvas);
    showDialogBox('Congratulations! You won!', 'confirmation');
  }, 8000);
}
