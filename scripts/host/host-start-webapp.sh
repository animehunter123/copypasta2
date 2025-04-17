#!/bin/bash

# This is my main script to start the app. Open to suggestions to improve it.
echo "This script will launch the meteorjs webpage on your Ubuntu Host."

# Use NodeJS Portable Tarball Environment
NODEJS_HOME=$(echo "$PWD"/node-v*/bin)
PATH=$NODEJS_HOME:$PATH

# Ensure that node/npm/meteor is installed or exit with a message to the user
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but it's not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but it's not installed.  Aborting."; exit 1; }
command -v meteor >/dev/null 2>&1 || { echo >&2 "meteorjs is required but it's not installed.  Aborting."; exit 1; }

# Get the absolute path of the script directory (Because, per README.md: You `cd ./scripts; ./host-start-webapp.sh to launch this!!!`)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Ensure that node_modules exists (assuming its valid!), if not installs and creates the directory
echo "Ensuring that webapp has a ./node_modules..."
WEBAPP_DIR="$SCRIPT_DIR/../../webapp-meteor"
cd "$WEBAPP_DIR"
if [ ! -d "./node_modules" ]; then
    echo "ERROR, WEBAPP DIR doesnt have node modules. I.e., you need to install node_modules... (Please see: ./host/host-install-meteorjs.sh and README.md)."
    exit ; # The user needs to run ./host/host-install-meteorjs.sh , which in turn does `npm install`
fi

echo "Ensuring that webapp has a ./data directory (and ./data/files and ./data/notes)..."
if [ ! -d "$WEBAPP_DIR/data" ]; then
    echo "Creating data directory"
    mkdir -p "$WEBAPP_DIR/data/files" 2>/dev/null 1>/dev/null
    mkdir -p "$WEBAPP_DIR/data/notes" 2>/dev/null 1>/dev/null
fi

# Inform the user which port the web application is running on
echo "Pre-Flight Check OK! 
Webapp has ./node_modules! --> $WEBAPP_DIR/node_modules!
Webapp has ./data directory! --> $WEBAPP_DIR/data (with subdir of ./data/files and ./data/notes)!
Web application will soon run on port 3000..."

# Kill any older MeteorJS processes running on port 3000
echo "Killing any older MeteorJS processes on port 3000 (via netstat command)..."
netstat -tulnap 2>/dev/null | grep 3000 | grep -i LISTEN | sed 's/.*LISTEN \+//' | sed 's/\/node.*//' | xargs kill -9 2>/dev/null 1>/dev/null

# Export data directory path and start Meteor
export COPYPASTA_DATA_DIR="$WEBAPP_DIR/data"
echo "PWD directory: $PWD"
echo "Data directory: $COPYPASTA_DATA_DIR"
meteor --port 3000 --allow-superuser # This is the new MeteorJS webapp with explicit port and superuser access (for development only!!!)
