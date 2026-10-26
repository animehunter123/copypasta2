# Description
This is a todo cards webapp to emulate copypasta (notepad in your browser with auto-ageoff). It is written in reactive MeteorJS/Node22JS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, press "n" for a new card, use the code editor allows pressing **"F1"** in the browser for a Command Pallette (Monaco), and finally **"Ctrl+Enter"** to submit the note card!

# Features 
This is a web-based clipboard/note-taking application ("CopyPasta") built with:
* MeteorJS 3.1, Node.js 22, React 18
* VSCode/Monaco editor with Command Palette (F1) and Ctrl+Enter submission
* Text notes with File Upload support
* File/note expiration after 14 days
* Docker/Podman containerization 
* The app runs on port 3000 and stores data in `./data/files` and `./data/notes` directories. It can be deployed either directly on a Linux host or via Docker (recommended method).
* File size limit of 50MB
* Special handling for large binary files (>16MB)

![Sample Photo of MeteorJS CopyPasta](https://github.com/user-attachments/assets/1c1dfc5d-ad81-4704-b7cd-93354c11460b "A sample photo of the CopyPasta webpage then runs in MeteorJS")

# Quickstart: How to run...
* Use a Linux Host with Docker/Podman/Lxc installed.
* Use the bash scripts which use docker commands:
```bash
./build.sh # <-- this will build the docker container
./start.sh # <-- this will start the container
./logs.sh  # <-- this will `tail -f` the logs for debugging, it will say "App running at: http://localhost:3000" when it is ready!
```
* Finally, open a web browser to http://localhost:3000, and upload a file or a note, and it will save those to `./data/files` or `./data/notes`

# Todo's
* BUG: When a note is open, need a escape or click out CONFIRMATION to close so you dont lose data you already have typed into it.
* Add a "Favorite" so that it gets protected from being deleted in 14 days
* FR: Hour/Minute Timestamp should be shown on card to allow sorting order to be easier for users
* FR: Monaco doesnt show the "paste" in right click menu, (see react macos monaco samples)
* FR: List view really should be vertical card and more indicitive if the text was too long, its difficult at the moment
* FR: Use ImageMagick to make a thumbnail of the image and display in file cards.
* FR: Future CopyPasta2 should implement a Search button but meh this is not a priority atm.
* FR: Future CopyPasta2: Add authentication/login to the app.
* FR: For Docker Best Practices, should run as a non-root user instead of root (to remove warnings during startup).
* FR: Refactor the extremely long App.jsx into multiple jsx files for the components (with their own imports and exports). 
* FR: Update to latest Meteor (See https://docs.meteor.com/history.html and update this project with 'meteor update')!
* BUG: Make this compatible with internet explorer (for old homelabs from the 90's and ECMA5 instead of ECMA6 and polyfills ughh...). Looks like only Meteor 1.0 works correctly, so this requires a complete downgrade of this webapp, else you will see:
```log
Detected older Firefox version: 36  firefox-compat.js:12:7
Applying Firefox compatibility fixes  firefox-compat.js:21:3
Stub meteorInstall global called  firefox-compat.js:53:7
SyntaxError: invalid identity escape in regular expression  modules.js:42625:35
TypeError: Package.modules is undefined[Learn More]  promise.js:15:5
TypeError: Package.mongo is undefined[Learn More]  global-imports.js:3:1
TypeError: require is not a function[Learn More]
```
* host scripts seem to be weird, and running twice launches it correctly - need to use a .env file instead of messing up the bashrc, i dont like this. >> For Now, using a fresh LXC does in fact behave correctly if you use ./1.sh and then ./2.sh for example, al

v2.0 goals (draggable modal)
* FEATURE REQ: The modal should be draggable and resizable

- when a modal is open, and the user starts typing or uploading a file, if you accidently click out it closes the modal, this should stay open so the user doesnt lose their progress. (I think this happens in many cases). Please check all cases. Handle it appropriately, maybe with a popup modal saying are you sure you want to close this modal before saving changes or something?

- the drag and resize work great, thanks I learned a lot! Now if you resize the modal to be wide the width of the inputtext area of the monaco vscode editor doesnt expand (see attached photo). Can it be wider and expand as the user chooses? Also if you look at the photo the monaco editor looks blue and doesnt look correct/modern, did I do it correctly, or do we need to update the monaco modal to look better?

- Similar to above for the new card modal the Upload File also doesnt expand to the width the user wants.

- Please check all of the buttons in the navbar top to ensure they are all autofocused on a appropriate field as you open then.

- Please make a keyboard escape key handler for every single navbar button behaviour so it closes (or goes to the are you sure you want to close unsaved changes modal behaviour), please check all modals and verify this behaviour for all possible cases.

- The dark mode doesnt seem to easy to see, did I mess up the colors or tailwind? can you clean it up a bit to be clean and easier to see maybe close or similar to material dark? and reduce eye strain

- can a footer be added as well that is always visible and shows the current version of meteor used from the package.json or similar, and keep always visible without dissapearing as many cards appear?
