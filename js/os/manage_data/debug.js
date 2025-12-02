import { saveState } from './persistence.js';
import { storage } from '../indexeddb_storage.js';
import { initializeRestoredApp, reinitializeApp } from './apps.js';

// Debug function to check current window states
export function debugWindowStates() {
}

// Force save current state (for testing)
export async function forceSaveState() {
  try {
    await saveState();
  } catch (error) {
    console.error('Failed to save state manually:', error);
  }
}

// Test app restoration (for testing)
export function testAppRestoration(windowId) {
  initializeRestoredApp(windowId);
}

// Test app reinitialization (for testing)
export function testAppReinitialization(windowId) {
  const launchFunctions = {
    'calculator': typeof launchCalculator !== 'undefined' ? launchCalculator : undefined,
    'mediaplayer': typeof launchMediaPlayer !== 'undefined' ? launchMediaPlayer : undefined,
    'bombbroomer': typeof launchBombbroomer !== 'undefined' ? launchBombbroomer : undefined,
    'solitaire': typeof launchSolitaire !== 'undefined' ? launchSolitaire : undefined
  };

  if (launchFunctions[windowId]) {
    reinitializeApp(windowId, launchFunctions[windowId]);
  } else {
    console.warn(`No launch function found for ${windowId}`);
  }
}

// Test Bombbroomer specific initialization
export function testBombbroomerInit() {
  const gameWindow = document.getElementById('bombbroomer');
  if (gameWindow && typeof initializeBombbroomerUI === 'function') {
    initializeBombbroomerUI(gameWindow);
  } else {
    console.warn('Bombbroomer window not found or function not available');
  }
}

// Test data integrity (for debugging)
export async function testDataIntegrity() {
  try {
    // Test 1: Save current state
    await saveState();

    // Test 2: Read back the saved state
    const savedData = await storage.getItem('appState');

    if (savedData) {

      // Test 3: Verify IndexedDB persistence
      const storage_estimate = await navigator.storage.estimate();

      return true;
    } else {
      console.error('✗ No data found after save');
      return false;
    }
  } catch (error) {
    console.error('✗ Data integrity test failed:', error);
    return false;
  }
}

// Test session persistence (for debugging login behavior)
export async function testSessionPersistence() {
  try {
    const appState = await storage.getItem('appState');
    const explicitRestart = await storage.getItem('explicitRestart');

    return !!appState;
  } catch (error) {
    console.error('✗ Session persistence test failed:', error);
    return false;
  }
}

// Simulate restart for testing
export async function simulateRestart() {
  await storage.setItem('explicitRestart', true);
}

if (typeof window !== 'undefined') {
  window.debugWindowStates = debugWindowStates;
  window.forceSaveState = forceSaveState;
  window.testAppRestoration = testAppRestoration;
  window.testAppReinitialization = testAppReinitialization;
  window.testBombbroomerInit = testBombbroomerInit;
  window.testDataIntegrity = testDataIntegrity;
  window.testSessionPersistence = testSessionPersistence;
  window.simulateRestart = simulateRestart;
}
