# Description

Just a todo cards webapp to emulate the copypasta, but in vanilla js. (Maybe Reactivize or Meteorize Later?)

# How to run...

* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs
* Launch the shell script ./start-webapp.sh (Make sure you know what you are doing)
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo

* need meteorjs to allow ANY TYPE OF FILE UPLOAD (currently it is only TEXTUPLOAD, not pdf/zip) IT ALSO NEEDS MAX LIMIT of 50MB, and MAX TIME FOR 14 days, and each card should say timeleft until autodelete
* the totalsize has a border css which doesnt match the others
* the copybutton isnt working
* the card LINES need to be MAX LIMITED to like 5 lines or something

* need meteorjs reactivity instead of vanilla js (i opted for non mongo for file uploads because its just easier to pull it from the container)
* make bash script for node ./server.js
* need 14 day autodelete
* need autofocus on uploadmodal, as well as initialpageload, then autofocus on modaltext area, then on CLOSE focus back to upload button for keyboard nativity
* need top page cards to have a navigate to url button
* need to test if code is autodetected in textarea
* need to move CDNs into code, so that it works offline 
* low pri -- make the filename revert to the non uuid one
* low pri -- i was lazy, and i need to Set up proper Meteor publications and subscriptions for real-time reactivity
