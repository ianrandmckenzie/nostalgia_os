#!/bin/bash

# Release script for Nostalgia OS
# Usage: ./release.sh [version]
# Example: ./release.sh 1.0.0

VERSION=${1}

if [ -z "$VERSION" ]; then
    echo "Usage: ./release.sh [version]"
    echo "Example: ./release.sh 1.0.0"
    exit 1
fi

# Update version in package.json
echo "Updating package.json version to $VERSION..."
npm version $VERSION --no-git-tag-version

# Update version in Cargo.toml
echo "Updating Cargo.toml version to $VERSION..."
sed -i '' "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

# Update version in tauri.conf.json
echo "Updating tauri.conf.json version to $VERSION..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

echo "Version updated to $VERSION in all files."
echo "Next steps:"
echo "1. Commit the changes: git add . && git commit -m \"Release v$VERSION\""
echo "2. Create a tag: git tag v$VERSION"
echo "3. Push the tag: git push origin v$VERSION"
echo "4. GitHub Actions will automatically build and create a release"
