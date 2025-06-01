function restart() {
  localStorage.clear();
  windowStates = {};
  desktopIconsState = {};
  desktopSettings = {
    clockSeconds: false,
    bgColor: "#20b1b1",
    bgImage: ""
  };
  window.location.reload();
}
