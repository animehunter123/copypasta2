#!/bin/bash

echo "This webapp uses 3 directories underneath ./app, which are ./data ./node_modules and ./meteor/local"

echo "Stopping docker containers..."
if command -v docker-compose &> /dev/null
then
    echo "Stopping the docker-meteorjs-webapp container..."
    docker-compose down
else
    echo "Stopping the docker-meteorjs-webapp container..."
    docker compose down
fi

echo "Removing docker-meteorjs-webapp:latest container... (if it exists, otherwise ignore the argument error)..."
docker rm -f `docker ps -a | grep 'docker-meteorjs-webapp:latest' | sed 's/ .*//'`

echo "Cleaning directories forcibly..."
rm -rf ./app/data/ 2>&1 1>/dev/null
rm -rf ./app/node_modules/ 2>&1 1>/dev/null
rm -rf ./app/.meteor/local/ 2>&1 1>/dev/null

sudo rm -rf ./app/data/
sudo rm -rf ./app/node_modules/
sudo rm -rf ./app/.meteor/local/

echo "Script complete. You may build, and start the app again."