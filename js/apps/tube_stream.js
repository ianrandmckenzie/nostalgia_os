// Import required functions
import { createWindow } from '../gui/window.js';

async function launchTubeStream() {
  const youtube_url = await loadPrimaryStream(); // Await the async function

  // Check if YouTube is reachable
  const isOnline = await checkYouTubeConnectivity();

  let content;
  if (isOnline) {
    content = `<iframe width="560" height="315" style="margin:0 auto;" src="${youtube_url}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  } else {
    content = `<div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column; text-align: center; padding: 20px; font-family: 'MS Sans Serif', sans-serif;">
      <p>Unable to connect to YouTube.</p>
      <p>You might be offline or there is a network error.</p>
    </div>`;
  }

  createWindow('TubeStream', content, false, 'tubestream', false, false, { type: 'integer', width: 580, height: 380 }, 'default', null, 'white');
}

function checkYouTubeConnectivity() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = "https://img.youtube.com/vi/qhCsL1cx4Qc/default.jpg?" + new Date().getTime();
  });
}

async function loadPrimaryStream() {
  const base_url = 'https://www.youtube.com/embed';
  let data;

  try {
    const response = await fetch('https://example.com/some-backend');
    if (!response.ok) throw new Error('Network response was not ok');
    const json = await response.json();
    data = json.playlists[0];
  } catch (error) {
    console.warn('Error fetching playlist, using fallback:', error);
    data = myPlaylist.playlists[0];
  }

  try {
    let custom_params = data.custom_parameters;
    // Decode HTML entities if present (e.g. &amp; -> &)
    if (custom_params) {
      custom_params = custom_params.replace(/&amp;/g, '&');
    }

    // Check if this is a single video/livestream or a playlist
    if (data.type === 'single' || data.type === 'livestream') {
      const video_id = data.video_id;
      return `${base_url}/${video_id}?${custom_params}`;
    } else {
      // Default to playlist type
      const video_id = data.beginning_video_id;
      const playlist_id = data.playlist_id;
      return `${base_url}/${video_id}?list=${playlist_id}&${custom_params}`;
    }
  } catch (error) {
    console.error('Error constructing stream URL:', error);
    return 'https://www.youtube.com/embed/qhCsL1cx4Qc?autoplay=true'; // Default fallback URL
  }
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
  loadPrimaryStream
};
