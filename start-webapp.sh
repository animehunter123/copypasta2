#!/bin/bash

# Ensure that nodejs is installed or exit with a message to the user
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but it's not installed.  Aborting."; exit 1; }

# Ensure that npm is installed or exit with a message to the user
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but it's not installed.  Aborting."; exit 1; }

# Ensure that meteorjs is installed or exit with a message to the user
command -v meteor >/dev/null 2>&1 || { echo >&2 "meteorjs is required but it's not installed.  Aborting."; exit 1; }

# Change into the webapp folder which has ./node_modules which are used for this webapp
cd ./webapp

# Ensure that node_modules is installed, if not installs and creates the directory
if [ ! -d "./node_modules" ]; then
    echo "Installing node_modules"
    npm install
fi


# Create the ./data directory if it doesn't exist
mkdir -p ./data 

# Inform the user which port the web application is running on
echo "Web application will soon run on port 3000"

# Start the web application
node server.js
