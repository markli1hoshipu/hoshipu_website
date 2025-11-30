# ./frontend/Dockerfile

# --- Stage 1: Builder ---
# Use a recent, stable Node.js version for building
FROM node:20-slim as builder

# Install Python and build tools needed for native dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app/frontend

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install
# RUN yarn install
# RUN pnpm install --frozen-lockfile # Recommended for pnpm

# Copy the rest of the frontend source code
COPY . .

# Accept build arguments for environment variables
ARG VITE_GOOGLE_API_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_MICROSOFT_CLIENT_ID
ARG VITE_MICROSOFT_TENANT_ID
ARG VITE_BACKEND_SOCKETIO_URL
ARG VITE_BACKEND_API_URL
ARG VITE_BACKEND_LEAD_API_URL
ARG VITE_SALESCENTER_API_URL
ARG VITE_CRM_API_URL
ARG VITE_USER_SETTINGS_API_URL

# Set environment variables for Vite build
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID
ENV VITE_MICROSOFT_TENANT_ID=$VITE_MICROSOFT_TENANT_ID
ENV VITE_BACKEND_SOCKETIO_URL=$VITE_BACKEND_SOCKETIO_URL
ENV VITE_BACKEND_API_URL=$VITE_BACKEND_API_URL
ENV VITE_BACKEND_LEAD_API_URL=$VITE_BACKEND_LEAD_API_URL
ENV VITE_SALESCENTER_API_URL=$VITE_SALESCENTER_API_URL
ENV VITE_CRM_API_URL=$VITE_CRM_API_URL
ENV VITE_USER_SETTINGS_API_URL=$VITE_USER_SETTINGS_API_URL

# Build the Vite application for production
# Assuming your package.json has a "build" script (e.g., "build": "vite build")
RUN npm run build
# Or yarn build, pnpm build

# --- Stage 2: Server ---
# Use a lightweight web server like Nginx to serve the static files
FROM nginx:alpine

# Copy the build output from the builder stage into the Nginx webroot
# The default build output directory for Vite is 'dist'
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration file for React Router support
# This enables client-side routing where all requests are served by index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port Nginx runs on (default HTTP port)
EXPOSE 80

# Command to run Nginx in the foreground (essential for Docker)
CMD ["nginx", "-g", "daemon off;"]