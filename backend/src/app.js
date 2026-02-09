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

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
