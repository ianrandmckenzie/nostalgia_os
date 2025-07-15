function toggleButtonActiveState(id, rename = null) {
  let btn;
  if (typeof id !== 'string') {
    btn = id;
  } else {
    btn = document.getElementById(id);
  }
  btn.classList.toggle('bg-gray-50');
  btn.classList.toggle('bg-gray-200');
  btn.classList.toggle('border-gray-300');
  btn.classList.toggle('border-black');
  const btnInner = btn.querySelector('span');
  btnInner.classList.toggle('border-gray-300');
  btnInner.classList.toggle('border-black');
  const btnImg = btn.querySelector('img');
  if (btnImg) {
    btnImg.classList.toggle('border-gray-300');
    btnImg.classList.toggle('border-black');
  }
  if (rename) {
    btnInner.innerHTML = rename;
  }
}

// Error!

function isOwnAppError(source) {
  if (!source) return true // sometimes source is null on same-origin scripts
  try {
    const srcUrl = new URL(source, location.href)
    return srcUrl.origin === location.origin
  } catch {
    return false
  }
}

function showErrorOverlay() {
  document.getElementById('error-overlay').classList.remove('hidden');
  document.getElementById('error-overlay').style.zIndex = '9999';

  // Add keydown event listener to reload page on any key press
  function handleKeyPress(event) {
    location.reload();
  }

  document.addEventListener('keydown', handleKeyPress, { once: true });
}

window.onerror = function(message, source, lineno, colno, error) {
  if (isOwnAppError(source)) showErrorOverlay()
}

window.addEventListener('unhandledrejection', function(event) {
  // These usually have no source, so assume they're from your app
  showErrorOverlay()
})
