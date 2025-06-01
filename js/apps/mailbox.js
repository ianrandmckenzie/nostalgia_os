function launchMailbox() {
  // Build the mailbox app UI with a left message list and a right detail pane
  const content = `
    <div class="h-full flex flex-col">
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Column: Message List & Compose Button -->
        <div id="mailbox-list" class="w-1/3 border-r border-gray-300 flex flex-col overflow-y-auto">
          <button id="compose-btn" class="p-2 border-b border-gray-300 text-blue-500 hover:bg-gray-100">
            Compose
          </button>
          <!-- Message items will be appended here -->
        </div>
        <!-- Right Column: Message Details -->
        <div id="mailbox-detail" class="flex-1 p-2 overflow-y-auto">
          <div id="placeholder" class="text-gray-500">Select a message to view</div>
        </div>
      </div>
    </div>
  `;
  createWindow('Mailbox', content, false, 'mailbox', false, false, { type: 'integer', width: 600, height: 400 }, 'App', null, 'white');

  // Helper: Fetch messages from the API and populate the left column
  function loadMessages() {
    fetch('/api/submissions.json')
      .then(response => response.json())
      .then(data => {
        const mailboxList = document.getElementById('mailbox-list');
        // Remove any previously loaded message items (preserve the compose button)
        while (mailboxList.children.length > 1) {
          mailboxList.removeChild(mailboxList.lastChild);
        }
        // Add each submission as a clickable item
        data.submissions.forEach(submission => {
          const item = document.createElement('div');
          item.className = "p-2 border-b border-gray-300 hover:bg-gray-200 cursor-pointer truncate";
          // Display subject if available, otherwise fallback to sender email
          item.textContent = submission.subject ? submission.subject : submission.email;
          item.addEventListener('click', function() {
            showMessage(submission);
          });
          mailboxList.appendChild(item);
        });
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
      });
  }

  // Helper: Display a selected message in the right column
  function showMessage(message) {
    const detail = document.getElementById('mailbox-detail');
    detail.innerHTML = ''; // Clear any previous message detail

    // Header with sender and subject
    const header = document.createElement('div');
    header.className = "mb-2";
    header.innerHTML = `
      <div><strong>From:</strong> ${message.email}</div>
      <div><strong>Subject:</strong> ${message.subject ? message.subject : '(No Subject)'}</div>
    `;
    // Message body
    const body = document.createElement('div');
    body.className = "mb-2 whitespace-pre-wrap";
    body.textContent = message.textarea;

    detail.appendChild(header);
    detail.appendChild(body);

    // Render attachments if any exist
    if (message.files && Object.keys(message.files).length > 0) {
      const attachmentsDiv = document.createElement('div');
      attachmentsDiv.className = "mt-2";
      attachmentsDiv.innerHTML = `<strong>Attachments:</strong>`;
      const fileList = document.createElement('ul');
      fileList.className = "list-disc list-inside";
      Object.values(message.files).forEach(file => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        // Prefer 'url' if available, otherwise 'contents'
        link.href = file.url || file.contents || "#";
        link.className = 'text-blue-500 hover:underline'
        link.textContent = file.name;
        link.target = "_blank";
        li.appendChild(link);
        fileList.appendChild(li);
      });
      attachmentsDiv.appendChild(fileList);
      detail.appendChild(attachmentsDiv);
    }
  }

  // Helper: Open a new window with a compose message form
  function openCompose() {
    const composeContent = `
      <div class="p-4">
        <form id="compose-form" class="flex flex-col space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">From</label>
            <input type="email" name="from" required class="mt-1 block w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">To</label>
            <input type="email" name="to" value="person@example.com" readonly class="mt-1 block w-full border border-gray-300 rounded p-2 bg-gray-100" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Subject (optional)</label>
            <input type="text" name="subject" class="mt-1 block w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Message</label>
            <textarea name="message" required class="mt-1 block w-full border border-gray-300 rounded p-2"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Attachment (at least one required)</label>
            <input type="file" name="attachment" required class="mt-1 block w-full" />
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" id="cancel-compose" onclick="closeWindow('Compose Message'); event.stopPropagation();" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Cancel</span></button>
            <button type="submit" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">Send</span></button>
          </div>
        </form>
      </div>
    `;
    createWindow('Compose Message', composeContent, false, 'Compose Message', false, false, { type: 'integer', width: 400, height: 600 }, 'App', null, 'white');

    // Attach events to the compose form elements once the window content is rendered
    const composeForm = document.getElementById('compose-form');
    composeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(composeForm);
      // Ensure that an attachment is provided (input is required, but double-check)
      if (!formData.get('attachment') || !formData.get('attachment').name) {
        showDialogBox('Please attach at least one file.', 'error');
        return;
      }
      // Submit the form data via POST to the submissions endpoint
      fetch('/api/submissions', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (response.ok) {
          showDialogBox("Message sent successfully!", 'success');
          loadMessages(); // Refresh the mailbox list
          // Close the compose window if a close function is available
          if (typeof closeCurrentWindow === 'function') {
            closeCurrentWindow();
          }
        } else {
          showDialogBox("Error sending message.", 'error');
        }
      })
      .catch(err => {
        console.error(err);
        showDialogBox("Error sending message.", 'error');
      });
    });
    // Handle cancellation of compose
    const cancelBtn = document.getElementById('cancel-compose');
    cancelBtn.addEventListener('click', function() {
      if (typeof closeCurrentWindow === 'function') {
        closeCurrentWindow();
      }
    });
  }

  // Bind the compose button in the mailbox window to open the compose message window
  document.getElementById('compose-btn').addEventListener('click', openCompose);

  // Load messages immediately upon launching the mailbox
  loadMessages();
}
