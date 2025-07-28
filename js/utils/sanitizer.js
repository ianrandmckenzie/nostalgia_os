/**
 * HTML Sanitization Utilities for Nostalgia OS
 * Provides safe HTML sanitization to prevent XSS attacks
 */

// TODO: Make better use of this

/**
 * Simple HTML sanitizer for trusted content
 * Removes dangerous elements and attributes while preserving basic formatting
 */
export function sanitizeHTML(html) {
  if (typeof html !== 'string') {
    return '';
  }

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove all script tags
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // Remove all on* event attributes from all elements
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    const attributes = [...element.attributes];
    attributes.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
        element.removeAttribute(attr.name);
      }
    });
  });

  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'style'];
  dangerousTags.forEach(tag => {
    const elements = temp.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });

  return temp.innerHTML;
}

/**
 * Sanitize text content to prevent XSS in text nodes
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const temp = document.createElement('div');
  temp.textContent = text;
  return temp.innerHTML;
}

/**
 * Safe innerHTML setter that sanitizes content first
 */
export function safeSetHTML(element, html) {
  if (!element || typeof element.innerHTML === 'undefined') {
    return false;
  }

  element.innerHTML = sanitizeHTML(html);
  return true;
}

/**
 * Escape HTML entities
 */
export function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Whitelist-based sanitizer for specific use cases
 */
export function sanitizeWithWhitelist(html, allowedTags = [], allowedAttributes = []) {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove elements not in whitelist
    if (!allowedTags.includes(element.tagName.toLowerCase())) {
      element.remove();
      return;
    }

    // Remove attributes not in whitelist
    const attributes = [...element.attributes];
    attributes.forEach(attr => {
      if (!allowedAttributes.includes(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
}
