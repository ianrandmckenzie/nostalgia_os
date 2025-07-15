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
  const mediaContainer = document.createElement('div');
  mediaContainer.id = 'media-container';
  mediaContainer.className = 'w-full h-0 bg-black mb-2 flex items-center justify-center';
  mediaContainer.innerHTML = '<audio id="audio-player" class="w-full"></audio>';
  content.appendChild(mediaContainer);

  const controls = document.createElement('div');
  controls.className = 'bg-gray-300 border-2 border-gray-400 p-3 mb-2';

  const trackInfo = document.createElement('div');
  trackInfo.className = 'text-center mb-2';
  trackInfo.innerHTML = `
    <div id="current-track-name" class="font-bold text-sm">Media Player</div>
    <div id="current-time" class="text-xs text-gray-600">Ready to play</div>
  `;

  const progressContainer = document.createElement('div');
  progressContainer.className = 'mb-3';
  progressContainer.innerHTML = `
    <div id="progress-container" class="w-full h-2 bg-gray-400 border border-gray-500 cursor-pointer">
      <div id="progress-bar" class="h-full bg-blue-500" style="width: 0%"></div>
    </div>
  `;

  const buttonRow = document.createElement('div');
  buttonRow.className = 'flex justify-center space-x-2 mb-2';
  buttonRow.innerHTML = `
    <button id="prev-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">⏮</button>
    <button id="play-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">▶</button>
    <button id="stop-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">⏹</button>
    <button id="next-btn" class="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:bg-gray-200 text-xs">⏭</button>
  `;

  const volumeRow = document.createElement('div');
  volumeRow.className = 'flex items-center justify-center space-x-2';
  volumeRow.innerHTML = `
    <span class="text-xs">🔊</span>
    <input type="range" id="volume-control" min="0" max="1" step="0.01" value="0.5" class="w-20">
    <span class="text-xs" id="volume-display">50%</span>
  `;

  controls.appendChild(trackInfo);
  controls.appendChild(progressContainer);
  controls.appendChild(buttonRow);
  controls.appendChild(volumeRow);

  const playlistArea = document.createElement('div');
  playlistArea.className = 'flex-1 bg-white border-2 border-gray-400 p-2 overflow-y-auto';
  playlistArea.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <div class="text-xs font-bold">Playlist:</div>
      <button id="add-song-btn" onclick="setTimeout(function(){toggleButtonActiveState('add-song-btn', 'Add Song')}, 1000);toggleButtonActiveState('add-song-btn', 'Adding song...');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Add Song</span></button>
      <input type="file" id="song-file-input" class="hidden" accept="audio/*">
    </div>
    <div id="playlist-container" class="space-y-1">
      <div class="text-xs text-gray-500">Loading playlist...</div>
    </div>
  `;

  content.appendChild(controls);
  content.appendChild(playlistArea);

  // --- Media Player Logic ---
  const audio = content.querySelector('#audio-player');
  let currentTrackIndex = -1;
  let playlist = [];

  const playBtn = content.querySelector('#play-btn');
  const nextBtn = content.querySelector('#next-btn');
  const prevBtn = content.querySelector('#prev-btn');
  const stopBtn = content.querySelector('#stop-btn');
  const volumeControl = content.querySelector('#volume-control');
  const progressBar = content.querySelector('#progress-bar');
  const progress = content.querySelector('#progress-container');
  const addSongBtn = content.querySelector('#add-song-btn');
  const songFileInput = content.querySelector('#song-file-input');

  // --- IndexedDB Logic ---
  let db;
  const dbName = "media_player_db";
  const storeName = "songs";

  function initDB() {
    const request = indexedDB.open(dbName, 1);

    request.onerror = (event) => {
      console.error("Database error: ", event.target.errorCode);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      const objectStore = db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      objectStore.createIndex("name", "name", { unique: false });
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      loadPlaylist();
    };
  }

  function addSongToDB(songFile) {
    const transaction = db.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);
    const song = { name: songFile.name, file: songFile };
    const request = objectStore.add(song);

    request.onsuccess = () => {
      // Also add the song to the file system Music folder
      const fileExtension = songFile.name.split('.').pop().toLowerCase();
      addFileToFileSystem(songFile.name, '', 'C://Music', fileExtension, songFile);
      loadPlaylist();
    };

    request.onerror = (event) => {
      console.error("Error adding song: ", event.target.error);
    };
  }

  function loadPlaylist() {
    const transaction = db.transaction([storeName], "readonly");
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      const dbSongs = request.result;
      // Start with the default track
      playlist = [];

      // Add songs from IndexedDB
      dbSongs.forEach(song => {
        playlist.push({ name: song.name, file: song.file, id: song.id });
      });

      // Also load songs from the Music folder in the file system
      try {
        const fs = getFileSystemState();
        const musicFolder = fs.folders['C://'].Music;
        if (musicFolder && musicFolder.contents) {
          Object.values(musicFolder.contents).forEach(file => {
            if (file.content_type && ['mp3', 'wav', 'audio'].includes(file.content_type)) {
              // Check if this song is already in the playlist (avoid duplicates)
              const existsInPlaylist = playlist.some(track => track.name === file.name);
              if (!existsInPlaylist) {
                // For file system songs, we need to handle them differently
                playlist.push({
                  name: file.name,
                  file: file.file,
                  id: file.id,
                  isFileSystem: true,
                  path: file.file ? null : `media/${file.name}` // fallback for default songs
                });
              }
            }
          });
        }
      } catch (error) {
        console.log('Could not load songs from file system:', error);
      }

      renderPlaylist();
      if (playlist.length > 0) {
        loadTrack(0);
      }
    };
  }

  function renderPlaylist() {
    const container = content.querySelector('#playlist-container');
    container.innerHTML = '';
    playlist.forEach((track, index) => {
      const trackEl = document.createElement('div');
      trackEl.className = 'text-xs cursor-pointer hover:bg-gray-100 p-1 rounded';
      trackEl.textContent = track.name;
      trackEl.dataset.index = index;
      trackEl.addEventListener('click', () => {
        loadTrack(index);
        safePlay(); // Use safePlay to prevent errors
      });
      container.appendChild(trackEl);
    });
  }

  function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    currentTrackIndex = index;
    const track = playlist[index];

    if (track.isDefault) {
      audio.src = track.path;
    } else if (track.isFileSystem && track.path) {
      // For file system songs that reference media folder
      audio.src = track.path;
    } else if (track.file) {
      // For uploaded files (both IndexedDB and file system with file objects)
      audio.src = URL.createObjectURL(track.file);
    } else {
      console.error('Unable to load track:', track);
      return;
    }

    content.querySelector('#current-track-name').textContent = track.name;
    updatePlaylistUI();
  }

  function updatePlaylistUI() {
    const tracks = content.querySelectorAll('#playlist-container > div');
    tracks.forEach((trackEl, index) => {
      if (index === currentTrackIndex) {
        trackEl.classList.add('bg-blue-200');
      } else {
        trackEl.classList.remove('bg-blue-200');
      }
    });
  }

  // SNIPPET START: This function prevents the AbortError
  function safePlay() {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name === 'AbortError') {
          // This error is expected if a new load request interrupts the play request.
          // We can safely ignore it.
          // console.log('Play request was aborted by a new load. Safe to ignore.');
        } else {
          // Log other errors.
          console.error("Playback failed:", error);
        }
      });
    }
  }
  // SNIPPET END

  function togglePlay() {
    if (audio.paused) {
      safePlay(); // Use safePlay to prevent errors
    } else {
      audio.pause();
    }
  }

  function stopTrack() {
    audio.pause();
    audio.currentTime = 0;
  }

  function nextTrack() {
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(newIndex);
    safePlay(); // Use safePlay to prevent errors
  }

  function prevTrack() {
    const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(newIndex);
    safePlay(); // Use safePlay to prevent errors
  }

  function updateVolume() {
    audio.volume = volumeControl.value;
    content.querySelector('#volume-display').textContent = `${Math.round(volumeControl.value * 100)}%`;
  }

  function updateProgress() {
    if (audio.duration) {
      const progressPercent = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${progressPercent}%`;

      const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
      };

      content.querySelector('#current-time').textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
  }

  function seek(e) {
    if (!audio.duration) return;
    const clickPosition = e.offsetX;
    const containerWidth = progress.offsetWidth;
    audio.currentTime = (clickPosition / containerWidth) * audio.duration;
  }

  // --- Event Listeners ---
  playBtn.addEventListener('click', togglePlay);
  audio.addEventListener('play', () => playBtn.textContent = '⏸');
  audio.addEventListener('pause', () => playBtn.textContent = '▶');
  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('volumechange', () => {
    volumeControl.value = audio.volume;
    updateVolume();
  });

  stopBtn.addEventListener('click', stopTrack);
  nextBtn.addEventListener('click', nextTrack);
  prevBtn.addEventListener('click', prevTrack);
  volumeControl.addEventListener('input', updateVolume);
  progress.addEventListener('click', seek);

  addSongBtn.addEventListener('click', () => songFileInput.click());
  songFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      addSongToDB(file);
    }
  });

  // --- Initial Load ---
  initDB();
  updateVolume();
}
