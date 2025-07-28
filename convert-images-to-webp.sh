#!/bin/bash

# Script to convert images to WebP format
# Images >100KB: 70% quality (lossy)
# Images <=100KB: lossless conversion

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "Error: cwebp is not installed. Please install WebP tools:"
    echo "  macOS: brew install webp"
    echo "  Ubuntu/Debian: sudo apt-get install webp"
    echo "  CentOS/RHEL: sudo yum install libwebp-tools"
    exit 1
fi

# Configuration
SIZE_THRESHOLD=102400  # 100KB in bytes
LOSSY_QUALITY=70      # Quality for large images (70%)

# Supported image formats
IMAGE_EXTENSIONS=("jpg" "jpeg" "png" "gif" "bmp" "tiff")

# Statistics
total_files=0
converted_lossy=0
converted_lossless=0
skipped_files=0
total_size_before=0
total_size_after=0

# Function to format bytes in human readable format
format_bytes() {
    local bytes=$1
    if [[ $bytes -gt 1073741824 ]]; then
        echo "$((bytes / 1073741824))GB"
    elif [[ $bytes -gt 1048576 ]]; then
        echo "$((bytes / 1048576))MB"
    elif [[ $bytes -gt 1024 ]]; then
        echo "$((bytes / 1024))KB"
    else
        echo "${bytes}B"
    fi
}

echo "Starting image conversion to WebP..."
echo "Size threshold: 100KB"
echo "Lossy quality for large images: ${LOSSY_QUALITY}%"
echo "----------------------------------------"

# Function to convert a single image
convert_image() {
    local input_file="$1"
    local file_size=$(stat -f%z "$input_file" 2>/dev/null || stat -c%s "$input_file" 2>/dev/null)
    local output_file="${input_file%.*}.webp"

    # Skip if already a WebP file
    if [[ "${input_file}" == *.webp ]] || [[ "${input_file}" == *.WEBP ]]; then
        echo "Skipping (already WebP): $input_file"
        ((skipped_files++))
        return
    fi

    # Skip if output file already exists
    if [[ -f "$output_file" ]]; then
        echo "Skipping (WebP exists): $input_file"
        ((skipped_files++))
        return
    fi

    total_size_before=$((total_size_before + file_size))
    ((total_files++))

    if [[ $file_size -gt $SIZE_THRESHOLD ]]; then
        # Large file: use lossy compression with specified quality
        echo "Converting (lossy ${LOSSY_QUALITY}%): $input_file ($(format_bytes $file_size))"
        if cwebp -q $LOSSY_QUALITY "$input_file" -o "$output_file" >/dev/null 2>&1; then
            ((converted_lossy++))
        else
            echo "Error converting: $input_file"
            return
        fi
    else
        # Small file: use lossless compression
        echo "Converting (lossless): $input_file ($(format_bytes $file_size))"
        if cwebp -lossless "$input_file" -o "$output_file" >/dev/null 2>&1; then
            ((converted_lossless++))
        else
            echo "Error converting: $input_file"
            return
        fi
    fi

    # Get size of converted file
    if [[ -f "$output_file" ]]; then
        local output_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
        total_size_after=$((total_size_after + output_size))

        # Calculate compression ratio
        local ratio=$(( (file_size - output_size) * 100 / file_size ))
        echo "  → $(format_bytes $output_size) (${ratio}% reduction)"
    fi
}

# Find and convert all supported image files
for ext in "${IMAGE_EXTENSIONS[@]}"; do
    # Find files with current extension (case insensitive)
    while IFS= read -r -d '' file; do
        convert_image "$file"
    done < <(find . -type f \( -iname "*.${ext}" \) -print0 2>/dev/null)
done

echo "----------------------------------------"
echo "Conversion complete!"
echo "Files processed: $total_files"
echo "Converted with lossy compression: $converted_lossy"
echo "Converted with lossless compression: $converted_lossless"
echo "Skipped files: $skipped_files"

if [[ $total_files -gt 0 ]]; then
    echo "Total size before: $(format_bytes $total_size_before)"
    echo "Total size after: $(format_bytes $total_size_after)"

    if [[ $total_size_before -gt 0 ]]; then
        total_reduction=$(( (total_size_before - total_size_after) * 100 / total_size_before ))
        echo "Overall size reduction: ${total_reduction}%"
    fi
fi

echo ""
echo "Note: Original files have been preserved. You can manually delete them after verifying the WebP conversions."
echo "To remove original files, you can run:"
echo "  find . -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.gif' -o -iname '*.bmp' -o -iname '*.tiff' \) -exec rm {} \;"
