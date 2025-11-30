# Custom Apps Generator

This project includes a custom app generator that allows you to easily create and add custom applications to the Nostalgia OS without modifying core code.

## Overview

Custom apps are defined in `custom_branding/custom_apps.json` and are automatically integrated into:
- The desktop as clickable icons
- The start menu (taskbar)
- The file system

## Configuration

### File Structure

```
custom_branding/
├── custom_apps.json    # App definitions
├── about-us.html       # Example app content
├── about-us.png        # Example app icon
└── ... (your custom HTML files and icons)
```

### App Configuration Schema

Edit `custom_branding/custom_apps.json`:

```json
{
  "apps": [
    {
      "title": "About Us",
      "html_file": "about-us.html",
      "app_icon": "about-us.png",
      "open_on_pageload": "false",
      "compostable": "false",
      "filepath": "C://Desktop",
      "taskbar": "true",
      "taskbar_location": "default"
    }
  ]
}
```

### Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes | Display name of the app |
| `html_file` | string | Yes | HTML file name in `custom_branding/` folder |
| `app_icon` | string | Yes | Icon file name in `custom_branding/` folder |
| `open_on_pageload` | string/boolean | Yes | Whether to auto-open when site loads (`"true"` or `"false"`) |
| `compostable` | string/boolean | Yes | Whether users can delete/move to compost bin (`"true"` or `"false"`) |
| `filepath` | string | Yes | Where to place the app icon. Currently only `"C://Desktop"` is supported |
| `taskbar` | string/boolean | Yes | Whether to show in the start menu (`"true"` or `"false"`) |
| `taskbar_location` | string | Yes | Where in the start menu to place the app (see below) |

### Taskbar Location Options

The `taskbar_location` property determines where your app appears in the start menu:

- `"default"` - Main menu area (appears before Utilities)
- `"games"` - Groups with other games
- `"utilities"` - Groups with utility apps
- `"custom"` or any other name - Creates a new submenu with that name

**Examples:**

```json
// Appears in main menu
{
  "taskbar_location": "default"
}

// Groups with games
{
  "taskbar_location": "games"
}

// Creates a "Business Apps" submenu
{
  "taskbar_location": "Business Apps"
}
```

## Creating a Custom App

### Step 1: Create Your HTML Content

Create an HTML file in the `custom_branding/` folder (e.g., `my-app.html`):

```html
<div class="p-4">
  <h1 class="text-2xl font-bold mb-4">My Custom App</h1>
  <p>Your custom content here...</p>

  <!-- You can use Tailwind CSS classes -->
  <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
    Click me
  </button>

  <!-- You can include JavaScript -->
  <script>
    console.log('App loaded!');

    // Access the window element if needed
    const windowElement = document.getElementById('custom-my-app');
    if (windowElement) {
      console.log('Window found:', windowElement);
    }
  </script>
</div>
```

**Tips for HTML Content:**

- The content is loaded into a window with class `.p-2` (padding)
- You can use Tailwind CSS classes for styling
- Scripts within your HTML will be executed
- The window ID will be `custom-[filename-without-extension]`
- You can use `overflow-auto` classes for scrollable content

### Step 2: Create an Icon

Create or add an icon file to `custom_branding/` (e.g., `my-app.png`). Recommended:

- Format: PNG with transparency
- Size: 64x64 pixels or higher
- Square aspect ratio

### Step 3: Add to Configuration

Add your app to `custom_branding/custom_apps.json`:

```json
{
  "apps": [
    {
      "title": "My Custom App",
      "html_file": "my-app.html",
      "app_icon": "my-app.png",
      "open_on_pageload": "false",
      "compostable": "true",
      "filepath": "C://Desktop",
      "taskbar": "true",
      "taskbar_location": "default"
    }
  ]
}
```

### Step 4: Build and Test

Run the build process:

```bash
npm run build
```

Start the development server (if applicable):

```bash
npm run dev
```

Open the site and look for your new app:
- On the desktop
- In the start menu
- Try opening it by double-clicking

## Advanced Usage

### Multiple Apps

Simply add multiple objects to the `apps` array:

```json
{
  "apps": [
    {
      "title": "App One",
      "html_file": "app-one.html",
      ...
    },
    {
      "title": "App Two",
      "html_file": "app-two.html",
      ...
    }
  ]
}
```

### Custom Taskbar Groups

Create organized groups in the start menu:

```json
{
  "apps": [
    {
      "title": "Sales Dashboard",
      "taskbar_location": "Business Tools",
      ...
    },
    {
      "title": "Analytics",
      "taskbar_location": "Business Tools",
      ...
    },
    {
      "title": "Fun Game",
      "taskbar_location": "games",
      ...
    }
  ]
}
```

This creates:
- A "Business Tools" submenu with Sales Dashboard and Analytics
- Adds Fun Game to the existing Games group

### Auto-Opening Apps

Set `open_on_pageload: "true"` to automatically open an app when the page loads:

```json
{
  "title": "Welcome Screen",
  "open_on_pageload": "true",
  ...
}
```

**Note:** Use sparingly - too many auto-opening apps can overwhelm users.

### Interacting with the OS

Your custom app HTML can interact with the Nostalgia OS:

```html
<script>
  // Access global OS functions
  if (typeof window.showDialogBox === 'function') {
    window.showDialogBox('Hello from custom app!', 'info');
  }

  // Open other apps
  if (typeof window.openApp === 'function') {
    // Opens calculator when button is clicked
    document.getElementById('my-button').addEventListener('click', () => {
      window.openApp('calculator');
    });
  }

  // Access file system (advanced)
  if (typeof window.openExplorer === 'function') {
    window.openExplorer('C://Documents');
  }
</script>
```

### Styling Best Practices

Use Tailwind CSS classes for consistent styling:

```html
<!-- Container with padding and scroll -->
<div class="p-4 h-full overflow-auto">
  <!-- Card-like section -->
  <div class="bg-white border border-gray-300 rounded-lg p-6 mb-4">
    <h2 class="text-xl font-bold mb-2">Section Title</h2>
    <p class="text-gray-700">Content here...</p>
  </div>

  <!-- Button with retro styling -->
  <button class="bg-gray-200 border-2 border-gray-400 px-4 py-2 hover:bg-gray-300">
    <span class="border-b-2 border-r-2 border-black block">
      Click Me
    </span>
  </button>
</div>
```

## Troubleshooting

### App Not Appearing

1. Check the browser console for errors
2. Verify JSON syntax in `custom_apps.json` (use a JSON validator)
3. Ensure HTML and icon files exist in `custom_branding/`
4. Rebuild the project: `npm run build`
5. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)

### App Opens But Content Missing

1. Check browser console for 404 errors
2. Verify `html_file` path is correct
3. Ensure HTML file is in `custom_branding/` folder
4. Check that HTML is valid

### Icon Not Showing

1. Verify `app_icon` path in configuration
2. Ensure icon file exists in `custom_branding/`
3. Try a different image format (PNG recommended)
4. Check browser DevTools Network tab for 404 errors

### JavaScript Not Working

1. Check browser console for errors
2. Ensure scripts are inside `<script>` tags
3. Test if global functions are available:
   ```javascript
   console.log('openApp available?', typeof window.openApp);
   ```
4. Wait for DOM to load before accessing elements

## Examples

### Simple Information Page

```json
{
  "title": "Company Info",
  "html_file": "company-info.html",
  "app_icon": "info.png",
  "open_on_pageload": "false",
  "compostable": "false",
  "filepath": "C://Desktop",
  "taskbar": "true",
  "taskbar_location": "default"
}
```

### Interactive Form

```json
{
  "title": "Contact Form",
  "html_file": "contact-form.html",
  "app_icon": "mail.png",
  "open_on_pageload": "false",
  "compostable": "true",
  "filepath": "C://Desktop",
  "taskbar": "true",
  "taskbar_location": "utilities"
}
```

### Welcome Screen (Auto-Opens)

```json
{
  "title": "Welcome",
  "html_file": "welcome.html",
  "app_icon": "star.png",
  "open_on_pageload": "true",
  "compostable": "false",
  "filepath": "C://Desktop",
  "taskbar": "false",
  "taskbar_location": "default"
}
```

## Technical Details

### How It Works

1. On app initialization, `js/apps/custom_apps.js` loads `custom_branding/custom_apps.json`
2. Custom apps are integrated into the file system at `C://Desktop`
3. Apps with `taskbar: true` are added to the start menu
4. When launched, the app's HTML content is fetched and loaded into a window
5. Scripts within the HTML are executed in the window context

### File Locations

- **Configuration**: `custom_branding/custom_apps.json`
- **HTML Content**: `custom_branding/*.html`
- **Icons**: `custom_branding/*.png` (or other image formats)
- **Module Code**: `js/apps/custom_apps.js`
- **Integration**: Modified files include:
  - `js/os/manage_data.js` - File system integration
  - `js/gui/start_menu.js` - Start menu integration
  - `js/apps/main.js` - App launcher
  - `js/index.js` - Page load auto-open

### Custom App IDs

Each custom app is assigned an ID: `custom-[filename-without-extension]`

Example: `about-us.html` becomes `custom-about-us`

This ID is used internally for:
- Window identification
- File system entries
- Start menu items
- Launch commands

## Limitations

- Currently, apps can only be placed on the Desktop (`filepath: "C://Desktop"`)
- Custom apps use a standard window template (800x600)
- No custom window sizing options yet
- HTML content must be self-contained or use external URLs
- No access to local file system operations

## Future Enhancements

Potential features for future versions:
- Custom window sizes per app
- Support for placing apps in other folders
- App-to-app communication
- Persistent app state/storage
- Custom context menu actions
- Window resize/maximize options per app

## Support

For issues or questions:
1. Check this documentation
2. Review the example app (`about-us.html`)
3. Check browser console for error messages
4. Verify JSON syntax
5. Ensure all referenced files exist

---

**Happy customizing!** 🎨
