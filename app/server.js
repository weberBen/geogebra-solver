import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// ===== MIDDLEWARE =====

// Serve static files from the app
app.use(express.static(path.join(__dirname, 'public')));

// ===== PACKAGE ROUTES =====

// Serve the geogebra-optimizer-ui package
app.use('/packages/geogebra-optimizer-ui', express.static(
  path.join(__dirname, '../packages/geogebra-optimizer-ui'),
  {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }
));

// Serve the geogebra-optimizer package
app.use('/packages/geogebra-optimizer', express.static(
  path.join(__dirname, '../packages/geogebra-optimizer'),
  {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      }
    }
  }
));

// Serve the examples directory
app.use('/examples', express.static(
  path.join(__dirname, '../examples'),
  {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.xml')) {
        res.setHeader('Content-Type', 'application/xml');
      }
    }
  }
));

// ===== ROOT ROUTE =====

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  res.status(404).send('<h1>404 - Not Found</h1>');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

// ===== SERVER STARTUP =====

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
  console.log(`📦 Serving geogebra-optimizer-ui from /packages/`);
});
