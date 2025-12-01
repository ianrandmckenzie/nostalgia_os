import { processSystemManifest } from './manage_data.js';

export function showSplash() {
  const splashDiv = document.createElement('div');
  splashDiv.className = 'w-3xl fixed left-0 top-0 h-full w-full bg-gradient-to-b from-40% from-blue-500 to-cyan-500';
  splashDiv.id = "splash-screen";
  splashDiv.style.zIndex = "9000";

  splashDiv.innerHTML = `
  <div class="flex flex-col items-center justify-center h-full">
    <img id="splash-image" src="./image/logo.webp" alt="Startup" class="mb-4 max-w-48">
    <h1 class="sr-only">Doorways '25, a Nostalgia Inducing Operating System</h1>
    <div class="mx-auto w-72 text-sm pl-3 mb-2 bg-black py-1 border-2 border-lime-400 text-lime-300"><em>i hacked the mainframe credentials for u</em><br><span class="text-xs text-lime-500">sincerely, _N30_phreak_</span></div>
    <form id="splash-form" class="bg-gray-300 border border-gray-500 p-4 w-96">
      <div class="mb-2">
        <label class="block text-sm">Username</label>
        <input type="text" id="splash-username" value="admin" class="border px-1 py-1 w-full" readonly>
      </div>
      <div class="mb-2">
        <label class="block text-sm">Password</label>
        <input type="password" id="splash-password" value="••••••" class="border px-1 py-1 w-full" readonly>
      </div>
      <button id="splash-login" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full max-h-10 w-full py-1.5 px-3">Login</span></button>
    </form>
  </div>
`;
  document.body.appendChild(splashDiv);

  // Create audio dynamically to avoid Brave Playlist detection
  const splashAudio = new Audio('./audio/startup.mp3');
  splashAudio.id = "splash-audio";

  document.getElementById("splash-login").addEventListener("click", function (e) {
    splashAudio.play().catch(e => console.log("Audio play failed", e));
    e.preventDefault();
    document.getElementById('splash-image').src = './image/icon.gif';
    splashAudio.currentTime = 0;
    setTimeout(function () {
      splashDiv.remove();
    }, 3000);
  });
}

export async function showOSLoading() {
  const splashDiv = document.createElement('div');
  splashDiv.className = 'w-3xl fixed left-0 top-0 h-full w-full bg-gradient-to-b from-blue-500 to-cyan-500';
  splashDiv.id = "splash-screen";
  splashDiv.style.zIndex = "9999";

  splashDiv.innerHTML = `
  <div class="flex flex-col items-center justify-center h-full">
    <img id="splash-image" src="./image/logo.webp" alt="Startup" class="mb-4 max-w-48">
    <h2 class="text-4xl text-gray-900 font-bold mb-2">System Loading ...</h2>
  </div>
`;
  document.body.appendChild(splashDiv);

  setTimeout(function () {
    splashDiv.remove();

    // Show custom scrollbars after loading is complete
    if (typeof window.showCustomScrollbars === 'function') {
      window.showCustomScrollbars();
    }
  }, 1000); // Reduced timeout since we're doing actual work now
}

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.showSplash = showSplash;
  window.showOSLoading = showOSLoading;
}

// Removed top-level call to prevent circular dependency issues
// showOSLoading();
