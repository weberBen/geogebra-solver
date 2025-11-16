import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// ===== MIDDLEWARE =====

// Servir les fichiers statiques de l'app
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES POUR LES PACKAGES =====

// Servir le package geogebra-optimizer-ui
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

// Servir le package geogebra-optimizer
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

// Servir le dossier examples
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

// ===== ROUTE RACINE =====

// Page principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ===== GESTION D'ERREURS =====

// 404 handler
app.use((req, res) => {
  res.status(404).send('<h1>404 - Not Found</h1>');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

// ===== DÉMARRAGE DU SERVEUR =====

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
  console.log(`📦 Serving geogebra-optimizer-ui from /packages/`);
});
