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

  // Get the content area
  const content = win.querySelector('.p-2');
  content.className = 'p-2 bg-gray-200 h-full flex';

  // Clear any existing content
  content.innerHTML = '';

  // Try to load saved media player state
  let playerState = await loadMediaPlayerState();

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

  // Create left column for playlist
  const leftColumn = document.createElement('div');
  leftColumn.className = 'w-1/2 bg-white border-2 border-gray-400 mr-2 flex flex-col';
  leftColumn.innerHTML = `
    <div class="bg-gray-300 border-b-2 border-gray-400 p-2 flex justify-between items-center">
      <div class="text-xs font-bold">Media Playlist:</div>
      <button id="add-song-btn" onclick="setTimeout(function(){toggleButtonActiveState('add-song-btn', 'Add Media')}, 1000);toggleButtonActiveState('add-song-btn', 'Adding media...');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1 px-2 text-xs">Add</span></button>
      <input type="file" id="song-file-input" class="hidden" accept="audio/*,video/*">
    </div>
    <div id="playlist-container" class="flex-1 p-2 overflow-y-auto space-y-1">
      <div class="text-xs text-gray-500">Loading playlist...</div>
    </div>
  `;

  // Create right column for media player and controls
  const rightColumn = document.createElement('div');
  rightColumn.className = 'w-1/2 flex flex-col';

  // --- UI Elements ---
  const mediaContainer = document.createElement('div');
  mediaContainer.id = 'media-container';
  mediaContainer.className = 'w-full bg-black mb-2 flex items-center justify-center min-h-32';
  mediaContainer.innerHTML = `
    <audio id="audio-player" class="w-full hidden"></audio>
    <video id="video-player" class="w-full max-h-48 hidden" controls></video>
    <div id="audio-placeholder" class="text-white text-2xl p-4 flex items-center justify-center" style="display: none;">🎵 🎶 🎵</div>
    <div id="media-placeholder" class="text-white text-sm p-4">No media selected</div>
  `;
  rightColumn.appendChild(mediaContainer);

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
  rightColumn.appendChild(controls);

  // Add both columns to the main content
  content.appendChild(leftColumn);
  content.appendChild(rightColumn);

  // --- Media Player Logic ---
  const audio = content.querySelector('#audio-player');
  const video = content.querySelector('#video-player');

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
      loadPlaylist().catch(console.error);
    };
  }

  function addSongToDB(songFile) {

    // Add the song directly to the file system Media folder (no IndexedDB)
    const fileExtension = songFile.name.split('.').pop().toLowerCase();

    addFileToFileSystem(songFile.name, '', 'C://Media', fileExtension, songFile)
      .then((result) => {
        if (result) {
          // Reload the playlist to include the new song
          loadPlaylist().catch(console.error);
        } else {
          console.error('🎵 MEDIAPLAYER: Failed to add song to file system');
        }
      })
      .catch((error) => {
        console.error('🎵 MEDIAPLAYER: Error adding song to file system:', error);
      });
  }

    async function loadPlaylist() {

    // Start with an empty playlist
    playlist = [];

    // Load songs EXCLUSIVELY from the Media folder in the file system
    try {
      const fs = getFileSystemStateSync();
      const musicFolder = fs.folders['C://Media'];

      if (musicFolder) {
        // Get all files from the Media folder, excluding the 'contents' object
        const musicFiles = Object.entries(musicFolder)
          .filter(([key, value]) => key !== 'contents' && value && typeof value === 'object' && value.type)
          .map(([key, value]) => value);


        // Process files with async operations
        const playlistPromises = musicFiles.map(async file => {
          if (file.content_type && ['mp3', 'wav', 'audio', 'mp4', 'webm', 'avi', 'mov'].includes(file.content_type)) {
            const isVideo = ['mp4', 'webm', 'avi', 'mov'].includes(file.content_type);

            // For file system media, we need to handle them differently
            const playlistEntry = {
              name: file.name,
              file: file.file,
              id: file.id,
              isFileSystem: true,
              source: 'filesystem',
              isVideo: isVideo,
              contentType: file.content_type,
              type: file.file && file.file.type ? file.file.type : (isVideo ? 'video/' + file.content_type : 'audio/' + file.content_type)
            };

            // Check if we need to load data from IndexedDB
            // This covers files with storageLocation='indexeddb' OR files that appear to be uploaded but lack dataURL
            if ((file.storageLocation === 'indexeddb' && !file.dataURL) ||
                (!file.dataURL && !file.file && !file.path && file.id && file.id.startsWith('file-'))) {
              try {
                const storedDataURL = await storage.getItem(`file_data_${file.id}`);
                if (storedDataURL) {
                  // Update the file system entry with the loaded dataURL
                  file.dataURL = storedDataURL;
                  playlistEntry.dataURL = storedDataURL;

                  // Update the file system state to include the loaded dataURL
                  const fs = getFileSystemStateSync();
                  if (fs.folders['C://Media'] && fs.folders['C://Media'][file.id]) {
                    fs.folders['C://Media'][file.id].dataURL = storedDataURL;
                    // Clear the tempObjectURL since we have the persistent dataURL
                    fs.folders['C://Media'][file.id].tempObjectURL = null;
                    setFileSystemState(fs);
                  }
                } else {
                  console.warn('🎵 MEDIAPLAYER: No stored data found in IndexedDB for:', file.name, 'File ID:', file.id);
                  // Try alternative storage key format
                  const alternativeKey = `file_data_${file.name}`;
                  const alternativeData = await storage.getItem(alternativeKey);
                  if (alternativeData) {
                    file.dataURL = alternativeData;
                    playlistEntry.dataURL = alternativeData;
                  }
                }
              } catch (error) {
                console.error('🎵 MEDIAPLAYER: Failed to load data from IndexedDB for:', file.name, error);
              }
            }

            // Determine the correct path/source for the song (prioritize persistent storage)
            if (file.isDefault && file.path) {
              // Default songs that reference static files
              playlistEntry.path = file.path;
              playlistEntry.isDefault = true;
            } else if (file.dataURL || playlistEntry.dataURL) {
              // Songs with stored data URLs (persistent after reload)
              playlistEntry.dataURL = file.dataURL || playlistEntry.dataURL;
            } else if (file.file) {
              // Songs with actual file objects (only valid during session)
              playlistEntry.file = file.file;
            } else if (file.tempObjectURL) {
              // Songs with temporary object URLs (uploaded files being processed)
              playlistEntry.tempObjectURL = file.tempObjectURL;
            } else {
              // Fallback for songs that might reference media folder
              playlistEntry.path = `media/${file.name}`;
            }

            return playlistEntry;
          }
          return null;
        });

        // Wait for all files to be processed
        const playlistEntries = await Promise.all(playlistPromises);
        playlist = playlistEntries.filter(entry => entry !== null);
      } else {
      }
    } catch (error) {
      console.error('Could not load songs from file system:', error);
    }

    // If no default song was found in the file system, add the fallback default song
    const hasDefaultSong = playlist.some(track => track.name === 'too_many_screws_final.mp3');
    if (!hasDefaultSong) {
      playlist.unshift({
        name: 'too_many_screws_final.mp3',
        path: 'media/too_many_screws_final.mp3',
        isDefault: true,
        id: 'fallback-default-song',
        source: 'fallback'
      });
    }

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
  }

  function renderPlaylist() {
    const container = content.querySelector('#playlist-container');
    container.innerHTML = '';
    playlist.forEach((track, index) => {
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

    // Determine if this is a video or audio file
    // Check multiple possible properties for video detection
    const isVideo = (track.type && track.type.startsWith('video/')) ||
                   (track.contentType && ['mp4', 'webm', 'avi', 'mov'].includes(track.contentType)) ||
                   (track.isVideo === true) ||
                   (track.file && track.file.type && track.file.type.startsWith('video/'));

    // Hide all media elements initially
    audio.style.display = 'none';
    video.style.display = 'none';

    // Hide all placeholders initially
    const placeholder = content.querySelector('#media-placeholder');
    const audioPlaceholder = content.querySelector('#audio-placeholder');
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    if (audioPlaceholder) {
      audioPlaceholder.style.display = 'none';
    }

    // Select the appropriate player and show the right element
    const activePlayer = isVideo ? video : audio;
    const inactivePlayer = isVideo ? audio : video;

    if (isVideo) {
      // Show video player for video files
      activePlayer.style.display = 'block';
    } else {
      // Show audio placeholder for audio files
      if (audioPlaceholder) {
        audioPlaceholder.style.display = 'flex';
      }
    }


    // Pause the inactive player
    inactivePlayer.pause();
    inactivePlayer.currentTime = 0;

    if (track.isDefault || (track.path && !track.file && !track.dataURL)) {
      // For default songs or file system songs that reference static files
      activePlayer.src = track.path;
    } else if (track.dataURL) {
      // For songs with stored data URLs (uploaded files)
      activePlayer.src = track.dataURL;
    } else if (track.tempObjectURL) {
      // For files with temporary object URLs (uploaded files being processed)
      activePlayer.src = track.tempObjectURL;
    } else if (track.isFileSystem && track.file) {
      // For file system songs with actual file objects
      const objectURL = URL.createObjectURL(track.file);
      activePlayer.src = objectURL;
    } else if (track.file) {
      // For uploaded files from IndexedDB
      const objectURL = URL.createObjectURL(track.file);
      activePlayer.src = objectURL;
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
    const activePlayer = getActivePlayer();
    const playPromise = activePlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name === 'AbortError') {
          // This error is expected if a new load request interrupts the play request.
          // We can safely ignore it.
        } else {
          // Log other errors.
          console.error("Playback failed:", error);
        }
      });
    }
  }
  // SNIPPET END

  // Helper function to get the currently active player
  function getActivePlayer() {
    // If video is visible, return video; otherwise return audio (even if placeholder is shown)
    return video.style.display === 'block' ? video : audio;
  }

  function togglePlay() {
    const activePlayer = getActivePlayer();
    if (activePlayer.paused) {
      safePlay(); // Use safePlay to prevent errors
    } else {
      activePlayer.pause();
    }
  }

  function stopTrack() {
    const activePlayer = getActivePlayer();
    activePlayer.pause();
    activePlayer.currentTime = 0;
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
    const activePlayer = getActivePlayer();
    activePlayer.volume = volumeControl.value;
    // Also update the inactive player for consistency
    const inactivePlayer = activePlayer === audio ? video : audio;
    inactivePlayer.volume = volumeControl.value;

    playerState.volume = activePlayer.volume;
    content.querySelector('#volume-display').textContent = `${Math.round(volumeControl.value * 100)}%`;
    saveMediaPlayerState(playerState).catch(console.error); // Save state after volume change
  }

  function updateProgress() {
    const activePlayer = getActivePlayer();
    if (activePlayer.duration) {
      const progressPercent = (activePlayer.currentTime / activePlayer.duration) * 100;
      progressBar.style.width = `${progressPercent}%`;

      const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
      };

      content.querySelector('#current-time').textContent = `${formatTime(activePlayer.currentTime)} / ${formatTime(activePlayer.duration)}`;
    }
  }

  function seek(e) {
    const activePlayer = getActivePlayer();
    if (!activePlayer.duration) return;
    const clickPosition = e.offsetX;
    const containerWidth = progress.offsetWidth;
    activePlayer.currentTime = (clickPosition / containerWidth) * activePlayer.duration;
  }

  // --- Event Listeners ---
  playBtn.addEventListener('click', togglePlay);

  // Audio event listeners
  audio.addEventListener('play', () => playBtn.textContent = '⏸');
  audio.addEventListener('pause', () => playBtn.textContent = '▶');
  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('volumechange', () => {
    volumeControl.value = audio.volume;
    updateVolume();
  });

  // Video event listeners (same functionality as audio)
  video.addEventListener('play', () => playBtn.textContent = '⏸');
  video.addEventListener('pause', () => playBtn.textContent = '▶');
  video.addEventListener('ended', nextTrack);
  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('volumechange', () => {
    volumeControl.value = video.volume;
    updateVolume();
  });

  // Add error event listeners for debugging
  audio.addEventListener('error', (e) => {
    console.error('🎵 MEDIAPLAYER: Audio error:', e.target.error, 'Source:', audio.src);
  });

  video.addEventListener('error', (e) => {
    console.error('🎵 MEDIAPLAYER: Video error:', e.target.error, 'Source:', video.src);
  });

  // Add loadstart event listeners for debugging
  audio.addEventListener('loadstart', () => {
  });

  video.addEventListener('loadstart', () => {
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
  video.volume = validVolume; // Also set video volume
  content.querySelector('#volume-display').textContent = `${Math.round(validVolume * 100)}%`;

  // Update playerState with validated volume
  playerState.volume = validVolume;

  // Audio event listeners for state persistence
  audio.addEventListener('timeupdate', () => {
    if (audio.style.display === 'block') { // Only track time for active player
      playerState.currentTime = audio.currentTime;
      // Save state every 5 seconds to avoid too frequent saves
      if (Math.floor(audio.currentTime) % 5 === 0) {
        saveMediaPlayerState(playerState).catch(console.error);
      }
    }
  });

  audio.addEventListener('play', () => {
    if (audio.style.display === 'block') { // Only track state for active player
      playerState.isPlaying = true;
      saveMediaPlayerState(playerState).catch(console.error);
    }
  });

  audio.addEventListener('pause', () => {
    if (audio.style.display === 'block') { // Only track state for active player
      playerState.isPlaying = false;
      saveMediaPlayerState(playerState).catch(console.error);
    }
  });

  // Video event listeners for state persistence
  video.addEventListener('timeupdate', () => {
    if (video.style.display === 'block') { // Only track time for active player
      playerState.currentTime = video.currentTime;
      // Save state every 5 seconds to avoid too frequent saves
      if (Math.floor(video.currentTime) % 5 === 0) {
        saveMediaPlayerState(playerState).catch(console.error);
      }
    }
  });

  video.addEventListener('play', () => {
    if (video.style.display === 'block') { // Only track state for active player
      playerState.isPlaying = true;
      saveMediaPlayerState(playerState).catch(console.error);
    }
  });

  video.addEventListener('pause', () => {
    if (video.style.display === 'block') { // Only track state for active player
      playerState.isPlaying = false;
      saveMediaPlayerState(playerState).catch(console.error);
    }
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
  // This allows other parts of the system to notify the media player when files are added to C://Media
  window.refreshMediaPlayerPlaylist = function() {
    if (db) {
      loadPlaylist().catch(console.error);
    }
  };

  // Set up a periodic check for changes in C://Media (every 10 seconds when media player is open)
  const musicFolderWatcher = setInterval(() => {
    try {
      const fs = getFileSystemStateSync();
      const musicFolder = fs.folders['C://Media'];
      if (musicFolder) {
        const currentMediaFiles = Object.values(musicFolder)
          .filter(file => file.content_type && ['mp3', 'wav', 'audio', 'mp4', 'webm', 'avi', 'mov'].includes(file.content_type))
          .map(file => file.name);

        const playlistFileNames = playlist
          .filter(track => track.source === 'filesystem' || track.isFileSystem)
          .map(track => track.name);

        // Check if there are new files in C://Media that aren't in the playlist
        const newFiles = currentMediaFiles.filter(fileName => !playlistFileNames.includes(fileName));

        if (newFiles.length > 0) {
          loadPlaylist().catch(console.error); // Reload the playlist to include new files
        }
      }
    } catch (error) {
    }
  }, 10000); // Check every 10 seconds

  // Clean up the watcher when the media player window is closed
  const mediaPlayerWindow = win;
  const originalRemove = mediaPlayerWindow.remove;
  mediaPlayerWindow.remove = function() {
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


  // Load the track if we have a valid index
  if (playlist.length > playerState.currentTrackIndex) {
    loadTrack(playerState.currentTrackIndex);

    // Helper function to restore position for either player
    function restorePosition() {
      const activePlayer = getActivePlayer();
      if (playerState.currentTime > 0) {
        activePlayer.currentTime = playerState.currentTime;
      }

      // Resume playback if it was playing
      if (playerState.isPlaying) {
        safePlay();
      }
    }

    // Restore position when track is loaded (for both audio and video)
    audio.addEventListener('loadedmetadata', function restoreAudioPosition() {
      if (audio.style.display === 'block') {
        restorePosition();
      }
      audio.removeEventListener('loadedmetadata', restoreAudioPosition);
    });

    video.addEventListener('loadedmetadata', function restoreVideoPosition() {
      if (video.style.display === 'block') {
        restorePosition();
      }
      video.removeEventListener('loadedmetadata', restoreVideoPosition);
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
