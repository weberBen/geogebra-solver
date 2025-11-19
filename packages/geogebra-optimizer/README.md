# GeoGebra Optimizer

JavaScript library for optimizing GeoGebra constructions using the CMA-ES algorithm via PyOdide.

## Features

- 🔬 **CMA-ES Optimization** - Covariance Matrix Adaptation Evolution Strategy algorithm
- 🐍 **Python in Browser** - Runs Python optimization code via PyOdide (WebAssembly)
- 📐 **GeoGebra Integration** - Direct integration with GeoGebra applets
- 📊 **Real-time Feedback** - Event-driven architecture for live updates
- 🎯 **Constraint-Based** - Augmented Lagrangian method for hard and soft constraints
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
optimizer.on('ready', ({ ggbApi, variables }) => {
    console.log('Ready with variables:', variables);
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

// Start optimization with constraints
await optimizer.optimize({
    selectedVariables: ['AB', 'BC', 'CD'],
    constraints: [
        { expr: "Distance(A', A)", op: "=", value: 0, tolerance: 1e-4 }
    ],
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
- **`constraints:loaded`** - Variables detected, receives `{ variables }`
- **`ready`** - Both ready, receives `{ ggbApi, variables }`

#### Optimization Events

- **`optimization:start`** - Optimization started, receives `{ selectedVariables, constraints, solverParams }`
- **`optimization:progress`** - Progress update, receives `{ generation, evaluations, metrics }`
- **`optimization:newBest`** - Better solution found, receives `{ solution, metrics, deltas }`
- **`optimization:complete`** - Optimization finished, receives `{ bestSolution, finalMetrics }`
- **`optimization:stopped`** - Stopped by user

#### Other Events

- **`variable:changed`** - Variable value changed, receives `{ name, value, oldValue, allValues }`
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

Start constrained optimization using CMA-ES with Augmented Lagrangian method.

**Parameters:**
- `options.selectedVariables` (string[]) - Variable names to optimize
- `options.constraints` (Array<Object>, optional) - Constraint definitions (see Constraints section below)
  - Each constraint: `{ expr, op, value, tolerance, weight? }`
- `options.defaultTolerance` (number, default: 1e-4) - Default tolerance for constraints
- `options.solverParams` (Object, optional) - CMA-ES solver parameters
  - `maxiter` (number, default: 100) - Maximum iterations
  - `popsize` (number, default: 10) - Population size
  - `sigma` (number, default: 0.5) - Initial step size
  - `tolfun` (number, default: 1e-6) - Function tolerance

**Returns:** `Promise<void>`

**Example:**
```javascript
await optimizer.optimize({
    selectedVariables: ['AB', 'BC'],
    constraints: [
        { expr: "Distance(A', A)", op: "=", value: 0, tolerance: 1e-4 },
        { expr: "AB", op: ">", value: 5, weight: 2 }
    ],
    defaultTolerance: 1e-4,
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

#### `getVariables()`

Get all available variables from GeoGebra.

**Returns:** `Array<Object>` - Array of variable objects

**Example:**
```javascript
const variables = optimizer.getVariables();
console.log(variables);
// [
//   { name: 'AB', min: 0, max: 10, value: 5, default: 5, step: 0.1 },
//   { name: 'BC', min: 0, max: 10, value: 3, default: 3, step: 0.1 }
// ]
```

#### `getVariable(name)`

Get a specific variable by name.

**Parameters:**
- `name` (string) - Variable name

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

## GeoGebra Configuration

### Variable Configuration with Checkboxes

GeoGebra allows you to configure variables (numeric values) with two important checkboxes in the object properties:

#### **userVariable** Checkbox

Located in the "Advanced" tab of object properties, this checkbox determines:
- **When checked**: The variable appears in the **Variables Panel** UI and can be selected for optimization
- **When unchecked**: The variable is **hidden** from the Variables Panel but still exists in GeoGebra
- **Default behavior**: Unchecked variables are automatically included in optimization but not shown in the UI

**Use cases:**
- Check for variables you want users to manually select/deselect (e.g., construction parameters)
- Uncheck for internal variables that should always be optimized but hidden from UI (e.g., auxiliary angles)

#### **decoration** Checkbox

Located in the "Basic" tab of object properties under "Show Object", this checkbox determines:
- **When checked**: The variable is **visible** in the GeoGebra drawing (appears as text/slider)
- **When unchecked**: The variable is **hidden** from the GeoGebra viewer but still functional

**Use cases:**
- Uncheck to hide auxiliary variables from cluttering the construction view
- Check to show important parameters users should see

**Example Configuration:**

| Variable | userVariable | decoration | Result |
|----------|--------------|------------|--------|
| AB (length) | ✓ checked | ✓ checked | Visible in GeoGebra, shown in Variables Panel |
| angle_aux | ✗ unchecked | ✗ unchecked | Hidden everywhere, auto-optimized |
| BC (length) | ✓ checked | ✗ unchecked | Hidden in GeoGebra, shown in Variables Panel |

## Constraints

The optimizer uses **Augmented Lagrangian** method to handle constraints. Constraints define conditions that the optimized solution must satisfy.

### Constraint Types

#### Hard Constraints (Equality: `op: "="`)
Strict requirements that **must** be satisfied (e.g., `Distance(A', A) = 0`).
- Enforced with high penalty
- Used for geometric requirements (coincidence, perpendicularity, etc.)

#### Soft Constraints (Inequality: `op: ">"`, `op: "<"`)
Preferences that should be satisfied when possible but can be violated.
- Lower penalty, can be weighted
- Used for design preferences (minimum lengths, angle ranges, etc.)

### Constraint Format

```javascript
{
    expr: string,      // GeoGebra expression to evaluate
    op: "=" | ">" | "<",  // Operator
    value: number,     // Target value
    tolerance: number, // Tolerance for "=" constraints (default: 1e-4)
    weight: number     // Weight for soft constraints (default: 1)
}
```

### Constraint Examples

#### Example 1: Point Coincidence
```javascript
{
    expr: "Distance(A', A)",  // Distance between A' and A
    op: "=",                   // Must equal
    value: 0,                  // Zero
    tolerance: 1e-4            // Within 0.0001 units
}
```
**Interpretation**: Point A' must coincide with point A (hard constraint).

#### Example 2: Minimum Length
```javascript
{
    expr: "AB",        // Length variable
    op: ">",           // Must be greater than
    value: 5,          // 5 units
    weight: 2          // Higher priority (default: 1)
}
```
**Interpretation**: Length AB should be at least 5 units (soft constraint, weighted 2x).

#### Example 3: Angle Range
```javascript
{
    expr: "angle",
    op: ">",
    value: 30
},
{
    expr: "angle",
    op: "<",
    value: 150
}
```
**Interpretation**: Angle should be between 30° and 150°.

#### Example 4: Multiple Points Coincidence
```javascript
constraints: [
    { expr: "Distance(A', A)", op: "=", value: 0, tolerance: 1e-4 },
    { expr: "Distance(B', B)", op: "=", value: 0, tolerance: 1e-4 },
    { expr: "Distance(C', C)", op: "=", value: 0, tolerance: 1e-4 }
]
```
**Use case**: Fitting a triangle A'B'C' onto target points A, B, C.

### Complete Optimization Example

```javascript
// Optimize a quadrilateral ABCD to match target shape A'B'C'D'
// while maintaining minimum side lengths
await optimizer.optimize({
    selectedVariables: ['AB', 'BC', 'CD', 'angleABC', 'angleBCD'],

    constraints: [
        // Hard constraints: vertices must coincide
        { expr: "Distance(A', A)", op: "=", value: 0, tolerance: 1e-4 },
        { expr: "Distance(B', B)", op: "=", value: 0, tolerance: 1e-4 },
        { expr: "Distance(C', C)", op: "=", value: 0, tolerance: 1e-4 },
        { expr: "Distance(D', D)", op: "=", value: 0, tolerance: 1e-4 },

        // Soft constraints: minimum side lengths
        { expr: "AB", op: ">", value: 100, weight: 1 },
        { expr: "BC", op: ">", value: 100, weight: 1 },
        { expr: "CD", op: ">", value: 100, weight: 1 },

        // Soft constraint: angle range
        { expr: "angleABC", op: ">", value: 90, weight: 0.5 },
        { expr: "angleABC", op: "<", value: 180, weight: 0.5 }
    ],

    defaultTolerance: 1e-4,

    solverParams: {
        maxiter: 200,
        popsize: 15,
        sigma: 0.5,
        tolfun: 1e-6
    }
});
```

### How Constraints Work Internally

1. **Augmented Lagrangian**: Combines objective function with constraint penalties
2. **Penalty Updates**: Automatically increases penalties for violated constraints
3. **Feasibility Tracking**: Monitors constraint violations and reports in metrics
4. **Adaptive Weighting**: Balances hard constraints (equality) vs soft constraints (inequality)

### Constraint Tips

- **Tolerance**: Use `1e-4` to `1e-6` for geometric precision
- **Weights**: Higher weights (2-5) prioritize certain soft constraints
- **Redundancy**: Avoid redundant constraints (e.g., `AB > 5` and `AB > 10`)
- **Feasibility**: Ensure constraints don't contradict each other
- **Start Simple**: Begin with hard constraints only, then add soft constraints

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
    console.log('Variable changes:', deltas);
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

**SVG/PDF/EPS Export Issues:**
- GeoGebra's vector export has inherent precision limitations
- For complex objects, GeoGebra may use polyline approximations instead of true Bézier curves
- Control points and coordinates may be rounded during export

**Bézier to Polyline Conversion:**
- All curves are converted to polylines (many small line segments)
- For machine operation (like CNC, or printer), this can result in:
  - **Loss of smooth curves** → Quality degradation on complex shapes
  - **Very large file sizes**
  - **Potential machinery wear** (laser cutters, CNC routers) due to high segment count
  - **Slower machine operation** from processing thousands of micro-segments

However, in reality such case might not appears since the shape on geogebra cannot exceed a specific complexity in reasonable treatement time.


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
    selectedVariables: ['AB', 'BC', 'CD'],
    objectiveParams: { lambda: 0.01 },
    solverParams: { maxiter: 50 }
});
```

See [`/examples/web-components-ui/`](../../examples/web-components-ui/) for a complete working example with UI.

# Disclaimer

Used with Claude Code 2.0.42
