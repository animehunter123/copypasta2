#!/bin/bash

echo "If your mongodb doesnt startup for the meteorjs webapp, just delete it (effectively deleting all card cache)... DELETING NOW."

echo "Deleting Meteorjs Webapp Data"
rm -rf ./webapp-meteor/.meteor/local/db

echo "Deleting Meteorjs Webapp ./data folder"
rm -rf ./webapp-meteor/data