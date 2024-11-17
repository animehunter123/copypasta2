# Description

Just a todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS.

# How to run...

* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs
* Launch the shell script ./start-webapp.sh (Make sure you know what you are doing)
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml
* when i click outside the modal, it should close
* need to test if code is autodetected in textarea
* low pri -- make the filename revert to the non uuid one
* low pri -- i was lazy, and i need to Set up proper Meteor publications and subscriptions for real-time reactivity

* final step --- clean code and dockerize with docker-compose.yaml