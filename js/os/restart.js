function restart() {
  // Reset state objects for current session
  windowStates = {};
  desktopIconsState = {};
  desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };

  // Show splash screen instead of directly reloading
  showSplash();
}
