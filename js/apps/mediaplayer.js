function launchMediaPlayer() {
  // Check if media player window already exists
  const existingWindow = document.getElementById('mediaplayer');
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }

  // Create the media player window
  const win = createWindow(
    'Media Player',
    '',
    false,
    'mediaplayer',
    false,
    false,
    { type: 'integer', width: 500, height: 400 },
    'App',
    null,
    'gray'
  );

  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-gray-200 h-full flex flex-col';

  // --- UI Elements ---
  // Controls container
  const controls = document.createElement('div');
  controls.className = 'bg-gray-300 border-2 border-gray-400 p-3 mb-2';

  // Track info
  const trackInfo = document.createElement('div');
  trackInfo.className = 'text-center mb-2';
  trackInfo.innerHTML = `
    <div id="current-track-name" class="font-bold text-sm">Media Player</div>
    <div id="current-time" class="text-xs text-gray-600">Ready to play</div>
  `;

  // Progress bar
  const progressContainer = document.createElement('div');
  progressContainer.className = 'mb-3';
  progressContainer.innerHTML = `
    <div id="progress-container" class="w-full h-2 bg-gray-400 border border-gray-500">
      <div id="progress-bar" class="h-full bg-blue-500" style="width: 0%"></div>
    </div>
  `;

  // Control buttons
  const buttonRow = document.createElement('div');
  buttonRow.className = 'flex justify-center space-x-2 mb-2';
  buttonRow.innerHTML = `
    <button id="prev-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">⏮</button>
    <button id="play-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">▶</button>
    <button id="stop-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">⏹</button>
    <button id="next-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">⏭</button>
  `;

  // Volume control
  const volumeRow = document.createElement('div');
  volumeRow.className = 'flex items-center justify-center space-x-2';
  volumeRow.innerHTML = `
    <span class="text-xs">🔊</span>
    <input type="range" id="volume-control" min="0" max="100" value="50" class="w-20">
    <span class="text-xs" id="volume-display">50%</span>
  `;

  controls.appendChild(trackInfo);
  controls.appendChild(progressContainer);
  controls.appendChild(buttonRow);
  controls.appendChild(volumeRow);

  // Playlist area
  const playlistArea = document.createElement('div');
  playlistArea.className = 'flex-1 bg-white border-2 border-gray-400 p-2 overflow-y-auto';
  playlistArea.innerHTML = `
    <div class="text-xs font-bold mb-2">Playlist:</div>
    <div id="playlist-container" class="space-y-1">
      <div class="text-xs text-gray-500">Media Player is ready!</div>
    </div>
  `;

  // Assemble UI
  content.appendChild(controls);
  content.appendChild(playlistArea);

  // --- Event listeners and state setup would go here ---
  // (Add IndexedDB, audio logic, playlist management, etc. as next step)
}
