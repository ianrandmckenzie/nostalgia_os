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
