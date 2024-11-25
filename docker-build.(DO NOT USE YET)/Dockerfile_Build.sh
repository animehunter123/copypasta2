#!/bin/bash

# Standard name for our docker container
target="docker-meteorjs-webapp"

echo "Removing any existing containers..."
docker rm -f $target 2>/dev/null
docker image rm -f $target 2>/dev/null

echo "Building the new container: $target from the internet..."
# Or on Windows/WSL/Podman set network=host on wsl...: podman build -t docker-meteorjs-webapp . --network=host
docker build -t $target .  

echo "Script complete. Confirm it with 'docker images' to confirm container $target:latest is now listed"
