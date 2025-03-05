#!/usr/bin/env bash

if command -v docker-compose &> /dev/null
then
    docker-compose logs -f
else
    docker compose logs -f
fi