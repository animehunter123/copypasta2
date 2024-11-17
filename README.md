# Description

Just a todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS.

# How to run...

* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs
* Launch the shell script ./start-webapp.sh (Make sure you know what you are doing)
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml
* Would like the Monaco TextArea to be modern font looking, its kinda meh atm
* OPTIONAL: Make the text area allow CONTROL + ENTER to save and close the card, and autofocus back on the new card button > this is still not working!