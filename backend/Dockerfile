# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of your application code
COPY . .

# Your app runs on port 5000, so expose it
# IMPORTANT: Make sure your Express app listens on this port (e.g., process.env.PORT || 5000)
EXPOSE 5001

# The command to run your app
CMD [ "npm", "start" ]