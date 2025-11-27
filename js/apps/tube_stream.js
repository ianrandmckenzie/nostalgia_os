// Import required functions
import { createWindow } from '../gui/window.js';

async function launchTubeStream() {
  const youtube_url = await loadPrimaryStream(); // Await the async function
  const content = `<iframe width="560" height="315" style="margin:0 auto;" src="${youtube_url}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  createWindow('TubeStream', content, false, 'tubestream', false, false, { type: 'integer', width: 580, height: 380 }, 'default', null, 'white');
}

async function loadPrimaryStream() {
  const base_url = 'https://www.youtube.com/embed';

  try {
    const data = myPlaylist.playlists[0];
    const video_id = data.beginning_video_id;
    const playlist_id = data.playlist_id;
    const custom_params = data.custom_parameters;

    return `${base_url}/${video_id}?list=${playlist_id}&${custom_params}`;
  } catch (error) {
    console.error('Error loading stream:', error);
    return 'https://www.youtube.com/embed/qhCsL1cx4Qc?autoplay=true'; // Default fallback URL
  }
}

// async function loadPrimaryStream() {
//   const base_url = 'https://www.youtube.com/embed';

//   try {
//     const response = await fetch('/api/playlists/primary.json');
//     const data = await response.json();

//     const video_id = data.beginning_video_id;
//     const playlist_id = data.playlist_id;
//     const custom_params = data.custom_parameters;

//     return `${base_url}/${video_id}?list=${playlist_id}&${custom_params}`;
//   } catch (error) {
//     console.error('Error fetching stream:', error);
//     return 'https://www.youtube.com/embed/_v7_q7dpi5o?autoplay=true'; // Default fallback URL
//   }
// }

const myPlaylist = {
  "playlists": [
    {
      "id": "111",
      "name": "FUTV STREAM TEST",
      "description": "This is a test of our public broadcast system. Please stand by.",
      "playlist_id": "PLfznZzH31A46XXPSw2dcb-gqhMXcBMOHV",
      "beginning_video_id": "qhCsL1cx4Qc",
      "custom_parameters": "autoplay=true&loop=false"
    }
  ]
}

// Export functions
export {
  launchTubeStream,
  loadPrimaryStream
};
