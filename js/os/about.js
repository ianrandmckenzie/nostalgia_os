import { createWindow } from '../gui/window.js';

export async function openAboutWindow() {
  const isReddit = window.location.href.includes('reddit.com');
  // Fetch version from package.json
  let version = '1.0.0'; // fallback version
  try {
    const response = await fetch('./package.json');
    const packageData = await response.json();
    version = packageData.version || '1.0.0';
  } catch (error) {
    console.warn('Could not fetch version from package.json:', error);
  }

  const content = `
    <div class="p-4 gap-y-2 flex flex-col">
      <img src="./image/startup.webp" class="w-48 h-auto mx-auto mb-4" alt="FUTV startup logo">
      <h1 class="text-xl font-bold mb-2">About This Computer</h1>
      <p>Made by multimedia artist Ian McKenzie.</p>
      <p>More shenanigans @ ${isReddit ? 'relentlesscurious.com' : '<a href="https://www.relentlesscurious.com" target="_blank">relentlesscurious.com</a>'}</p>
      <p>Version: ${version}</p>
      <p>Copyright © Ian Rand McKenzie, 2025</p>
      <p>This project must be purchased for use, but is open source and free for those who contribute via code, security research, bug reporting, etc. — contributors may do so on <a target="_blank" href="https://github.com/ianrandmckenzie/nostalgia_os">github.com/ianrandmckenzie/nostalgia_os</a></p>
    </div>
  `;
  createWindow("About This Computer", content, false, null, false, false, { type: 'integer', width: 400, height: 640 }, "default", null, 'gray-200');
}
