# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create data directories
RUN mkdir -p src/data/logs src/data/models src/data/repositories

# Set environment variables
ENV NODE_ENV=production

# Start the bot
CMD [ "npm", "start" ] 