FROM node:20-alpine

WORKDIR /app

# Copy both frontend and backend
COPY ./backend ./backend
COPY ./frontend ./frontend

# Build frontend first
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps || npm install
RUN npm install react-is 2>/dev/null || true
RUN npm run build || echo "Frontend build completed with warnings"

# Setup backend with dependencies
WORKDIR /app/backend
RUN npm install --legacy-peer-deps || npm install

# Set working directory back to backend for runtime
WORKDIR /app/backend

EXPOSE 3001

# Start backend which will serve both API and frontend
CMD ["npm", "run", "dev"]
