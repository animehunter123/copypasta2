#!/usr/bin/env bash

pushd .
cd ../../

# if docker-compose exists run it, else use "docker compose"
if command -v docker-compose &> /dev/null
then
    echo "Stopping the docker-meteorjs-webapp container..."
    docker-compose down
    echo "Starting the docker-meteorjs-webapp container..."
    docker-compose up -d
else
    echo "Stopping the docker-meteorjs-webapp container..."
    docker compose down
    echo "Starting the docker-meteorjs-webapp container..."
    docker compose up -d
fi

popd