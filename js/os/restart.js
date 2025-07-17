function restart() {
  // Clear localStorage
  localStorage.clear();

  // Clear IndexedDB for media player
  const deleteRequest = indexedDB.deleteDatabase("media_player_db");
  deleteRequest.onsuccess = () => {
    console.log("Media player database cleared");
  };
  deleteRequest.onerror = (event) => {
    console.error("Error clearing media player database:", event);
  };

  // Reset state objects
  windowStates = {};
  desktopIconsState = {};
  desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };

  // Reload the page
  window.location.reload();
}
