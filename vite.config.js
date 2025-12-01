// vite.config.js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

// Plugin to update CSP with API URLs from config.js
const cspInjectionPlugin = () => {
  return {
    name: 'csp-injection',
    transformIndexHtml(html) {
      try {
        const configContent = fs.readFileSync('js/config.js', 'utf-8');

        // Extract trusted_providers object
        const trustedProvidersMatch = /trusted_providers:\s*(\[\s*\{[\s\S]*?\}\s*\])/.exec(configContent);

        if (trustedProvidersMatch) {
          // We need to safely parse this JS object string into JSON
          // Since it's JS syntax (single quotes, no quotes on keys), we can't just JSON.parse
          // We'll use a Function constructor to evaluate it in a sandbox-like way
          // or just simple string manipulation if possible.
          // Given the complexity, let's try to evaluate it.
          const providersString = trustedProvidersMatch[1];
          // Replace single quotes with double quotes for JSON compatibility attempt,
          // but keys are unquoted.
          // Let's use new Function to return the array.
          const getProviders = new Function(`return ${providersString}`);
          const trustedProviders = getProviders();

          // Map of CSP directives to allowed domains
          const cspMap = {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://s.ytimg.com"],
            'script-src-elem': ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://s.ytimg.com"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", "data:", "blob:", "https://www.google.com", "https://*.gstatic.com", "https://i.ytimg.com"],
            'media-src': ["'self'", "data:", "blob:"],
            'font-src': ["'self'"],
            'connect-src': ["'self'", "https://www.relentlesscurious.com"],
            'frame-src': ["https://www.youtube.com"],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"]
          };

          trustedProviders.forEach(provider => {
            const domains = [...provider.domains, ...provider.dev_domains];
            provider.types.forEach(type => {
              let directive = '';
              switch(type) {
                case 'img': directive = 'img-src'; break;
                case 'audio': directive = 'media-src'; break;
                case 'video': directive = 'media-src'; break;
                case 'connect': directive = 'connect-src'; break;
                case 'frame': directive = 'frame-src'; break;
                case 'script': directive = 'script-src'; break;
                case 'style': directive = 'style-src'; break;
                case 'font': directive = 'font-src'; break;
              }

              if (directive && cspMap[directive]) {
                domains.forEach(domain => {
                  // Handle wildcards for CSP
                  let cspDomain = domain;
                  if (domain.startsWith('*.')) {
                    // CSP supports *.example.com
                    // But let's keep it as is if it's already in CSP format
                  }
                  // Add protocol if missing and not a wildcard/localhost
                  if (!cspDomain.startsWith('http') && !cspDomain.startsWith('*') && !cspDomain.includes('localhost')) {
                     // Actually CSP domains don't strictly need protocol, but it's safer to match config
                     // If the config has just domain, we might want to allow https://domain
                     if (!cspDomain.includes('://')) {
                        cspDomain = "https://" + cspDomain;
                     }
                  }
                  // For localhost, allow http
                  if (cspDomain.includes('localhost') && !cspDomain.startsWith('http')) {
                      cspDomain = "http://" + cspDomain;
                  }

                  // Avoid duplicates
                  if (!cspMap[directive].includes(cspDomain)) {
                    cspMap[directive].push(cspDomain);
                  }

                  // Sync script-src with script-src-elem
                  if (directive === 'script-src' && cspMap['script-src-elem']) {
                     if (!cspMap['script-src-elem'].includes(cspDomain)) {
                        cspMap['script-src-elem'].push(cspDomain);
                     }
                  }

                  // Also add non-protocol version if it was added with protocol, just in case?
                  // No, CSP is strict.
                });
              }
            });
          });

          // Construct the CSP string
          const cspString = Object.entries(cspMap)
            .map(([directive, sources]) => {
              return `${directive} ${sources.join(' ')}`;
            })
            .join('; ') + ';';

          const cspRegex = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/;
          return html.replace(cspRegex, `<meta http-equiv="Content-Security-Policy" content="${cspString}">`);
        }
      } catch (error) {
        console.warn('Failed to inject CSP URLs:', error);
      }
      return html;
    }
  }
}

export default defineConfig({
  plugins: [tailwindcss(), cspInjectionPlugin()],
  build: {
    outDir: 'docs',
    emptyOutDir: false, // Don't empty the docs directory to preserve existing files like CNAME
  },
  publicDir: 'public', // Ensure public files are copied
  server: {
    port: 5173,
    strictPort: true, // Fail if port 5173 is not available
    allowedHosts: ['localhost', 'irm-indev.ngrok.io']
  }
})
