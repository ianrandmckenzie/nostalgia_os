function openAboutWindow() {
  const content = `
    <div class="p-4">
      <img src="./image/microsauce.jpeg" class="h-48 w-48 mx-auto mb-4 rounded shadow-md">
      <h1 class="text-xl font-bold mb-2">About This Computer</h1>
      <p>Made by multimedia artist Ian McKenzie.</p>
      <p>More shenanigans @ <a href="https://www.psychosage.io/"></a></p>
      <p>Version: 1.0.0</p>
      <p>Copyright © Ian Rand McKenzie, 2025</p>
    </div>
  `;
  createWindow("About This Computer", content, false, null, false, false, { type: 'integer', width: 400, height: 500 }, "default", null, 'gray-200 cursor-not-allowed pointer-events-none');
}
