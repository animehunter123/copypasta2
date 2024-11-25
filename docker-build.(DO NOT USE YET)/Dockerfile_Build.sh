#!/bin/bash

# Standard name for our docker container
target="docker-meteorjs-webapp"

echo "Removing any existing containers..."
docker rm -f $target 2>/dev/null
docker image rm -f $target 2>/dev/null

echo "Building the new container: $target from the internet..."
docker build -t $target .  #You can also use "podman in place of docker here..."

echo "Script complete. Confirm it with 'docker images' to confirm container $target:latest is now listed"
