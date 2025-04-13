# Description
This is a todo cards webapp to emulate the copypasta. It is written in reactive MeteorJS3.1/Node22 (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing **"F1"** in the browser for a Command Pallette (Monaco)! And, there is a eventHandler for **"Ctrl+Enter"** to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

# Features 
This is a web-based clipboard/note-taking application ("CopyPasta") built with:
* MeteorJS 3.1 and Node.js 22
* React 18 with Monaco Code Editor integration
* MongoDB for data storage
* File and text note uploads
* Code syntax highlighting
* Monaco editor with Command Palette (F1) and Ctrl+Enter submission
* File/note expiration after 14 days
* Docker/Podman containerization support
* The app runs on port 3000 and stores data in `./data/files` and `./data/notes` directories. It can be deployed either directly on a Linux host or via Docker (recommended method).
* The project includes comprehensive Docker configurations and deployment scripts for both Linux and Windows environments, with special consideration for WSL2/Podman setups.
* Language auto-detection for syntax highlighting
* Support for both text and binary files
* File size limit of 50MB
* Special handling for large binary files (>16MB)

![Sample Photo of MeteorJS CopyPasta](https://github.com/user-attachments/assets/1c1dfc5d-ad81-4704-b7cd-93354c11460b "A sample photo of the CopyPasta webpage then runs in MeteorJS")

# How to run...
* Use a Linux Host or Docker/Podman/Lxc Container.
* Install netstat
* Install nodejs/npm/npx. To use portable tarball, just run ```./scripts/host/host-install-nodejs-portabletarball-as-current-user.sh```
* Install meteorjs. To use portable meteorjs env, just run ```./scripts/host/host-install-meteorjs.sh```
* Launch it via one of these two methods:
    1. On your Host Directly (Please carefully check the Bash Script before running it, and also: the host/docker/lxc requires minimum of 2gb ram to run this app): 
        ```        
        cd ./scripts
        ./host/host-start-webapp.sh
        ```
    2. *(Reccomended Method)* On a Linux Container on your docker host (This will change perms, so you need to rebuild if you want on host again):
    
        ```
        cd ./scripts  
        ./Dockerfile_Build.sh       # Only do this ONCE
        ./start-webapp-on-docker.sh
        ```

* Finally, open a web browser to http://localhost:3000, and upload a file or a note, and it will save those to `./data/files` or `./data/notes`

# Todo ⛳
* FR: Hour/Minute Timestamp should be shown on card to allow sorting order to be easier for users
* FR: Monaco doesnt show the "paste" in right click menu, (see react macos monaco samples)
* FR: List view really should be vertical card and more indicitive if the text was too long, its difficult at the moment
* FR: Use ImageMagick to make a thumbnail of the image and display in file cards.
* FR: Future CopyPasta3 should implement a Search button but meh this is not a priority atm.
* FR: Future CopyPasta3: Add authentication/login to the app.
* FR: For Docker Best Practices, should run as a non-root user instead of root (to remove warnings during startup).
* FR: Refactor the extremely long App.jsx into multiple jsx files for the components (with their own imports and exports). 