async function launchWatercolour() {
  const content = `<iframe width="660" height="400" style="margin:0 auto;" src="./js/apps/watercolour/index.html" title="watercolour app" frameborder="0"></iframe>`;
  createWindow('Watercolour', content, false, 'watercolour', false, false, { type: 'integer', width: 700, height: 440 }, 'app', null, 'white');
}
