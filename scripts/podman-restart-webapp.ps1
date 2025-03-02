$erroractionpreference = 0

# This is just a test script for using podman to build and run the webapp
# Podman runs really well on WSL2 (Windows Subsystem for Linux)

pushd .

cd ../docker-build-scripts -ea 0 | out-null
podman rm -f docker-meteorjs-webapp
podman compose up

popd