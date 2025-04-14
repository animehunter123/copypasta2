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
* FR: Update to latest Meteor (See https://docs.meteor.com/history.html and update this project with 'meteor update')!
* BUG: Make this compatible with internet explorer (for old homelabs from the 90's). Looks like only Meteor 1.0 works correctly, so this requires a complete downgrade of this webapp, else you will see:
```log
Detected older Firefox version: 36  firefox-compat.js:12:7
Applying Firefox compatibility fixes  firefox-compat.js:21:3
Stub meteorInstall global called  firefox-compat.js:53:7
SyntaxError: invalid identity escape in regular expression  modules.js:42625:35
TypeError: Package.modules is undefined[Learn More]  promise.js:15:5
TypeError: Package.mongo is undefined[Learn More]  global-imports.js:3:1
TypeError: require is not a function[Learn More]
```
... WHEREFORE I ATTEMPTED DOWNGRADE METEOR from 3.1 to 2.16 or 1.10, VIA BELOW DIDNT WORK. **Maybe just re-write the entire thing with Rust+Leptos(Actix):**
```bash
rm -rf node_modules* ; 
rm -rf package-lock.json ;
meteor reset ; 
meteor update --release 2.16 ; # The .meteor/release shows METEOR@3.1, and will change to METEOR@2.16
meteor add ecmascript ; 
npm i ; meteor npm install ; 
npm install --legacy-peer-deps ; 
npm install @fortawesome/fontawesome-svg-core@6 monaco-editor@0.30 ;
meteor npm update @babel/core @babel/runtime ;
node -v ; meteor --port 3000 --allow-superuser ;  #But even after all of this, failure :(
```
* Add a "Favorite" so that it gets protected from being deleted in 14 days