// Function to initialize a single editor container
function initializeLetterPad(container) {
  // Skip if already initialized
  if (container.dataset.initialized === "true") return;
  container.dataset.initialized = "true";

  // Get the editor's unique ID from data attribute
  const editorId = container.getAttribute('data-letterpad-editor-id');
  const storageKey = `letterpad_${editorId}`;
  let storedContent = null;
  const storedData = storage.getItemSync(storageKey);
  if (storedData) {
    try {
      const jsonData = JSON.parse(storedData);
      storedContent = jsonData.content;
    } catch (e) {
      console.error('Error parsing stored markdown data for editor ' + editorId, e);
    }
  }

  // Build the Editor UI
  const editorWrapper = document.createElement('div');
  editorWrapper.className = "flex flex-col border rounded p-4 bg-white";

  // Toolbar (for formatting) – only visible if no stored content exists
  const toolbar = document.createElement('div');
  toolbar.className = "flex space-x-2 mb-2";

  // Dropdown for heading/text type
  const selectHeading = document.createElement('select');
  selectHeading.className = "border rounded p-1";
  const options = [
    { value: 'paragraph', text: 'Paragraph' },
    { value: 'h1', text: 'Heading 1' },
    { value: 'h2', text: 'Heading 2' },
    { value: 'h3', text: 'Heading 3' }
  ];
  options.forEach(optData => {
    const option = document.createElement('option');
    option.value = optData.value;
    option.textContent = optData.text;
    selectHeading.appendChild(option);
  });
  toolbar.appendChild(selectHeading);

  // Bold button
  const boldButton = document.createElement('button');
  boldButton.type = "button";
  boldButton.className = "border rounded p-1 hover:bg-gray-200";
  boldButton.textContent = "Bold";
  toolbar.appendChild(boldButton);

  // Italic button
  const italicButton = document.createElement('button');
  italicButton.type = "button";
  italicButton.className = "border rounded p-1 hover:bg-gray-200";
  italicButton.textContent = "Italic";
  toolbar.appendChild(italicButton);

  // Underline button (using HTML <u> tags)
  const underlineButton = document.createElement('button');
  underlineButton.type = "button";
  underlineButton.className = "border rounded p-1 hover:bg-gray-200";
  underlineButton.textContent = "Underline";
  toolbar.appendChild(underlineButton);

  // Editor textarea for Markdown input
  const textarea = document.createElement('textarea');
  textarea.className = "w-full h-40 border rounded p-2 mb-2";

  // Preview area (for rendered HTML)
  const previewArea = document.createElement('div');
  previewArea.className = "w-full h-40 border rounded p-2 overflow-auto";

  // Toggle button to switch between edit and preview modes
  const toggleButton = document.createElement('button');
  toggleButton.type = "button";
  toggleButton.className = "border rounded p-1 hover:bg-gray-200 self-end";
  if (storedContent) {
    toggleButton.textContent = "Edit";
  } else {
    toggleButton.textContent = "Save & Preview";
  }

  // Append all components into the wrapper
  editorWrapper.appendChild(toolbar);
  editorWrapper.appendChild(textarea);
  editorWrapper.appendChild(previewArea);
  editorWrapper.appendChild(toggleButton);
  container.appendChild(editorWrapper);

  // --- Initialization Based on Stored Data ---
  if (storedContent) {
    // If content exists in localStorage, load it in preview mode.
    textarea.value = storedContent;
    previewArea.innerHTML = convertMarkdownToHTML(storedContent);
    textarea.classList.add('hidden');
    toolbar.classList.add('hidden');
    toggleButton.classList.remove('hidden');
    previewArea.classList.remove('hidden');
  } else {
    // No stored content; start in edit mode with preview hidden.
    previewArea.classList.add('hidden');

    boldButton.addEventListener('mousedown', function(event) {
      event.preventDefault();
      applyFormatting('**', textarea);
    });

    italicButton.addEventListener('mousedown', function(event) {
      event.preventDefault();
      applyFormatting('*', textarea);
    });

    underlineButton.addEventListener('click', function() {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);
      if (selectedText.startsWith('<u>') && selectedText.endsWith('</u>')) {
        const newText = selectedText.substring(3, selectedText.length - 4);
        textarea.value = beforeText + newText + afterText;
      } else {
        const newText = `<u>${selectedText}</u>`;
        textarea.value = beforeText + newText + afterText;
      }
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = end + 7;
    });

    // Heading dropdown event: apply heading formatting to the current line.
    selectHeading.addEventListener('change', function() {
      const headingValue = selectHeading.value;
      const start = textarea.selectionStart;
      const value = textarea.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      let headingPrefix = '';
      if (headingValue === 'h1') headingPrefix = '# ';
      else if (headingValue === 'h2') headingPrefix = '## ';
      else if (headingValue === 'h3') headingPrefix = '### ';
      else headingPrefix = '';
      const lineEnd = value.indexOf('\n', start);
      const lineText = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
      const newLineText = lineText.replace(/^(#{1,6}\s)?/, headingPrefix);
      textarea.value = value.substring(0, lineStart) + newLineText + value.substring(lineEnd === -1 ? value.length : lineEnd);
    });
  }

  // Toggle button event listener: switch between edit and preview modes.
  toggleButton.addEventListener('click', function() {
    if (textarea.classList.contains('hidden')) {
      // Switch to Edit mode.
      previewArea.classList.add('hidden');
      textarea.classList.remove('hidden');
      toolbar.classList.remove('hidden');
      toggleButton.textContent = "Preview & Save";
    } else {
      // Convert Markdown to HTML, save to IndexedDB, then switch to Preview mode.
      const markdownText = textarea.value;
      previewArea.innerHTML = convertMarkdownToHTML(markdownText);
      storage.setItemSync(storageKey, JSON.stringify({ content: markdownText }));
      textarea.classList.add('hidden');
      previewArea.classList.remove('hidden');
      toggleButton.textContent = "Edit";
      toolbar.classList.add('hidden');
    }
  });
}

// Initialize editors that exist at DOMContentLoaded.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.letterpad_editor').forEach(function(container) {
    initializeLetterPad(container);
  });

  // Use a MutationObserver to catch new editor elements added later.
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // If the added node itself has the editor class, initialize it.
            if (node.classList.contains('letterpad_editor')) {
              initializeLetterPad(node);
            }
            // Also check its descendants.
            node.querySelectorAll && node.querySelectorAll('.letterpad_editor').forEach(child => {
              initializeLetterPad(child);
            });
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

// Helper to apply formatting (bold, italic, etc.)
function applyFormatting(symbol, textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start === end) return; // No text selected, do nothing

  const selectedText = textarea.value.substring(start, end);
  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);

  const symbolLength = symbol.length;
  const hasPrefix = selectedText.startsWith(symbol);
  const hasSuffix = selectedText.endsWith(symbol);

  let newText;
  let adjustment = 2 * symbolLength;

  if (hasPrefix && hasSuffix) {
    // Remove formatting
    newText = selectedText.slice(symbolLength, -symbolLength);
    adjustment = -adjustment;
  } else {
    // Apply formatting
    newText = symbol + selectedText + symbol;
  }

  textarea.value = beforeText + newText + afterText;

  // Restore focus and selection
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = start;
    textarea.selectionEnd = end + adjustment;
  }, 0);
}


// --- Markdown Conversion Function ---
function convertMarkdownToHTML(text) {
  let html = text;
  // Convert **bold** syntax
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert *italic* syntax
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Convert titles with Tailwind classes
  html = html.replace(/###### (.*)/g, '<h6 class="mt-1 mb-2 text-2xl">$1</h6>');
  html = html.replace(/##### (.*)/g, '<h5 class="mt-1 mb-2 text-3xl">$1</h5>');
  html = html.replace(/#### (.*)/g, '<h4 class="mt-1 mb-2 text-4xl">$1</h4>');
  html = html.replace(/### (.*)/g, '<h3 class="mt-1 mb-2 text-5xl">$1</h3>');
  html = html.replace(/## (.*)/g, '<h2 class="mt-1 mb-2 text-6xl">$1</h2>');
  html = html.replace(/# (.*)/g, '<h1 class="mt-1 mb-2 text-7xl">$1</h1>');
  // Convert newlines to <br> tags for display
  html = html.replace(/\n/g, '<br>');
  return html;
}
