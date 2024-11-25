# This is a docker file to use to launch our meteorjs webapp
FROM ubuntu:noble

# Make sure all apt installs are silent
ENV DEBIAN_FRONTEND=noninteractive

# Install nodejs, npm, and meteor (and also netstat for the start-webapp-on-host.sh script)
RUN apt-get update 
RUN apt-get install -y vim wget nodejs npm net-tools

# Our webapp dependencies are tied to meteor 3.0.4 (not 3.1.0)
# RUN npx -y meteor@3.0.4 

# Instead of forcing us to stick on 3.0.4, lets use 3.1.0 (4 days ago it came out!)
# Thus, I updated my meteor existing project first via:
# ... meteor --version
# ... meteor update --release 3.1 # This updates it systemwide
# ... cd ./webapp-meteor && rm -rf node_modules && rm -rf .meteor/local && meteor update --release 3.1 && meteor reset && meteor npm install --save # This updates it in this project, and regenerates the node_modules and .meteor/local
# ... meteor --version
# Thus, this container image will be locked to 3.1.0:
RUN npx -y meteor@3.1

# Install our webapp dependencies 
# RUN mkdir -p /app/testbed/node_modules
# RUN mkdir -p /app/testbed/.meteor
# RUN cd /app/testbed 
# COPY package.json /app/testbed/package.json
# COPY package-lock.json /app/testbed/package-lock.json
# COPY .meteor/packages /app/testbed/.meteor/
# COPY .meteor/platforms /app/testbed/.meteor/
# COPY .meteor/release /app/testbed/.meteor/
# COPY .meteor/versions /app/testbed/.meteor/
# RUN cd /app/testbed && source ~/.bashrc && meteor npm install --save

# Alternative instead of using npx...
# RUN curl https://install.meteor.com/ | sh

# Set the working dir to ./ (so that ./webapp-meteor is mounted as a volume by docker-compose)
WORKDIR /app

# Export 3000 as a normal port for meteor webapp
EXPOSE 3000

# Run our app via the bash script
CMD ["./start-webapp-on-host.sh"]
