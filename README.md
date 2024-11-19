# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing "F1" in the browser for a Command Pallette! And I made a eventHandler for "Ctrl+Enter" to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://private-user-images.githubusercontent.com/42163211/387266971-1c1dfc5d-ad81-4704-b7cd-93354c11460b.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MzE5NDE2MjMsIm5iZiI6MTczMTk0MTMyMywicGF0aCI6Ii80MjE2MzIxMS8zODcyNjY5NzEtMWMxZGZjNWQtYWQ4MS00NzA0LWI3Y2QtOTMzNTRjMTE0NjBiLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDExMTglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMTE4VDE0NDg0M1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTVkODhiZmU0OWY3NjdlY2UzYzI2ZmNmOTk3OWVjYzg1MjVjZjAxMzJmMTc3MjhlMDYxMjlhYzUzMDhmMTQ5OTImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.1m18OwR3Km5NSjEUuwMsFIG_9mRWrpcIlX_YM1X15Kw">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs, `and netstat (if using the bash script).`
* Launch the shell script ./start-webapp.sh `(Make sure you know what this BASH script is doing!!!).`
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* BUG: needs to flush text area after saving a modal
* BUG: needs modal prompt to delete
* REQ: make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml
* FR: Make the Monaco TextArea to be modern font looking, its kinda meh atm, nerdfont fira would be cool
* FR: Drag and Drop to re-order cards maybe.