# Description
Just a example todo cards webapp to emulate the copypasta, written in non-reactive VanillaJS, and also in reactive MeteorJS (with Monaco Code Editor, which was added to package.json via `meteor npm install @monaco-editor/react`). 

As a bonus, the code editor allows pressing "F1"

<img width="964" alt="Sample Photo of MeteorJS CopyPasta" src="https://github-production-user-asset-6210df.s3.amazonaws.com/42163211/387186855-9c5f0701-3cfc-4a43-aab0-0fb6129e9db8.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20241118%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241118T110036Z&X-Amz-Expires=300&X-Amz-Signature=0548424ff937afc095d5468f6c5970604f8c9658eb0e318fe6527b78fba889cd&X-Amz-SignedHeaders=host">

# How to run...
* Use a Linux Container or Host.
* Install nodejs, npm, meteorjs
* Launch the shell script ./start-webapp.sh `(Make sure you know what this BASH script is doing!!!)`
* Open a web browser to localhost:3000, and upload a file or a note, and it will save those to ./data/files or ./data/notes

# Todo
* REQ: make a Dockerfile(uses ubuntu2404 with apt install nodejs/npm/meteorjs)/docker-compose.yaml
* FR: Make the Monaco TextArea to be modern font looking, its kinda meh atm, nerdfont fira would be cool
* BUG: The "Edit File" should remain READ ONLY, and have DOWNLOAD FILE button, but the "Edit Note" should be able to be edited