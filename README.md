# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing **"F1"** in the browser for a Command Pallette (Monaco)! And, there is a eventHandler for **"Ctrl+Enter"** to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://github.com/user-attachments/assets/1c1dfc5d-ad81-4704-b7cd-93354c11460b">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs, `and netstat (if using the bash script).`
* Launch the shell script ./start-webapp.sh `(Make sure you review what this BASH script is doing, before running it!!!).`
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* navbar dropdown for ALL/FILES/NOTES needs to be ontop all the time if clicked, not just on hover, it also needs to filter correctly again (it has a memoization bug at the moment)

* TST: Do a test to ensure 14 day'eth old'eth card got deleted'eth!

... Before Final Release
* REQ: move all scripts to ./scripts, and leave a ./restart.sh at top level?
* REQ: make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml