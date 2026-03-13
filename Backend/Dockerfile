FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package dependencies
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source
COPY . .

# Expose backend port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
