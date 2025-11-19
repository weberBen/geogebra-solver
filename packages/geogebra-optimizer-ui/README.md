# GeoGebra Optimizer UI

Web Components-based UI framework for [geogebra-optimizer](../geogebra-optimizer).

## Features

- 🎨 **Web Components** - Standard custom elements, framework-agnostic
- 🌐 **Localization** - Built-in i18n support (English, French)
- 📐 **Grid Layout** - Configurable CSS Grid positioning
- 🔧 **Customizable** - Override any module or create custom layouts
- 📚 **Storybook** - Interactive component documentation
- 🎯 **TypeScript-ready** - JSDoc annotations for IntelliSense

## Installation

```bash
npm install geogebra-optimizer geogebra-optimizer-ui
```

## Quick Start

```javascript
import { GeoGebraOptimizer } from 'geogebra-optimizer';
import { GeoGebraOptimizerUI } from 'geogebra-optimizer-ui';

// Create optimizer instance
const optimizer = new GeoGebraOptimizer();

// Create UI with module-specific configuration
const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer,
  locale: 'en', // or 'fr'

  // Configure variable panel
  variablePanelProps: {
    variableValueStep: 0.5  // Step for variable value inputs (default: 0.5)
  },

  // Configure objective parameters
  objectiveParamsProps: {
    defaultLambda: 0.01,   // Default lambda value (default: 0.01)
    lambdaStep: 0.001      // Step for lambda input (default: 0.001)
  },

  // Configure solver parameters
  solverParamsProps: {
    defaults: {
      maxiter: 100,        // Default max iterations (default: 100)
      popsize: 10,         // Default population size (default: 10)
      sigma: 0.5,          // Default initial step size (default: 0.5)
      tolfun: 0.000001     // Default function tolerance (default: 0.000001)
    },
    steps: {
      maxiter: 1,          // Step for maxiter input (default: 1)
      popsize: 1,          // Step for popsize input (default: 1)
      sigma: 0.1,          // Step for sigma input (default: 0.1)
      tolfun: 0.000001     // Step for tolfun input (default: 0.000001)
    }
  },
mai
  // Configure export panel
  exportPanelProps: {
    pngScaleStep: 0.5,     // Step for PNG scale input (default: 0.5)
    webhookParamStep: 0.001, // Step for webhook param inputs (default: 0.001)
    webhookConfig: {
      allowedInputFormats: ['svg', 'png', 'xml'],
      params: {
        outputFormat: 'dxf',
        tolerance: '0.01mm',
        optimize: true
      },
      paramLabels: {
        outputFormat: { label: 'Output Format', description: 'Target format' },
        tolerance: { label: 'Tolerance', description: 'Conversion precision' },
        optimize: { label: 'Optimize Paths', description: 'Simplify paths' }
      },
      description: 'DXF Export via Server',
      warning: 'DXF export converts Bézier curves to polylines.'
    }
  }
});

// Load GeoGebra XML and Python files
const [xmlContent, optimizerCode, fitnessCode] = await Promise.all([
  fetch('geogebra.xml').then(r => r.text()),
  fetch('optimizer.py').then(r => r.text()),
  fetch('fitness.py').then(r => r.text())
]);

// Initialize
await ui.init({
  geogebraXML: xmlContent,
  pythonFiles: {
    optimizer: optimizerCode,
    fitness: fitnessCode
  }
});
```

## Components

All components are Web Components (Custom Elements) that can be used standalone or within the full UI framework.

### Available Components

- **`<ggb-frame>`** - GeoGebra viewer
- **`<variable-panel>`** - Variable selection and control
- **`<control-buttons>`** - Start/Stop/Reset buttons
- **`<solver-params>`** - CMA-ES solver parameters
- **`<objective-params>`** - Objective function parameters
- **`<metrics-panel>`** - Real-time optimization metrics
- **`<logs-panel>`** - Event logs display

### Component Props

Each component accepts these common props via `initProps()`:

```javascript
{
  localize: Function,    // Localization function
  row: Number,          // Grid row position
  col: Number,          // Grid column position
  rowSpan: Number,      // Grid row span
  colSpan: Number,      // Grid column span
  className: String,    // Additional CSS classes
  style: Object         // Additional inline styles
}
```

### Using Components Standalone

```javascript
import { ControlButtons, loadLocale, createLocalizeFunction } from 'geogebra-optimizer-ui';

// Load translations
const translations = await loadLocale('en');
const localize = createLocalizeFunction(translations);

// Create component
const controls = new ControlButtons();
controls.initProps({ localize });

// Add event listeners
controls.addEventListener('start-optimization', () => {
  console.log('Start clicked!');
});

// Append to DOM
document.body.appendChild(controls);
```

## Localization

### Using Built-in Locales

```javascript
const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer,
  locale: 'fr' // English (en) or French (fr)
});
```

### Custom Localization

```javascript
import { createLocalizeFunction } from 'geogebra-optimizer-ui';

const customTranslations = {
  controlButtons: {
    start: 'Comenzar',
    stop: 'Detener',
    reset: 'Reiniciar'
  },
  // ... more translations
};

const localize = createLocalizeFunction(customTranslations);

const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer,
  localize // Use custom function
});
```

### Available Translation Keys

See [`locales/en.json`](./locales/en.json) for all available translation keys.

## Custom Layouts

### Custom Grid Layout

```javascript
const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer,
  layout: {
    gridTemplateRows: '200px 1fr auto auto',
    gridTemplateColumns: '3fr 2fr 1fr',
    gap: '2rem'
  }
});
```

### Custom Module Positioning

```javascript
import { GeoGebraFrame, VariablePanel, ControlButtons } from 'geogebra-optimizer-ui';

const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer,
  modules: [
    {
      name: 'viewer',
      component: GeoGebraFrame,
      row: 1,
      col: 1,
      rowSpan: 2,
      colSpan: 2
    },
    {
      name: 'variables',
      component: VariablePanel,
      row: 1,
      col: 3
    },
    {
      name: 'controls',
      component: ControlButtons,
      row: 2,
      col: 3
    }
  ]
});
```

### Custom Components

Create your own components by extending `BaseModule`:

```javascript
import { BaseModule } from 'geogebra-optimizer-ui';

class CustomMetrics extends BaseModule {
  constructor() {
    super();
    this.state = { value: 0 };
  }

  render() {
    const t = this.t.bind(this);
    this.innerHTML = `
      <div class="custom-metrics">
        <h2>${t('customMetrics.title')}</h2>
        <p>Value: ${this.state.value}</p>
      </div>
    `;
  }

  updateValue(value) {
    this.setState({ value });
  }
}

customElements.define('custom-metrics', CustomMetrics);

// Use in layout
const ui = new GeoGebraOptimizerUI({
  modules: [
    // ... other modules
    {
      name: 'customMetrics',
      component: CustomMetrics,
      row: 3,
      col: 2
    }
  ]
});
```

## Webhook Export Configuration

The UI includes an export panel with support for server-side processing via webhooks. You can configure this when creating the UI instance.

### Basic Webhook Configuration

```javascript
const ui = new GeoGebraOptimizerUI({
  container: document.getElementById('app'),
  optimizer,
  webhookConfig: {
    // Allowed source formats that users can select
    allowedInputFormats: ['svg', 'png', 'xml'],

    // Server parameters with default values
    params: {
      outputFormat: 'dxf',
      tolerance: '0.01mm',
      optimize: true,
      units: 'mm'
    },

    // Labels and descriptions for each parameter
    paramLabels: {
      outputFormat: {
        label: 'Output Format',
        description: 'Format of the file generated by the server'
      },
      tolerance: {
        label: 'Tolerance',
        description: 'Precision of curve conversion (e.g., 0.01mm)'
      },
      optimize: {
        label: 'Optimize Paths',
        description: 'Merge and simplify vector paths'
      },
      units: {
        label: 'Units',
        description: 'Measurement units for the output file'
      }
    },

    // UI customization
    description: 'DXF Export via Server',
    info: 'Converts SVG/PNG to DXF using vpype',
    warning: '⚠️ DXF export converts Bézier curves to polylines.'
  }
});
```

### Export Quality Warnings

#### GeoGebra Vector Export Precision Limitations

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

#### Webhook

The export format can be extended via a webhook to which the application send the native export (SVG/PNG/XML/...) and the server return a file in a specific format. An example of such a server is avalaible under `/webhook_export_server`. It uses `vpype` for SVG to DXF conversion with path optimization to merge close ones. However, that does not solve the precision limitation of GeoGebra export which is used underneath. 

If `webhookConfig` is not provided, the UI falls back to a default DXF export configuration suitable for testing. But the webhook config is 100% customizable with your own fields.

##### Parameter Types

The UI automatically determines input types based on parameter values:
- **Boolean** → Checkbox
- **Number** → Number input
- **String** → Text input

##### Custom Server Integration

The webhook export sends a POST request to the configured URL with this structure:

```javascript
{
  format: 'svg',             // Selected source format
  data: '...',               // Exported data (SVG/PNG/XML content)
  outputFormat: 'your format identifier',   // Target output format (extracted from params and used as file extension)
  options: {                 // Processing options
    // your options
  }
}
```

Your server should process the data and return a file blob.

##### Quick Start:

```bash
cd packages/geogebra-optimizer-ui/webhook_export_server
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python server.py
```

The server runs on `http://localhost:5000` by default.

**⚠️ WARNING:** This is a **reference implementation** for development and testing only. See the [server documentation](./webhook_export_server/README.md) for complete installation instructions, API reference, and customization examples.

## Module-Specific Configuration

The UI uses a modular architecture where each module can be configured independently via dedicated props objects. This approach provides better organization and clearer API than the previous scattered configuration.

### Variable Panel Props

Configure the variable panel via `variablePanelProps`:

```javascript
variablePanelProps: {
  variableValueStep: 0.5  // Step value for variable inputs (default: 0.5)
}
```

### Objective Parameters Props

Configure objective function parameters via `objectiveParamsProps`:

```javascript
objectiveParamsProps: {
  defaultLambda: 0.01,  // Default lambda value (default: 0.01)
  lambdaStep: 0.001     // Step for lambda input (default: 0.001)
}
```

### Solver Parameters Props

Configure CMA-ES solver parameters via `solverParamsProps`:

```javascript
solverParamsProps: {
  defaults: {
    maxiter: 100,       // Default max iterations
    popsize: 10,        // Default population size
    sigma: 0.5,         // Default initial step size
    tolfun: 0.000001    // Default function tolerance
  },
  steps: {
    maxiter: 1,         // Step for maxiter input
    popsize: 1,         // Step for popsize input
    sigma: 0.1,         // Step for sigma input
    tolfun: 0.000001    // Step for tolfun input
  }
}
```

## API Reference

### `GeoGebraOptimizerUI`

Main UI orchestrator class.

#### Constructor

```javascript
new GeoGebraOptimizerUI(config)
```

**Config:**
- `container: HTMLElement` - Container for UI
- `optimizer: GeoGebraOptimizer` - Optimizer instance
- `locale?: string` - Locale code (default: 'en')
- `localize?: Function` - Custom localization function
- `layout?: Object` - Layout configuration
- `modules?: Array` - Custom module configuration
- `variablePanelProps?: Object` - VariablePanel configuration
- `objectiveParamsProps?: Object` - ObjectiveParams configuration
- `solverParamsProps?: Object` - SolverParams configuration
- `exportPanelProps?: Object` - ExportPanel configuration
- `defaultParams?: Object` - **DEPRECATED:** Use module-specific props instead
- `webhookConfig?: Object` - **DEPRECATED:** Use exportPanelProps.webhookConfig instead

#### Methods

- `async init(optimizerConfig)` - Initialize UI and optimizer
- `getLayoutManager()` - Get LayoutManager instance
- `getModules()` - Get all module instances
- `getModule(name)` - Get specific module
- `destroy()` - Clean up resources

### `LayoutManager`

Grid layout manager for organizing modules.

#### Constructor

```javascript
new LayoutManager(config)
```

**Config:**
- `gridTemplateRows?: string` - CSS grid-template-rows
- `gridTemplateColumns?: string` - CSS grid-template-columns
- `gap?: string` - CSS gap
- `containerStyle?: Object` - Additional container styles

#### Methods

- `setModules(modules)` - Set module configurations
- `addModule(module)` - Add single module
- `removeModule(name)` - Remove module by name
- `getModule(name)` - Get module instance
- `render(container)` - Render layout
- `destroy()` - Clean up

### `BaseModule`

Base class for all UI modules.

#### Methods

- `initProps(props)` - Initialize properties
- `t(key, params)` - Translate localization key
- `updateProps(props)` - Update properties
- `setState(state)` - Update state and re-render
- `render()` - Render component (override)
- `emit(event, detail)` - Emit custom event
- `$(selector)` - Query selector
- `$$(selector)` - Query selector all

## Storybook

View interactive component documentation:

```bash
npm run storybook
```

This will start Storybook at `http://localhost:6006` with live examples of all components.

## Examples

See the [examples directory](../../examples/web-components-ui) for complete working examples.

## Development

### Running Tests

```bash
npm test
```

### Building Documentation

Storybook automatically generates documentation from JSDoc comments and component props.

```bash
npm run build-storybook
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

(Web Components Custom Elements V1 required)

# Disclaimer

Used with Claude Code 2.0.42
