#!/bin/bash

# Build script for Nostalgia OS desktop application
# This script builds the application for the current platform

echo "Building Nostalgia OS desktop application..."
echo "Current platform: $(uname -s)"

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Error: Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run tauri:build

echo "Build complete!"
echo "Built files are located in src-tauri/target/release/bundle/"

# Show available installers
echo "Available installers:"
if [ -d "src-tauri/target/release/bundle" ]; then
    find src-tauri/target/release/bundle -type f \( -name "*.dmg" -o -name "*.app" -o -name "*.exe" -o -name "*.msi" -o -name "*.deb" -o -name "*.AppImage" -o -name "*.rpm" \) | sort
else
    echo "No build artifacts found. Please check for build errors."
fi
