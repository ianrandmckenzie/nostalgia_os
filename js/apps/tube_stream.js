async function launchTubeStream() {
  const youtube_url = await loadPrimaryStream(); // Await the async function
  const content = `<iframe width="560" height="315" style="margin:0 auto;" src="${youtube_url}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  createWindow('TubeStream', content, false, 'tubestream', false, false, { type: 'integer', width: 580, height: 380 }, 'default', null, 'white');
}

async function loadPrimaryStream() {
  const base_url = 'https://www.youtube.com/embed';

  try {
    const response = await fetch('/api/playlists/primary.json');
    const data = await response.json();
    
    const video_id = data.beginning_video_id;
    const playlist_id = data.playlist_id;
    const custom_params = data.custom_parameters;
    
    return `${base_url}/${video_id}?list=${playlist_id}&${custom_params}`;
  } catch (error) {
    console.error('Error fetching stream:', error);
    return 'https://www.youtube.com/embed/_v7_q7dpi5o?autoplay=true'; // Default fallback URL
  }
}
