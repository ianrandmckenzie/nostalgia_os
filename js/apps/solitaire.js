function launchSolitaire() {
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

  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-green-600 h-full overflow-hidden';
  content.style.backgroundImage = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)';

  // Game state
  let gameState = {
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
    dragElement: null
  };

  let gameTimer = null;

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

  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'px-2 py-1 hover:bg-gray-300 text-sm border border-transparent hover:border-gray-400';
  newGameBtn.textContent = 'New Game';
  newGameBtn.addEventListener('click', startNewGame);

  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'text-sm font-mono ml-auto flex space-x-4';
  scoreDisplay.innerHTML = '<span>Score: <span id="score">0</span></span><span>Time: <span id="time">0:00</span></span>';

  // menuBar.appendChild(gameMenu); // doesn't do anything right now
  menuBar.appendChild(newGameBtn);
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
    if (gameState.deck.length > 0) {
      const card = gameState.deck.pop();
      card.faceUp = true;
      gameState.waste.push(card);
      gameState.moves++;
    } else if (gameState.waste.length > 0) {
      // Reset deck from waste
      gameState.deck = gameState.waste.reverse();
      gameState.deck.forEach(card => card.faceUp = false);
      gameState.waste = [];
      gameState.moves++;
    }
    renderGame();
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

    gameState.selectedCard = card;
    gameState.dragElement = card.cloneNode(true);
    gameState.dragElement.style.position = 'fixed';
    gameState.dragElement.style.pointerEvents = 'none';
    gameState.dragElement.style.zIndex = '1000';
    gameState.dragElement.style.transform = 'rotate(5deg)';

    // Get initial coordinates from either mouse or touch event
    const initialPoint = e.type === 'touchstart' ? e.touches[0] : e;

    // Set initial position to prevent jumping
    gameState.dragElement.style.left = (initialPoint.clientX - 32) + 'px';
    gameState.dragElement.style.top = (initialPoint.clientY - 48) + 'px';

    document.body.appendChild(gameState.dragElement);
    card.style.opacity = '0.5';

    function dragMove(moveEvent) {
      if (gameState.dragElement) {
        const movePoint = moveEvent.type === 'touchmove' ? moveEvent.touches[0] : moveEvent;
        gameState.dragElement.style.left = (movePoint.clientX - 32) + 'px';
        gameState.dragElement.style.top = (movePoint.clientY - 48) + 'px';
      }
    }

    function dragEnd(endEvent) {
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', dragEnd);
      document.removeEventListener('touchmove', dragMove);
      document.removeEventListener('touchend', dragEnd);

      if (gameState.dragElement) {
        document.body.removeChild(gameState.dragElement);
        gameState.dragElement = null;
      }

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
    // Use { passive: false } for touchmove to allow preventDefault within the handler if needed in the future
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
  }

  function moveCardToTableau(cardElement, tableauIndex) {
    // Remove card from current location
    const cardsToMove = removeCardFromCurrentLocation(cardElement, true);

    // Add card(s) to tableau
    gameState.tableaus[tableauIndex].push(...cardsToMove);

    gameState.moves++;
    renderGame();
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
    }, 1000);

    initializeDeck();
    dealCards();
  }

  // Check win condition
  function checkWinCondition() {
    const totalFoundationCards = gameState.foundations.reduce((sum, foundation) => sum + foundation.length, 0);
    if (totalFoundationCards === 52) {
      if (gameTimer) clearInterval(gameTimer);
      setTimeout(() => {
        showDialogBox('Congratulations! You won!', 'confirmation');
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
  startNewGame();
}
