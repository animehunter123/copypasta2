#!/bin/bash

echo "If your mongodb doesnt startup for the meteorjs webapp, just delete it (effectively deleting all card cache)... DELETING NOW."

echo "Deleting Meteorjs Webapp Data"
cd ..
rm -rf ./webapp-meteor/.meteor/local/db

# echo "Deleting Meteorjs Webapp ./webapp-meteor/.meteor/local folder"
# sudo rm -rf ./webapp-meteor/.meteor/local/ # This deletes the entire .meteor/local folder

echo "Deleting Meteorjs Webapp ./data folder"
rm -rf ./data
# rm -rf ./webapp-meteor/data