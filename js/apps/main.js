function openApp(id) {
  const existingWindow = document.getElementById(id);
  if (existingWindow) {
    const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
    const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
      getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
    );
    existingWindow.style.zIndex = `${parseInt(highestZIndex.style.zIndex) + 1}`;
    return;
  }
  if (id === 'mailbox') launchMailbox();
  if (id === 'tubestream') launchTubeStream();
  if (id === 'watercolour') launchWatercolour();
  if (id === 'calculator') launchCalculator();
  if (id === 'solitaire') launchSolitaire();
  if (id === 'chess') launchChess();
  if (id === 'bombbroomer') launchBombbroomer();
  if (id === 'mediaplayer') launchMediaPlayer();
  if (id === 'compostbin') launchCompostBin();
  if (id === 'storage') launchStorageManager();
}
