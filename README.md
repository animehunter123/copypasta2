# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS3.1/Node22 (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing **"F1"** in the browser for a Command Pallette (Monaco)! And, there is a eventHandler for **"Ctrl+Enter"** to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://github.com/user-attachments/assets/1c1dfc5d-ad81-4704-b7cd-93354c11460b">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs `(and netstat if using the bash script on the host).`
* Launch it via one of these two methods:

    1. On your Host Directly (Please carefully check the Bash Script before running it): 

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
* FR: Toggle to list mode from card grid mode?
* FR: inside create new card, add keyboard shortcut to toggle to code view or file view"

* VERIFY: Do a test to ensure 14 day'eth old'eth card got deleted'eth!
* FR: List Toggle to view in List View or Grid View
* FR: Add authentication/login to this (Got Lazy and left this for the end)
* FR: For Docker Best Practices, should run as a non-root user instead of root (to remove warnings during startup)
* FR: Refactor to multiple jsx files for the components (with their own imports and exports). Currently impossible to maintain.
* FR: After updated to Meteor3.1 noticed dependency deprecated feature of: (node:10338) Warning: The `util._extend` API is deprecated. Please use Object.assign() instead. For now, we will ignore this as it is not affecting our app and it is a external dependency which we cannot fix.