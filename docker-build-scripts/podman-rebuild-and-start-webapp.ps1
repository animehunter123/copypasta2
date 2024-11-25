$erroractionpreference = 0

# This is just a test script for using podman to build and run the webapp
# Podman runs really well on WSL2 (Windows Subsystem for Linux)

pushd .

cd ../webapp-meteor -ea 0 | out-null

podman build -t docker-meteorjs-webapp . --network=host

podman run  -it --rm -p 3000:3000 -v "%cd%\\..:/app" docker-meteorjs-webapp bash

popd