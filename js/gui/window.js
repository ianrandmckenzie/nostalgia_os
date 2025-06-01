function createWindow(title, content, isNav = false, windowId = null, initialMinimized = false, restore = false, dimensions = { type: 'default' }, windowType = 'default', parentWin = null, color = 'white') {
  let contentToPrint = content;
  if (!windowId) {
    windowId = 'window-' + Date.now();
  }
  if (windowType === 'Settings') {
    contentToPrint = getSettingsContent();
  }
  if (windowType === 'Explorer') {
    contentToPrint = content || getExplorerWindowContent();
  }
  if (windowType === 'App') {
    contentToPrint = content;
  }
  let styleDimensions = "";
  if (dimensions.type === 'integer') {
    styleDimensions = `width: ${dimensions.width}px; height: ${dimensions.height}px; max-width:100%; max-height:100%;`;
  } else {
    styleDimensions = "width: 100%; height: 100%;";
  }
  const win = document.createElement('div');
  win.id = windowId;
  win.className = `absolute border border-gray-500 shadow-lg overflow-auto`;
  win.style.cssText = styleDimensions;
  win.style.minWidth = "350px";
  win.style.minHeight = "240px";
  if (initialMinimized) {
    win.style.display = 'none';
  }
  win.innerHTML = `
    <div class="relative w-full h-[calc(100%-1rem)]">
      <div class="bg-handlebarBlue sticky top-0 left-0 text-white px-2 py-1 flex justify-between items-center cursor-move">
        <span>${title}</span>
        <div class="my-1">
          <button onclick="minimizeWindow('${windowId}'); event.stopPropagation();" class="bg-yellow-500 h-6 w-6 text-white">_</button>
          <button onclick="toggleFullScreen('${windowId}'); event.stopPropagation();" class="bg-green-500 h-6 w-6 text-white">⛶</button>
          <button onclick="closeWindow('${windowId}'); event.stopPropagation();" class="bg-red-500 h-6 w-6 text-white">X</button>
        </div>
      </div>
      <div class="p-2 bg-${color} h-full ${windowType === 'editor' ? 'w-full' : ''} overflow-auto" ${windowType === 'default' ? 'contenteditable="true" oninput="updateContent(\'' + windowId + '\', this.innerHTML)"' : ''}>
        ${contentToPrint}
      </div>
    </div>`;
  win.addEventListener('click', function () {
    bringToFront(win);
  });
  document.getElementById('windows-container').appendChild(win);

  const tab = document.createElement('div');
  tab.id = 'tab-' + windowId;
  tab.className = 'bg-gray-200 border border-gray-500 px-2 py-1 cursor-pointer';
  tab.textContent = title;
  tab.onclick = function () {
    if (win.style.display === 'none') {
      bringToFront(win);
    } else {
      minimizeWindow(win.id);
    }
  };
  document.getElementById('window-tabs').appendChild(tab);

  windowStates[windowId] = {
    id: windowId,
    title: title,
    content: contentToPrint,
    isNav: isNav,
    isMinimized: initialMinimized,
    dimensions: dimensions,
    windowType: windowType,
    position: windowStates[windowId] ? windowStates[windowId].position : null,
    fullScreen: false
  };
  if (isNav) {
    navWindows[title] = windowId;
  }
  if (!initialMinimized) {
    bringToFront(win);
  }
  if (dimensions.type !== 'default') {
    if (restore && windowStates[windowId].position) {
      win.style.left = windowStates[windowId].position.left;
      win.style.top = windowStates[windowId].position.top;
    } else {
      if (parentWin) {
        let parentLeft = parseInt(parentWin.style.left, 10) || 0;
        let parentTop = parseInt(parentWin.style.top, 10) || 0;
        let candidateLeft = parentLeft + 30;
        let candidateTop = parentTop + 30;
        let desktopWidth = window.innerWidth;
        let desktopHeight = window.innerHeight - 40;
        let newWidth = dimensions.width;
        let newHeight = dimensions.height;
        if (candidateLeft + newWidth > desktopWidth || candidateTop + newHeight > desktopHeight) {
          candidateLeft = 0;
          candidateTop = 0;
          const existingTopLeft = Array.from(document.querySelectorAll('#windows-container > div')).find(el => {
            return (parseInt(el.style.left, 10) || 0) <= 10 && (parseInt(el.style.top, 10) || 0) <= 10;
          });
          if (existingTopLeft) {
            candidateLeft = (parseInt(existingTopLeft.style.left, 10) || 0) + 30;
          }
        }
        win.style.left = candidateLeft + 'px';
        win.style.top = candidateTop + 'px';
      } else {
        win.style.left = "100px";
        win.style.top = "100px";
      }
    }
    makeDraggable(win);
    makeResizable(win);
  }
  if (!restore) {
    saveState();
  }
  return win;
}

function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) {
    win.style.display = 'none';
    if (windowStates[windowId]) {
      windowStates[windowId].isMinimized = true;
      saveState();
    }
    const tab = document.getElementById('tab-' + windowId);
    if (tab) {
      tab.classList.remove('bg-gray-50');
    }
  }
}

function bringToFront(win) {
  if (win.style.display === 'none') {
    win.style.display = 'block';
    if (windowStates[win.id]) {
      windowStates[win.id].isMinimized = false;
      saveState();
    }
  }
  highestZ++;
  win.style.zIndex = highestZ;
  document.querySelectorAll('#window-tabs > div').forEach(tab => tab.classList.remove('bg-gray-50'));
  const activeTab = document.getElementById('tab-' + win.id);
  if (activeTab) {
    activeTab.classList.add('bg-gray-50');
  }
  if (win.querySelector("video, audio")) {
    activeMediaWindow = win.id;
    updateMediaControl();
  }
}

function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (win) win.remove();
  const tab = document.getElementById('tab-' + windowId);
  if (tab) tab.remove();
  if (activeMediaWindow === windowId) {
    activeMediaWindow = null;
    updateMediaControl();
  }
  delete windowStates[windowId];
  for (const key in navWindows) {
    if (navWindows[key] === windowId) { delete navWindows[key]; break; }
  }
  saveState();
}

function makeDraggable(el) {
  const header = el.querySelector('.cursor-move');
  if (!header) return;
  header.addEventListener('mousedown', function (e) {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    function mouseMoveHandler(e) {
      el.style.left = (e.clientX - offsetX) + 'px';
      el.style.top = (e.clientY - offsetY) + 'px';
    }
    function mouseUpHandler() {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      if (windowStates[el.id]) {
        windowStates[el.id].position = { left: el.style.left, top: el.style.top };
        saveState();
      }
    }
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    bringToFront(el);
  });
}

function makeResizable(el) {
  const resizer = document.createElement('div');
  resizer.className = 'sticky bottom-0 left-full w-4 h-4 cursor-se-resize';
  resizer.style.background = 'rgba(0,0,0,0.2)';
  el.appendChild(resizer);
  resizer.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
    const startHeight = parseInt(document.defaultView.getComputedStyle(el).height, 10);
    function doDrag(e) {
      const newWidth = Math.max(startWidth + e.clientX - startX, 350);
      const newHeight = Math.max(startHeight + e.clientY - startY, 200);
      el.style.width = newWidth + 'px';
      el.style.height = newHeight + 'px';
    }
    function stopDrag() {
      document.documentElement.removeEventListener('mousemove', doDrag, false);
      document.documentElement.removeEventListener('mouseup', stopDrag, false);
      windowStates[el.id].dimensions = { type: 'integer', width: parseInt(el.style.width), height: parseInt(el.style.height) };
      saveState();
    }
    document.documentElement.addEventListener('mousemove', doDrag, false);
    document.documentElement.addEventListener('mouseup', stopDrag, false);
  });
}

function toggleFullScreen(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  let state = windowStates[winId];
  if (!state.fullScreen) {
    state.originalDimensions = state.dimensions;
    state.originalPosition = state.position;
    win.style.left = "0px";
    win.style.top = "0px";
    win.style.width = window.innerWidth + "px";
    win.style.height = (window.innerHeight - 40) + "px";
    state.dimensions = { type: 'default' };
    state.fullScreen = true;
  } else {
    if (state.originalDimensions && state.originalPosition) {
      win.style.left = state.originalPosition.left;
      win.style.top = state.originalPosition.top;
      win.style.width = state.originalDimensions.width + "px";
      win.style.height = state.originalDimensions.height + "px";
      state.dimensions = state.originalDimensions;
    } else {
      win.style.left = "15%";
      win.style.top = "15%";
      win.style.width = "70vw";
      win.style.height = "70vh";
      state.dimensions = { type: 'integer', width: window.innerWidth * 0.7, height: window.innerHeight * 0.7 };
    }
    state.fullScreen = false;
    makeDraggable(win);
    makeResizable(win);
  }
  saveState();
}

function openWindow(id, content = '', dimensions = { type: 'default' }, windowType = 'default', parentWin = null) {
  return createWindow(id, content === '' ? 'Content for ' + id : content, false, null, false, false, dimensions, windowType, parentWin);
}

function showDialogBox(message, dialogType) {
  const uniqueWindowId = 'dialogWindow-' + Date.now();
  const dialogElement = `
    <h2 class="text-3xl">${message}</h2>
    <button id="${uniqueWindowId}-button" onclick="setTimeout(function(){toggleButtonActiveState('${uniqueWindowId}-button', 'OK')}, 1000);toggleButtonActiveState('${uniqueWindowId}-button', 'Cool!');" 
      class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2">
      <span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">OK</span>
    </button>
  `;

  let title = '⚠️ Information';
  if (dialogType === 'confirmation') {
    title = '✅ Success';
  }
  if (dialogType === 'error') {
    title = '⚠️ Error';
    document.getElementById('error-popup-audio').play();
  }
  createWindow(title, dialogElement, false, null, false, false, { type: 'integer', width: 300, height: 100 }, "Default");
  return;
}
