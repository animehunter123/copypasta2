# Description
This is a todo cards webapp to emulate the copypasta. It is written in reactive MeteorJS3.1/Node22 (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing **"F1"** in the browser for a Command Pallette (Monaco)! And, there is a eventHandler for **"Ctrl+Enter"** to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

![Sample Photo of MeteorJS CopyPasta](https://github.com/user-attachments/assets/1c1dfc5d-ad81-4704-b7cd-93354c11460b "A sample photo of the CopyPasta webpage then runs in MeteorJS")

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs `(and netstat if using the bash script on the host).`
* Launch it via one of these two methods:
    1. On your Host Directly (Please carefully check the Bash Script before running it, and also: the host/docker/lxc requires minimum of 2gb ram to run this app): 

        ```        
        ./start-webapp-on-host.sh
        ```
    2. On a Linux Container on your docker host (This will change perms, so you need to rebuild if you want on host again): 
    
        ```
        cd ./docker-build-scripts  
        ./Dockerfile_Build.sh       # Only do this ONCE
        ./start-webapp-on-docker.sh
        ```

* Finally, open a web browser to http://localhost:3000, and upload a file or a note, and it will save those to `./data/files` or `./data/notes`

# Todo
* BUG: darkmode, hovering a filecard - color style does not match
* FR: List view really should be vertical card and more indicitive if the text was too long, its difficult at the moment
* FR: Add a favicon to the webapp
* FR: When editing a card, the Monaco Editor width div is wider than the edit note div, causing a horizontal scrollbar to appear (This only appears at CERTAIN ZOOM LEVELS then continuing to ZOOM fixes it... weird!)
* FR: All/Notes/Files should be a Filter Iconified Button
* FR: Future CopyPasta3 should implement a Search button but meh this is not a priority atm.
* FR: Add authentication/login to this (Meh, Got Lazy and left this for the end.)
* FR: For Docker Best Practices, should run as a non-root user instead of root (to remove warnings during startup)
* FR: Refactor the terrifying App.jsx into multiple jsx files for the components (with their own imports and exports). 
* FR: Use ImageMagick to make a thumbnail of the image and display it in the UI.
* FR: Add a search bar for notes and files (just another way to filter)
* FR: After updated to Meteor3.1 noticed dependency deprecated feature of: (node:10338) Warning: The `util._extend` API is deprecated. Please use Object.assign() instead. For now, we will ignore this as it is not affecting our app and it is a external dependency which we cannot fix.