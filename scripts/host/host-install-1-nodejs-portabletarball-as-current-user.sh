#!/bin/bash

echo "WARNING CHANGING YOUR SYSTEM!!!!!!!
This will install Node.js and npm for the current user. Are you sure you want to proceed? (y/n) " choice

# Step 1: Fetch the latest version from Node.js website
LATEST_VERSION=$(curl -s https://nodejs.org/dist/latest/ | grep -oP 'node-v[\d.]+-linux-x64.tar.xz' | head -1)
# Step 2: Download the latest Node.js tarball
echo "Downloading $LATEST_VERSION..."
curl -O https://nodejs.org/dist/latest/$LATEST_VERSION
# Step 3: Extract the tarball
echo "Extracting $LATEST_VERSION..."
tar -xf $LATEST_VERSION
# Step 4: Set environment variables
EXTRACTED_DIR=$(echo $LATEST_VERSION | sed 's/.tar.xz//')
export NODEJS_HOME=$PWD/$EXTRACTED_DIR/bin
export PATH=$NODEJS_HOME:$PATH
# Step 5: Verify installation
echo "Node.js version:"
node -v
echo "npm version:"
npm -v
echo "npx version:"
npx -v
# Update ~/.bashrc for Bash users
echo "Updating ~/.bashrc for persistent environment variables..."
echo "export NODEJS_HOME=$NODEJS_HOME" >> ~/.bashrc
echo "export PATH=\$NODEJS_HOME:\$PATH" >> ~/.bashrc
# Update ~/.config/fish/config.fish for Fish users
FISH_CONFIG="$HOME/.config/fish/config.fish"
if [ -d "$HOME/.config/fish" ]; then
    echo "Updating $FISH_CONFIG for persistent environment variables..."
    echo "set -x NODEJS_HOME $NODEJS_HOME" >> $FISH_CONFIG
    echo "set -x PATH \$NODEJS_HOME \$PATH" >> $FISH_CONFIG
else
    echo "Fish shell configuration directory not found. Skipping Fish shell update."
fi
# Reload Bash and Fish configurations
echo "Reloading shell configurations..."
source ~/.bashrc 2>/dev/null || echo "Please restart your Bash session to apply changes."
if [ -f "$FISH_CONFIG" ]; then
    fish -c "source $FISH_CONFIG" 2>/dev/null || echo "Please restart your Fish session to apply changes."
fi
echo "Installation complete. Please restart your terminal or run 'source ~/.profile' to apply changes."