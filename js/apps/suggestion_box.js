import { createWindow, closeWindow } from '../gui/window.js';

export function launchSuggestionBox() {
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
    if (document.getElementById('suggestionbox-error')) {
      return;
    }

    // Create a simple error dialog without using showDialogBox
    const errorWindow = createWindow(
      '⚠️ Error',
      '<div class="text-center p-4"><p class="mb-4">Suggestion Box is not available in Reddit context.</p><button id="error-ok-btn" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 h-8" aria-label="Close error dialog" title="Close this error message"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1 px-3 leading-6">OK</span></button></div>',
      false,
      'suggestionbox-error',
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
          closeWindow('suggestionbox-error');
        });
      }
    }, 100);
    return;
  }

  // ──────────────────────────────────────────────────────
  // 1.  Create an empty window for the suggestion box UI
  // ──────────────────────────────────────────────────────
  const win = createWindow(
    'Suggestion Box',
    '',                      // start with no markup
    false,
    'suggestionbox',
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
  listPane.id      = 'suggestionbox-list';
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
  detailPane.id    = 'suggestionbox-detail';
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
        suggestion: item.message || '',
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
      fetch('http://abc.localhost:3000/end_data/public/ananan')
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
    body.textContent = msg.suggestion;

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
      'New Suggestion',
      '',
      false,
      'compose-suggestion',
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
    form.appendChild(makeField('Suggestion Title (optional)', subjInput));

    // Message body
    const msgArea = document.createElement('textarea');
    msgArea.name  = 'message';
    msgArea.required = true;
    msgArea.id = 'email-message';
    msgArea.setAttribute('aria-label', 'Email message content');
    msgArea.className =
      'mt-1 block w-full border border-gray-300 rounded p-2';
    form.appendChild(makeField('Your Suggestion', msgArea));

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
    cancelBtn.setAttribute('aria-label', 'Cancel suggestion composition');
    cancelBtn.setAttribute('title', 'Cancel and discard suggestion');
    btnRow.appendChild(cancelBtn);

    const sendBtn = document.createElement('button');
    sendBtn.type  = 'submit';
    sendBtn.className =
      'bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2';
    sendBtn.innerHTML =
      '<span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Submit</span>';
    sendBtn.setAttribute('aria-label', 'Submit suggestion');
    sendBtn.setAttribute('title', 'Submit your suggestion');
    btnRow.appendChild(sendBtn);

    // ─── Compose-form handlers ───────────────────────────
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);

      // Semantic data structure
      const suggestionData = {
        email: fd.get('from'),
        title: fd.get('subject') || 'No Subject',
        suggestion: fd.get('message'),
        phone: fd.get('phone') || '',
        company: fd.get('company') || ''
      };

      // Map semantic data to API structure
      const apiPayload = {
        creator_model: {
          title: `Contact: ${suggestionData.title}`,
          feed_slug: "suggestions",
          creator_fields_attributes: {
            "0": { html_input_label: "name", string_content: suggestionData.email }, // Using email as name for now
            "1": { html_input_label: "email", string_content: suggestionData.email },
            "2": { html_input_label: "phone", string_content: suggestionData.phone },
            "3": { html_input_label: "company", string_content: suggestionData.company },
            "4": { html_input_label: "subject", string_content: suggestionData.title },
            "5": { html_input_label: "message", string_content: suggestionData.suggestion }
          }
        }
      };

      fetch('http://abc.localhost:3000/end_data/public/kfjbwef', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      })
        .then(r => {
          if (r.ok) {
            showDialogBox('Suggestion submitted successfully!', 'success');
            loadMessages();
            closeWindow('compose-suggestion');
          } else {
            throw new Error('Failed to submit form');
          }
        })
        .catch(() => showDialogBox('Error submitting suggestion.', 'error'));
    });

    cancelBtn.addEventListener('click', () => closeWindow('compose-suggestion'));
  }

  // ──────────────────────────────────────────────────────
  // 7.  Hook up events and start
  // ──────────────────────────────────────────────────────
  composeBtn.addEventListener('click', openCompose);
  loadMessages();
}

/* ENDPOINTS INFO

📚 API Documentation
Contact Form API - Easy integration for developers

🚀 Quick Start
Our Contact Form API allows you to easily integrate contact form functionality into any website or application. Simply POST form data to our endpoint and we'll handle the rest.

Base URL: https://staging.failyourunit.tv
📝 Submit Contact Form
POST Submit a new contact form
https://staging.failyourunit.tv/end_data/public/contact-form-create
Parameters
Field	Type	Required	Description
name	string	Required	Full name of the person contacting
email	string	Required	Email address for response
subject	string	Required	Subject of the inquiry
message	string	Required	The message content
phone	string	Optional	Phone number for contact
company	string	Optional	Company name
JavaScript Example
async function submitContactForm(formData) { const data = { creator_model: { title: `Contact: ${formData.subject}`, creator_fields_attributes: { "0": { html_input_label: "name", string_content: formData.name }, "1": { html_input_label: "email", string_content: formData.email }, "2": { html_input_label: "phone", string_content: formData.phone || '' }, "3": { html_input_label: "company", string_content: formData.company || '' }, "4": { html_input_label: "subject", string_content: formData.subject }, "5": { html_input_label: "message", string_content: formData.message } } } }; try { const response = await fetch('https://staging.failyourunit.tv/end_data/public/contact-form-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (response.ok) { const result = await response.json(); console.log('Success:', result); return result; } else { throw new Error('Failed to submit form'); } } catch (error) { console.error('Error:', error); throw error; } } // Usage example: const formData = { name: 'John Doe', email: 'john@example.com', subject: 'General Inquiry', message: 'Hello, I have a question about your services.', phone: '555-123-4567', company: 'Example Corp' }; submitContactForm(formData) .then(result => console.log('Form submitted successfully')) .catch(error => console.error('Submission failed:', error));

jQuery Example
function submitContactForm(formData) { const data = { creator_model: { title: `Contact: ${formData.subject}`, creator_fields_attributes: { "0": { html_input_label: "name", string_content: formData.name }, "1": { html_input_label: "email", string_content: formData.email }, "2": { html_input_label: "phone", string_content: formData.phone || '' }, "3": { html_input_label: "company", string_content: formData.company || '' }, "4": { html_input_label: "subject", string_content: formData.subject }, "5": { html_input_label: "message", string_content: formData.message } } } }; return $.ajax({ url: 'https://staging.failyourunit.tv/end_data/public/contact-form-create', method: 'POST', contentType: 'application/json', data: JSON.stringify(data) }); } // Usage with jQuery: $('#contactForm').on('submit', function(e) { e.preventDefault(); const formData = { name: $('#name').val(), email: $('#email').val(), subject: $('#subject').val(), message: $('#message').val(), phone: $('#phone').val(), company: $('#company').val() }; submitContactForm(formData) .done(function(result) { alert('Thank you! Your message has been sent.'); $('#contactForm')[0].reset(); }) .fail(function() { alert('Sorry, there was an error sending your message.'); }); });

📊 List Submissions (Public)
GET Retrieve contact form submissions
https://staging.failyourunit.tv/end_data/public/contact-form-data
This endpoint returns all contact form submissions. Note: In a production environment, you may want to add authentication to this endpoint.

JavaScript Example
async function getContactSubmissions() { try { const response = await fetch('https://staging.failyourunit.tv/end_data/public/contact-form-data'); if (response.ok) { const result = await response.json(); const submissions = parseSubmissionData(result.data); return submissions; } else { throw new Error('Failed to fetch submissions'); } } catch (error) { console.error('Error:', error); throw error; } } function parseSubmissionData(apiData) { const submissionGroups = {}; apiData.forEach(field => { const submissionId = field.creator_model_id; if (!submissionGroups[submissionId]) { submissionGroups[submissionId] = { id: submissionId, fields: {}, created_at: field.created_at, updated_at: field.updated_at }; } submissionGroups[submissionId].fields[field.html_input_label] = { content: field.string_content || '', fieldId: field.id }; }); return Object.values(submissionGroups).map(group => ({ id: group.id, name: group.fields.name?.content || 'Unknown', email: group.fields.email?.content || '', phone: group.fields.phone?.content || '', company: group.fields.company?.content || '', subject: group.fields.subject?.content || 'No Subject', message: group.fields.message?.content || '', created_at: group.created_at, updated_at: group.updated_at })); } // Usage: getContactSubmissions() .then(submissions => { console.log('Retrieved submissions:', submissions); // Process submissions here }) .catch(error => console.error('Failed to get submissions:', error));

🔒 Authentication Required Endpoints
The following endpoints require authentication and appropriate user roles (Manager or Admin):

PUT Update a submission
https://staging.failyourunit.tv/end_data/contact-form-update
DELETE Delete a submission
https://staging.failyourunit.tv/end_data/contact-form-delete?id={submission_id}
Note: These endpoints require user authentication and appropriate permissions. Contact your system administrator for access.
📝 Response Format
Success Response
{ "data": { "id": 123, "title": "Contact: General Inquiry", "created_at": "2025-07-20T18:30:00Z", "updated_at": "2025-07-20T18:30:00Z" }, "message": "Data created successfully" }
Error Response
{ "error": "Validation failed: Email can't be blank" }

*/
