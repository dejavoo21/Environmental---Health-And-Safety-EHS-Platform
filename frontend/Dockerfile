# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# VITE_API_BASE_URL will be baked into the bundle at build time
# e.g. http://backend:3001/api for docker-compose
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Serve stage – Nginx
FROM nginx:1.27-alpine AS runtime

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Basic nginx config (optional to tune later)
# - you can add a custom nginx.conf if needed

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
