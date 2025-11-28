import { launchSuggestionBox } from './suggestion_box.js';
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
import { launchHappyTurd } from './happyturd.js';
import { launchOSUpdate } from './os_update.js';

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

  console.log(`🔍 Checking app cases for ${id}...`);
  if (id === 'suggestionbox' || id.includes('shortcut-suggestionboxapp')) launchSuggestionBox();
  if (id === 'watercolour' || id.includes('shortcut-watercolourapp')) launchWatercolour();
  if (id === 'calculator' || id.includes('shortcut-calcapp')) launchCalculator();
  if (id === 'solitaire' || id.includes('shortcut-solapp')) launchSolitaire();
  if (id === 'chess' || id.includes('shortcut-chessapp')) launchChess();
  if (id === 'bombbroomer' || id.includes('shortcut-bombapp')) launchBombbroomer();
  if (id === 'mediaplayer' || id.includes('shortcut-mediaapp')) launchMediaPlayer();
  if (id === 'compostbin' || id.includes('shortcut-compostbinapp')) launchCompostBin();
  if (id === 'storage' || id.includes('shortcut-storageapp')) launchStorageManager();
  if (id === 'tubestream' || id.includes('shortcut-tubestreamapp')) launchTubeStream();
  if (id === 'osupdate' || id.includes('shortcut-osupdateapp')) launchOSUpdate();
  if (id === 'pong' || id.includes('shortcut-pongapp')) launchPong();
  if (id === 'snake' || id.includes('shortcut-snakeapp')) launchSnake();
  if (id === 'happyturd' || id.includes('shortcut-happyturdapp')) launchHappyTurd();
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
