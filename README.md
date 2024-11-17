# Description

Just a todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS.

# How to run...

* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs
* Launch the shell script ./start-webapp.sh (Make sure you know what you are doing)
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* need autofocus on uploadmodal, as well as initialpageload, then autofocus on modaltext area, then on CLOSE focus back to upload button for keyboard nativity

* need top page cards to have a navigate to url button
* need to test if code is autodetected in textarea
* need to move CDNs into code, so that it works offline 
* low pri -- make the filename revert to the non uuid one
* low pri -- i was lazy, and i need to Set up proper Meteor publications and subscriptions for real-time reactivity

* final step --- clean code and dockerize with docker-compose.yaml