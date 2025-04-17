$erroractionpreference = 0

# This is just a test script for using podman to build and run the webapp
# Podman runs really well on WSL2 (Windows Subsystem for Linux)
# NOTE: This is only if you didnt install the "Podman Compose" plugin for Windows Podman

pushd .

cd ../webapp-meteor -ea 0 | out-null

podman build -t docker-meteorjs-webapp . --network=host

# To shell into it for verification use
# podman run  -it --rm -p 3000:3000 -v "%cd%\\..:/app" docker-meteorjs-webapp bash

# To run it (foreground without -d):
cd ../scripts -ea 0 | out-null
podman rm -f docker-meteorjs-webapp
podman compose up

popd