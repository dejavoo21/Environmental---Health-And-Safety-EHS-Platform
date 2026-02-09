const express = require('express');
const path = require('path');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Parse multiple CORS origins from env variable (comma-separated)
const corsOrigins = env.corsOrigin.split(',').map(origin => origin.trim());
app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(express.json());

// Serve static files from uploads directory (logos, attachments)
app.use('/uploads', express.static(path.join(process.cwd(), env.uploadsDir)));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', routes);

// Serve frontend static files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.use(errorHandler);

module.exports = app;
