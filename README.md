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

# Quickstart
How to run in docker...
* Use a Linux Host with Docker/Podman/Lxc installed.
* Use the bash scripts which use docker commands:
```bash
./build*.sh # <-- this will build the docker container
./start*.sh # <-- this will start the container
./logs*.sh  # <-- this will `tail -f` the logs for debugging, it will say "App running at: http://localhost:3000" when it is ready!
```
* Finally, open a web browser to http://localhost:3000, and upload a file or a note, and it will save those to `./data/files` or `./data/notes`

How to run in bash...
Alternatively, if you wish to run manually without docker for fast development:
- Install Linux (x64 required for meteor)
- Install Node JS
```bash
npx meteor # to install meteor
cd ./app
meteor npm --no-audit install --save --allow-superuser # To make the ./node_modules
COPYPASTA_DATA_DIR="./data" meteor --port 3000 --allow-superuser # To launch it for development only!!!
```

# Todo's
* FR: Monaco doesnt show the "paste" in right click menu, (see react macos monaco samples)
* FR: Images: Add image support in the text input field to be WYSIG if you paste image into it, it becomes a image card.
* FR: Images: Use ImageMagick to make a thumbnail of the image and display in file cards (if it was img)
* FR: Future CopyPasta2 should implement a Search button but meh this is not a priority atm.
* FR: Future CopyPasta2: Add authentication/login to the app.
* FR: For Docker Best Practices, should run as a non-root user instead of root (to remove warnings during startup).
* FR: Refactor the extremely long App.jsx into multiple jsx files for the components (with their own imports and exports). 
* FR: Update to latest Meteor (See https://docs.meteor.com/history.html and update this project with 'meteor update')!



* Add a "Favorite" toggle so that it gets protected from being deleted in 14 days. Make the UI also explain this and so it sticks out enough in both card/list views.

* FR: List view really should be vertical card and more indicitive if the text was too long, its difficult at the moment (just trim it with ... so the user can know know if text or filename was too long)

* For file cards can the padding inside match the same for looking the same as text note cards

* Hour/Minute Timestamp should be shown on card to allow sorting order to be easier for users (yymmdd hhmmss or something, keep the ui clean)



* Can we make the favorite toggle always appear at top of card list and grid list
* Can we fix up the css because all the fields of the cards in both views looks way off now (see the attached photo)
* Can we make sure all the list view cards are the same height regardless of being a file card or a text card.
* if the text or filename is too long, ensure that it is truncated and showing a ... at the end?
* I dont like the yyymmmdd hourminute second current way, can you make it with yyyy/mm//dd instead?