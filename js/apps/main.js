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
import { launchKeyboard } from './keyboard.js';
import { launchPong } from './pong.js';
import { launchSnake } from './snake.js';

export function openApp(id) {
  const existingWindow = document.getElementById(id);
  if (existingWindow) {
    // Special handling for keyboard since it conflicts with another element
    if (id === 'keyboard') {
      console.log('🔍 Skipping generic keyboard element, will handle in keyboard case');
    } else {
      const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
      const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
        getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
      , existingWindow);
      existingWindow.style.zIndex = `${parseInt(getComputedStyle(highestZIndex).zIndex) + 1}`;
      return;
    }
  }

  console.log('🔍 Checking app cases...');
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
  if (id === 'pong') launchPong();
  if (id === 'snake') launchSnake();
  if (id === 'keyboard') {
    // Check for the actual keyboard app window instead of just 'keyboard'
    const existingKeyboardWindow = document.getElementById('keyboard-app');
    if (existingKeyboardWindow) {
      console.log('🔍 Keyboard app window already exists, bringing to front');
      const elementsWithZIndex = [...document.querySelectorAll('*')].filter(el => (getComputedStyle(el).zIndex > 100 && getComputedStyle(el).zIndex < 1000));
      const highestZIndex = elementsWithZIndex.reduce((maxEl, el) =>
        getComputedStyle(el).zIndex > getComputedStyle(maxEl).zIndex ? el : maxEl
      , existingKeyboardWindow);
      existingKeyboardWindow.style.zIndex = `${parseInt(getComputedStyle(highestZIndex).zIndex) + 1}`;
      return;
    }
    launchKeyboard().catch(console.error);
  }
  console.log('🔍 Finished checking all cases');
}
