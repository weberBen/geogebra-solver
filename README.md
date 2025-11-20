# GeoGebra Solver - Monorepo

> The GeoGebra solver that nobody asked for

![Demo loading...Please wait...](assets/demo.gif)

Interactive web application combining GeoGebra and CMA-ES optimization (Covariance Matrix Adaptation Evolution Strategy) via PyOdide (Python in WebAssembly).

## Project Architecture

This project is organized as a **monorepo** with npm workspaces:

```
/
├── packages/
│   ├── geogebra-optimizer/          # 📦 Core package (optimization engine)
│   │   ├── src/
│   │   │   ├── GeoGebraOptimizer.js # Main engine
│   │   │   ├── PyodideManager.js    # Pyodide management
│   │   │   ├── GeoGebraManager.js   # GeoGebra API management
│   │   │   └── EventBus.js          # Event system
│   │   └── package.json
│   │
│   └── geogebra-optimizer-ui/       # 🎨 UI package (Web Components)
│       ├── src/
│       │   ├── GeoGebraOptimizerUI.js
│       │   ├── BaseModule.js
│       │   └── modules/             # UI modules (VariablePanel, MetricsPanel, etc.)
│       ├── styles/
│       ├── locales/                 # Translations (fr, en)
│       └── package.json
│
├── app/                             # 🚀 Shell application
│   ├── server.js                    # Express server
│   ├── public/
│   │   ├── index.html               # Entry point (with Pyodide and GeoGebra CDN)
│   │   ├── main.js                  # UI initialization
│   │   └── assets/
│   │       └── geogebra.xml         # GeoGebra file
│   └── package.json
│
└── package.json                     # Root workspace configuration
```

## ⚠️ Required External Dependencies

**Important**: The packages use **external dependencies** that must be loaded in your HTML:

### In `index.html`:

```html
<!-- Pyodide CDN - Required by geogebra-optimizer -->
<script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>

<!-- GeoGebra API - Required by geogebra-optimizer -->
<script src="https://www.geogebra.org/apps/deployggb.js"></script>

<!-- geogebra-optimizer-ui package styles - Required for UI -->
<link rel="stylesheet" href="/packages/geogebra-optimizer-ui/styles/default.css">
```

**Why?**
- The `geogebra-optimizer` and `geogebra-optimizer-ui` packages are **ES6 modules**
- **CDN Scripts**: Pyodide and GeoGebra are **UMD/global** scripts that expose `window.loadPyodide` and `window.GGBApplet` - impossible to import them as ES6
- **CSS**: The UI package styles must be explicitly loaded via `<link>` in the HTML
- The optimizer package **uses** `window.loadPyodide` but doesn't **load** it itself

## Installation

```bash
# At the project root
npm install
```

npm workspaces will automatically:
- Install dependencies for all packages
- Create symbolic links between packages
- Install Express for the shell app

## Usage

### Start the application

```bash
# From the root
npm start

# Or directly in /app
cd app
node server.js
```

The application will be accessible at **http://localhost:8000/**

### Using the optimizer

1. **Initial loading**: Wait for Pyodide and CMA-ES to load (~10-30 seconds)
2. **Variable selection**: Check/uncheck the variables you want to optimize
3. **Configuration**: Adjust solver parameters (optional)
4. **Start**: Click on "Start optimization"
5. **Monitoring**: Observe metrics, logs and history in real-time
6. **Stop**: Click on "Stop" to interrupt optimization

## Features

### 🎨 GeoGebra Interface
- Interactive display of geometric construction
- Real-time manipulation of points and variables
- Live optimization visualization

### 🧬 CMA-ES Optimization with Hard Constraints
- **Evolutionary algorithm**: CMA-ES with ConstrainedFitnessAL (Augmented Lagrangian)
- **Objective function**: Minimize L2 penalty on variable changes
- **Hard constraint**: Distance between A' and A must be ≤ epsilon (configurable tolerance)
- **Flexible selection**: Choose which variables to optimize
- **Configurable parameters**: maxiter, popsize, sigma, tolfun, epsilon

### 📊 Real-time Metrics
- Current distance and best distance
- Fitness and regularization penalty
- Variable deltas
- Generation and number of evaluations
- Progress bar

### 📜 History (Snapshots)
- Automatic save before/after optimization
- Restore any snapshot
- Calculate deltas from previous snapshot

### 📤 Export
- **Direct exports**: SVG, PNG (with scale), PDF, XML
- **Webhook export**: Configure external server URL for custom processing (e.g., DXF conversion)
- **Options**: Transparent background, hide decorative elements

⚠️ **Note:** Vector exports have inherent precision limitations. See the [UI package documentation](./packages/geogebra-optimizer-ui/README.md#export-quality-warnings) for detailed warnings about DXF conversion, curve precision, and the included example server.

## GeoGebra Configuration & Constraints

### Variable Configuration

GeoGebra variables can be configured using two checkboxes:

- **userVariable checkbox** (Advanced tab): Controls visibility in the Variables Panel UI
  - Checked: Shown in UI, user can select/deselect
  - Unchecked: Hidden from UI, automatically included in optimization

- **decoration checkbox** (Basic tab, "Show Object"): Controls visibility in GeoGebra viewer
  - Checked: Visible as text/variable in the drawing
  - Unchecked: Hidden from the drawing view

### Constraint-Based Optimization

The optimizer uses **Augmented Lagrangian** method for constrained optimization:

- **Hard Constraints** (equality, `op: "="`): Strict requirements (e.g., point coincidence)
- **Soft Constraints** (inequality, `op: ">"` or `"<"`): Preferences with weights

**Example:**
```javascript
constraints: [
    { expr: "Distance(A', A)", op: "=", value: 0 },  // Hard: A' = A
    { expr: "AB", op: ">", value: 100, weight: 2 }   // Soft: AB >= 100
]
```

For complete documentation on constraints, GeoGebra configuration, and examples, see [geogebra-optimizer README](./packages/geogebra-optimizer/README.md#constraints).

## Package Development

### `geogebra-optimizer` Package (Core)

```javascript
import { GeoGebraOptimizer } from 'geogebra-optimizer';

const optimizer = new GeoGebraOptimizer();
await optimizer.init({
  geogebraXML: xmlContent,
  container: document.getElementById('ggbApplet')
});

await optimizer.optimize({
  selectedVariables: ['AB', 'BC', 'CD'],
  constraints: [
    { expr: "Distance(A', A)", op: "=", value: 0 }
  ],
  solverParams: { maxiter: 100, popsize: 10 }
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

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), Web Components
- **GeoGebra API**: `deployggb.js` (CDN)
- **Pyodide 0.24.1**: Python in the browser via WebAssembly (CDN)
- **CMA-ES**: Evolutionary optimization algorithm (installed via micropip)
- **Backend**: Node.js + Express
- **Monorepo**: npm workspaces

## Performance

### Loading Time
- **Pyodide**: ~10-30 seconds (first time, then cached)
- **CMA-ES**: ~2-5 seconds
- **GeoGebra**: ~1-2 seconds

### Optimization Speed
- **Evaluations/second**: ~20-30 (depends on browser)
- **Typical generation**: ~0.5-1 second (popsize=10)
- **Convergence**: 10-50 generations (depending on complexity)

## References

- [GeoGebra API Documentation](https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/)
- [PyOdide Documentation](https://pyodide.org/en/stable/)
- [CMA-ES Python Library](https://github.com/CMA-ES/pycma)
- [CMA-ES Algorithm](https://en.wikipedia.org/wiki/CMA-ES)

## Disclaimer

Used with Claude Code 2.0.42
