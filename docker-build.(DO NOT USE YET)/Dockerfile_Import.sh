#!/bin/bash

# Standard name for our docker container
target="docker-meteorjs-webapp"

echo "Importing image to $target:latest..."
docker load -i ./$target.tar.bz2


