# Description

Just a todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS.

[https://private-user-images.githubusercontent.com/42163211/386965137-224f056d-1f04-46e5-b10e-5fa168d624ac.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MzE4NTI2MDEsIm5iZiI6MTczMTg1MjMwMSwicGF0aCI6Ii80MjE2MzIxMS8zODY5NjUxMzctMjI0ZjA1NmQtMWYwNC00NmU1LWIxMGUtNWZhMTY4ZDYyNGFjLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDExMTclMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMTE3VDE0MDUwMVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTNmNDRiZDRiZTFlYzY4NDU4MzFiZjQ5ZWI0OWQwMDkzYzU4YjAxZWI3ZGJlYjZkNmQ1MzY5ZTU0NmRhODJjZmUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.uz4BOq7ztphccmnjpz-JpM8oXDd-9BrxZ1pfSvrRAlE]

# How to run...

* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs
* Launch the shell script ./start-webapp.sh (Make sure you know what you are doing)
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml
* Would like the Monaco TextArea to be modern font looking, its kinda meh atm
* OPTIONAL: Make the text area allow CONTROL + ENTER to save and close the card, and autofocus back on the new card button > this is still not working!