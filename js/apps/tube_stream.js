// Import required functions
import { createWindow } from '../gui/window.js';
import { API_BASE_URL, TUBE_STREAMS_PATH } from '../config.js';

let youtubeApiPromise = null;

function loadYoutubeApi() {
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
  return youtubeApiPromise;
}

async function launchTubeStream() {
  const win = createWindow('TubeStream', '<div class="p-2 h-full flex items-center justify-center">Loading...</div>', false, 'tubestream', false, false, { type: 'integer', width: 580, height: 380 }, 'default', null, 'white');

  await initializeTubeStreamUI(win);
}

async function initializeTubeStreamUI(win) {
  if (!win) return;

  const contentDiv = win.querySelector('.p-2');
  if (!contentDiv) return;

  // Check if YouTube is reachable
  const isOnline = await checkYouTubeConnectivity();

  if (!isOnline) {
    contentDiv.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column; text-align: center; padding: 20px; font-family: 'MS Sans Serif', sans-serif;">
      <p>Unable to connect to YouTube.</p>
      <p>You might be offline or there is a network error.</p>
    </div>`;
    return;
  }

  // Fetch playlist data
  let playlistData = [];
  try {
    const response = await fetch(`${API_BASE_URL}${TUBE_STREAMS_PATH}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const json = await response.json();
    playlistData = json.playlists;
  } catch (error) {
    console.warn('Error fetching playlist, using fallback:', error);
    playlistData = myPlaylist.playlists;
  }

  // Filter out invalid items (e.g. empty objects)
  if (Array.isArray(playlistData)) {
      playlistData = playlistData.filter(item => {
          if (!item || typeof item !== 'object' || Object.keys(item).length === 0) return false;
          
          if (item.type === 'single' || item.type === 'livestream') {
              return !!(item.video_id || item.beginning_video_id);
          }
          // Default case (playlist)
          return !!item.playlist_id;
      });
  }

  if (!playlistData || playlistData.length === 0) {
      contentDiv.innerHTML = '<div class="p-4 text-center">No content available.</div>';
      return;
  }

  // Initialize state
  win.tubeStreamState = {
      playlistData: playlistData,
      currentIndex: 0,
      player: null
  };

  // Load YouTube API
  await loadYoutubeApi();

  // Prepare container
  contentDiv.innerHTML = '';
  contentDiv.style.padding = '0';
  contentDiv.style.height = '100%';
  contentDiv.style.overflow = 'hidden';

  loadVideo(win);
}

function loadVideo(win) {
    const state = win.tubeStreamState;
    if (!state || !state.playlistData) return;

    const contentDiv = win.querySelector('.p-2');
    if (!contentDiv) return;

    // Destroy existing player to avoid state issues
    if (state.player) {
        try {
            if (typeof state.player.destroy === 'function') {
                state.player.destroy();
            }
        } catch (e) {
            console.warn("Error destroying player:", e);
        }
        state.player = null;
    }

    // Create fresh container
    contentDiv.innerHTML = '';
    const playerDivId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    state.playerDivId = playerDivId;
    const playerDiv = document.createElement('div');
    playerDiv.id = playerDivId;
    contentDiv.appendChild(playerDiv);

    const data = state.playlistData[state.currentIndex];
    if (!data) {
        console.warn('No data for current index', state.currentIndex);
        return;
    }

    // Construct player vars
    let playerVars = {
        'autoplay': 1,
        'controls': 1,
        'rel': 0,
        'fs': 1,
        'enablejsapi': 1
    };

    // Parse custom parameters
    if (data.custom_parameters) {
        const params = new URLSearchParams(data.custom_parameters.replace(/&amp;/g, '&'));
        for (const [key, value] of params) {
            if (key === 'loop') continue;
            playerVars[key] = value === 'true' ? 1 : (value === 'false' ? 0 : value);
        }
    }

    let videoId = null;
    let listId = null;

    if (data.type === 'single' || data.type === 'livestream') {
        videoId = data.video_id || data.beginning_video_id;
    } else {
        // Playlist
        videoId = data.beginning_video_id;
        listId = data.playlist_id;
    }

    const playerConfig = {
        height: '100%',
        width: '100%',
        playerVars: playerVars,
        events: {
            'onStateChange': (event) => onPlayerStateChange(event, win)
        }
    };

    if (listId) {
        playerConfig.playerVars.listType = 'playlist';
        playerConfig.playerVars.list = listId;
        if (videoId) {
            playerConfig.videoId = videoId;
        }
    } else {
        playerConfig.videoId = videoId;
    }

    state.player = new YT.Player(playerDivId, playerConfig);
}

function onPlayerStateChange(event, win) {
    if (event.data === YT.PlayerState.ENDED) {
        const state = win.tubeStreamState;
        if (!state) return;
        const data = state.playlistData[state.currentIndex];

        if (data.type === 'playlist') {
             // Check if we are at the end of the YouTube playlist
             const player = state.player;
             if (player && typeof player.getPlaylist === 'function') {
                 const playlist = player.getPlaylist();
                 const index = player.getPlaylistIndex();
                 // If playlist is null or empty, or we are at the last index
                 if (!playlist || playlist.length === 0 || index === playlist.length - 1) {
                     setTimeout(() => playNextItem(win), 200);
                 }
             } else {
                 setTimeout(() => playNextItem(win), 200);
             }
        } else {
            setTimeout(() => playNextItem(win), 200);
        }
    }
}

function playNextItem(win) {
    const state = win.tubeStreamState;
    if (!state) return;
    state.currentIndex++;
    if (state.currentIndex >= state.playlistData.length) {
        state.currentIndex = 0;
    }
    loadVideo(win);
}

function checkYouTubeConnectivity() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = "https://img.youtube.com/vi/qhCsL1cx4Qc/default.jpg?" + new Date().getTime();
  });
}

const myPlaylist = {
  "playlists": [
    {
      "id": "111",
      "type": "playlist",
      "name": "FUTV STREAM TEST",
      "description": "This is a test of our public broadcast system. Please stand by.",
      "playlist_id": "PLfznZzH31A46XXPSw2dcb-gqhMXcBMOHV",
      "beginning_video_id": "qhCsL1cx4Qc",
      "custom_parameters": "autoplay=true&loop=false"
    }
    // Example single video:
    // {
    //   "id": "112",
    //   "type": "single",
    //   "name": "Single Video Example",
    //   "description": "A single video",
    //   "video_id": "dQw4w9WgXcQ",
    //   "custom_parameters": "autoplay=true"
    // }
    // Example livestream:
    // {
    //   "id": "113",
    //   "type": "livestream",
    //   "name": "Live Stream Example",
    //   "description": "A live stream",
    //   "video_id": "jfKfPfyJRdk",
    //   "custom_parameters": "autoplay=true"
    // }
  ]
}

// Export functions
export {
  launchTubeStream,
  initializeTubeStreamUI
};
