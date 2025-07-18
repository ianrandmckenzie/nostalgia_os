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

  // Check if desktopSettings is available and initialized
  const showSeconds = (typeof desktopSettings !== 'undefined' && desktopSettings && desktopSettings.clockSeconds) || false;
  let timeStr = showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
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

document.addEventListener('DOMContentLoaded', () => {
  // Find all the links that are meant to trigger a submenu
  const submenuTriggers = document.querySelectorAll('[data-submenu-trigger]');

  // Check if the screen is "mobile" size (matches Tailwind's 'lg' breakpoint)
  const isMobile = window.innerWidth < 1024;

  if (isMobile) {
    submenuTriggers.forEach(trigger => {
      const submenu = trigger.nextElementSibling; // The <ul> is right after the <a>
      const arrow = trigger.querySelector('span');

      // When a trigger is clicked...
      trigger.addEventListener('click', (event) => {
        // Prevent the link from trying to navigate
        event.preventDefault();

        // Toggle the 'block' and 'hidden' classes on the submenu
        if (submenu.classList.contains('hidden')) {
          submenu.classList.remove('hidden');
          submenu.classList.add('block');
          arrow.classList.add('rotate-90');
        } else {
          submenu.classList.remove('block');
          submenu.classList.add('hidden');
          arrow.classList.remove('rotate-90');
        }
      });
    });
  }
});

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

document.getElementById('storageapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('storage');
});

document.getElementById('watercolourapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('watercolour');
});

document.getElementById('letterpad').addEventListener('click', () => {
  toggleStartMenu();
  createNewFile(null, 'C://Documents', (newFileId) => {
    openFile(newFileId, { target: document.body });
  });
});

document.getElementById('calcapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('calculator');
});

document.getElementById('solapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('solitaire');
});

document.getElementById('chessapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('chess');
});

document.getElementById('bombapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('bombbroomer');
});

document.getElementById('mediaapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('mediaplayer');
});

document.getElementById('mailapp').addEventListener('click', () => {
  toggleStartMenu();
  openApp('mailbox');
});

document.getElementById('rstrtcomp').addEventListener('click', () => {
  toggleStartMenu();
  restart();
});
