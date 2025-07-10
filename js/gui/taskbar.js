function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  menu.classList.toggle('hidden');
  toggleButtonActiveState('start-button');
}

function minimizeAllWindows() {
  for (const id in windowStates) {
    minimizeWindow(id);
  }
  document.querySelectorAll('#window-tabs > div').forEach(tab => {
    tab.classList.remove('bg-gray-50');
  });
}

function openNav(title, content = '', dimensions = { type: 'default' }, windowType = 'default') {
  toggleStartMenu();
  if (navWindows[title]) {
    const existingWindow = document.getElementById(navWindows[title]);
    if (existingWindow) { bringToFront(existingWindow); return; }
    else { delete navWindows[title]; }
  }
  createWindow(title, content, true, null, false, false, dimensions, windowType);
}

function updateClock() {
  const clockEl = document.getElementById('clock');
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;
  let timeStr = desktopSettings.clockSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  clockEl.textContent = timeStr;
}

function toggleMediaPlayback() {
  const mediaEl = getActiveMediaElement();
  if (mediaEl) {
    mediaEl.paused ? mediaEl.play() : mediaEl.pause();
    updateMediaControl();
  }
}

function updateMediaControl() {
  const mediaEl = getActiveMediaElement();
  const mediaControl = document.getElementById('media-control');
  if (mediaEl) {
    mediaControl.textContent = mediaEl.paused ? "▶" : "⏸";
  } else {
    mediaControl.textContent = "";
  }
}

function getActiveMediaElement() {
  if (activeMediaWindow) {
    const win = document.getElementById(activeMediaWindow);
    if (win) {
      return win.querySelector("video, audio");
    }
  }
  return null;
}

setInterval(updateClock, 1000);
updateClock();

document.getElementById('media-control').addEventListener('click', () => {
  toggleMediaPlayback()
});

document.getElementById('min-all-btn').addEventListener('click', () => {
  toggleStartMenu();
  minimizeAllWindows()
});


document.getElementById('start-button').addEventListener('click', () => {
  toggleStartMenu();
});

document.getElementById('mycomp').addEventListener('click', () => {
  toggleStartMenu();
  openExplorer('C://');
});

document.getElementById('abtcomp').addEventListener('click', () => {
  toggleStartMenu();
  openAboutWindow();
});

document.getElementById('sysset').addEventListener('click', () => {
  toggleStartMenu();
  openNav('Settings', '', { type: 'integer', width: 600, height: 400 }, 'Settings');
});

document.getElementById('calcapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('calculator');
});

document.getElementById('solapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('solitaire');
});

document.getElementById('bombapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('bombbroomer');
});

document.getElementById('rstrtcomp').addEventListener('click', () => {
  toggleStartMenu();
  restart();
});
