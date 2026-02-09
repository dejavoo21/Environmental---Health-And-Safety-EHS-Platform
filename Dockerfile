FROM node:18-alpine

WORKDIR /app

# Copy backend
COPY backend ./backend
WORKDIR /app/backend
RUN npm install

# Copy frontend
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

WORKDIR /app/backend

EXPOSE 3001

CMD ["npm", "run", "dev"]
