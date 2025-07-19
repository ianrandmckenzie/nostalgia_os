// Compost Bin - A parody successor to the Recycle Bin

function launchCompostBin() {
  // Check if compost bin window already exists
  const existingWindow = document.getElementById('compost-bin');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  // Create the compost bin window
  const win = createWindow(
    'Compost Bin',
    '',
    false,
    'compost-bin',
    false,
    false,
    { type: 'integer', width: 600, height: 400 },
    'App',
    null,
    'gray'
  );

  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-gray-100 h-full flex flex-col';

  // Create the compost bin interface
  const binContainer = document.createElement('div');
  binContainer.className = 'h-full flex flex-col';

  // Header with bin info
  const header = document.createElement('div');
  header.className = 'bg-gray-200 border-b border-gray-400 p-2 flex justify-between items-center';

  const binInfo = document.createElement('div');
  binInfo.className = 'text-sm';
  const fs = getFileSystemState();

  // Use unified structure: look for compost bin in fs.folders['C://Desktop']
  const desktopItems = fs.folders['C://Desktop'] || {};
  const compostBin = desktopItems['compostbin'];

  const itemCount = Object.keys(compostBin?.contents || {}).length;
  binInfo.textContent = `Compost Bin - ${itemCount} item(s)`;

  const binActions = document.createElement('div');
  binActions.className = 'flex space-x-2';

  const emptyBinBtn = document.createElement('button');
  emptyBinBtn.className = 'px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs';
  emptyBinBtn.textContent = 'Empty Bin';
  emptyBinBtn.addEventListener('click', emptyCompostBin);

  binActions.appendChild(emptyBinBtn);
  header.appendChild(binInfo);
  header.appendChild(binActions);

  // Content area
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 bg-white border border-gray-400 p-2 overflow-auto';
  contentArea.id = 'compost-bin-content';

  // Load compost bin contents
  loadCompostBinContents(contentArea);

  binContainer.appendChild(header);
  binContainer.appendChild(contentArea);
  content.appendChild(binContainer);
}

function loadCompostBinContents(container) {
  const fs = getFileSystemState();

  // Use unified structure: look for compost bin in fs.folders['C://Desktop']
  const desktopItems = fs.folders['C://Desktop'] || {};
  const compostBin = desktopItems['compostbin'];
  const contents = compostBin?.contents || {};

  container.innerHTML = '';

  if (Object.keys(contents).length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'text-center text-gray-500 mt-8';
    emptyMsg.textContent = 'The Compost Bin is empty';
    container.appendChild(emptyMsg);
    return;
  }

  // Create grid layout for items
  const itemsGrid = document.createElement('div');
  itemsGrid.className = 'grid grid-cols-6 gap-4 p-2';

  Object.values(contents).forEach(item => {
    const itemElement = createCompostBinItem(item);
    itemsGrid.appendChild(itemElement);
  });

  container.appendChild(itemsGrid);
}

function createCompostBinItem(item) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'flex flex-col items-center p-2 hover:bg-blue-100 cursor-pointer';
  itemDiv.draggable = true;
  itemDiv.setAttribute('data-item-id', item.id);

  // Icon
  const icon = document.createElement('img');
  icon.className = 'w-8 h-8 mb-1';
  icon.src = item.icon || getDefaultIcon(item.type);
  icon.alt = item.name;

  // Name
  const name = document.createElement('div');
  name.className = 'text-xs text-center text-gray-700 break-words max-w-16';
  name.textContent = item.name;

  itemDiv.appendChild(icon);
  itemDiv.appendChild(name);

  // Set up drag events for restoring items
  itemDiv.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData('application/x-compost-item', 'true');
    e.dataTransfer.effectAllowed = 'move';
  });

  return itemDiv;
}

function moveItemToCompostBin(itemId, fromPath) {
  const fs = getFileSystemState();

  // Don't allow moving the compost bin itself
  if (itemId === 'compostbin') {
    showDialogBox('Cannot move the Compost Bin to itself!', 'error');
    return;
  }

  // Find the item in its current location
  let sourceItem = null;
  let sourceContainer = null;

  if (fromPath === 'C://Desktop') {
    // Use unified structure for desktop
    sourceContainer = fs.folders['C://Desktop'] || {};
  } else {
    // Navigate to the source container
    const pathParts = fromPath.split('/').filter(part => part);
    let current = fs.folders;

    for (const part of pathParts) {
      if (current[part]) {
        current = current[part];
        if (current.contents) {
          current = current.contents;
        }
      }
    }
    sourceContainer = current;
  }

  if (sourceContainer && sourceContainer[itemId]) {
    sourceItem = sourceContainer[itemId];

    // Move item to compost bin
    const desktopItems = fs.folders['C://Desktop'] || {};
    const compostBin = desktopItems['compostbin'];
    if (!compostBin) {
      console.error('Compost bin not found in unified structure');
      showDialogBox('Compost Bin not found!', 'error');
      return;
    }
    if (!compostBin.contents) {
      compostBin.contents = {};
    }

    // Store original path for potential restoration
    sourceItem.originalPath = fromPath;
    compostBin.contents[itemId] = sourceItem;

    // Remove from original location
    delete sourceContainer[itemId];

    // Clean up desktop icon position if moving from desktop
    if (fromPath === 'C://Desktop') {
      const iconId = 'icon-' + itemId;
      if (desktopIconsState[iconId]) {
        delete desktopIconsState[iconId];
      }
    }

    // Save state and refresh
    setFileSystemState(fs);
    saveState();
    refreshExplorerViews();
    renderDesktopIcons();

    // Refresh compost bin if open
    const compostBinWindow = document.getElementById('compost-bin');
    if (compostBinWindow) {
      const contentArea = compostBinWindow.querySelector('#compost-bin-content');
      if (contentArea) {
        loadCompostBinContents(contentArea);
        updateCompostBinHeader(compostBinWindow);
      }
    }
  }
}

function emptyCompostBin() {
  const fs = getFileSystemState();

  // Use unified structure: look for compost bin in fs.folders['C://Desktop']
  const desktopItems = fs.folders['C://Desktop'] || {};
  const compostBin = desktopItems['compostbin'];

  if (!compostBin) {
    showDialogBox('Compost Bin not found!', 'error');
    return;
  }

  const itemCount = Object.keys(compostBin.contents || {}).length;

  if (itemCount === 0) {
    showDialogBox('The Compost Bin is already empty.', 'info');
    return;
  }

  // Show confirmation dialog
  const winId = `window-${Date.now()}`;
  const win = createWindow(
    'Empty Compost Bin',
    '',
    false,
    winId,
    false,
    false,
    { type: 'integer', width: 320, height: 140 },
    'Default'
  );

  const box = win.querySelector('.p-2');
  box.classList.add('p-4', 'flex', 'flex-col', 'justify-between', 'h-full');

  const msg = document.createElement('p');
  msg.textContent = `Are you sure you want to permanently delete all ${itemCount} item(s) in the Compost Bin?`;
  box.appendChild(msg);

  const btnRow = document.createElement('div');
  btnRow.className = 'flex justify-end space-x-2';
  box.appendChild(btnRow);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'px-4 py-2 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200';
  cancelBtn.textContent = 'Cancel';

  const emptyBtn = document.createElement('button');
  emptyBtn.className = 'px-4 py-2 bg-red-500 border-2 border-red-600 hover:bg-red-400 text-white';
  emptyBtn.textContent = 'Empty Bin';

  btnRow.append(cancelBtn, emptyBtn);

  cancelBtn.addEventListener('click', () => closeWindow(winId));

  emptyBtn.addEventListener('click', () => {
    // Get list of items before clearing for cleanup
    const itemIds = Object.keys(compostBin.contents || {});

    // Empty the compost bin
    compostBin.contents = {};

    // Clean up desktop icon positions for deleted items
    itemIds.forEach(itemId => {
      const iconId = 'icon-' + itemId;
      if (desktopIconsState[iconId]) {
        delete desktopIconsState[iconId];
      }
    });

    // Save state and refresh
    setFileSystemState(fs);
    saveState();

    // Refresh compost bin if open
    const compostBinWindow = document.getElementById('compost-bin');
    if (compostBinWindow) {
      const contentArea = compostBinWindow.querySelector('#compost-bin-content');
      if (contentArea) {
        loadCompostBinContents(contentArea);
        updateCompostBinHeader(compostBinWindow);
      }
    }

    closeWindow(winId);
    showDialogBox(`${itemCount} item(s) permanently deleted from Compost Bin`, 'info');
  });
}

function updateCompostBinHeader(compostBinWindow) {
  const header = compostBinWindow.querySelector('.bg-gray-200');
  if (header) {
    const binInfo = header.querySelector('.text-sm');
    if (binInfo) {
      const fs = getFileSystemState();

      // Use unified structure: look for compost bin in fs.folders['C://Desktop']
      const desktopItems = fs.folders['C://Desktop'] || {};
      const compostBin = desktopItems['compostbin'];

      const itemCount = Object.keys(compostBin?.contents || {}).length;
      binInfo.textContent = `Compost Bin - ${itemCount} item(s)`;
    }
  }
}

function getDefaultIcon(type) {
  switch (type) {
    case 'folder': return './image/folder.png';
    case 'ugc-file': return './image/doc.png';
    case 'app': return './image/computer.png';
    default: return './image/file.png';
  }
}
