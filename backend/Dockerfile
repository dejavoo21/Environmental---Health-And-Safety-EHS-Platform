# Backend Dockerfile for EHS Portal

FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --only=production

# Copy source
COPY . .

# Environment:
# - PORT
# - DATABASE_URL (or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME)
# - JWT_SECRET

EXPOSE 3001

CMD ["npm", "start"]
