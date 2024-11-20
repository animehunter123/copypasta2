#!/bin/bash

# Its a good idea to ensure that the .node_modules and .meteor are updated, so if you need to fetch the dependencies, uncomment the below...
cd webapp-meteor
npm install        # This populates the ./node_modules directory
meteor npm install # This populates the ./node_modules directory and also the .meteor/local directory (I think?)
cd ..
