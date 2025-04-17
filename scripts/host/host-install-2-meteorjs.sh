#!/bin/bash

echo "Installing dependencies, this script should be launched as non-root user, and it will elevate during install manually."

# Install NodeJS 
# sudo apt update
# sudo apt install -y nodejs npm curl

# Install MeteorJS (3.1)
# curl https://install.meteor.com/\?release\=3.1 | sh

# Use NodeJS Portable Runtime Tarball Environment
NODEJS_HOME=$(echo "$PWD"/node-v*/bin)
PATH=$NODEJS_HOME:$PATH
alias node=$NODEJS_HOME/node
alias npx=$NODEJS_HOME/npx
alias npm=$NODEJS_HOME/npm
echo "Activating the  NodeJS Runtime Tarball Environment...

Activated it via these commands:
export NODEJS_HOME=$NODEJS_HOME
alias node=$NODEJS_HOME/node
alias npx=$NODEJS_HOME/npx
alias npm=$NODEJS_HOME/npm

Which, resulted in \`which npm\` results of...:
"
which node
which npx
which npm

# New way to install the latest meteorjs
echo "Removing existing Meteor installation (if any)..."
pushd .
meteor remove || true # Ignore errors if meteor command not found
rm -rf ~/.meteor # Remove .meteor directory
rm -f /usr/local/bin/meteor # Remove the symlink
npm install -y -g clear-npx-cache
npx clear-npx-cache
rm -rf ~/.npm/_npx

#echo "Installing Meteor via npm..."
#npm install -y -g meteor #THIS METHOD IS NO LONGER SUPPORTED.

echo "Installing Meteor via the new supported method..."
curl https://install.meteor.com/ | sh

echo "Verifying Meteor installation (IT DEFAULTS TO ~/.bashrc NOT FISH, SO I WILL ADD IT TO FISH NOW TOO!!!)..."
# fish_add_path $HOME/.meteor 2>/dev/null 1>/dev/null # The correct way to do this, but IT WONT APPEAR IN ~/.config/fish/config.fish (which isnt bash'y'ish.)
echo 'fish_add_path $HOME/.meteor' >> ~/.config/fish/config.fish
source ~/.bashrc
meteor --version  --allow-superuser
popd

# Its a good idea to ensure that the .node_modules and .meteor are updated, so if you need to fetch the dependencies, uncomment the below...
pushd .
echo "Now installing the node dependencies to the ./node_modules directory (and the older version of meteor which runs this webapp)"
cd ../webapp-meteor
npm install        # This populates the ./node_modules directory
meteor npm install --allow-superuser # This populates the ./node_modules directory and also the .meteor/local directory (I think?)
popd