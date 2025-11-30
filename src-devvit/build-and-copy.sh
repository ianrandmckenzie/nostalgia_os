#!/bin/bash

# Script to build the Nostalgia OS project and copy files to Devvit webroot

echo "Building Nostalgia OS..."
cd ..
npm run build

echo "Copying built files to webroot..."
cp -r docs/* src-devvit/webroot/

echo "Done! Files updated in webroot."
