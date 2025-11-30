import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const customConfigPath = path.join(__dirname, 'custom-config.js');
const configPath = path.join(__dirname, 'js', 'config.js');
const originalConfigPath = path.join(__dirname, 'js', 'config.original.js');
const cnamePath = path.join(__dirname, 'public', 'CNAME');
const originalCnamePath = path.join(__dirname, 'public', 'CNAME.original');

let activeConfigContent = '';

if (fs.existsSync(customConfigPath)) {
    console.log('Custom configuration found.');

    // Backup original config if not already backed up
    if (!fs.existsSync(originalConfigPath)) {
        if (fs.existsSync(configPath)) {
            fs.copyFileSync(configPath, originalConfigPath);
            console.log('Backed up original config to js/config.original.js');
        }
    }

    // Overwrite config.js with custom-config.js
    fs.copyFileSync(customConfigPath, configPath);
    console.log('Applied custom configuration to js/config.js');

    activeConfigContent = fs.readFileSync(customConfigPath, 'utf8');
} else {
    // Restore original config if it exists
    if (fs.existsSync(originalConfigPath)) {
        fs.copyFileSync(originalConfigPath, configPath);
        fs.unlinkSync(originalConfigPath);
        console.log('Restored original configuration to js/config.js');
    }

    // Restore original CNAME if it exists (when reverting to default)
    if (fs.existsSync(originalCnamePath)) {
        fs.copyFileSync(originalCnamePath, cnamePath);
        fs.unlinkSync(originalCnamePath);
        console.log('Restored original CNAME to public/CNAME');
    }

    if (fs.existsSync(configPath)) {
        activeConfigContent = fs.readFileSync(configPath, 'utf8');
    } else {
        console.error('Error: js/config.js not found.');
        process.exit(1);
    }
}

// Extract branding_images value using regex
const match = activeConfigContent.match(/branding_images:\s*['"]([^'"]+)['"]/);
let brandingDir = 'default_branding';
if (match && match[1]) {
    brandingDir = match[1];
}

console.log(`Using branding directory: ${brandingDir}`);

const brandingPath = path.join(__dirname, brandingDir);

if (!fs.existsSync(brandingPath)) {
    console.error(`Branding directory not found: ${brandingPath}`);
    process.exit(1);
}

// Handle CNAME specifically
const brandingCnamePath = path.join(brandingPath, 'CNAME');
if (fs.existsSync(brandingCnamePath)) {
    // If we have a custom CNAME, backup the original (if not already backed up)
    if (!fs.existsSync(originalCnamePath) && fs.existsSync(cnamePath)) {
        fs.copyFileSync(cnamePath, originalCnamePath);
        console.log('Backed up original CNAME to public/CNAME.original');
    }

    // Copy the custom CNAME
    const srcHash = getFileHash(brandingCnamePath);
    let destHash = '';
    if (fs.existsSync(cnamePath)) {
        destHash = getFileHash(cnamePath);
    }

    if (srcHash !== destHash) {
        fs.copyFileSync(brandingCnamePath, cnamePath);
        console.log(`Copied ${brandingDir}/CNAME to public/CNAME`);
    }
}

// Define mappings
// Source is relative to brandingDir
// Dest is relative to project root
const mappings = [
    { src: 'icon.png', dest: 'icon.png' },
    { src: 'icon.webp', dest: 'icon.webp' },
    { src: 'icon.png', dest: 'public/image/icon.png' },
    { src: 'icon.webp', dest: 'public/image/icon.webp' },
    { src: 'icon.gif', dest: 'public/image/icon.gif' },
    { src: 'icon.svg', dest: 'public/image/favicons/favicon.svg' }, // Direct copy if exists
    { src: 'logo.png', dest: 'public/image/logo.png' },
    { src: 'logo.webp', dest: 'public/image/logo.webp' },
    // For generate-icons.sh
    { src: 'icon.png', dest: 'icon_masked.png' },
    { src: 'icon.svg', dest: 'icon.svg' } // For generate-icons.sh to use
];

function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

let iconsNeedRegeneration = false;

mappings.forEach(({ src, dest }) => {
    const srcPath = path.join(brandingPath, src);
    const destPath = path.join(__dirname, dest);

    if (fs.existsSync(srcPath)) {
        // Ensure dest dir exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        let shouldCopy = true;
        if (fs.existsSync(destPath)) {
            const srcHash = getFileHash(srcPath);
            const destHash = getFileHash(destPath);
            if (srcHash === destHash) {
                shouldCopy = false;
            }
        }

        if (shouldCopy) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied ${src} to ${dest}`);

            // Check if this change should trigger icon regeneration
            if (dest === 'icon_masked.png' || dest === 'icon.svg') {
                iconsNeedRegeneration = true;
            }
        }
    } else {
        console.warn(`Warning: Source file ${src} not found in branding directory.`);
    }
});

// Check if output directories exist
const tauriIconsDir = path.join(__dirname, 'src-tauri', 'icons');
const webFaviconsDir = path.join(__dirname, 'public', 'image', 'favicons');

if (!fs.existsSync(tauriIconsDir) || !fs.existsSync(webFaviconsDir) || fs.readdirSync(tauriIconsDir).length === 0) {
    console.log('Icon directories missing or empty, forcing regeneration.');
    iconsNeedRegeneration = true;
}

if (iconsNeedRegeneration) {
    // Run generate-icons.sh
    console.log('Running generate-icons.sh...');
    try {
        // Make sure it's executable
        execSync('chmod +x generate-icons.sh');
        execSync('./generate-icons.sh', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error running generate-icons.sh:', error);
        process.exit(1);
    }
} else {
    console.log('Icons are up to date. Skipping generation.');
}

console.log('Branding setup complete.');
