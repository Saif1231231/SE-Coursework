# Base image to use
FROM node:18

# setting a working directory
WORKDIR /src

# Copying across project configuration information
COPY package*.json /src/

# Clean install dependencies in the container
RUN npm install -g supervisor && npm install

# Copying across all our files
COPY . /src

# Remove any existing node_modules that might have been copied from host
RUN rm -rf node_modules && npm install

# Expose our application port (3002)
EXPOSE 3002


