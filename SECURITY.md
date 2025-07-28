# Security Guide for Nostalgia OS

## Overview

This document outlines the security measures implemented in Nostalgia OS and provides guidelines for secure development practices.

## Security Measures Implemented

### 1. Content Security Policy (CSP)

**Status**: ✅ Implemented

CSP headers are configured in both HTML files and Tauri configuration:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
media-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
```

### 2. Security Headers

**Status**: ✅ Implemented

The following security headers are configured:
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information

### 3. Code Injection Prevention

**Status**: ✅ Fixed

- Removed dangerous `new Function()` usage
- Implemented safe event dispatch system with whitelisted actions
- Added input validation for dynamic function calls

### 4. HTML Sanitization

**Status**: ✅ Implemented

Created comprehensive HTML sanitization utilities:
- `sanitizeHTML()` - General purpose HTML sanitizer
- `sanitizeWithWhitelist()` - Whitelist-based sanitization
- `escapeHTML()` - HTML entity escaping
- `safeSetHTML()` - Safe innerHTML replacement

### 5. Tauri Permissions

**Status**: ✅ Hardened

Replaced broad `core:default` permissions with minimal specific permissions:
- Window management permissions only
- App metadata access only
- No file system or network access unless specifically needed

### 6. Input Validation

**Status**: ✅ Implemented

- All user inputs are validated and sanitized
- Markdown content is sanitized before rendering
- Function calls are whitelisted to prevent code injection

## Security Guidelines for Developers

### 1. Never Use Dangerous Functions

❌ **NEVER USE:**
- `eval()`
- `new Function()`
- `innerHTML` with unsanitized content
- `document.write()`
- `setTimeout()/setInterval()` with string arguments

✅ **USE INSTEAD:**
- `safeSetHTML()` for HTML content
- `sanitizeHTML()` for user content
- Event listeners for dynamic behavior
- `textContent` for plain text

### 2. HTML Content Guidelines

```javascript
// ❌ Dangerous
element.innerHTML = userContent;

// ✅ Safe
import { safeSetHTML } from './utils/sanitizer.js';
safeSetHTML(element, userContent);
```

### 3. Event Handling

```javascript
// ❌ Dangerous
element.setAttribute('onclick', userCode);

// ✅ Safe
element.addEventListener('click', () => {
  // Validated and whitelisted actions only
});
```

### 4. Data Validation

```javascript
// ✅ Always validate user input
function processUserInput(input) {
  if (typeof input !== 'string' || input.length > MAX_LENGTH) {
    throw new Error('Invalid input');
  }
  return sanitizeHTML(input);
}
```

## Security Testing

### Automated Checks

Run the security check script regularly:
```bash
npm run security-check
```

This checks for:
- npm vulnerabilities
- Rust security issues
- CSP implementation
- Security headers
- Hardcoded secrets
- Build integrity

### Manual Testing

1. **XSS Testing**: Try injecting `<script>alert('xss')</script>` in user inputs
2. **Code Injection**: Test function calls with malicious payloads
3. **CSRF Protection**: Verify all state-changing operations are protected
4. **Content Validation**: Test with malformed HTML/Markdown

## Incident Response

### If a Security Issue is Discovered

1. **Immediate Response**
   - Assess the severity and impact
   - Document the vulnerability
   - Implement temporary mitigations if possible

2. **Fix Development**
   - Create a fix following security guidelines
   - Test thoroughly in isolated environment
   - Code review with security focus

3. **Deployment**
   - Deploy fix as soon as possible
   - Monitor for any related issues
   - Document the fix and lessons learned

### Reporting Security Issues

Security vulnerabilities should be reported to: hey@relentlesscurious.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested remediation (if applicable)

## Security Dependencies

### NPM Dependencies

All npm dependencies are automatically checked for vulnerabilities:
```bash
npm audit --audit-level moderate
```

### Rust Dependencies

Rust dependencies are checked using cargo-audit:
```bash
cargo audit
```

Note: GTK3 binding warnings are acceptable as they're deprecated but still secure for this use case.

## Best Practices Summary

1. **Input Validation**: Validate all user inputs
2. **Output Encoding**: Encode all outputs appropriately
3. **Least Privilege**: Use minimal required permissions
4. **Defense in Depth**: Implement multiple security layers
5. **Regular Updates**: Keep dependencies updated
6. **Security Testing**: Test security controls regularly
7. **Code Review**: Review all code changes for security implications

## Security Architecture

```
┌─────────────────┐
│   Browser       │
├─────────────────┤
│   CSP Headers   │ ← Content Security Policy
├─────────────────┤
│   HTML Sanitizer│ ← Input validation & sanitization
├─────────────────┤
│   Event System  │ ← Safe event handling
├─────────────────┤
│   Storage Layer │ ← Secure data storage
├─────────────────┤
│   Tauri Runtime │ ← Minimal permissions
└─────────────────┘
```

Each layer provides protection against different attack vectors, ensuring comprehensive security coverage.
