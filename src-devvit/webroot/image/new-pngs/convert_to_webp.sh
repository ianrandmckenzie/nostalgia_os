#!/bin/zsh

# Check if imagemagick is installed.
if ! command -v magick &> /dev/null; then
    echo "ImageMagick is not installed. Please install it to use this script."
    exit 1
fi

# Get the directory where the script is located.
SCRIPT_DIR=$(dirname "$0")

# Check if there are any files to process.
if [ -z "$(find "$SCRIPT_DIR" -maxdepth 1 \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \))" ]; then
    echo "No JPG, JPEG, or PNG files found in this directory. Nothing to convert."
    exit 0
fi

echo "Found files to convert..."

# Find all jpg, jpeg and png files and process them.
find "$SCRIPT_DIR" -maxdepth 1 \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -print0 | while IFS= read -r -d '' file; do
    # Get the filename without the extension.
    filename=$(basename -- "$file")
    filename_no_ext="${filename%.*}"

    # Convert the file to webp.
    echo "Converting $filename to $filename_no_ext.webp"
    magick "$file" "$SCRIPT_DIR/$filename_no_ext.webp"
done

echo "Conversion complete."
