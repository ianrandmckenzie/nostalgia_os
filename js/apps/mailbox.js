import { createWindow, closeWindow } from '../gui/window.js';
import { API_BASE_URL, SUGGESTIONS_LIST_PATH, SUGGESTIONS_SUBMISSIONS_PATH } from '../config.js';

export function launchMailbox() {
  // Play "you've got mail" sound when app opens
  try {
    const audio = new Audio('audio/youve_got_mail.mp3');
    audio.play().catch(err => console.log('Audio playback prevented:', err));
  } catch (err) {
    console.log('Could not play audio:', err);
  }

  // Check if running in Reddit context and prevent launch
  const isReddit = window.location.href.includes('reddit.com');
  if (isReddit) {
    // Check if error dialog is already open to prevent duplicates
    if (document.getElementById('mailbox-error')) {
      return;
    }

    // Create a simple error dialog without using showDialogBox
    const errorWindow = createWindow(
      '⚠️ Error',
      '<div class="text-center p-4"><p class="mb-4">Mail Box is not available in Reddit context.</p><button id="error-ok-btn" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 h-8" aria-label="Close error dialog" title="Close this error message"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1 px-3 leading-6">OK</span></button></div>',
      false,
      'mailbox-error',
      false,
      false,
      { type: 'integer', width: 300, height: 150 },
      'Default'
    );
    // Add click handler for OK button with proper delegation
    setTimeout(() => {
      const errorBtn = document.getElementById('error-ok-btn');
      if (errorBtn) {
        errorBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeWindow('mailbox-error');
        });
      }
    }, 100);
    return;
  }

  // ──────────────────────────────────────────────────────
  // 1.  Create an empty window for the mail box UI
  // ──────────────────────────────────────────────────────
  const win = createWindow(
    'Mail Box',
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

  initializeMailboxUI(win);
}

export function initializeMailboxUI(win) {
  if (!win) return;

  // content area provided by createWindow
  const root = win.querySelector('.p-2');
  if (!root) return;
  
  // Clear existing content to ensure clean state
  root.innerHTML = '';
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
  composeBtn.setAttribute('aria-label', 'Compose new email');
  composeBtn.setAttribute('title', 'Create and send a new email message');
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
  // 4.  Fetch and render message list from API
  // ──────────────────────────────────────────────────────

  // Helper function to parse API submission data
  function parseSubmissionData(apiData) {
    // The API now returns an array of objects directly, not a flat list of fields
    return apiData.map(item => {
      const files = {};
      ['file_1', 'file_2', 'file_3'].forEach(key => {
        if (item[key]) {
          const url = item[key];
          let name = 'attachment';
          try {
            name = url.split('/').pop().split('?')[0];
          } catch (e) {
            name = key;
          }
          files[key] = { name, url };
        }
      });

      return {
        id: item.id,
        email: item.email || item.name || 'Unknown',
        title: item.subject || 'No Subject',
        mail: item.message || '',
        phone: item.phone || '',
        company: item.company || '',
        timestamp: item.created_at || null,
        public: false,
        files: files
      };
    });
  }

  function loadMessages() {
    try {
      // Remove existing list items but keep the compose button
      while (listPane.children.length > 1) {
        listPane.removeChild(listPane.lastChild);
      }

      // Fetch messages from API
      fetch(`${API_BASE_URL}${SUGGESTIONS_LIST_PATH}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch submissions');
          }
          return response.json();
        })
        .then(result => {
          const submissions = parseSubmissionData(result.data);

          submissions.forEach(sub => {
            const item = document.createElement('div');
            item.className =
              'p-2 border-b border-gray-300 hover:bg-gray-200 cursor-pointer truncate';
            item.textContent = sub.title || sub.email;
            item.addEventListener('click', () => showMessage(sub));
            listPane.appendChild(item);
          });
        })
        .catch(err => {
          console.error('Error loading messages:', err);
          // Add error message to UI
          const errorItem = document.createElement('div');
          errorItem.className = 'p-2 text-red-500 text-sm';
          errorItem.textContent = 'Failed to load messages';
          listPane.appendChild(errorItem);
        });
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }


  // ──────────────────────────────────────────────────────
  // 5.  Render one message in the detail pane
  // ──────────────────────────────────────────────────────
  function showMessage(msg) {
    // clear previous contents
    while (detailPane.firstChild) detailPane.removeChild(detailPane.firstChild);

    // Header
    const header = document.createElement('div');
    header.className = 'mb-4 border-b border-gray-200 pb-2';

    const createRow = (label, value) => {
      const row = document.createElement('div');
      row.className = 'mb-1';
      const lbl = document.createElement('strong');
      lbl.textContent = label + ': ';
      row.append(lbl, document.createTextNode(value || ''));
      return row;
    };

    header.appendChild(createRow('From', msg.email));
    header.appendChild(createRow('Title', msg.title || '(No Title)'));
    if (msg.phone) header.appendChild(createRow('Phone', msg.phone));
    if (msg.company) header.appendChild(createRow('Company', msg.company));
    if (msg.timestamp) header.appendChild(createRow('Date', new Date(msg.timestamp).toLocaleString()));

    // Body
    const body = document.createElement('div');
    body.className = 'mb-2 whitespace-pre-wrap font-sans';
    body.textContent = msg.mail;

    detailPane.append(header, body);

    // Attachments
    if (msg.files && Object.keys(msg.files).length) {
      const atDiv = document.createElement('div');
      atDiv.className = 'mt-4 border-t border-gray-200 pt-2';

      const atTitle = document.createElement('strong');
      atTitle.textContent = 'Attachments:';
      atDiv.appendChild(atTitle);

      const container = document.createElement('div');
      container.className = 'flex flex-col gap-2 mt-2';

      Object.values(msg.files).forEach(f => {
        const url = f.url || f.contents;
        if (!url) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'border p-2 rounded bg-gray-50';

        // Determine type by extension
        const ext = url.split('.').pop().toLowerCase().split('?')[0];

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = f.name;
          img.className = 'max-w-full h-auto max-h-96 object-contain block mb-1';
          wrapper.appendChild(img);
        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = url;
          audio.className = 'w-full mb-1';
          wrapper.appendChild(audio);
        } else if (['mp4', 'webm'].includes(ext)) {
          const video = document.createElement('video');
          video.controls = true;
          video.src = url;
          video.className = 'max-w-full h-auto max-h-96 mb-1';
          wrapper.appendChild(video);
        }

        // Link to open/download
        const link = document.createElement('a');
        link.href        = url;
        link.className   = 'text-blue-500 hover:underline text-sm break-all';
        link.textContent = f.name;
        link.target      = '_blank';
        wrapper.appendChild(link);

        container.appendChild(wrapper);
      });

      atDiv.appendChild(container);
      detailPane.appendChild(atDiv);
    }
  }

  // ──────────────────────────────────────────────────────
  // 6.  Compose-message window, also without innerHTML
  // ──────────────────────────────────────────────────────
  function openCompose() {
    const cw = createWindow(
      'New Mail',
      '',
      false,
      'compose-mail',
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
    fromInput.id = 'from-email';
    fromInput.setAttribute('aria-label', 'Your email address');
    fromInput.setAttribute('aria-describedby', 'from-help');
    fromInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Your Email', fromInput));

    // To (fixed)
    const toInput = document.createElement('input');
    toInput.type  = 'text';
    toInput.name  = 'to';
    toInput.value = 'Nostalgia OS Team';
    toInput.readOnly = true;
    toInput.id = 'to-email';
    toInput.setAttribute('aria-label', 'Recipient');
    toInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2 bg-gray-100';
    form.appendChild(makeField('To', toInput));

    // Subject
    const subjInput = document.createElement('input');
    subjInput.type  = 'text';
    subjInput.name  = 'subject';
    subjInput.id = 'email-subject';
    subjInput.setAttribute('aria-label', 'Email subject line (optional)');
    subjInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Mail Title (optional)', subjInput));

    // Message body
    const msgArea = document.createElement('textarea');
    msgArea.name  = 'message';
    msgArea.required = true;
    msgArea.id = 'email-message';
    msgArea.setAttribute('aria-label', 'Email message content');
    msgArea.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Your Mail', msgArea));

    // Phone (optional)
    const phoneInput = document.createElement('input');
    phoneInput.type  = 'tel';
    phoneInput.name  = 'phone';
    phoneInput.id = 'phone-number';
    phoneInput.setAttribute('aria-label', 'Phone number (optional)');
    phoneInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Phone (optional)', phoneInput));

    // Company (optional)
    const companyInput = document.createElement('input');
    companyInput.type  = 'text';
    companyInput.name  = 'company';
    companyInput.id = 'company-name';
    companyInput.setAttribute('aria-label', 'Company name (optional)');
    companyInput.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Company (optional)', companyInput));

    // Remove attachment field as API doesn't support files

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
    cancelBtn.setAttribute('aria-label', 'Cancel mail composition');
    cancelBtn.setAttribute('title', 'Cancel and discard mail');
    btnRow.appendChild(cancelBtn);

    const sendBtn = document.createElement('button');
    sendBtn.type  = 'submit';
    sendBtn.className =
      'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
    sendBtn.innerHTML =
      '<span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Submit</span>';
    sendBtn.setAttribute('aria-label', 'Submit mail');
    sendBtn.setAttribute('title', 'Submit your mail');
    btnRow.appendChild(sendBtn);

    // ─── Compose-form handlers ───────────────────────────
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);

      // Semantic data structure
      const mailData = {
        email: fd.get('from'),
        title: fd.get('subject') || 'No Subject',
        mail: fd.get('message'),
        phone: fd.get('phone') || '',
        company: fd.get('company') || ''
      };

      // Map semantic data to API structure
      const apiPayload = {
        creator_model: {
          title: `Contact: ${mailData.title}`,
          feed_slug: "suggestions",
          model_type: 'page',
          creator_fields_attributes: {
            "0": { html_input_label: "name", string_content: mailData.email }, // Using email as name for now
            "1": { html_input_label: "email", string_content: mailData.email },
            "2": { html_input_label: "phone", string_content: mailData.phone },
            "3": { html_input_label: "company", string_content: mailData.company },
            "4": { html_input_label: "subject", string_content: mailData.title },
            "5": { html_input_label: "message", string_content: mailData.mail }
          }
        }
      };

      fetch(`${API_BASE_URL}${SUGGESTIONS_SUBMISSIONS_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      })
        .then(r => {
          if (r.ok) {
            showDialogBox('Mail submitted successfully!', 'success');
            loadMessages();
            closeWindow('compose-mail');
          } else {
            throw new Error('Failed to submit form');
          }
        })
        .catch(() => showDialogBox('Error submitting mail.', 'error'));
    });

    cancelBtn.addEventListener('click', () => closeWindow('compose-mail'));
  }

  // ──────────────────────────────────────────────────────
  // 7.  Hook up events and start
  // ──────────────────────────────────────────────────────
  composeBtn.addEventListener('click', openCompose);
  loadMessages();
}
