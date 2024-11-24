# This is a docker file to use to launch our meteorjs webapp
FROM ubuntu:noble

# Make sure all apt installs are silent
ENV DEBIAN_FRONTEND=noninteractive

# Install nodejs, npm, and meteor (and also netstat for the start-webapp-on-host.sh script)
RUN apt-get update 
RUN apt-get install -y vim wget nodejs npm net-tools
RUN npx -y meteor

# Alternative instead of using npx...
# RUN curl https://install.meteor.com/ | sh

# Set the working dir to ./ (so that ./webapp-meteor is mounted as a volume by docker-compose)
WORKDIR /app

# Export 3000 as a normal port for meteor webapp
EXPOSE 3000

# Run our app via the bash script
CMD ["./start-webapp-on-host.sh"]
