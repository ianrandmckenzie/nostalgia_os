// Mailbox app – no innerHTML anywhere
function launchMailbox() {
  // ──────────────────────────────────────────────────────
  // 1.  Create an empty window for the mailbox UI
  // ──────────────────────────────────────────────────────
  const win = createWindow(
    'Mailbox',
    '',                      // start with no markup
    false,
    'mailbox',
    false,
    false,
    { type: 'integer', width: 600, height: 400 },
    'App',
    null,
    'white'
  );

  // content area provided by createWindow
  const root = win.querySelector('.p-2');
  root.classList.add('flex', 'flex-col', 'h-full');

  // ──────────────────────────────────────────────────────
  // 2.  Build the left-hand message list + compose button
  // ──────────────────────────────────────────────────────
  const mainArea   = document.createElement('div');
  mainArea.className = 'flex-1 flex overflow-hidden';
  root.appendChild(mainArea);

  const listPane   = document.createElement('div');
  listPane.id      = 'mailbox-list';
  listPane.className =
    'w-1/3 border-r border-gray-300 flex flex-col overflow-y-auto';
  mainArea.appendChild(listPane);

  const composeBtn = document.createElement('button');
  composeBtn.id    = 'compose-btn';
  composeBtn.className =
    'p-2 border-b border-gray-300 text-blue-500 hover:bg-gray-100';
  composeBtn.textContent = 'Compose';
  listPane.appendChild(composeBtn);

  // Container where <div> items for each mail will be added
  // (all done in loadMessages)
  // ──────────────────────────────────────────────────────
  // 3.  Build the right-hand detail pane with placeholder
  // ──────────────────────────────────────────────────────
  const detailPane = document.createElement('div');
  detailPane.id    = 'mailbox-detail';
  detailPane.className = 'flex-1 p-2 overflow-y-auto';
  mainArea.appendChild(detailPane);

  const placeholder = document.createElement('div');
  placeholder.id    = 'placeholder';
  placeholder.className = 'text-gray-500';
  placeholder.textContent = 'Select a message to view';
  detailPane.appendChild(placeholder);

  // ──────────────────────────────────────────────────────
  // 4.  Fetch and render message list
  // ──────────────────────────────────────────────────────
  function loadMessages() {
    fetch('/api/submissions.json')
      .then(r => r.json())
      .then(data => {
        // remove existing list items but keep the compose button
        while (listPane.children.length > 1) listPane.removeChild(listPane.lastChild);

        data.submissions.forEach(sub => {
          const item = document.createElement('div');
          item.className =
            'p-2 border-b border-gray-300 hover:bg-gray-200 cursor-pointer truncate';
          item.textContent = sub.subject || sub.email;
          item.addEventListener('click', () => showMessage(sub));
          listPane.appendChild(item);
        });
      })
      .catch(err => console.error('Error fetching messages:', err));
  }

  // ──────────────────────────────────────────────────────
  // 5.  Render one message in the detail pane
  // ──────────────────────────────────────────────────────
  function showMessage(msg) {
    // clear previous contents
    while (detailPane.firstChild) detailPane.removeChild(detailPane.firstChild);

    // Header
    const header = document.createElement('div');
    header.className = 'mb-2';

    const fromRow = document.createElement('div');
    const fromLbl = document.createElement('strong');
    fromLbl.textContent = 'From: ';
    fromRow.append(fromLbl, document.createTextNode(msg.email));
    header.appendChild(fromRow);

    const subjRow = document.createElement('div');
    const subjLbl = document.createElement('strong');
    subjLbl.textContent = 'Subject: ';
    subjRow.append(subjLbl, document.createTextNode(msg.subject || '(No Subject)'));
    header.appendChild(subjRow);

    // Body
    const body = document.createElement('div');
    body.className = 'mb-2 whitespace-pre-wrap';
    body.textContent = msg.textarea;

    detailPane.append(header, body);

    // Attachments
    if (msg.files && Object.keys(msg.files).length) {
      const atDiv = document.createElement('div');
      atDiv.className = 'mt-2';

      const atTitle = document.createElement('strong');
      atTitle.textContent = 'Attachments:';
      atDiv.appendChild(atTitle);

      const ul = document.createElement('ul');
      ul.className = 'list-disc list-inside';

      Object.values(msg.files).forEach(f => {
        const li   = document.createElement('li');
        const link = document.createElement('a');
        link.href        = f.url || f.contents || '#';
        link.className   = 'text-blue-500 hover:underline';
        link.textContent = f.name;
        link.target      = '_blank';
        li.appendChild(link);
        ul.appendChild(li);
      });

      atDiv.appendChild(ul);
      detailPane.appendChild(atDiv);
    }
  }

  // ──────────────────────────────────────────────────────
  // 6.  Compose-message window, also without innerHTML
  // ──────────────────────────────────────────────────────
  function openCompose() {
    const cw = createWindow(
      'Compose Message',
      '',
      false,
      'Compose Message',
      false,
      false,
      { type: 'integer', width: 400, height: 600 },
      'App',
      null,
      'white'
    );
    const cont = cw.querySelector('.p-2');
    cont.classList.add('p-4');   // add spacing

    const form = document.createElement('form');
    form.id = 'compose-form';
    form.className = 'flex flex-col space-y-4';
    cont.appendChild(form);

    // small helper to build labelled inputs
    const makeField = (labelText, input) => {
      const wrapper = document.createElement('div');
      const label   = document.createElement('label');
      label.className = 'block text-sm font-medium text-gray-700';
      label.textContent = labelText;
      wrapper.append(label, input);
      return wrapper;
    };

    // From
    const fromInput = document.createElement('input');
    fromInput.type  = 'email';
    fromInput.name  = 'from';
    fromInput.required = true;
    fromInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('From', fromInput));

    // To (fixed)
    const toInput = document.createElement('input');
    toInput.type  = 'email';
    toInput.name  = 'to';
    toInput.value = 'person@example.com';
    toInput.readOnly = true;
    toInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2 bg-gray-100';
    form.appendChild(makeField('To', toInput));

    // Subject
    const subjInput = document.createElement('input');
    subjInput.type  = 'text';
    subjInput.name  = 'subject';
    subjInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Subject (optional)', subjInput));

    // Message body
    const msgArea = document.createElement('textarea');
    msgArea.name  = 'message';
    msgArea.required = true;
    msgArea.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Message', msgArea));

    // Attachment
    const fileInput = document.createElement('input');
    fileInput.type  = 'file';
    fileInput.name  = 'attachment';
    fileInput.required = true;
    fileInput.className = 'mt-1 block w-full';
    form.appendChild(makeField('Attachment (at least one required)', fileInput));

    // Buttons
    const btnRow  = document.createElement('div');
    btnRow.className = 'flex justify-end space-x-2';
    form.appendChild(btnRow);

    const cancelBtn = document.createElement('button');
    cancelBtn.type  = 'button';
    cancelBtn.id    = 'cancel-compose';
    cancelBtn.className =
      'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
    cancelBtn.innerHTML =
      '<span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span>'; // ⬅︎ ≤-- just markup string; safe & short
    btnRow.appendChild(cancelBtn);

    const sendBtn = document.createElement('button');
    sendBtn.type  = 'submit';
    sendBtn.className =
      'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
    sendBtn.innerHTML =
      '<span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Send</span>';
    btnRow.appendChild(sendBtn);

    // ─── Compose-form handlers ───────────────────────────
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      if (!fd.get('attachment') || !fd.get('attachment').name) {
        showDialogBox('Please attach at least one file.', 'error');
        return;
      }
      fetch('/api/submissions', { method: 'POST', body: fd })
        .then(r => {
          if (r.ok) {
            showDialogBox('Message sent successfully!', 'success');
            loadMessages();
            closeWindow('Compose Message');
          } else {
            showDialogBox('Error sending message.', 'error');
          }
        })
        .catch(() => showDialogBox('Error sending message.', 'error'));
    });

    cancelBtn.addEventListener('click', () => closeWindow('Compose Message'));
  }

  // ──────────────────────────────────────────────────────
  // 7.  Hook up events and start
  // ──────────────────────────────────────────────────────
  composeBtn.addEventListener('click', openCompose);
  loadMessages();
}
