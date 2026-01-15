#!/usr/bin/env bash

# if docker-compose exists run it, else use "docker compose"
if command -v docker-compose &> /dev/null
then
    echo "Starting the docker-meteorjs-webapp container..."
    docker-compose up -d
else
    echo "Starting the docker-meteorjs-webapp container..."
    docker compose up -d
fi
