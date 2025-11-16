# GeoGebra Optimizer - Monorepo

Application web interactive combinant GeoGebra et l'optimisation CMA-ES (Covariance Matrix Adaptation Evolution Strategy) via PyOdide (Python en WebAssembly).

## TODO

- [ ] Ajouter les contraintes supplémentaires avec ConstrainedFitnessAL

## Architecture du projet

Ce projet est organisé en **monorepo** avec npm workspaces :

```
/
├── packages/
│   ├── geogebra-optimizer/          # 📦 Package core (engine d'optimisation)
│   │   ├── src/
│   │   │   ├── GeoGebraOptimizer.js # Engine principal
│   │   │   ├── PyodideManager.js    # Gestion de Pyodide
│   │   │   ├── GeoGebraManager.js   # Gestion de GeoGebra API
│   │   │   └── EventBus.js          # Système événementiel
│   │   └── package.json
│   │
│   └── geogebra-optimizer-ui/       # 🎨 Package UI (Web Components)
│       ├── src/
│       │   ├── GeoGebraOptimizerUI.js
│       │   ├── BaseModule.js
│       │   └── modules/             # Modules UI (SliderPanel, MetricsPanel, etc.)
│       ├── styles/
│       ├── locales/                 # Traductions (fr, en)
│       └── package.json
│
├── app/                             # 🚀 Application coquille
│   ├── server.js                    # Serveur Express
│   ├── public/
│   │   ├── index.html               # Point d'entrée (avec CDN Pyodide et GeoGebra)
│   │   ├── main.js                  # Initialisation de l'UI
│   │   └── assets/
│   │       └── geogebra.xml         # Fichier GeoGebra
│   └── package.json
│
└── package.json                     # Configuration workspace racine
```

## ⚠️ Dépendances externes requises

**Important** : Les packages utilisent des **dépendances externes** qui doivent être chargées dans votre HTML :

### Dans `index.html` :

```html
<!-- Pyodide CDN - Requis par geogebra-optimizer -->
<script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>

<!-- GeoGebra API - Requis par geogebra-optimizer -->
<script src="https://www.geogebra.org/apps/deployggb.js"></script>

<!-- Styles du package geogebra-optimizer-ui - Requis pour l'UI -->
<link rel="stylesheet" href="/packages/geogebra-optimizer-ui/styles/default.css">
```

**Pourquoi ?**
- Les packages `geogebra-optimizer` et `geogebra-optimizer-ui` sont des **modules ES6**
- **Scripts CDN** : Pyodide et GeoGebra sont des scripts **UMD/global** qui exposent `window.loadPyodide` et `window.GGBApplet` - impossible de les importer en ES6
- **CSS** : Les styles du package UI doivent être chargés explicitement via `<link>` dans le HTML
- Le package optimizer **utilise** `window.loadPyodide` mais ne le **charge pas** lui-même

## Installation

```bash
# À la racine du projet
npm install
```

npm workspaces va automatiquement :
- Installer les dépendances de tous les packages
- Créer les liens symboliques entre les packages
- Installer Express pour l'app coquille

## Utilisation

### Démarrer l'application

```bash
# Depuis la racine
npm start

# Ou directement dans /app
cd app
node server.js
```

L'application sera accessible sur **http://localhost:8000/**

### Utiliser l'optimiseur

1. **Chargement initial** : Attendez que Pyodide et CMA-ES soient chargés (~10-30 secondes)
2. **Sélection des sliders** : Cochez/décochez les sliders que vous souhaitez optimiser
3. **Paramétrage** : Ajustez les paramètres du solver (optionnel)
4. **Démarrage** : Cliquez sur "Démarrer l'optimisation"
5. **Suivi** : Observez les métriques, logs et historique en temps réel
6. **Arrêt** : Cliquez sur "Arrêter" pour interrompre l'optimisation

## Fonctionnalités

### 🎨 Interface GeoGebra
- Affichage interactif de la construction géométrique
- Manipulation des points et sliders en temps réel
- Visualisation de l'optimisation en direct

### 🧬 Optimisation CMA-ES
- **Algorithme évolutionnaire** : CMA-ES pour optimisation globale
- **Fonction objectif** : Minimisation de la distance entre A' et A avec régularisation L2
- **Sélection flexible** : Choisissez quels sliders optimiser
- **Paramètres configurables** : maxiter, popsize, sigma, tolfun, lambda

### 📊 Métriques en temps réel
- Distance actuelle et meilleure distance
- Fitness et pénalité de régularisation
- Deltas des sliders
- Génération et nombre d'évaluations
- Barre de progression

### 📜 Historique (Snapshots)
- Sauvegarde automatique avant/après optimisation
- Restauration de n'importe quel snapshot
- Calcul des deltas par rapport au snapshot précédent

### 📤 Export
- **Exports directs** : SVG, PNG (avec scale), PDF, XML
- **Export serveur** : DXF via webhook (conversion Bézier → polylines)
- **Options** : Fond transparent, masquage des éléments décoratifs

## Conventions GeoGebra

### Nommage des points

- **Point de départ** : Le point de départ de votre construction doit être nommé **`A`**
- **Point d'arrivée** : Le point d'arrivée (pour les figures fermées) doit être nommé **`A'`**

L'objectif de l'optimisation est de minimiser la distance entre ces deux points.

### Sliders cachés

Les sliders peuvent être cachés dans GeoGebra :
- **Variables d'optimisation** : Les sliders cachés sont toujours utilisés comme variables
- **Affichage UI** : Les sliders cachés ne sont PAS affichés dans le panneau
- **Pénalité L2** : Les sliders cachés sont EXCLUS du calcul de la pénalité de régularisation
- **Sélection automatique** : Les sliders cachés sont automatiquement sélectionnés

## Développement des packages

### Package `geogebra-optimizer` (Core)

```javascript
import { GeoGebraOptimizer } from 'geogebra-optimizer';

const optimizer = new GeoGebraOptimizer();
await optimizer.init({
  geogebraXML: xmlContent,
  container: document.getElementById('ggbApplet')
});

await optimizer.optimize({
  selectedSliders: ['AB', 'BC', 'CD'],
  solverParams: { maxiter: 100, popsize: 10 },
  objectiveParams: { lambda: 0.01 }
});
```

### Package `geogebra-optimizer-ui` (UI)

```javascript
import { GeoGebraOptimizerUI } from 'geogebra-optimizer-ui';

const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer: optimizer,
  locale: 'fr' // ou 'en'
});

await ui.init({ geogebraXML: xmlContent });
```

## Stack technologique

- **Frontend** : Vanilla JavaScript (ES6+), Web Components
- **GeoGebra API** : `deployggb.js` (CDN)
- **Pyodide 0.24.1** : Python dans le navigateur via WebAssembly (CDN)
- **CMA-ES** : Algorithme d'optimisation évolutionnaire (installé via micropip)
- **Backend** : Node.js + Express
- **Monorepo** : npm workspaces

## Performance

### Temps de chargement
- **Pyodide** : ~10-30 secondes (première fois, puis mis en cache)
- **CMA-ES** : ~2-5 secondes
- **GeoGebra** : ~1-2 secondes

### Vitesse d'optimisation
- **Évaluations/seconde** : ~20-30 (dépend du navigateur)
- **Génération typique** : ~0.5-1 seconde (popsize=10)
- **Convergence** : 10-50 générations (selon la complexité)

## Références

- [GeoGebra API Documentation](https://wiki.geogebra.org/en/Reference:JavaScript)
- [PyOdide Documentation](https://pyodide.org/en/stable/)
- [CMA-ES Python Library](https://github.com/CMA-ES/pycma)
- [CMA-ES Algorithm](https://en.wikipedia.org/wiki/CMA-ES)

## Licence

MIT

## Auteur

Créé avec Claude Code
