#!/bin/bash

# Icon Generator Script for Click Rippler
# This script helps convert your custom icon.png to the required Tauri icon formats
# including macOS, Windows, and Windows Store/UWP icons
#
# IMPORTANT: Tauri requires icons to be in RGBA format (not palette/colormap)
# This script ensures all generated icons use the proper RGBA format to avoid
# build errors like "icon is not RGBA"

echo "🎨 Click Rippler Icon Generator"
echo ""

# Check if icon.png exists
if [ ! -f "icon.png" ]; then
    echo "❌ icon.png not found in the current directory"
    echo "Please make sure you have an icon.png file in the project root"
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

echo "🔄 Converting icon.png to required Tauri formats..."

# Create icons directory if it doesn't exist
mkdir -p src-tauri/icons

# Generate PNG icons with explicit RGBA format for Tauri compatibility
if [ "$USE_IMAGEMAGICK" = true ]; then
    # ImageMagick with explicit RGBA format
    $MAGICK_CMD icon.png -resize 32x32 -define png:color-type=6 src-tauri/icons/32x32.png
    $MAGICK_CMD icon.png -resize 128x128 -define png:color-type=6 src-tauri/icons/128x128.png
    $MAGICK_CMD icon.png -resize 256x256 -define png:color-type=6 src-tauri/icons/128x128@2x.png
    $MAGICK_CMD icon.png -resize 1024x1024 -define png:color-type=6 src-tauri/icons/icon.png
elif [ "$USE_SIPS" = true ]; then
    # sips (macOS native) - generates RGBA by default
    sips -z 32 32 icon.png --out src-tauri/icons/32x32.png > /dev/null 2>&1
    sips -z 128 128 icon.png --out src-tauri/icons/128x128.png > /dev/null 2>&1
    sips -z 256 256 icon.png --out src-tauri/icons/128x128@2x.png > /dev/null 2>&1
    sips -z 1024 1024 icon.png --out src-tauri/icons/icon.png > /dev/null 2>&1
fi

echo "✅ Generated PNG icons"

# Generate ICO for Windows (if we ever build for Windows)
if [ "$USE_IMAGEMAGICK" = true ]; then
    $MAGICK_CMD icon.png -resize 256x256 -define png:color-type=6 src-tauri/icons/icon.ico
elif [ "$USE_SIPS" = true ]; then
    # sips doesn't support ICO directly, use PNG as fallback
    sips -z 256 256 icon.png --out src-tauri/icons/icon.ico.png > /dev/null 2>&1
    echo "⚠️  Generated icon.ico.png instead of .ico (sips limitation)"
fi

echo "✅ Generated ICO icon"

# Generate Windows Store/UWP icons
echo "🔄 Generating Windows Store/UWP icons..."
if [ "$USE_IMAGEMAGICK" = true ]; then
    # Windows Store logos with explicit RGBA format
    $MAGICK_CMD icon.png -resize 30x30 -define png:color-type=6 src-tauri/icons/Square30x30Logo.png
    $MAGICK_CMD icon.png -resize 44x44 -define png:color-type=6 src-tauri/icons/Square44x44Logo.png
    $MAGICK_CMD icon.png -resize 71x71 -define png:color-type=6 src-tauri/icons/Square71x71Logo.png
    $MAGICK_CMD icon.png -resize 89x89 -define png:color-type=6 src-tauri/icons/Square89x89Logo.png
    $MAGICK_CMD icon.png -resize 107x107 -define png:color-type=6 src-tauri/icons/Square107x107Logo.png
    $MAGICK_CMD icon.png -resize 142x142 -define png:color-type=6 src-tauri/icons/Square142x142Logo.png
    $MAGICK_CMD icon.png -resize 150x150 -define png:color-type=6 src-tauri/icons/Square150x150Logo.png
    $MAGICK_CMD icon.png -resize 284x284 -define png:color-type=6 src-tauri/icons/Square284x284Logo.png
    $MAGICK_CMD icon.png -resize 310x310 -define png:color-type=6 src-tauri/icons/Square310x310Logo.png
    $MAGICK_CMD icon.png -resize 50x50 -define png:color-type=6 src-tauri/icons/StoreLogo.png
elif [ "$USE_SIPS" = true ]; then
    # Windows Store logos using sips (generates RGBA by default)
    sips -z 30 30 icon.png --out src-tauri/icons/Square30x30Logo.png > /dev/null 2>&1
    sips -z 44 44 icon.png --out src-tauri/icons/Square44x44Logo.png > /dev/null 2>&1
    sips -z 71 71 icon.png --out src-tauri/icons/Square71x71Logo.png > /dev/null 2>&1
    sips -z 89 89 icon.png --out src-tauri/icons/Square89x89Logo.png > /dev/null 2>&1
    sips -z 107 107 icon.png --out src-tauri/icons/Square107x107Logo.png > /dev/null 2>&1
    sips -z 142 142 icon.png --out src-tauri/icons/Square142x142Logo.png > /dev/null 2>&1
    sips -z 150 150 icon.png --out src-tauri/icons/Square150x150Logo.png > /dev/null 2>&1
    sips -z 284 284 icon.png --out src-tauri/icons/Square284x284Logo.png > /dev/null 2>&1
    sips -z 310 310 icon.png --out src-tauri/icons/Square310x310Logo.png > /dev/null 2>&1
    sips -z 50 50 icon.png --out src-tauri/icons/StoreLogo.png > /dev/null 2>&1
fi

echo "✅ Generated Windows Store/UWP icons"

# Generate ICNS for macOS
if command -v iconutil &> /dev/null && [ "$USE_IMAGEMAGICK" = true ]; then
    # Create iconset directory
    mkdir -p icon.iconset

    # Generate all required sizes for ICNS with explicit RGBA format
    $MAGICK_CMD icon.png -resize 16x16 -define png:color-type=6 icon.iconset/icon_16x16.png
    $MAGICK_CMD icon.png -resize 32x32 -define png:color-type=6 icon.iconset/icon_16x16@2x.png
    $MAGICK_CMD icon.png -resize 32x32 -define png:color-type=6 icon.iconset/icon_32x32.png
    $MAGICK_CMD icon.png -resize 64x64 -define png:color-type=6 icon.iconset/icon_32x32@2x.png
    $MAGICK_CMD icon.png -resize 128x128 -define png:color-type=6 icon.iconset/icon_128x128.png
    $MAGICK_CMD icon.png -resize 256x256 -define png:color-type=6 icon.iconset/icon_128x128@2x.png
    $MAGICK_CMD icon.png -resize 256x256 -define png:color-type=6 icon.iconset/icon_256x256.png
    $MAGICK_CMD icon.png -resize 512x512 -define png:color-type=6 icon.iconset/icon_256x256@2x.png
    $MAGICK_CMD icon.png -resize 512x512 -define png:color-type=6 icon.iconset/icon_512x512.png
    $MAGICK_CMD icon.png -resize 1024x1024 -define png:color-type=6 icon.iconset/icon_512x512@2x.png

    # Convert to ICNS
    iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns

    # Clean up
    rm -rf icon.iconset

    echo "✅ Generated ICNS icon"
elif command -v iconutil &> /dev/null && [ "$USE_SIPS" = true ]; then
    # Create iconset directory
    mkdir -p icon.iconset

    # Generate all required sizes for ICNS using sips
    sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png > /dev/null 2>&1
    sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png > /dev/null 2>&1
    sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png > /dev/null 2>&1
    sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png > /dev/null 2>&1
    sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png > /dev/null 2>&1
    sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png > /dev/null 2>&1
    sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png > /dev/null 2>&1
    sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png > /dev/null 2>&1
    sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png > /dev/null 2>&1
    sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png > /dev/null 2>&1

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
echo "Generated icons in src-tauri/icons/:"
ls -la src-tauri/icons/
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
echo "Your custom icons are now ready. Run 'npm run tauri:build' to build with your custom icons!"
