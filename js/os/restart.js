async function restart() {
  // Set flag to indicate this is an explicit restart
  await storage.setItem('explicitRestart', true);

  // Reset state objects for current session
  windowStates = {};
  desktopIconsState = {};
  desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };

  // Show splash screen
  showSplash();
}

// Logout function - similar to restart but preserves data
async function logout() {
  // Set flag to indicate this is an explicit logout
  await storage.setItem('explicitRestart', true);

  // Save current state before showing login
  try {
    await saveState();
  } catch (error) {
    console.warn('Failed to save state before logout:', error);
  }

  // Show splash screen
  showSplash();
}
