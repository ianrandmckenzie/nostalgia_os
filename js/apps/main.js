import { launchMailbox } from './mailbox.js';
import { launchTubeStream } from './tube_stream.js';
import { launchWatercolour } from './watercolour/main.js';
import { launchCalculator } from './calculator.js';
import { launchSolitaire } from './solitaire.js';
import { launchChess } from './chess.js';
import { launchBombbroomer } from './bombbroomer.js';
import { launchMediaPlayer } from './mediaplayer.js';
import { launchCompostBin } from './compost_bin.js';
import { launchStorageManager } from './storage_manager.js';

export function openApp(id) {
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
