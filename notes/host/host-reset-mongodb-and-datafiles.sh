#!/bin/bash

echo "If your mongodb doesnt startup for the meteorjs webapp, just delete it (effectively deleting all card cache)... DELETING NOW."

echo "Deleting Meteorjs Webapp Data"
cd ..
rm -rf ./app/.meteor/local/db

# echo "Deleting Meteorjs Webapp ./app/.meteor/local folder"
# sudo rm -rf ./app/.meteor/local/ # This deletes the entire .meteor/local folder

echo "Deleting Meteorjs Webapp ./data folder"
rm -rf ./data
# rm -rf ./app/data