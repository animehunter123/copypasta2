#!/usr/bin/env bash

echo "Stopping the docker-meteorjs-webapp container..."
docker compose down
docker-compose down

echo "Starting the docker-meteorjs-webapp container..."
docker-compose up -d
