#!/usr/bin/env bash

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
  echo "Starting the docker-meteorjs-webapp container..."
  docker-compose up -d
else
  echo "Starting the docker-meteorjs-webapp container..."
  docker compose up -d
fi
