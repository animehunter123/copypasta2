#!/bin/bash

# This will build the docker image. Sometimes you need to run this script as sudo

# Standard name for our docker container
target="docker-meteorjs-webapp"

pushd .
cd ./webapp-meteor

echo "Removing any existing containers..."
docker rm -f $target 2>/dev/null
docker image rm -f $target 2>/dev/null

echo "Building the new container: $target from the internet..."
# Or on Windows/WSL/Podman set network=host on wsl...: podman build -t docker-meteorjs-webapp . --network=host
# Note on podman windows, you can manually run it without docker-compose via: podman run  -it --rm -p 3000:3000 -v "%cd%\\..\\..:/app" docker-meteorjs-webapp bash
docker build -t $target .  
popd

echo "OK: Confirm it with 'docker images' to confirm container $target:latest is now listed"
echo "OK: Next, you can now launch the dockerized app via the docker build scripts cwd, then run: ./start-webapp-on-docker.sh"
echo "OK: Script complete."