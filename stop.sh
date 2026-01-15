#!/usr/bin/env bash

# if docker-compose exists run it, else use "docker compose"
if command -v docker-compose &> /dev/null
then
    echo "Stopping the docker-meteorjs-webapp container..."
    docker-compose down
else
    echo "Stopping the docker-meteorjs-webapp container..."
    docker compose down
fi
