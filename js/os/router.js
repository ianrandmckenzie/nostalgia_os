// Simple router for Nostalgia OS
import { openNav } from '../gui/taskbar.js';

// Security Policy content adapted for the window system
const SECURITY_POLICY_CONTENT = `
<div class="max-w-4xl mx-auto text-black font-mono bg-gray-50 p-6 h-full overflow-auto">
  <h1 class="text-3xl font-bold text-black mb-6">Security Policy</h1>

  <div class="bg-gray-100 rounded-lg p-4 mb-6 border border-gray-700">
    <p class="text-lg text-black mb-4">
      At relentlessCurious, we take security seriously. This policy outlines our commitment to maintaining a secure environment for our users and provides guidelines for responsible disclosure of security vulnerabilities.
    </p>
  </div>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Reporting Security Vulnerabilities</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <p class="text-black mb-3">
        If you discover a security vulnerability in our systems, please report it responsibly by contacting our developer, Ian, at:
      </p>
      <div class="bg-gray-200 rounded p-3 border border-gray-600 mb-3">
        <p class="text-black font-mono">hey@relentlesscurious.com</p>
      </div>
      <p class="text-black mb-3">
        Please include the following information in your report:
      </p>
      <ul class="list-disc list-inside text-black space-y-1 ml-4">
        <li>Description of the vulnerability</li>
        <li>Steps to reproduce the issue</li>
        <li>Potential impact assessment</li>
        <li>Suggested remediation (if applicable)</li>
        <li>Your contact information for follow-up</li>
      </ul>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Response Timeline</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-gray-200 rounded p-3 border border-gray-600">
          <h3 class="text-lg font-semibold text-black mb-2">Initial Response</h3>
          <p class="text-black">Within 48 hours of receiving your report</p>
        </div>
        <div class="bg-gray-200 rounded p-3 border border-gray-600">
          <h3 class="text-lg font-semibold text-black mb-2">Investigation</h3>
          <p class="text-black">Within 7 days for initial assessment</p>
        </div>
        <div class="bg-gray-200 rounded p-3 border border-gray-600">
          <h3 class="text-lg font-semibold text-black mb-2">Resolution</h3>
          <p class="text-black">Timeline varies based on severity</p>
        </div>
        <div class="bg-gray-200 rounded p-3 border border-gray-600">
          <h3 class="text-lg font-semibold text-black mb-2">Disclosure</h3>
          <p class="text-black">After fix is deployed and verified</p>
        </div>
      </div>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Scope</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <h3 class="text-lg font-semibold text-black mb-2">In Scope</h3>
      <ul class="list-disc list-inside text-black space-y-1 mb-3 ml-4">
        <li>relentlessCurious.com and all subdomains</li>
        <li>Web applications and APIs</li>
        <li>Smart contracts (when deployed)</li>
        <li>Infrastructure vulnerabilities</li>
        <li>Social engineering vulnerabilities</li>
      </ul>

      <h3 class="text-lg font-semibold text-black mb-2">Out of Scope</h3>
      <ul class="list-disc list-inside text-black space-y-1 ml-4">
        <li>Third-party services we don't control</li>
        <li>Social media accounts</li>
        <li>Physical security issues</li>
        <li>Denial of Service (DoS) attacks</li>
        <li>Spam or social engineering attacks</li>
      </ul>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Responsible Disclosure Guidelines</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <p class="text-black mb-3">We ask that security researchers:</p>
      <ul class="list-disc list-inside text-black space-y-1 ml-4">
        <li>Allow us reasonable time to investigate and address the issue before public disclosure</li>
        <li>Avoid accessing, modifying, or deleting user data</li>
        <li>Do not perform testing that could degrade or damage our systems</li>
        <li>Do not use social engineering, phishing, or physical attacks</li>
        <li>Make a good faith effort to avoid privacy violations and data destruction</li>
        <li>Contact us immediately if you inadvertently access sensitive data</li>
      </ul>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Security Measures</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <p class="text-black mb-3">Our security implementation includes:</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-black">Web Security</h3>
          <ul class="list-disc list-inside text-black text-sm space-y-1 ml-4">
            <li>Content Security Policy (CSP)</li>
            <li>HTTP Strict Transport Security (HSTS)</li>
            <li>Input validation and sanitization</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-black">Data Protection</h3>
          <ul class="list-disc list-inside text-black text-sm space-y-1 ml-4">
            <li>Encryption in transit and at rest</li>
            <li>Regular security audits</li>
            <li>Access controls and monitoring</li>
            <li>Secure development practices</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Recognition</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <p class="text-black mb-3">
        We appreciate the security research community's efforts in keeping our platform secure. Researchers who responsibly disclose valid security vulnerabilities may be:
      </p>
      <ul class="list-disc list-inside text-black space-y-1 ml-4">
        <li>Acknowledged in our security advisory (with permission)</li>
        <li>Listed in our hall of fame</li>
        <li>Considered for our bug bounty program (when available)</li>
      </ul>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-black mb-3">Legal Safe Harbor</h2>
    <div class="bg-gray-100 rounded-lg p-4 border border-gray-700">
      <p class="text-black">
        relentlessCurious will not pursue legal action against security researchers who:
      </p>
      <ul class="list-disc list-inside text-black space-y-1 mt-3 ml-4">
        <li>Follow our responsible disclosure policy</li>
        <li>Report vulnerabilities in good faith</li>
        <li>Do not violate any applicable laws</li>
        <li>Do not access, modify, or delete user data</li>
        <li>Do not disrupt our services</li>
      </ul>
    </div>
  </section>

  <footer class="mt-8 pt-6 border-t border-gray-700">
    <div class="text-center">
      <p class="text-black text-sm">
        Last updated: July 15, 2025
      </p>
      <p class="text-black text-sm mt-2">
        This policy is subject to change. Check back regularly for updates.
      </p>
    </div>
  </footer>
</div>
`;

// Router configuration
const routes = {
  '/security-policy': {
    title: 'Security Policy',
    content: SECURITY_POLICY_CONTENT,
    icon: 'image/info.webp'
  }
};

// Function to open security policy window
export function openSecurityPolicy() {
  openNav('Security Policy', SECURITY_POLICY_CONTENT, { type: 'integer', width: 800, height: 600 }, 'default');
}

// Function to handle route navigation
export function handleRoute(pathname) {
  const route = routes[pathname];
  if (route) {
    openNav(route.title, route.content, { type: 'integer', width: 800, height: 600 }, 'default');
    return true;
  }
  return false;
}

// Function to initialize routing on page load
export function initializeRouter() {
  const pathname = window.location.pathname;

  // Handle the security-policy route
  if (pathname === '/security-policy') {
    // Wait a moment for the app to fully initialize
    setTimeout(() => {
      handleRoute(pathname);
      // Update URL to remove the route path for SPA behavior
      window.history.replaceState({}, '', '/');
    }, 500);
  }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function(event) {
  const pathname = window.location.pathname;
  if (!handleRoute(pathname)) {
    // If no route matches, just stay on the main desktop
    console.log('No route found for:', pathname);
  }
});

// Export the routes for potential external use
export { routes };
