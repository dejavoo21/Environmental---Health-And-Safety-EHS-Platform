FROM node:20-alpine

WORKDIR /app

# Copy both backend and frontend
COPY ./backend ./backend
COPY ./frontend ./frontend

# Build frontend first
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps || npm install
ENV VITE_API_URL=/api
RUN npm run build

# Setup backend
WORKDIR /app/backend
RUN npm install --legacy-peer-deps || npm install

WORKDIR /app/backend

EXPOSE 3001

CMD ["npm", "run", "dev"]
