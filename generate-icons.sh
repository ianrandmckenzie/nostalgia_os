#!/bin/bash

# Icon Generator Script for Spiral Animator
# This script helps convert your custom icons to the required Tauri icon formats
# including macOS, Windows, and Windows Store/UWP icons
#
# IMPORTANT: Tauri requires icons to be in RGBA format (not palette/colormap)
# This script ensures all generated icons use the proper RGBA format to avoid
# build errors like "icon is not RGBA"
#
# ICON MASKING STRATEGY:
# - Uses icon_masked.png (with rounded corners) for most platforms
# - Uses icon_masked.png (unmasked) for platforms that apply their own corner radius:
#   • iOS/Apple Touch (applies automatic corner radius)
#   • macOS ICNS (dock handles corner radius)
#   • Windows Store tiles (system applies corner radius)

echo "🎨 Spiral Animator Icon Generator"
echo ""

# Check if required icon files exist
if [ ! -f "icon.png" ]; then
    echo "❌ icon_masked.png not found in the current directory"
    echo "Please make sure you have an icon_masked.png file in the project root"
    exit 1
fi

if [ ! -f "icon_masked.png" ]; then
    echo "❌ icon_masked.png not found in the current directory"
    echo "Please create an icon_masked.png with rounded corners for platforms that don't handle their own masking"
    exit 1
fi

# Check for available image conversion tools
USE_IMAGEMAGICK=false
USE_SIPS=false
MAGICK_CMD=""

if command -v magick &> /dev/null; then
    USE_IMAGEMAGICK=true
    MAGICK_CMD="magick"
    echo "✅ Found ImageMagick v7+ (magick command)"
elif command -v convert &> /dev/null; then
    USE_IMAGEMAGICK=true
    MAGICK_CMD="convert"
    echo "✅ Found ImageMagick (convert command)"
elif command -v sips &> /dev/null; then
    USE_SIPS=true
    echo "✅ Found sips (macOS native)"
else
    echo "❌ No image conversion tool found"
    echo "Please install ImageMagick:"
    if command -v brew &> /dev/null; then
        echo "   brew install imagemagick"
    else
        echo "   Visit: https://imagemagick.org/script/download.php"
    fi
    exit 1
fi

echo "🔄 Converting icon_masked.png to required Tauri formats..."

# Create icons directory if it doesn't exist
mkdir -p src-tauri/icons
mkdir -p public

# Generate web favicon icons first
echo "🔄 Generating web favicon icons..."
if [ "$USE_IMAGEMAGICK" = true ]; then
    # Web favicons with explicit RGBA format
    # Use masked icon for web favicons (looks better in browsers)
    $MAGICK_CMD icon_masked.png -resize 96x96 -define png:color-type=6 public/favicon-96x96.png
    # Use unmasked icon for Apple Touch (iOS applies its own corner radius)
    $MAGICK_CMD icon_masked.png -resize 180x180 -define png:color-type=6 public/apple-touch-icon.png
    $MAGICK_CMD icon_masked.png -resize 32x32 -define png:color-type=6 public/favicon.ico

    # Generate SVG favicon (convert to SVG if possible, otherwise copy original if it's SVG)
    if [ -f "icon.svg" ]; then
        cp icon.svg public/favicon.svg
        echo "✅ Copied icon.svg to public/favicon.svg"
    else
        # Convert PNG to SVG (basic conversion) - use masked version
        $MAGICK_CMD icon_masked.png -resize 32x32 public/favicon.svg 2>/dev/null || {
            echo "⚠️  SVG conversion failed, creating PNG-based favicon.svg"
            $MAGICK_CMD icon_masked.png -resize 32x32 -define png:color-type=6 public/favicon.png
        }
    fi

elif [ "$USE_SIPS" = true ]; then
    # Web favicons using sips
    # Use masked icon for web favicons (looks better in browsers)
    sips -z 96 96 icon_masked.png --out public/favicon-96x96.png > /dev/null 2>&1
    # Use unmasked icon for Apple Touch (iOS applies its own corner radius)
    sips -z 180 180 icon_masked.png --out public/apple-touch-icon.png > /dev/null 2>&1
    sips -z 32 32 icon_masked.png --out public/favicon.ico > /dev/null 2>&1

    # Handle SVG favicon
    if [ -f "icon.svg" ]; then
        cp icon.svg public/favicon.svg
        echo "✅ Copied icon.svg to public/favicon.svg"
    else
        echo "⚠️  No icon.svg found, using PNG for favicon.svg"
        sips -z 32 32 icon_masked.png --out public/favicon.svg > /dev/null 2>&1
    fi
fi

echo "✅ Generated web favicon icons"

# Generate basic web manifest
cat > public/site.webmanifest << EOF
{
    "name": "Spiral Animator - Interactive Sound Grid",
    "short_name": "Spiral Animator",
    "description": "Interactive sound grid for creating and learning clicking sounds and glossolalia",
    "icons": [
        {
            "src": "/public/favicon-96x96.png",
            "sizes": "96x96",
            "type": "image/png"
        },
        {
            "src": "/public/apple-touch-icon.png",
            "sizes": "180x180",
            "type": "image/png"
        }
    ],
    "theme_color": "#1F1F1F",
    "background_color": "#1F1F1F",
    "display": "standalone",
    "start_url": "/"
}
EOF

echo "✅ Generated web manifest"

# Generate PNG icons with explicit RGBA format for Tauri compatibility
if [ "$USE_IMAGEMAGICK" = true ]; then
    # ImageMagick with explicit RGBA format
    # Use masked icons for most Tauri/desktop icons
    $MAGICK_CMD icon_masked.png -resize 32x32 -define png:color-type=6 src-tauri/icons/32x32.png
    $MAGICK_CMD icon_masked.png -resize 128x128 -define png:color-type=6 src-tauri/icons/128x128.png
    $MAGICK_CMD icon_masked.png -resize 256x256 -define png:color-type=6 src-tauri/icons/128x128@2x.png
    $MAGICK_CMD icon_masked.png -resize 1024x1024 -define png:color-type=6 src-tauri/icons/icon.png
elif [ "$USE_SIPS" = true ]; then
    # sips (macOS native) - generates RGBA by default
    # Use masked icons for most Tauri/desktop icons
    sips -z 32 32 icon_masked.png --out src-tauri/icons/32x32.png > /dev/null 2>&1
    sips -z 128 128 icon_masked.png --out src-tauri/icons/128x128.png > /dev/null 2>&1
    sips -z 256 256 icon_masked.png --out src-tauri/icons/128x128@2x.png > /dev/null 2>&1
    sips -z 1024 1024 icon_masked.png --out src-tauri/icons/icon.png > /dev/null 2>&1
fi

echo "✅ Generated PNG icons"

# Generate ICO for Windows (if we ever build for Windows)
if [ "$USE_IMAGEMAGICK" = true ]; then
    # Use masked icon for Windows ICO
    $MAGICK_CMD icon_masked.png -resize 256x256 -define png:color-type=6 src-tauri/icons/icon.ico
elif [ "$USE_SIPS" = true ]; then
    # sips doesn't support ICO directly, use PNG as fallback
    sips -z 256 256 icon_masked.png --out src-tauri/icons/icon.ico.png > /dev/null 2>&1
    echo "⚠️  Generated icon.ico.png instead of .ico (sips limitation)"
fi

echo "✅ Generated ICO icon"

# Generate Windows Store/UWP icons
echo "🔄 Generating Windows Store/UWP icons..."
if [ "$USE_IMAGEMAGICK" = true ]; then
    # Windows Store logos - use unmasked icon (Windows Store applies its own corner radius)
    $MAGICK_CMD icon_masked.png -resize 30x30 -define png:color-type=6 src-tauri/icons/Square30x30Logo.png
    $MAGICK_CMD icon_masked.png -resize 44x44 -define png:color-type=6 src-tauri/icons/Square44x44Logo.png
    $MAGICK_CMD icon_masked.png -resize 71x71 -define png:color-type=6 src-tauri/icons/Square71x71Logo.png
    $MAGICK_CMD icon_masked.png -resize 89x89 -define png:color-type=6 src-tauri/icons/Square89x89Logo.png
    $MAGICK_CMD icon_masked.png -resize 107x107 -define png:color-type=6 src-tauri/icons/Square107x107Logo.png
    $MAGICK_CMD icon_masked.png -resize 142x142 -define png:color-type=6 src-tauri/icons/Square142x142Logo.png
    $MAGICK_CMD icon_masked.png -resize 150x150 -define png:color-type=6 src-tauri/icons/Square150x150Logo.png
    $MAGICK_CMD icon_masked.png -resize 284x284 -define png:color-type=6 src-tauri/icons/Square284x284Logo.png
    $MAGICK_CMD icon_masked.png -resize 310x310 -define png:color-type=6 src-tauri/icons/Square310x310Logo.png
    $MAGICK_CMD icon_masked.png -resize 50x50 -define png:color-type=6 src-tauri/icons/StoreLogo.png
elif [ "$USE_SIPS" = true ]; then
    # Windows Store logos - use unmasked icon (Windows Store applies its own corner radius)
    sips -z 30 30 icon_masked.png --out src-tauri/icons/Square30x30Logo.png > /dev/null 2>&1
    sips -z 44 44 icon_masked.png --out src-tauri/icons/Square44x44Logo.png > /dev/null 2>&1
    sips -z 71 71 icon_masked.png --out src-tauri/icons/Square71x71Logo.png > /dev/null 2>&1
    sips -z 89 89 icon_masked.png --out src-tauri/icons/Square89x89Logo.png > /dev/null 2>&1
    sips -z 107 107 icon_masked.png --out src-tauri/icons/Square107x107Logo.png > /dev/null 2>&1
    sips -z 142 142 icon_masked.png --out src-tauri/icons/Square142x142Logo.png > /dev/null 2>&1
    sips -z 150 150 icon_masked.png --out src-tauri/icons/Square150x150Logo.png > /dev/null 2>&1
    sips -z 284 284 icon_masked.png --out src-tauri/icons/Square284x284Logo.png > /dev/null 2>&1
    sips -z 310 310 icon_masked.png --out src-tauri/icons/Square310x310Logo.png > /dev/null 2>&1
    sips -z 50 50 icon_masked.png --out src-tauri/icons/StoreLogo.png > /dev/null 2>&1
fi

echo "✅ Generated Windows Store/UWP icons"

# Generate ICNS for macOS
if command -v iconutil &> /dev/null && [ "$USE_IMAGEMAGICK" = true ]; then
    # Create iconset directory
    mkdir -p icon.iconset

    # Generate all required sizes for ICNS with explicit RGBA format
    $MAGICK_CMD icon_masked.png -resize 16x16 -define png:color-type=6 icon.iconset/icon_16x16.png
    $MAGICK_CMD icon_masked.png -resize 32x32 -define png:color-type=6 icon.iconset/icon_16x16@2x.png
    $MAGICK_CMD icon_masked.png -resize 32x32 -define png:color-type=6 icon.iconset/icon_32x32.png
    $MAGICK_CMD icon_masked.png -resize 64x64 -define png:color-type=6 icon.iconset/icon_32x32@2x.png
    $MAGICK_CMD icon_masked.png -resize 128x128 -define png:color-type=6 icon.iconset/icon_128x128.png
    $MAGICK_CMD icon_masked.png -resize 256x256 -define png:color-type=6 icon.iconset/icon_128x128@2x.png
    $MAGICK_CMD icon_masked.png -resize 256x256 -define png:color-type=6 icon.iconset/icon_256x256.png
    $MAGICK_CMD icon_masked.png -resize 512x512 -define png:color-type=6 icon.iconset/icon_256x256@2x.png
    $MAGICK_CMD icon_masked.png -resize 512x512 -define png:color-type=6 icon.iconset/icon_512x512.png
    $MAGICK_CMD icon_masked.png -resize 1024x1024 -define png:color-type=6 icon.iconset/icon_512x512@2x.png

    # Convert to ICNS
    iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns

    # Clean up
    rm -rf icon.iconset

    echo "✅ Generated ICNS icon"
elif command -v iconutil &> /dev/null && [ "$USE_SIPS" = true ]; then
    # Create iconset directory
    mkdir -p icon.iconset

    # Generate all required sizes for ICNS using sips
    sips -z 16 16 icon_masked.png --out icon.iconset/icon_16x16.png > /dev/null 2>&1
    sips -z 32 32 icon_masked.png --out icon.iconset/icon_16x16@2x.png > /dev/null 2>&1
    sips -z 32 32 icon_masked.png --out icon.iconset/icon_32x32.png > /dev/null 2>&1
    sips -z 64 64 icon_masked.png --out icon.iconset/icon_32x32@2x.png > /dev/null 2>&1
    sips -z 128 128 icon_masked.png --out icon.iconset/icon_128x128.png > /dev/null 2>&1
    sips -z 256 256 icon_masked.png --out icon.iconset/icon_128x128@2x.png > /dev/null 2>&1
    sips -z 256 256 icon_masked.png --out icon.iconset/icon_256x256.png > /dev/null 2>&1
    sips -z 512 512 icon_masked.png --out icon.iconset/icon_256x256@2x.png > /dev/null 2>&1
    sips -z 512 512 icon_masked.png --out icon.iconset/icon_512x512.png > /dev/null 2>&1
    sips -z 1024 1024 icon_masked.png --out icon.iconset/icon_512x512@2x.png > /dev/null 2>&1

    # Convert to ICNS
    iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns

    # Clean up
    rm -rf icon.iconset

    echo "✅ Generated ICNS icon"
else
    echo "⚠️  iconutil not found or no suitable image converter"
    echo "   ICNS icon generation skipped"
fi

echo ""
echo "🎉 Icon generation completed!"
echo ""
echo "📋 Icon Masking Strategy Applied:"
echo "   ✅ Used icon_masked.png for: web favicons, desktop PNG icons, Windows ICO"
echo "   ✅ Used icon_masked.png (unmasked) for: Apple Touch, macOS ICNS, Windows Store tiles"
echo "   ℹ️  This ensures optimal appearance across all platforms"
echo ""
echo "Generated Tauri icons in src-tauri/icons/:"
ls -la src-tauri/icons/
echo ""
echo "Generated web icons in public/:"
ls -la public/favicon* public/apple-touch-icon.png public/site.webmanifest 2>/dev/null || echo "  (Some web icons may not be present)"
echo ""

# Verify RGBA format for critical icons
echo "🔍 Verifying icon formats (ensuring RGBA for Tauri compatibility):"
if command -v file &> /dev/null; then
    for icon in "32x32.png" "128x128.png" "128x128@2x.png" "Square30x30Logo.png" "Square44x44Logo.png" "StoreLogo.png"; do
        if [ -f "src-tauri/icons/$icon" ]; then
            format=$(file "src-tauri/icons/$icon" | grep -o "RGBA\|colormap\|grayscale")
            if [[ $format == *"RGBA"* ]]; then
                echo "  ✅ $icon: RGBA format (good for Tauri)"
            else
                echo "  ⚠️  $icon: $format format (may cause Tauri build issues)"
            fi
        fi
    done
else
    echo "  ℹ️  Install 'file' command to verify icon formats"
fi

echo ""
echo "Your custom icons are now ready for both web and Tauri!"
echo "• Web icons: public/ directory (favicons and manifest)"
echo "• Tauri icons: src-tauri/icons/ directory (app icons)"
echo ""
echo "💡 To update icons in the future:"
echo "   • Edit icon_masked.png for the base unmasked version"
echo "   • Edit icon_masked.png for the version with rounded corners"
echo "   • Re-run this script to regenerate all platform-specific icons"
echo ""
echo "Run 'npm run dev' to test web icons or 'npm run tauri:build' to build with custom app icons!"
