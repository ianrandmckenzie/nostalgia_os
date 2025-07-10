# Nostalgia OS Desktop App Installation Guide

## Download

Download the latest version of Nostalgia OS for your operating system from the [Releases](https://github.com/yourusername/nostalgia_os/releases) page.

## Installation Instructions

### macOS

1. Download the `.dmg` file from the releases page
2. Double-click the `.dmg` file to open it
3. Drag the Nostalgia OS app to your Applications folder
4. Open the app from Applications (you may need to right-click and select "Open" the first time due to macOS security)

### Windows

1. Download the `.exe` installer from the releases page
2. Double-click the installer and follow the setup wizard
3. The app will be installed and a desktop shortcut will be created
4. You can also find it in your Start menu

### Linux

#### Ubuntu/Debian (recommended)

1. Download the `.deb` file from the releases page
2. Install using the package manager:
   ```bash
   sudo dpkg -i nostalgia-os_*.deb
   sudo apt-get install -f  # Fix any dependency issues
   ```
3. Launch from the applications menu or run `nostalgia-os` in terminal

#### AppImage (universal)

1. Download the `.AppImage` file from the releases page
2. Make it executable:
   ```bash
   chmod +x nostalgia-os_*.AppImage
   ```
3. Run the application:
   ```bash
   ./nostalgia-os_*.AppImage
   ```

#### RPM-based (Fedora, CentOS, RHEL)

1. Download the `.rpm` file from the releases page
2. Install using your package manager:
   ```bash
   sudo rpm -i nostalgia-os_*.rpm
   ```
   or
   ```bash
   sudo dnf install nostalgia-os_*.rpm
   ```

## Troubleshooting

### macOS: "App can't be opened because it's from an unidentified developer"

1. Right-click the app and select "Open"
2. Click "Open" in the dialog that appears
3. Alternatively, go to System Preferences > Security & Privacy > General and click "Open Anyway"

### Windows: "Windows protected your PC"

1. Click "More info" in the warning dialog
2. Click "Run anyway"
3. This happens because the app isn't signed with a certificate yet

### Linux: Missing dependencies

If you get dependency errors, try:
- Ubuntu/Debian: `sudo apt-get install -f`
- Fedora: `sudo dnf install --skip-broken`

## Uninstallation

### macOS
- Simply drag the app from Applications to Trash

### Windows
- Use "Add or Remove Programs" in Windows Settings
- Or use the uninstaller from the Start menu

### Linux
- Ubuntu/Debian: `sudo apt-get remove nostalgia-os`
- Fedora: `sudo dnf remove nostalgia-os`
- AppImage: Simply delete the file

## Development

To run the app in development mode or build it yourself, see the [README.md](README.md) file for developer instructions.
