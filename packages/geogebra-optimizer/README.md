# GeoGebra Optimizer

JavaScript library for optimizing GeoGebra constructions using the CMA-ES algorithm via PyOdide.

## Features

- 🔬 **CMA-ES Optimization** - Covariance Matrix Adaptation Evolution Strategy algorithm
- 🐍 **Python in Browser** - Runs Python optimization code via PyOdide (WebAssembly)
- 📐 **GeoGebra Integration** - Direct integration with GeoGebra applets
- 📊 **Real-time Feedback** - Event-driven architecture for live updates
- 🎯 **Regularization** - Built-in L2 regularization to minimize changes
- 🔧 **Flexible** - Pure logic library, no UI dependencies

## Installation

```bash
npm install geogebra-optimizer
```

## Quick Start

```javascript
import { GeoGebraOptimizer } from 'geogebra-optimizer';

const optimizer = new GeoGebraOptimizer();

// Listen to events
optimizer.on('ready', ({ ggbApi, sliders }) => {
    console.log('Ready with sliders:', sliders);
});

optimizer.on('optimization:newBest', ({ solution, metrics }) => {
    console.log('New best solution:', metrics);
});

// Initialize with GeoGebra XML and Python code
await optimizer.init({
    container: document.getElementById('ggb-container'),
    geogebraXML: xmlContent,
    pythonFiles: {
        optimizer: optimizerCode,
        fitness: fitnessCode
    }
});

// Start optimization
await optimizer.optimize({
    selectedSliders: ['AB', 'BC', 'CD'],
    objectiveParams: { lambda: 0.01 },
    solverParams: { maxiter: 100, popsize: 10 }
});
```

## API Reference

### Events

The optimizer emits events throughout its lifecycle:

#### Initialization Events

- **`pyodide:loading`** - PyOdide starts loading
- **`pyodide:ready`** - PyOdide loaded and ready
- **`geogebra:loading`** - GeoGebra starts loading
- **`geogebra:ready`** - GeoGebra loaded, receives `{ api }`
- **`constraints:loaded`** - Sliders detected, receives `{ sliders }`
- **`ready`** - Both ready, receives `{ ggbApi, sliders }`

#### Optimization Events

- **`optimization:start`** - Optimization started, receives `{ selectedSliders, objectiveParams, solverParams }`
- **`optimization:progress`** - Progress update, receives `{ generation, evaluations, metrics }`
- **`optimization:newBest`** - Better solution found, receives `{ solution, metrics, deltas }`
- **`optimization:complete`** - Optimization finished, receives `{ bestSolution, finalMetrics }`
- **`optimization:stopped`** - Stopped by user

#### Other Events

- **`slider:changed`** - Slider value changed, receives `{ name, value, oldValue, allValues }`
- **`log`** - Log message, receives `{ message, level, timestamp }`
- **`error`** - Error occurred, receives `{ error, context }`

### Methods

#### `init(config)`

Initialize the optimizer with GeoGebra and PyOdide.

**Parameters:**
- `config.container` (HTMLElement) - DOM container for GeoGebra
- `config.geogebraXML` (string) - GeoGebra XML content
- `config.geogebraOptions` (Object, optional) - GeoGebra configuration
- `config.pyodideOptions` (Object, optional) - PyOdide configuration
- `config.pythonFiles` (Object) - Python modules to load
  - `pythonFiles.optimizer` (string) - Optimizer Python code
  - `pythonFiles.fitness` (string) - Fitness function Python code

**Returns:** `Promise<void>`

**Example:**
```javascript
await optimizer.init({
    container: document.getElementById('ggb'),
    geogebraXML: '<geogebra>...</geogebra>',
    geogebraOptions: {
        showToolBar: false,
        showAlgebraInput: false
    },
    pythonFiles: {
        optimizer: 'def initialize_optimizer(...):\n    ...',
        fitness: 'def calculate_fitness(...):\n    ...'
    }
});
```

#### `optimize(options)`

Start optimization using CMA-ES algorithm.

**Parameters:**
- `options.selectedSliders` (string[]) - Slider names to optimize
- `options.objectiveParams` (Object, optional) - Objective function parameters
  - `lambda` (number, default: 0.01) - Regularization parameter
- `options.solverParams` (Object, optional) - CMA-ES solver parameters
  - `maxiter` (number, default: 100) - Maximum iterations
  - `popsize` (number, default: 10) - Population size
  - `sigma` (number, default: 0.5) - Initial step size
  - `tolfun` (number, default: 1e-6) - Function tolerance

**Returns:** `Promise<void>`

**Example:**
```javascript
await optimizer.optimize({
    selectedSliders: ['AB', 'BC'],
    objectiveParams: { lambda: 0.01 },
    solverParams: {
        maxiter: 100,
        popsize: 10,
        sigma: 0.5,
        tolfun: 0.000001
    }
});
```

#### `stop()`

Stop the currently running optimization.

**Example:**
```javascript
optimizer.stop();
```

#### `getSliders()`

Get all available sliders from GeoGebra.

**Returns:** `Array<Object>` - Array of slider objects

**Example:**
```javascript
const sliders = optimizer.getSliders();
console.log(sliders);
// [
//   { name: 'AB', min: 0, max: 10, value: 5, default: 5, step: 0.1 },
//   { name: 'BC', min: 0, max: 10, value: 3, default: 3, step: 0.1 }
// ]
```

#### `getSlider(name)`

Get a specific slider by name.

**Parameters:**
- `name` (string) - Slider name

**Returns:** `Object|undefined`

#### `getGeoGebraAPI()`

Get the GeoGebra API instance for direct manipulation.

**Returns:** `Object` - GeoGebra API

**Example:**
```javascript
const ggbApi = optimizer.getGeoGebraAPI();
const x = ggbApi.getXcoord('A');
```

#### `getPyodideAPI()`

Get the PyOdide API instance for running Python code.

**Returns:** `Object` - PyOdide API

**Example:**
```javascript
const pyodide = optimizer.getPyodideAPI();
const result = await pyodide.runPythonAsync('2 + 2');
```

#### `getState()`

Get current optimizer state.

**Returns:** `Object` - State object with `isReady`, `isOptimizing`, etc.

## Python Integration

### Required Python Functions

Your `optimizer.py` must define these functions:

```python
def initialize_optimizer(initial_values, bounds_min, bounds_max, sigma, maxiter, popsize, tolfun):
    """Initialize CMA-ES optimizer"""
    import cma
    # ... implementation
    return es

def ask_solutions(es):
    """Request new solutions from optimizer"""
    # ... implementation
    return json.dumps(solutions)

def tell_results(es, solutions, fitnesses):
    """Send fitness results to optimizer"""
    # ... implementation

def check_convergence(es):
    """Check if optimizer has converged"""
    # ... implementation
    return json.dumps(stop_dict)
```

### Example Python Code

See [`/examples/web-components-ui/python/`](../../examples/web-components-ui/python/) for complete examples.

## Documentation

- **JSDoc API Documentation**: Run `npm run docs` to generate HTML documentation
- **Examples**: See `/examples/` directory
- **UI Framework**: See [geogebra-optimizer-ui](../geogebra-optimizer-ui) for ready-to-use UI components

## Advanced Usage

### Custom Event Handling

```javascript
// Listen for specific events
optimizer.on('optimization:newBest', ({ solution, metrics, deltas }) => {
    console.log(`Generation ${metrics.generation}`);
    console.log(`Best distance: ${metrics.bestDistance}`);
    console.log('Slider changes:', deltas);
});

// One-time listener
optimizer.once('ready', () => {
    console.log('Optimizer ready!');
});

// Remove listener
const listener = optimizer.on('log', ({ message }) => {
    console.log(message);
});
listener(); // Unsubscribe
```

### Parallel Initialization

PyOdide and GeoGebra load in parallel for better performance:

```javascript
// Both load simultaneously
await optimizer.init({ ... });
```

### Error Handling

```javascript
optimizer.on('error', ({ error, context }) => {
    console.error(`Error in ${context}:`, error);
});

try {
    await optimizer.optimize({ ... });
} catch (error) {
    console.error('Optimization failed:', error);
}
```

## Performance

- **Parallel Loading**: PyOdide and GeoGebra load simultaneously
- **Optimized NumPy**: Pre-loads NumPy to avoid duplicate loading by CMA-ES
- **Event-Driven**: Non-blocking architecture with real-time updates

## Exporting Constructions

The package includes `ExportManager` for exporting GeoGebra constructions to various formats.

### Direct Exports (Client-Side)

Export directly from the browser without server-side processing:

```javascript
import { ExportManager } from 'geogebra-optimizer';

const exportManager = new ExportManager({ geogebraManager });

// Export SVG
await exportManager.exportSVG({ filename: 'figure.svg' });

// Export PNG (high quality)
await exportManager.exportPNG({
    dpi: 300,              // 300 DPI for print quality
    scale: 2,              // 2x scale
    transparent: true,     // Transparent background
    filename: 'figure.png'
});

// Export PDF
await exportManager.exportPDF({ filename: 'figure.pdf' });

// Export construction state as JSON
await exportManager.exportJSON({ filename: 'construction.json' });
```

### Server-Side Processing (Webhook)

For advanced conversions (e.g., SVG→DXF), send exports to a server for processing:

```javascript
const exportManager = new ExportManager({
    geogebraManager,
    webhookUrl: 'http://localhost:8000/api/process'
});

// Convert SVG to DXF using vpype
await exportManager.exportViaWebhook('svg', null, {
    outputFormat: 'dxf',
    tolerance: '0.01mm',   // Simplification tolerance
    optimize: true,        // Apply path optimization
    units: 'mm'            // Output units
});
```

See [`examples/export-server/`](../../examples/export-server/) for a reference FastAPI server implementation using vpype.

### ⚠️ Export Limitations & Warnings

#### GeoGebra Vector Export Precision

GeoGebra has inherent limitations in vector exports (SVG, PDF, EPS):

- **Bézier curve control points are rounded to integers**
- **Only 5 significant digits** are written (insufficient for full single-precision)
- **Does NOT affect PNG exports**

Source: GeoGebra community discussions and official documentation.

**Recommendation**: For highest precision requirements, use PNG export with high DPI (300-600) instead of vector formats.

#### DXF Export via vpype

When converting SVG→DXF using vpype (server-side):

- **Bézier curves are converted to polylines** (line segments)
- Complex curves become **many small segments**
- This can cause:
  - **Loss of precision** on smooth curves
  - **Machine wear** (laser cutter/CNC) due to micro-segments
  - **Large DXF files** for complex drawings

**Adjust settings** based on your use case:
- High-precision cutting: Lower tolerance (`0.001mm`)
- Fast prototyping: Higher tolerance (`0.1mm`)
- Complex curves: Enable `optimize: true` to reduce segments

### Export Events

ExportManager emits events for tracking export progress:

```javascript
exportManager.on('export:start', ({ format, method }) => {
    console.log(`Starting ${format} export via ${method}`);
});

exportManager.on('export:progress', ({ format, step, progress }) => {
    console.log(`${format}: ${step} (${progress * 100}%)`);
});

exportManager.on('export:complete', ({ format, filename }) => {
    console.log(`Export complete: ${filename}`);
});

exportManager.on('error', ({ error, context }) => {
    console.error(`Export error in ${context}:`, error);
});
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires WebAssembly support for PyOdide.

## Examples

### Complete Example

```javascript
import { GeoGebraOptimizer } from 'geogebra-optimizer';

// Fetch resources
const [xml, optimizer, fitness] = await Promise.all([
    fetch('geogebra.xml').then(r => r.text()),
    fetch('optimizer.py').then(r => r.text()),
    fetch('fitness.py').then(r => r.text())
]);

// Create and initialize
const opt = new GeoGebraOptimizer();

opt.on('optimization:newBest', ({ metrics }) => {
    console.log(`Distance: ${metrics.bestDistance.toFixed(6)}`);
});

await opt.init({
    container: document.getElementById('app'),
    geogebraXML: xml,
    pythonFiles: { optimizer, fitness }
});

// Start optimization
await opt.optimize({
    selectedSliders: ['AB', 'BC', 'CD'],
    objectiveParams: { lambda: 0.01 },
    solverParams: { maxiter: 50 }
});
```

See [`/examples/web-components-ui/`](../../examples/web-components-ui/) for a complete working example with UI.

## License

MIT
