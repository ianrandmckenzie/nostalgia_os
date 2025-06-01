function makeIconDraggable(icon) {
  icon.addEventListener('mousedown', function (e) {
    e.preventDefault();
    const rect = icon.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    function mouseMoveHandler(e) {
      icon.style.left = (e.clientX - offsetX) + 'px';
      icon.style.top = (e.clientY - offsetY) + 'px';
      icon.style.position = 'absolute';
    }
    function mouseUpHandler() {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      desktopIconsState[icon.id] = { left: icon.style.left, top: icon.style.top };
      saveState();
    }
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  });
  icon.addEventListener('click', function () {
    document.querySelectorAll('.draggable-icon').forEach(i => i.classList.remove('bg-gray-50'));
    icon.classList.add('bg-gray-50');
  });
}

function updateDesktopSettings() {
  const color = document.getElementById('bgColorInput').value;
  const image = document.getElementById('bgImageInput').value.trim();
  const clockSec = document.getElementById('clockSecondsInput').checked;
  desktopSettings.bgColor = color;
  desktopSettings.bgImage = image;
  desktopSettings.clockSeconds = clockSec;
  applyDesktopSettings();
  saveState();
}

function renderDesktopIcons() {
  const desktopIconsContainer = document.getElementById('desktop-icons');
  desktopIconsContainer.innerHTML = "";
  let fs = getFileSystemState();
  // Retrieve the Desktop folder from the "C://" drive.
  let desktopFolder = fs.folders['C://'] ? fs.folders['C://']['Desktop'] : null;
  if (!desktopFolder) return;
  // Iterate over the items in the Desktop folder (now stored as an object).
  Object.values(desktopFolder.contents).forEach(item => {
    const iconElem = document.createElement('div');
    iconElem.id = "icon-" + item.id;
    iconElem.className = 'flex flex-col items-center cursor-pointer m-2 draggable-icon desktop-folder-icon';
    let iconSrc = (item.type === 'folder') ? 'image/folder.svg' : 'image/file.svg';
    if (item.type === 'file' || item.type === 'ugc-file') {
      iconElem.setAttribute('ondblclick', `openFile('${item.id}', event);event.stopPropagation()`);
      iconElem.setAttribute('onmobiledbltap', `openFile('${item.id}', event);event.stopPropagation()`);
    }
    else if (item.type === 'app') {
      iconElem.setAttribute('ondblclick', `openApp('${item.id}')`);
      iconElem.setAttribute('onmobiledbltap', `openApp('${item.id}')`);
      iconElem.setAttribute('data-is-vendor-application', true);
      iconSrc = item.icon;
    } else if (item.type === 'folder') {
      iconElem.setAttribute('ondblclick', `openExplorer('${item.id}')`);
      iconElem.setAttribute('onmobiledbltap', `openExplorer('${item.id}')`);
    } else if (item.type == 'shortcut') {
      iconElem.setAttribute('ondblclick', `openShortcut(this)`);
      iconElem.setAttribute('onmobiledbltap', `openShortcut(this)`);
      iconElem.setAttribute('data-url', item.url);
      iconSrc = item.icon_url;
    }
    iconElem.setAttribute('data-item-id', item.id);
    iconElem.setAttribute('data-current-path', 'C://Desktop');
    iconElem.innerHTML = `<img src="${iconSrc}" alt="${item.name}" class="mb-1 p-1 h-16 w-16 desktop-folder-icon" />
      <span class="text-xs text-black max-w-20 text-center desktop-folder-icon">${item.name}</span>`;
    desktopIconsContainer.appendChild(iconElem);
    makeIconDraggable(iconElem);
  });
}

function applyDesktopSettings() {
  const desktop = document.getElementById('desktop');
  if (desktopSettings.bgColor) {
    desktop.style.backgroundColor = desktopSettings.bgColor;
  }
  if (desktopSettings.bgImage) {
    desktop.style.backgroundImage = `url(${desktopSettings.bgImage})`;
    desktop.style.backgroundSize = 'cover';
    desktop.style.backgroundRepeat = 'no-repeat';
  } else {
    desktop.style.backgroundImage = 'none';
  }
}

function getSettingsContent() {
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-sm">Desktop Background Color:</label>
        <input id="bgColorInput" type="color" value="${desktopSettings.bgColor}" class="border" />
      </div>
      <div>
        <label class="block text-sm">Background Image URL:</label>
        <input id="bgImageInput" type="text" placeholder="Enter image URL" value="${desktopSettings.bgImage}" class="border w-full" />
      </div>
      <div>
        <label class="block text-sm">Show Seconds on Clock:</label>
        <input id="clockSecondsInput" type="checkbox" ${desktopSettings.clockSeconds ? "checked" : ""} />
      </div>
      <button id="settings-apply-button" onclick="setTimeout(function(){toggleButtonActiveState('settings-apply-button', 'Apply')}, 1000);toggleButtonActiveState('settings-apply-button', 'Applied!');updateDesktopSettings();createWindow('Settings Applied', 'Your settings have successfully been saved!', false, 'settings-saved', false, false, { type: 'integer', height: 300, width: 200 }, 'default');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Apply</span></button>
    </div>
  `;
}

renderDesktopIcons();


// Function to detect double tap on mobile
function detectDoubleTap(element) {
  let lastTouchTime = 0;

  element.addEventListener("pointerdown", function (event) {
    let currentTime = new Date().getTime();
    let timeDiff = currentTime - lastTouchTime;

    if (timeDiff < 300 && timeDiff > 0) {
      // Dispatch a custom "mobiledbltap" event
      let customEvent = new Event("mobiledbltap");
      element.dispatchEvent(customEvent);
    }

    lastTouchTime = currentTime;
  });
}

// Add support for the custom "mobiledbltap" event on all elements
document.querySelectorAll("[onmobiledbltap]").forEach(element => {
  detectDoubleTap(element);

  // Attach the inline attribute function dynamically
  element.addEventListener("mobiledbltap", function () {
    let funcCall = element.getAttribute("onmobiledbltap");
      if (funcCall) {
        try {
          new Function(funcCall)();
        } catch (error) {
          console.error(`Error executing: ${funcCall}`, error);
        }
      }
  });
});
