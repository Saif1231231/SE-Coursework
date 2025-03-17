# Base image to use
FROM node:latest

# seting a working directory
WORKDIR /src

# Copying across project configuration information
# Installing application dependencies
COPY package*.json /src/

# Asking the npm to install the dependencies
RUN npm install -g supervisor && npm install && npm install supervisor

# Copying across all our files
COPY . /src

# Expose our application port (3000)
EXPOSE 3000


