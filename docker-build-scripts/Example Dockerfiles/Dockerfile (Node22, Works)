# This is a docker file to use to launch our meteorjs webapp
# Example on how to build without docker-compose (and run without docker network wan access):
# Linux:
# ... target='docker-meteorjs-webapp' ; docker build -t $target .    
# ... docker run --network=none -it --rm -p 3000:3000 -v "$(pwd)/..:/app" docker-meteorjs-webapp bash
# Windows:
# ... podman build -t docker-meteorjs-webapp . --network=host
# ... podman run  -it --rm -p 3000:3000 -v "%cd%\\..\\..:/app" docker-meteorjs-webapp bash
FROM node:22

WORKDIR /app

ENV METEOR_ALLOW_SUPERUSER=true
ENV METEOR_DISABLE_OPTIMISTIC_CACHING=1
ENV METEOR_OFFLINE_CATALOG=1
ENV ROOT_URL="http://localhost:3000"

# Install Meteor, but a SPECIFIC VERSION that works for this project (If you need to update it later, remember to: cd webapp-meteor && rm -rf node_modules && rm -rf .meteor/local && meteor update --release 3.1 && meteor reset && meteor npm install --save)
# RUN curl https://install.meteor.com/ | sh
# RUN curl https://install.meteor.com/\?release\=3.1 | sh
RUN curl https://install.meteor.com/\?release\=3.0.4 | sh
# RUN  meteor update --release 3.1 --allow-superuser
RUN  meteor update --release 3.0.4 --allow-superuser

COPY package*.json ./
COPY .meteor/packages ./.meteor/
COPY .meteor/platforms ./.meteor/
COPY .meteor/release ./.meteor/
COPY .meteor/versions ./.meteor/
RUN  meteor npm --no-audit -g --unsafe-perm=true install --save --allow-superuser
RUN npm --no-audit install -g --unsafe-perm=true --allow-root

# This will make sure Meteor is ready offline for Dockerizing!
RUN meteor --get-ready 

COPY . .
RUN  meteor npm --no-audit install --save --allow-superuser

EXPOSE 3000

# CMD ["meteor"]
# CMD ["meteor", "--allow-superuser", "--port", "3000"]
CMD ["/app/start-webapp-on-host.sh"]