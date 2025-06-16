function openAboutWindow() {
  const content = `
    <div class="p-4">
      <img src="./image/startup.png" class="w-48 h-auto mx-auto mb-4">
      <h1 class="text-xl font-bold mb-2">About This Computer</h1>
      <p>Made by multimedia artist Ian McKenzie.</p>
      <p>More shenanigans @ relentlesscurious.com</p>
      <p>Version: 1.0.0</p>
      <p>Copyright © Ian Rand McKenzie, 2025</p>
    </div>
  `;
  createWindow("About This Computer", content, false, null, false, false, { type: 'integer', width: 400, height: 500 }, "default", null, 'gray-200 cursor-not-allowed pointer-events-none');
}
