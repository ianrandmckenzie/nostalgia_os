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
    return 'https://www.youtube.com/embed/b6ZhmHfnklQ?autoplay=true'; // Default fallback URL
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
      "name": "Psytrance Mix",
      "description": "Example usage #1",
      "playlist_id": "PL7SZQy1OjmvdHsvEG1e8H305y3SxaIzxY",
      "beginning_video_id": "b6ZhmHfnklQ",
      "custom_parameters": "autoplay=true&loop=false"
    },
    {
      "id": "222",
      "name": "Skits",
      "description": "Example usage #2",
      "playlist_id": "PLfznZzH31A448eZ2rWURNfkmRGC0lsCaA",
      "beginning_video_id": "24ny5EJr-hQ",
      "custom_parameters": "autoplay=true&loop=true"
    },
    {
      "id": "333",
      "name": "Studio Shows",
      "description": "Example usage #3",
      "playlist_id": "PLfznZzH31A46GppLOHadmvL3I8H7ied2d",
      "beginning_video_id": "J5a029oRpDA",
      "custom_parameters": "autoplay=true&loop=false"
    }
  ]
}

// Export functions
export {
  launchTubeStream,
  loadPrimaryStream
};
