#!/bin/bash

#################################################################
# This script starts the MeteorJS webapp (Only a utility script!)
# THIS WILL ERROR with @babel/runtime, if you never got the deps
# installed into your $HOME/.meteor directory!!! SO RERUN THE
# BUILD SCRIPTS IF YOU SEE THAT ERROR UPON LAUNCHING THIS SCRIPT!
#################################################################

# Check if TCP port 80 is already occupied
if ss -H -ltnp 'sport = :80' | grep -q .; then

  echo ""
  echo "ERROR: TCP port 80 is already in use!"
  echo ""
  echo "Process currently listening on port 80:"
  ss -ltnp 'sport = :80'
  echo ""
  echo "Please stop the process above before starting this webapp."
  echo ""

  exit 1
fi

COPYPASTA_DATA_DIR="./data" meteor --port 80 --allow-superuser # This is the new MeteorJS webapp with explicit port and superuser access (for development only!!!)
