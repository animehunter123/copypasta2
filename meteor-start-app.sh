#!/bin/bash

#################################################################
# This script starts the MeteorJS webapp (Only a utility script!)
# THIS WILL ERROR with @babel/runtime, if you never got the deps
# installed into your $HOME/.meteor directory!!! SO RERUN THE 
# BUILD SCRIPTS IF YOU SEE THAT ERROR UPON LAUNCHING THIS SCRIPT!
#################################################################

COPYPASTA_DATA_DIR="./data"
meteor --port 3000 --allow-superuser # This is the new MeteorJS webapp with explicit port and superuser access (for development only!!!)
