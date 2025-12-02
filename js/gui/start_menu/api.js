import { unavailableApps } from './state.js';
import { generateStartMenuHTML } from './render.js';
import { probeApiEndpoints } from '../../utils/api_probe.js';

// Initialize API probes
export async function initializeApiProbes() {
  try {
    const results = await probeApiEndpoints();

    // Update unavailable apps based on results
    if (!results.mailbox) unavailableApps.add('mailboxapp');
    if (!results.tubestream) unavailableApps.add('tubestreamapp');

    // Regenerate menu if any apps were marked unavailable
    if (unavailableApps.size > 0) {
      generateStartMenuHTML();
    }
  } catch (error) {
    console.error('Failed to initialize API probes:', error);
  }
}
