# Versioning System for NostalgiaOS

## Overview

NostalgiaOS now includes a versioning system that allows you to add new apps and default files without disrupting existing users' setups. This system uses a manifest file to track versions and an "OS Update" app to apply updates.

## How It Works

### 1. System Manifest

The system manifest (`public/api/system_manifest.json`) defines:
- System version
- List of default files with versions
- List of apps with versions

Each file and app has:
- **id**: Unique identifier
- **version**: Semantic version (e.g., "1.0.0")
- **name**: Display name
- **icon**: Icon path
- Other metadata specific to files or apps

### 2. Version Tracking

User installations track which versions are installed in IndexedDB under the key `installedVersions`:

```javascript
{
  systemVersion: "1.0.0",
  files: {
    "default-file-welcome": "1.0.0",
    "default-file-todo": "1.0.0",
    // ...
  },
  apps: {
    "mycomp": "1.0.0",
    "mediaapp": "1.0.0",
    // ...
  }
}
```

### 3. OS Update App

The OS Update app (`js/apps/os_update.js`):
- Fetches the system manifest from the server
- Compares manifest versions with installed versions
- Shows available updates
- Installs new files and apps without overwriting existing user data

## Adding New Default Files

To add a new default file:

1. **Create the file** in `public/default_files/`
   ```
   public/default_files/my_new_file.md
   ```

2. **Add entry to manifest** in `public/api/system_manifest.json`:
   ```json
   {
     "id": "default-file-mynewfile",
     "name": "my_new_file.md",
     "version": "1.0.0",
     "path": "default_files/my_new_file.md",
     "targetFolder": "C://Documents",
     "contentType": "md",
     "icon": "image/file.webp",
     "description": "Description of the file"
   }
   ```

3. **Increment system version** in the manifest:
   ```json
   {
     "version": "1.1.0",
     "lastUpdated": "2025-11-27",
     ...
   }
   ```

4. Users can then run **OS Update** to get the new file!

## Adding New Apps

To add a new app:

1. **Create the app** in `js/apps/my_new_app.js`

2. **Add entry to manifest**:
   ```json
   {
     "id": "mynewapp",
     "name": "My New App",
     "version": "1.0.0",
     "icon": "image/mynewapp.webp",
     "type": "app"
   }
   ```

3. **Register the app** in the necessary files:
   - `js/apps/main.js` - Add import and launch condition
   - `js/index.js` - Export launch function globally
   - `js/gui/start_menu.js` - Add to default menu items and click handler

4. **Increment system version** in the manifest

5. Users run **OS Update** to register the new app

## Updating Existing Files/Apps

To update an existing file or app:

1. **Make your changes** to the file or app code

2. **Increment the version** in the manifest:
   ```json
   {
     "id": "default-file-welcome",
     "version": "1.1.0",  // Changed from 1.0.0
     ...
   }
   ```

3. **Increment system version**

4. Users run **OS Update** to get the updates

## File Types Supported

### Text Files
- `.md` (Markdown)
- `.txt` (Plain text)
- `.html` (HTML)

Text files are stored directly in the file system state.

### Binary Files
- `.webp`, `.png`, `.jpg`, `.jpeg`, `.gif` (Images)
- `.mp3`, `.wav`, `.ogg` (Audio)

Binary files are converted to Data URLs and stored in IndexedDB.

## Important Notes

### Non-Destructive Updates
- **Existing user files are never modified or deleted**
- New files are only added if they don't already exist
- Apps are registered/updated but don't affect user data

### Version Comparison
The system uses semantic versioning comparison:
- `1.0.0` < `1.0.1` (patch update)
- `1.0.1` < `1.1.0` (minor update)
- `1.1.0` < `2.0.0` (major update)

### Target Folders
Default files can be placed in:
- `C://Documents` - For document files
- `C://Media` - For images and audio
- Other folders as needed

### File IDs
File IDs should be unique and prefixed with `default-file-` to distinguish them from user-created files.

## Testing Updates

To test the update system:

1. **Clear your local storage** to simulate a new user
2. **Load the site** - you'll have the old version
3. **Update the manifest** with new files/apps
4. **Open OS Update** from the Start Menu
5. **Click "Install Updates"** to apply changes

## Example: Adding a New Tutorial File

1. Create `public/default_files/tutorial.md`:
```markdown
# Getting Started Tutorial
...content...
```

2. Add to `public/api/system_manifest.json`:
```json
{
  "id": "default-file-tutorial",
  "name": "tutorial.md",
  "version": "1.0.0",
  "path": "default_files/tutorial.md",
  "targetFolder": "C://Documents",
  "contentType": "md",
  "icon": "image/file.webp",
  "description": "Getting started tutorial"
}
```

3. Change system version to "1.1.0"

4. Users with version 1.0.0 will see the update available!

## Manifest Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-27",
  "defaultFiles": [
    {
      "id": "unique-file-id",
      "name": "filename.ext",
      "version": "1.0.0",
      "path": "default_files/filename.ext",
      "targetFolder": "C://Documents",
      "contentType": "md",
      "icon": "image/file.webp",
      "description": "File description"
    }
  ],
  "apps": [
    {
      "id": "appid",
      "name": "App Name",
      "version": "1.0.0",
      "icon": "image/appicon.webp",
      "type": "app"
    }
  ]
}
```

## Future Enhancements

Possible improvements to the versioning system:
- Automatic update checks on startup
- Update notifications in the taskbar
- Rollback functionality
- Update history/changelog display
- Selective update installation
- Update scheduling
