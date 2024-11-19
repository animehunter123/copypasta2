# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing "F1" in the browser for a Command Pallette! And I made a eventHandler for "Ctrl+Enter" to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://private-user-images.githubusercontent.com/42163211/387662522-12c2eb0c-19f2-46cc-9d3b-174203df7d9b.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MzIwMjE4ODIsIm5iZiI6MTczMjAyMTU4MiwicGF0aCI6Ii80MjE2MzIxMS8zODc2NjI1MjItMTJjMmViMGMtMTlmMi00NmNjLTlkM2ItMTc0MjAzZGY3ZDliLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDExMTklMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMTE5VDEzMDYyMlomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWJhNjcxMTVmZWQ2OWY2ZDIzNThjOTBiMTkyMmU4OGNjMmZiOWJiODhkZGZhM2UxNWFlOTJlYTczODIwOTViZTQmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0._6tbz4qPzv9NtwlKjaBOS5X05KE5R91yTJ5CBBWGw70">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs, `and netstat (if using the bash script).`
* Launch the shell script ./start-webapp.sh `(Make sure you know what this BASH script is doing!!!).`
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* FR: Make the Monaco TextArea to be modern font looking, its kinda meh atm, nerdfont fira would be cool
* TST: Do a test to ensure 14 day'eth old'eth card got deleted'eth!
* REQ: make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml