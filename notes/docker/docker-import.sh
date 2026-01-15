#!/bin/bash

# Standard name for our docker container
target="docker-meteorjs-webapp"

echo "Removing $target if it exists..."
docker image rm -f $target:latest

echo "Importing image to $target:latest..."
# If its a bz2 load it, else if its a tar load it
if [ -f ../$target.tar.bz2 ]; then
    echo "Loading $target.tar.bz2"
    docker load -i ../$target.tar.bz2
else
    echo "Loading $target.tar"
    docker load -i ../$target.tar
fi

echo "Script complete. You should now have a $target in 'docker images'."
