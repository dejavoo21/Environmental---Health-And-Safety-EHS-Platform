const express = require('express');
const path = require('path');
const fs = require('fs');
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

// Health check endpoint - responds immediately without any DB checks
app.get('/health', (req, res) => {
  try {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// API routes
app.use('/api', routes);

// Serve frontend static files (if built)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
const frontendDistExists = fs.existsSync(frontendDistPath);

if (frontendDistExists) {
  app.use(express.static(frontendDistPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Frontend not available' });
    }
  });
} else {
  // Frontend not built - serve API-only message
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Frontend not available. API is running at /api' });
  });
  console.warn('[App] Frontend dist folder not found. API-only mode.');
}

app.use(errorHandler);

module.exports = app;
