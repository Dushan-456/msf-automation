# Stage 1: Build the React application
FROM node:20-slim AS build

WORKDIR /usr/src/app

# Copy package dependencies
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source
COPY . .

# Accept built-time arguments
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the app for production
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built assets to the Nginx public folder
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose frontend port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
