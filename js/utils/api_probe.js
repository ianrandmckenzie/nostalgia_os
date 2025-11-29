import { API_BASE_URL, SUGGESTIONS_LIST_PATH, TUBE_STREAMS_PATH } from '../config.js';

export async function probeApiEndpoints() {
  const results = {
    mailbox: false,
    tubestream: false
  };

  const checkEndpoint = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      if (response.ok) return true;
      
      // If HEAD fails (e.g. 405), try GET
      if (response.status === 405 || response.status === 404) { // Some APIs return 404 for HEAD but work for GET? Unlikely but possible if route specific
         // Actually if 404 it probably doesn't exist. But let's try GET to be sure if it's just method not allowed.
         // If 404, it's likely down or wrong path.
         // Let's just try GET if HEAD wasn't 200 OK.
         const getResponse = await fetch(url, {
            method: 'GET',
            signal: controller.signal
         });
         return getResponse.ok;
      }
      
      return false;
    } catch (error) {
      console.warn(`Probe failed for ${url}:`, error);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Run checks in parallel
  const [mailboxAlive, tubeAlive] = await Promise.all([
    checkEndpoint(`${API_BASE_URL}${SUGGESTIONS_LIST_PATH}`),
    checkEndpoint(`${API_BASE_URL}${TUBE_STREAMS_PATH}`)
  ]);

  results.mailbox = mailboxAlive;
  results.tubestream = tubeAlive;

  console.log('🔍 API Probe Results:', results);
  return results;
}
