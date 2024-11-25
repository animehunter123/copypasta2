#!/bin/bash

# Install NodeJS 
sudo apt update
sudo apt install -y nodejs npm

# Install MeteorJS (3.1)
curl https://install.meteor.com/\?release\=3.1 | sh

# Its a good idea to ensure that the .node_modules and .meteor are updated, so if you need to fetch the dependencies, uncomment the below...
cd webapp-meteor
npm install        # This populates the ./node_modules directory
meteor npm install # This populates the ./node_modules directory and also the .meteor/local directory (I think?)
cd ..
