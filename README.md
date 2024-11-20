# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing "F1" in the browser for a Command Pallette! And I made a eventHandler for "Ctrl+Enter" to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://github.com/user-attachments/assets/1c1dfc5d-ad81-4704-b7cd-93354c11460b">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs, `and netstat (if using the bash script).`
* Launch the shell script ./start-webapp.sh `(Make sure you know what this BASH script is doing!!!).`
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* BUG: DRAG DROP REORDERING no longer works
* BUG: WHEN UPLOADING A FILE, then ADDING A COMMENT, it made 2 cards instead of 1
* BUG: CAN NO LONGER EDIT A TEXTCARD >> Error saving edit: Match error: Unknown key in field _id [edit-failed]

* Weird these bugs below show up on m, but not on lxc?
  * BUG: FILE DOWNLAODS NOT DOWNLAODING >0 bytes (THIS WAS WORKING IN "d78b3735b48ff05392a24e6bb36ed809747841f6 added a ctrl+enter memo with the f1 instruction to make it apparent to the user of usage")

* FR: Test the navbar, when the width is too small, the stats should be stacked vertically
* FR: Make the Monaco TextArea to be modern font looking, its kinda meh atm, nerdfont fira would be cool
* TST: Do a test to ensure 14 day'eth old'eth card got deleted'eth!
* REQ: make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml