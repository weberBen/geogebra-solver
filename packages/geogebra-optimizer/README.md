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

### Creating Constraints in GeoGebra

Constraints are defined using **text objects** in GeoGebra with a specific format.

#### Step 1: Create a Text Object

1. In GeoGebra: **Insert → Text** (or click the text tool)
2. In the text editor, type your constraint using the format below
3. Click OK to create the text object

#### Step 2: Constraint Format

Each text object contains ONE constraint with this format:

```
"constraint(type, operator[, label]):" expression
```

**Parameters:**
- **type**: `hard` or `soft` (case insensitive)
  - `hard`: Enforced with Augmented Lagrangian (must be satisfied)
  - `soft`: Enforced with L2 penalty (should be satisfied, weighted)
- **operator**: `=`, `==`, `<`, `<=`, `>`, `>=`
- **label**: (optional) Constraint identifier for debugging
- **expression**: GeoGebra expression in **normalized form** `g(x) op 0`

**Note:** Constraint tolerance is configured **globally** (not per-constraint) via the `defaultTolerance` parameter when calling the optimizer. Default value: `1e-4`.

#### Step 3: Expression Format (IMPORTANT!)

**All expressions must be in normalized form `g(x) op 0`:**

To convert intuitive constraints to normalized form:

| Intuitive Constraint | Normalized Form | GeoGebra Text |
|---------------------|-----------------|---------------|
| `AB < 100` | `AB - 100 < 0` | `"constraint(soft, <): AB - 100"` |
| `AB > 50` | `AB - 50 > 0` | `"constraint(soft, >): AB - 50"` |
| `AB = 75` | `AB - 75 = 0` | `"constraint(hard, =): AB - 75"` |
| `Distance(A',A) = 0` | `Distance(A',A) = 0` | `"constraint(hard, =):" + (Distance(A', A)) + ""` |

**Two syntaxes:**

1. **Static expression** (simple text):
   ```
   "constraint(soft, <): AB - 100"
   ```

2. **Dynamic expression** (evaluated by GeoGebra):
   ```
   "constraint(hard, =):" + (Distance(A', A)) + ""
   ```
   Use this when the expression needs to be dynamically evaluated (e.g., Distance, Angle, etc.)

#### Examples

**Example 1: Point coincidence (hard)**
```
"constraint(hard, =, A=A'):" + (Distance(A', A)) + ""
```
→ Point A must coincide with A'

**Example 2: Minimum length (soft)**
```
"constraint(soft, >): AB - 50"
```
→ AB should be greater than 50 (penalty when violated)

**Example 3: Maximum angle (soft)**
```
"constraint(soft, <): angle - 150"
```
→ Angle should be less than 150°

**Example 4: Length range (soft, multiple constraints)**
Create two text objects:
```
"constraint(soft, >): AB - 30"
"constraint(soft, <): AB - 100"
```
→ AB should be between 30 and 100

**GeoGebra Expression Syntax:**
- Native functions: `Distance(A, B)`, `Angle(A, B, C)`, `Area(poly1)`
- Variables: `AB`, `angle`, `length`
- Arithmetic: `AB + BC`, `angle * 2`, `AB - 100`
- Object properties: `x(A)`, `y(B)`, `Radius(c1)`

### How Constraints Work Internally

Since constraints are written in normalized form `g(x) op 0`, the processing is straightforward:

#### Constraint Conversion to Standard Form `g(x) ≤ 0`

All constraints are converted to the inequality form `g(x) ≤ 0`:

| Operator | Input (normalized) | Standard Form `g(x) ≤ 0` |
|----------|-------------------|-------------------------|
| `=` | `g(x) = 0` | Two inequalities: `g(x) - tol ≤ 0` AND `-g(x) - tol ≤ 0` |
| `<` | `g(x) < 0` | `g(x) - tol ≤ 0` (relaxed with tolerance) |
| `<=` | `g(x) ≤ 0` | `g(x) - tol ≤ 0` |
| `>` | `g(x) > 0` | `-g(x) - tol ≤ 0` |
| `>=` | `g(x) ≥ 0` | `-g(x) - tol ≤ 0` |

**Note:** Tolerance (`tol`) is configured **globally** for all constraints. Default: `1e-4`

**Example conversions:**

*GeoGebra constraint → Standard form `g(x) ≤ 0`:*

```
"constraint(hard, =):" + (Distance(A', A)) + ""
→ g(x) = Distance(A', A)
→ Two inequalities: Distance(A', A) - 1e-4 ≤ 0  AND  -Distance(A', A) - 1e-4 ≤ 0

"constraint(soft, >): AB - 100"
→ g(x) = AB - 100
→ -g(x) - tol ≤ 0  →  -(AB - 100) - 1e-4 ≤ 0  →  100 - AB - 1e-4 ≤ 0

"constraint(soft, <): angle - 150"
→ g(x) = angle - 150
→ g(x) - tol ≤ 0  →  angle - 150 - 1e-4 ≤ 0
```

#### Hard Constraints (Augmented Lagrangian)

Hard constraints (equality `"="`) use the **Augmented Lagrangian** method:

```
L(x, λ, μ) = f(x) + λ·g(x) + (μ/2)·max(0, g(x))²
```

Where:
- `f(x)`: Base objective (currently 0, only constraints matter)
- `g(x)`: Constraint violation (`≤ 0` means satisfied)
- `λ`: Lagrange multiplier (updated adaptively)
- `μ`: Penalty factor (increased when constraints violated)

**Penalty update rule:**
```python
if constraint_violated:
    λ_new = λ + μ * max(0, g(x))  # Increase Lagrange multiplier
    μ_new = μ * 1.5                # Increase penalty factor
```

**Characteristics:**
- Strong enforcement: penalty grows exponentially if violated
- Converges to exact constraint satisfaction
- Used for geometric requirements (coincidence, perpendicularity)

#### Soft Constraints (Weighted L2 Penalty)

Soft constraints use a **quadratic penalty** that depends on the operator:

**For `<` and `<=` operators** (want `g(x) < 0`):
```
penalty = weight * max(0, g(x))²
```
Penalizes when `g(x) > 0` (constraint violated)

**For `>` and `>=` operators** (want `g(x) > 0`):
```
penalty = weight * max(0, -g(x))²
```
Penalizes when `g(x) < 0` (constraint violated)

**For `=` operator** (want `g(x) = 0`):
```
penalty = weight * g(x)²
```
Penalizes any deviation from 0

**Examples:**

1. **Minimum length**: `"constraint(soft, >): AB - 100"` with weight 2
   - `g(x) = AB - 100`
   - Penalty = `2 * max(0, -(AB - 100))²` = `2 * max(0, 100 - AB)²`
   - If AB = 80:  penalty = `2 * max(0, 20)²` = **800**
   - If AB = 120: penalty = `2 * max(0, -20)²` = **0** (satisfied)

2. **Maximum angle**: `"constraint(soft, <): angle - 150"`
   - `g(x) = angle - 150`
   - Penalty = `max(0, angle - 150)²`
   - If angle = 160: penalty = `max(0, 10)²` = **100** (violated)
   - If angle = 140: penalty = `max(0, -10)²` = **0** (satisfied)

**Total soft penalty:**
```
soft_penalty = Σ (weight_i * penalty_i)
```

**Characteristics:**
- Gentle enforcement: can be violated if beneficial
- Higher weights = higher priority
- Used for design preferences (minimum lengths, angle ranges)

#### Complete Objective Function

The optimizer minimizes a combination of movement penalty, soft constraints, and hard constraints:

```
F(x) = movement_penalty + soft_penalty + hard_AL_penalty
```

**1. Movement Penalty** (minimize parameter changes):
```
movement_penalty = Σ(weight_i * (x_i - x_i_initial)²)
```
Encourages solutions close to initial configuration.

**2. Soft Constraint Penalty:**
```
soft_penalty = Σ soft_constraints (weight_i * penalty_i)
```
Where `penalty_i` depends on operator (see formulas above).

**3. Hard Constraint Penalty (Augmented Lagrangian):**
```
hard_AL_penalty = Σ hard_constraints (λ_j·g_j(x) + (μ_j/2)·max(0, g_j(x))²)
```
Adaptive penalty enforces strict satisfaction.

**Optimization process:**
1. CMA-ES minimizes `F(x) = movement + soft + hard_AL`
2. After each generation, update `λ` and `μ` for violated hard constraints
3. Report metrics: `bestObjective` (movement + soft), `bestHardViolation`
4. Converge when all hard constraints satisfied and objective minimized

### Constraint Tips

- **Tolerance (global)**: Set `defaultTolerance` when calling `optimize()`. Use `1e-4` to `1e-6` for geometric precision. This tolerance applies to ALL constraints.
- **Weights (soft only)**: Higher weights (2-5) prioritize certain soft constraints. Not applicable to hard constraints.
- **Redundancy**: Avoid redundant constraints (e.g., `AB - 5 > 0` and `AB - 10 > 0`)
- **Feasibility**: Ensure constraints don't contradict each other
- **Start Simple**: Begin with hard constraints only, then add soft constraints

### Example: Setting Global Tolerance

When using the optimizer via JavaScript API, configure tolerance globally:

```javascript
await optimizer.optimize({
    selectedVariables: ['AB', 'BC'],
    constraints: [
        // Constraints from GeoGebra text objects
    ],
    defaultTolerance: 1e-4,  // ← Global tolerance for ALL constraints
    solverParams: { maxiter: 100 }
});
```

The UI handles this automatically with the default value `1e-4`.

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
