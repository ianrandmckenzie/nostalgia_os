import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const customConfigPath = path.join(__dirname, 'custom-config.js');
const configPath = path.join(__dirname, 'js', 'config.js');
const originalConfigPath = path.join(__dirname, 'js', 'config.original.js');

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

mappings.forEach(({ src, dest }) => {
    const srcPath = path.join(brandingPath, src);
    const destPath = path.join(__dirname, dest);
    
    if (fs.existsSync(srcPath)) {
        // Ensure dest dir exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${src} to ${dest}`);
    } else {
        console.warn(`Warning: Source file ${src} not found in branding directory.`);
    }
});

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

console.log('Branding setup complete.');
