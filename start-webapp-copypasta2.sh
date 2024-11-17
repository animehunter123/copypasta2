#!/bin/bash

# This is my main script to start the app. Open to suggestions to improve it.
printf "This script will launch the meteorjs webpage on a Ubuntu Host.\nNote: Host environment must have already run: 'sudo apt install -y nodejs npm && npx meteor'"

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Ensure that nodejs is installed or exit with a message to the user
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but it's not installed. Aborting."; exit 1; }

# Ensure that npm is installed or exit with a message to the user
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but it's not installed.  Aborting."; exit 1; }

# Check if data directory exists, if not create it
if [ ! -d "$SCRIPT_DIR/data" ]; then
    echo "Creating data directory"
    mkdir -p "$SCRIPT_DIR/data/files"
    mkdir -p "$SCRIPT_DIR/data/notes"
fi

# Ensure that meteorjs is installed or exit with a message to the user
command -v meteor >/dev/null 2>&1 || { echo >&2 "meteorjs is required but it's not installed.  Aborting."; exit 1; }

# Change into the webapp folder which has ./node_modules which are used for this webapp
cd "$SCRIPT_DIR/webapp-meteor"

# Ensure that node_modules exists(assuming its valid!), if not installs and creates the directory
if [ ! -d "./node_modules" ]; then
    echo "Installing node_modules"
    npm install
fi

# Inform the user which port the web application is running on
echo "Web application will soon run on port 3000"

# Export data directory path and start Meteor
export COPYPASTA_DATA_DIR="$SCRIPT_DIR/data"
echo "PWD directory: $PWD"
echo "Data directory: $COPYPASTA_DATA_DIR"
meteor --port 3000 # This is the new MeteorJS webapp with explicit port
