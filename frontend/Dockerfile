# --- Stage 1: Build the React application ---
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# NOTE: npm run dev is for development. For production, you must build the static files.
# The 'npm run build' command creates an optimized 'dist' folder.
RUN npm run build

# --- Stage 2: Serve the static files with Nginx ---
FROM nginx:stable-alpine

# Copy the static files from the 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx listens on port 80 by default
EXPOSE 80

# When the container starts, Nginx will automatically serve the files.
CMD ["nginx", "-g", "daemon off;"]