#!/usr/bin/env bash

# Downing initially then doing a ps process check.
echo "Stopping docker, then checking if anything else is running on port 80..."
docker-compose down 2>/dev/null
docker compose down 2>/dev/null

# Check if TCP port 80 is already occupied
if ss -H -ltnp 'sport = :80' | grep -q .; then

  echo ""
  echo "ERROR: TCP port 80 is already in use!"
  echo ""
  echo "Process currently listening on port 80:"
  ss -ltnp 'sport = :80'
  echo ""
  echo "Please stop the process above before starting this webapp."
  echo ""

  exit 1
fi

echo "Port 80 is available. Starting webapp..."

# if docker-compose exists run it, else use "docker compose"
if command -v docker-compose &>/dev/null; then
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