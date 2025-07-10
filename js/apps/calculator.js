function launchCalculator() {
  // Check if calculator window already exists
  const existingWindow = document.getElementById('calculator');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  // Create the calculator window
  const win = createWindow(
    'Calculator',
    '',
    false,
    'calculator',
    false,
    false,
    { type: 'integer', width: 250, height: 360 },
    'App',
    null,
    'gray-100'
  );

  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-4 bg-gray-100 h-full overflow-hidden';

  // Calculator state
  let display = '0';
  let previousValue = null;
  let operation = null;
  let waitingForOperand = false;

  // Create calculator layout
  const calculatorContainer = document.createElement('div');
  calculatorContainer.className = 'flex flex-col h-full space-y-1 pb-6';

  // Display screen
  const displayContainer = document.createElement('div');
  displayContainer.className = 'bg-white border-2 p-2 mb-2';
  displayContainer.style.borderTopColor = '#808080';
  displayContainer.style.borderLeftColor = '#808080';
  displayContainer.style.borderBottomColor = '#ffffff';
  displayContainer.style.borderRightColor = '#ffffff';

  const displayElement = document.createElement('div');
  displayElement.id = 'calc-display';
  displayElement.className = 'text-right text-lg font-mono bg-white text-black min-h-6 px-1';
  displayElement.textContent = display;
  displayContainer.appendChild(displayElement);

  // Button grid
  const buttonGrid = document.createElement('div');
  buttonGrid.className = 'grid grid-cols-4 gap-1 flex-1';

  // Button definitions with classic Windows calculator layout
  const buttons = [
    { text: 'C', type: 'clear', className: 'col-span-2' },
    { text: '±', type: 'sign' },
    { text: '/', type: 'operator' },
    { text: '7', type: 'number' },
    { text: '8', type: 'number' },
    { text: '9', type: 'number' },
    { text: '*', type: 'operator' },
    { text: '4', type: 'number' },
    { text: '5', type: 'number' },
    { text: '6', type: 'number' },
    { text: '-', type: 'operator' },
    { text: '1', type: 'number' },
    { text: '2', type: 'number' },
    { text: '3', type: 'number' },
    { text: '+', type: 'operator' },
    { text: '0', type: 'number', className: 'col-span-2' },
    { text: '.', type: 'decimal' },
    { text: '=', type: 'equals' }
  ];

  // Create buttons with Windows 95 style
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.text;
    button.className = `bg-gray-200 border-2 hover:bg-gray-300 font-mono text-sm py-2 select-none ${btn.className || ''}`;
    button.style.borderTopColor = '#ffffff';
    button.style.borderLeftColor = '#ffffff';
    button.style.borderBottomColor = '#808080';
    button.style.borderRightColor = '#808080';
    button.style.transition = 'none';

    // Add pressed effect
    button.addEventListener('mousedown', () => {
      button.style.borderTopColor = '#808080';
      button.style.borderLeftColor = '#808080';
      button.style.borderBottomColor = '#ffffff';
      button.style.borderRightColor = '#ffffff';
      button.classList.add('bg-gray-300');
    });

    button.addEventListener('mouseup', () => {
      button.style.borderTopColor = '#ffffff';
      button.style.borderLeftColor = '#ffffff';
      button.style.borderBottomColor = '#808080';
      button.style.borderRightColor = '#808080';
      button.classList.remove('bg-gray-300');
    });

    button.addEventListener('mouseleave', () => {
      button.style.borderTopColor = '#ffffff';
      button.style.borderLeftColor = '#ffffff';
      button.style.borderBottomColor = '#808080';
      button.style.borderRightColor = '#808080';
      button.classList.remove('bg-gray-300');
    });

    // Button functionality
    button.addEventListener('click', () => handleButtonClick(btn.text, btn.type));

    buttonGrid.appendChild(button);
  });

  // Assemble calculator
  calculatorContainer.appendChild(displayContainer);
  calculatorContainer.appendChild(buttonGrid);
  content.appendChild(calculatorContainer);

  // Calculator functions
  function updateDisplay() {
    displayElement.textContent = display;
  }

  function handleButtonClick(value, type) {
    switch (type) {
      case 'number':
        if (waitingForOperand) {
          display = value;
          waitingForOperand = false;
        } else {
          display = display === '0' ? value : display + value;
        }
        break;

      case 'decimal':
        if (waitingForOperand) {
          display = '0.';
          waitingForOperand = false;
        } else if (display.indexOf('.') === -1) {
          display += '.';
        }
        break;

      case 'clear':
        display = '0';
        previousValue = null;
        operation = null;
        waitingForOperand = false;
        break;

      case 'sign':
        if (display !== '0') {
          display = display.charAt(0) === '-' ? display.slice(1) : '-' + display;
        }
        break;

      case 'operator':
        const inputValue = parseFloat(display);

        if (previousValue === null) {
          previousValue = inputValue;
        } else if (operation) {
          const currentValue = previousValue || 0;
          const newValue = calculate(currentValue, inputValue, operation);

          display = String(newValue);
          previousValue = newValue;
        }

        waitingForOperand = true;
        operation = value;
        break;

      case 'equals':
        const inputVal = parseFloat(display);

        if (previousValue !== null && operation) {
          const currentValue = previousValue || 0;
          const newValue = calculate(currentValue, inputVal, operation);

          display = String(newValue);
          previousValue = null;
          operation = null;
          waitingForOperand = true;
        }
        break;
    }

    updateDisplay();
  }

  function calculate(firstValue, secondValue, operation) {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      default:
        return secondValue;
    }
  }

  // Keyboard support
  function handleKeydown(event) {
    const key = event.key;

    if (/[0-9]/.test(key)) {
      handleButtonClick(key, 'number');
    } else if (['+', '-', '*', '/'].includes(key)) {
      handleButtonClick(key, 'operator');
    } else if (key === '.') {
      handleButtonClick(key, 'decimal');
    } else if (key === 'Enter' || key === '=') {
      handleButtonClick('=', 'equals');
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
      handleButtonClick('C', 'clear');
    } else if (key === 'Backspace') {
      if (display.length > 1) {
        display = display.slice(0, -1);
      } else {
        display = '0';
      }
      updateDisplay();
    }
  }

  // Add keyboard listener when calculator is focused
  document.addEventListener('keydown', handleKeydown);

  // Remove keyboard listener when calculator is closed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'calculator') {
          document.removeEventListener('keydown', handleKeydown);
          observer.disconnect();
        }
      });
    });
  });

  observer.observe(document.getElementById('windows-container'), {
    childList: true
  });
}
