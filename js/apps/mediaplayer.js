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

  // Initialize the media player UI
  initializeMediaPlayerUI(win).catch(console.error);
}

// Separate function to initialize the Media Player UI (for restoration)
async function initializeMediaPlayerUI(win) {
  console.log('Initializing Media Player UI, window:', win);

  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-gray-200 h-full flex flex-col';

  // Clear any existing content
  content.innerHTML = '';

  // Try to load saved media player state
  let playerState = await loadMediaPlayerState();
  console.log('Loaded media player state:', playerState);

  // If no saved state, create default state
  if (!playerState) {
    playerState = {
      currentTrackIndex: -1,
      currentTime: 0,
      volume: 0.5,
      isPlaying: false,
      playlist: []
    };
  } else {
    // Validate loaded state to prevent non-finite values
    if (!isFinite(playerState.volume) || playerState.volume < 0 || playerState.volume > 1) {
      playerState.volume = 0.5; // Reset to default if invalid
    }
    if (!isFinite(playerState.currentTime) || playerState.currentTime < 0) {
      playerState.currentTime = 0; // Reset to default if invalid
    }
    if (!Number.isInteger(playerState.currentTrackIndex)) {
      playerState.currentTrackIndex = -1; // Reset to default if invalid
    }
    if (!Array.isArray(playerState.playlist)) {
      playerState.playlist = []; // Reset to default if invalid
    }
  }

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

  // Use player state instead of individual variables
  let currentTrackIndex = playerState.currentTrackIndex;
  let playlist = playerState.playlist;

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

    request.onsuccess = async () => {
      console.log('Song added to IndexedDB:', songFile.name);
      // Also add the song to the file system Music folder
      const fileExtension = songFile.name.split('.').pop().toLowerCase();
      try {
        await addFileToFileSystem(songFile.name, '', 'C://Music', fileExtension, songFile);
        console.log('Song added to file system C://Music:', songFile.name);
      } catch (error) {
        console.error('Failed to add song to file system:', error);
      }
      // Reload the playlist to include the new song
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
      console.log('Loading playlist - IndexedDB songs:', dbSongs.length);

      // Start with an empty playlist
      playlist = [];

      // Add songs from IndexedDB that are not already in file system
      dbSongs.forEach(song => {
        playlist.push({ name: song.name, file: song.file, id: song.id, source: 'indexeddb' });
      });

      // Load songs from the Music folder in the file system
      try {
        const fs = getFileSystemStateSync();
        console.log('🎵 MEDIAPLAYER: File system state:', fs);
        const musicFolder = fs.folders['C://Music'];
        console.log('🎵 MEDIAPLAYER: Music folder contents:', musicFolder);

        if (musicFolder) {
          // Get all files from the Music folder, excluding the 'contents' object
          const musicFiles = Object.entries(musicFolder)
            .filter(([key, value]) => key !== 'contents' && value && typeof value === 'object' && value.type)
            .map(([key, value]) => value);

          console.log('🎵 MEDIAPLAYER: Music files found (excluding contents):', musicFiles);
          musicFiles.forEach(file => {
            console.log('🎵 MEDIAPLAYER: Checking file:', file);
            if (file.content_type && ['mp3', 'wav', 'audio'].includes(file.content_type)) {
              // Check if this song is already in the playlist (avoid duplicates)
              const existsInPlaylist = playlist.some(track => track.name === file.name);
              console.log('🎵 MEDIAPLAYER: File', file.name, 'exists in playlist?', existsInPlaylist);
              if (!existsInPlaylist) {
                console.log('🎵 MEDIAPLAYER: Adding file system song to playlist:', file.name);
                // For file system songs, we need to handle them differently
                const playlistEntry = {
                  name: file.name,
                  file: file.file,
                  id: file.id,
                  isFileSystem: true,
                  source: 'filesystem'
                };

                // Determine the correct path/source for the song
                if (file.isDefault && file.path) {
                  // Default songs that reference static files
                  playlistEntry.path = file.path;
                  playlistEntry.isDefault = true;
                } else if (file.file) {
                  // Songs with actual file objects
                  playlistEntry.file = file.file;
                } else if (file.dataURL) {
                  // Songs with stored data URLs
                  playlistEntry.dataURL = file.dataURL;
                } else {
                  // Fallback for songs that might reference media folder
                  playlistEntry.path = `media/${file.name}`;
                }

                playlist.push(playlistEntry);
              } else {
                console.log('Song already in playlist, skipping:', file.name);
              }
            }
          });
        } else {
          console.log('Music folder not found in file system');
        }
      } catch (error) {
        console.error('Could not load songs from file system:', error);
      }

      // If no default song was found in the file system, add the fallback default song
      const hasDefaultSong = playlist.some(track => track.name === 'too_many_screws_final.mp3');
      if (!hasDefaultSong) {
        console.log('No default song found in file system, adding fallback');
        playlist.unshift({
          name: 'too_many_screws_final.mp3',
          path: 'media/too_many_screws_final.mp3',
          isDefault: true,
          id: 'fallback-default-song',
          source: 'fallback'
        });
      }

      console.log('Final playlist:', playlist);
      renderPlaylist();

      if (playlist.length > 0) {
        // Restore saved state if available
        if (playerState.currentTrackIndex >= 0 && playerState.currentTrackIndex < playlist.length) {
          loadTrack(playerState.currentTrackIndex);
          // Restore current time
          audio.addEventListener('loadedmetadata', () => {
            audio.currentTime = playerState.currentTime || 0;
          }, { once: true });
        } else {
          loadTrack(0);
        }
      }
    };
  }

  function renderPlaylist() {
    const container = content.querySelector('#playlist-container');
    container.innerHTML = '';
    console.log('🎵 MEDIAPLAYER: Rendering playlist with', playlist.length, 'tracks');
    playlist.forEach((track, index) => {
      console.log('🎵 MEDIAPLAYER: Rendering track', index, ':', track.name, 'Full track:', track);
      const trackEl = document.createElement('div');
      trackEl.className = 'text-xs cursor-pointer hover:bg-gray-100 p-1 rounded';
      // Validate track name
      const trackName = track.name || track.id || 'Unknown Track';
      if (!track.name) {
        console.warn('🎵 MEDIAPLAYER: Track missing name property, using fallback:', trackName, 'Track:', track);
      }
      trackEl.textContent = trackName;
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
    playerState.currentTrackIndex = currentTrackIndex;
    const track = playlist[index];

    console.log('Loading track:', track);

    if (track.isDefault || (track.path && !track.file && !track.dataURL)) {
      // For default songs or file system songs that reference static files
      audio.src = track.path;
    } else if (track.dataURL) {
      // For songs with stored data URLs (uploaded files)
      audio.src = track.dataURL;
    } else if (track.tempObjectURL) {
      // For files with temporary object URLs (uploaded files being processed)
      audio.src = track.tempObjectURL;
    } else if (track.isFileSystem && track.file) {
      // For file system songs with actual file objects
      audio.src = URL.createObjectURL(track.file);
    } else if (track.file) {
      // For uploaded files from IndexedDB
      audio.src = URL.createObjectURL(track.file);
    } else {
      console.error('Unable to load track - no valid source:', track);
      return;
    }

    content.querySelector('#current-track-name').textContent = track.name || track.id || 'Unknown Track';
    updatePlaylistUI();
    saveMediaPlayerState(playerState).catch(console.error); // Save state after loading track
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
    playerState.volume = audio.volume;
    content.querySelector('#volume-display').textContent = `${Math.round(volumeControl.value * 100)}%`;
    saveMediaPlayerState(playerState).catch(console.error); // Save state after volume change
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

  // Set initial volume from saved state
  // Additional validation before setting audio volume
  const validVolume = isFinite(playerState.volume) && playerState.volume >= 0 && playerState.volume <= 1
    ? playerState.volume
    : 0.5;

  volumeControl.value = validVolume;
  audio.volume = validVolume;
  content.querySelector('#volume-display').textContent = `${Math.round(validVolume * 100)}%`;

  // Update playerState with validated volume
  playerState.volume = validVolume;

  // Audio event listeners for state persistence
  audio.addEventListener('timeupdate', () => {
    playerState.currentTime = audio.currentTime;
    // Save state every 5 seconds to avoid too frequent saves
    if (Math.floor(audio.currentTime) % 5 === 0) {
      saveMediaPlayerState(playerState).catch(console.error);
    }
  });

  audio.addEventListener('play', () => {
    playerState.isPlaying = true;
    saveMediaPlayerState(playerState).catch(console.error);
  });

  audio.addEventListener('pause', () => {
    playerState.isPlaying = false;
    saveMediaPlayerState(playerState).catch(console.error);
  });

  // --- Initial Load ---
  initDB();
  updateVolume();

  // Restore track and position if available
  if (playerState.currentTrackIndex >= 0 && playlist.length > playerState.currentTrackIndex) {
    setTimeout(async () => {
      await restoreMediaPlayerSession();
    }, 500); // Wait for playlist to load
  }

  // Expose a global function to refresh the media player playlist
  // This allows other parts of the system to notify the media player when files are added to C://Music
  window.refreshMediaPlayerPlaylist = function() {
    console.log('Refreshing media player playlist from external trigger');
    if (db) {
      loadPlaylist();
    }
  };

  // Set up a periodic check for changes in C://Music (every 10 seconds when media player is open)
  const musicFolderWatcher = setInterval(() => {
    try {
      const fs = getFileSystemStateSync();
      const musicFolder = fs.folders['C://Music'];
      if (musicFolder) {
        const currentMusicFiles = Object.values(musicFolder)
          .filter(file => file.content_type && ['mp3', 'wav', 'audio'].includes(file.content_type))
          .map(file => file.name);

        const playlistFileNames = playlist
          .filter(track => track.source === 'filesystem' || track.isFileSystem)
          .map(track => track.name);

        // Check if there are new files in C://Music that aren't in the playlist
        const newFiles = currentMusicFiles.filter(fileName => !playlistFileNames.includes(fileName));

        if (newFiles.length > 0) {
          console.log('Detected new music files in C://Music:', newFiles);
          loadPlaylist(); // Reload the playlist to include new files
        }
      }
    } catch (error) {
      console.log('Error checking for music folder changes:', error);
    }
  }, 10000); // Check every 10 seconds

  // Clean up the watcher when the media player window is closed
  const mediaPlayerWindow = win;
  const originalRemove = mediaPlayerWindow.remove;
  mediaPlayerWindow.remove = function() {
    console.log('Media player closing, cleaning up music folder watcher');
    clearInterval(musicFolderWatcher);
    if (window.refreshMediaPlayerPlaylist === window.refreshMediaPlayerPlaylist) {
      delete window.refreshMediaPlayerPlaylist;
    }
    return originalRemove.call(this);
  };
}

// Restore the media player session (track, position, etc.)
async function restoreMediaPlayerSession() {
  const playerState = await loadMediaPlayerState();
  if (!playerState || playerState.currentTrackIndex < 0) return;

  console.log('Restoring media player session:', playerState);

  // Load the track if we have a valid index
  if (playlist.length > playerState.currentTrackIndex) {
    loadTrack(playerState.currentTrackIndex);

    // Restore position when track is loaded
    audio.addEventListener('loadedmetadata', function restorePosition() {
      if (playerState.currentTime > 0) {
        audio.currentTime = playerState.currentTime;
        console.log('Restored playback position to:', playerState.currentTime);
      }

      // Resume playback if it was playing
      if (playerState.isPlaying) {
        safePlay();
      }

      // Remove this listener as it's only needed once
      audio.removeEventListener('loadedmetadata', restorePosition);
    });
  }
}

// Save media player state to IndexedDB
async function saveMediaPlayerState(playerState) {
  try {
    await storage.setItem('mediaplayer_state', playerState);
  } catch (error) {
    console.warn('Failed to save Media Player state:', error);
    // Fallback to sync method if async fails
    try {
      storage.setItemSync('mediaplayer_state', playerState);
    } catch (fallbackError) {
      console.error('Failed to save Media Player state with fallback:', fallbackError);
    }
  }
}

// Load media player state from IndexedDB
async function loadMediaPlayerState() {
  try {
    const savedState = await storage.getItem('mediaplayer_state');
    if (savedState) {
      return savedState;
    }
  } catch (error) {
    console.warn('Failed to load Media Player state:', error);
    // Fallback to sync method if async fails
    try {
      const savedState = storage.getItemSync('mediaplayer_state');
      if (savedState) {
        return savedState;
      }
    } catch (fallbackError) {
      console.warn('Failed to load Media Player state with fallback:', fallbackError);
    }
  }
  return null;
}

// Clear saved media player state
async function clearMediaPlayerState() {
  try {
    await storage.removeItem('mediaplayer_state');
  } catch (error) {
    console.warn('Failed to clear Media Player state:', error);
    // Fallback to sync method if async fails
    try {
      storage.removeItemSync('mediaplayer_state');
    } catch (fallbackError) {
      console.error('Failed to clear Media Player state with fallback:', fallbackError);
    }
  }
}
