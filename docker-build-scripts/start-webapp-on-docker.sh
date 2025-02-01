#!/usr/bin/env bash

# if docker-compose exists run it, else use "docker compose"
if command -v docker-compose &> /dev/null
then
    docker-compose up -d
else
    docker compose up -d
fi