// Function to detect double tap on mobile
export function detectDoubleTap(element) {
  let lastTouchTime = 0;

  element.addEventListener("pointerdown", function (event) {
    let currentTime = new Date().getTime();
    let timeDiff = currentTime - lastTouchTime;

    if (timeDiff < 300 && timeDiff > 0) {
      // Dispatch a custom "mobiledbltap" event
      let customEvent = new Event("mobiledbltap");
      element.dispatchEvent(customEvent);
    }

    lastTouchTime = currentTime;
  });
}

// Initialize mobile interactions
export function initializeMobileInteractions() {
    // Add support for the custom "mobiledbltap" event on all elements
    document.querySelectorAll("[onmobiledbltap]").forEach(element => {
      detectDoubleTap(element);

      // Attach the inline attribute function dynamically using safe event dispatch
      element.addEventListener("mobiledbltap", function () {
        let funcCall = element.getAttribute("onmobiledbltap");
        if (funcCall) {
          try {
            // Safe alternative: dispatch a custom event instead of executing arbitrary code
            const customEvent = new CustomEvent('mobiledbltap-action', {
              detail: { action: funcCall, element: element }
            });
            document.dispatchEvent(customEvent);
          } catch (error) {
            console.error(`Error dispatching event for: ${funcCall}`, error);
          }
        }
      });
    });

    // Safe event handler for mobile double-tap actions
    document.addEventListener('mobiledbltap-action', function(event) {
      const { action, element } = event.detail;

      // Whitelist of allowed function calls to prevent code injection
      const allowedActions = [
        'openExplorerInNewWindow',
        'openApp',
        'openShortcut'
      ];

      // Parse the action to extract function name and arguments
      const match = action.match(/^(\w+)\((.*)\)$/);
      if (match) {
        const [, funcName, args] = match;

        if (allowedActions.includes(funcName)) {
          try {
            // Safely call whitelisted functions
            if (funcName === 'openExplorerInNewWindow' && window.openExplorerInNewWindow) {
              // Parse arguments safely
              const argValue = args.replace(/['"]/g, '');
              window.openExplorerInNewWindow(argValue);
            } else if (funcName === 'openApp' && window.openApp) {
              const argValue = args.replace(/['"]/g, '');
              window.openApp(argValue);
            } else if (funcName === 'openShortcut' && window.openShortcut) {
              window.openShortcut(element);
            }
          } catch (error) {
            console.error(`Error executing safe action ${funcName}:`, error);
          }
        } else {
          console.warn(`Blocked potentially unsafe action: ${funcName}`);
        }
      } else {
        console.warn(`Invalid action format: ${action}`);
      }
    });
}
