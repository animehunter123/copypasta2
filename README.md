# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing "F1" in the browser for a Command Pallette! And I made a eventHandler for "Ctrl+Enter" to submit the code, so you can hit enter to submit your code, or you can use the command palette to submit your code!

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://github-production-user-asset-6210df.s3.amazonaws.com/42163211/387662522-12c2eb0c-19f2-46cc-9d3b-174203df7d9b.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20241119%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241119T125833Z&X-Amz-Expires=300&X-Amz-Signature=561f49d9e406c7ec8dd67cf0a45388e9c5135af2040f1fa17b408b95277ceadc&X-Amz-SignedHeaders=host">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs, `and netstat (if using the bash script).`
* Launch the shell script ./start-webapp.sh `(Make sure you know what this BASH script is doing!!!).`
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* FR: Make the Monaco TextArea to be modern font looking, its kinda meh atm, nerdfont fira would be cool
* TST: Do a test to ensure 14 day'eth old'eth card got deleted'eth!
* REQ: make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml