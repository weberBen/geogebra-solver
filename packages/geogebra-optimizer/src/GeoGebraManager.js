import { EventBus } from './EventBus.js';
import P from 'parsimmon';

/**
 * GeoGebraManager - Manages GeoGebra and constraints (sliders)
 * Emits events for state tracking
 */
export class GeoGebraManager extends EventBus {
    constructor(options = {}) {
        super();
        this.ggbApp = null;
        this.sliders = [];
        this.constraints = [];
        this.options = {
            appName: 'geometry',
            showToolBar: true,
            showAlgebraInput: false,
            showMenuBar: false,
            enableRightClick: true,
            enableShiftDragZoom: true,
            showResetIcon: true,
            language: 'en',
            enableLabelDrags: false,
            allowStyleBar: false,
            showZoomButtons: true,
            showFullscreenButton: true,
            ...options
        };
    }

    /**
     * Initialize GeoGebra with an XML file
     * @param {HTMLElement} container - DOM container for GeoGebra
     * @param {string} xmlContent - GeoGebra XML content
     */
    async init(container, xmlContent) {
        this.emit('geogebra:loading', {});
        this.container = container; // Store container reference

        return new Promise((resolve, reject) => {
            const params = {
                ...this.options,
                scaleContainerClass: "ggb-frame__container",
                disableAutoScale: false,
                width: "100%",
                height: "100%",
                appletOnLoad: async (api) => {
                    try {
                        this.ggbApp = api;
                        console.log('GeoGebra applet loaded');

                        // Load the XML
                        api.setXML(xmlContent);

                        // Configuration
                        setTimeout(async () => {
                            api.setRounding('6');
                            api.setPerspective('G');
                            api.setAxesVisible(false, false);
                            api.setMode(40);

                            // Parse constraints from XML
                            this.parseConstraints(xmlContent);
                            console.log('[GeoGebraManager] Constraints parsed:', this.constraints);

                            // Set userVariable checkbox to true
                            if (api.exists('userVariable')) {
                                api.setValue('userVariable', true);
                            }

                            // Extract sliders
                            await this.extractSliders(xmlContent);

                            // Hide constraint text elements and checkboxes
                            this.hideConstraintElements();

                            // Setup resize observer for responsive sizing
                            this.setupResizeObserver();

                            this.emit('geogebra:ready', { api });
                            resolve(api);
                        }, 1000);
                    } catch (error) {
                        this.emit('error', {
                            error,
                            context: 'GeoGebraManager.init'
                        });
                        reject(error);
                    }
                }
            };

            const applet = new GGBApplet(params, true);
            applet.inject(container);
        });
    }

    /**
     * Extract sliders from XML and GeoGebra API
     * @param {string} xmlContent - XML content
     */
    async extractSliders(xmlContent) {
        // Get all numeric objects (sliders)
        const numericObjects = this.ggbApp.getAllObjectNames('numeric');

        // Parse XML to get bounds
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        this.sliders = [];

        for (const sliderName of numericObjects) {
            const elements = xmlDoc.querySelectorAll(`element[label="${sliderName}"]`);

            for (const element of elements) {
                if (element.getAttribute('type') === 'numeric') {
                    const sliderElement = element.querySelector('slider');

                    if (sliderElement) {
                        const min = parseFloat(sliderElement.getAttribute('min'));
                        const max = parseFloat(sliderElement.getAttribute('max'));
                        const currentValue = this.ggbApp.getValue(sliderName);
                        const step = sliderName.startsWith('ag') ? 1 : 0.1;

                        // Detect if slider was hidden in GeoGebra (before we hide all sliders)
                        const wasVisible = this.ggbApp.getVisible(sliderName);

                        this.sliders.push({
                            name: sliderName,
                            label: sliderName,
                            min,
                            max,
                            value: currentValue,
                            default: currentValue,
                            step,
                            hidden: !wasVisible  // true if slider was hidden in GeoGebra
                        });
                    }
                    break;
                }
            }
        }

        // Hide sliders in GeoGebra
        this.sliders.forEach(slider => {
            this.ggbApp.setVisible(slider.name, false);
        });

        this.emit('constraints:loaded', { sliders: this.sliders });
    }

    /**
     * Return all sliders
     */
    getSliders() {
        return this.sliders;
    }

    /**
     * Return a specific slider
     * @param {string} name - Slider name
     */
    getSlider(name) {
        return this.sliders.find(s => s.name === name);
    }

    /**
     * Return current values of all sliders
     */
    getSliderValues() {
        const values = {};
        this.sliders.forEach(slider => {
            values[slider.name] = this.ggbApp.getValue(slider.name);
        });
        return values;
    }

    /**
     * Set the value of a slider
     * @param {string} name - Slider name
     * @param {number} value - New value
     */
    setSliderValue(name, value) {
        const slider = this.getSlider(name);
        if (!slider) {
            throw new Error(`Slider "${name}" not found`);
        }

        const oldValue = this.ggbApp.getValue(name);
        this.ggbApp.setValue(name, value);

        // Update in our cache
        slider.value = value;

        this.emit('slider:changed', {
            name,
            value,
            oldValue,
            allValues: this.getSliderValues()
        });
    }

    /**
     * Set values of multiple sliders
     * @param {Object} values - { sliderName: value, ... }
     */
    setSliderValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            const slider = this.getSlider(name);
            if (slider) {
                this.ggbApp.setValue(name, value);
                slider.value = value;
            }
        });

        this.emit('sliders:updated', { values });
    }

    /**
     * Refresh sliders (useful if changes in GeoGebra)
     */
    async refreshSliders(xmlContent) {
        await this.extractSliders(xmlContent);
    }

    /**
     * Register a listener for GeoGebra updates
     */
    registerUpdateListener(callback) {
        if (this.ggbApp) {
            this.ggbApp.registerUpdateListener(callback);
        }
    }

    /**
     * Calculate the distance between two points
     * @param {string} point1 - Name of the first point
     * @param {string} point2 - Name of the second point
     */
    calculateDistance(point1 = 'A', point2 = "A'") {
        try {
            const x1 = this.ggbApp.getXcoord(point1);
            const y1 = this.ggbApp.getYcoord(point1);
            const x2 = this.ggbApp.getXcoord(point2);
            const y2 = this.ggbApp.getYcoord(point2);

            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        } catch (e) {
            console.error("Distance calculation error:", e);
            return NaN;
        }
    }

    /**
     * Hide constraint text elements and checkboxes from view
     * Called during initialization to keep the figure clean
     */
    hideConstraintElements() {
        if (!this.ggbApp) {
            console.warn('GeoGebra API not ready');
            return;
        }

        try {
            // Hide all text elements (includes constraint expressions)
            const textObjects = this.ggbApp.getAllObjectNames('text');
            textObjects.forEach(objName => {
                this.ggbApp.setVisible(objName, false);
            });

            // Hide all boolean elements (checkboxes)
            const booleanObjects = this.ggbApp.getAllObjectNames('boolean');
            booleanObjects.forEach(objName => {
                this.ggbApp.setVisible(objName, false);
            });

            console.log(`Hidden ${textObjects.length} text elements and ${booleanObjects.length} checkboxes`);
        } catch (e) {
            console.warn('Could not hide constraint elements:', e);
        }
    }

    /**
     * Hide decorative elements (for clean export)
     * @returns {Object} Original visibility state { objName: boolean }
     */
    hideDecorativeElements() {
        if (!this.ggbApp) {
            console.warn('GeoGebra API not ready');
            return {};
        }

        const decorativeTypes = [
            'text',       // Text
            'numeric',    // Sliders + measurements (distance, area, slope)
            'angle',      // Angles and angle measurements
            'boolean',    // Checkboxes
            'button',     // Buttons
            'textfield',  // Input boxes
            'image',      // Images
            'point'       // All points
        ];

        const originalVisibility = {};

        decorativeTypes.forEach(type => {
            try {
                const objects = this.ggbApp.getAllObjectNames(type);
                objects.forEach(objName => {
                    // Store original state
                    originalVisibility[objName] = this.ggbApp.getVisible(objName);

                    // Hide object
                    this.ggbApp.setVisible(objName, false);
                });
            } catch (e) {
                console.warn(`Could not hide objects of type "${type}":`, e);
            }
        });

        return originalVisibility;
    }

    /**
     * Restore visibility of elements
     * @param {Object} originalVisibility - Visibility state { objName: boolean }
     */
    restoreVisibility(originalVisibility) {
        if (!this.ggbApp || !originalVisibility) {
            return;
        }

        Object.entries(originalVisibility).forEach(([objName, wasVisible]) => {
            try {
                this.ggbApp.setVisible(objName, wasVisible);
            } catch (e) {
                console.warn(`Could not restore visibility for "${objName}":`, e);
            }
        });
    }

    /**
     * Return the GeoGebra API
     */
    getAPI() {
        return this.ggbApp;
    }

    /**
     * Check if GeoGebra is ready
     */
    isReady() {
        return this.ggbApp !== null;
    }

    /**
     * Update GeoGebra size based on container
     */
    updateSize() {
        if (this.ggbApp && this.container) {
            const width = this.container.offsetWidth;
            const height = this.container.offsetHeight;
            if (width && height) {
                this.ggbApp.setSize(width, height);
            }
        }
    }

    /**
     * Set up an observer to detect container size changes
     */
    setupResizeObserver() {
        if (!this.container) return;

        // Disconnect previous observer if exists
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(() => {
            this.updateSize();
        });

        this.resizeObserver.observe(this.container);
    }

    /**
     * Parse constraints from GeoGebra XML
     * @param {string} xmlContent - GeoGebra XML content
     * @throws {Error} If no constraints found
     */
    parseConstraints(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const expressions = xmlDoc.querySelectorAll('expression');

        this.constraints = [];
        const errors = [];

        // Create Parsimmon parser
        const constraintParser = P.createLanguage({
            // Optional whitespace
            _ : () => P.optWhitespace,
            
            // Constraint type: hard or soft (case insensitive)
            type: () => P.regexp(/hard|soft/i)
                .map(s => s.toLowerCase())
                .desc('type (hard or soft)'),
            
            // Comparison operator
            operator: () => P.regexp(/==|<=|>=|=|<|>/)
                .desc('operator (=, ==, <, <=, >, >=)'),
            
            // Label that can contain balanced parentheses WITH COMMAS inside
            label: (r) => P.lazy(() => {
                const parenContent = P.alt(
                    // Balanced parentheses (allows everything inside including commas)
                    P.seq(
                        P.string('('),
                        P.regexp(/[^()]+/),  // Everything except parens (commas OK!)
                        P.string(')')
                    ).map(([open, content, close]) => open + content + close),

                    // Normal characters (no special chars that would break parsing)
                    P.regexp(/[^(),]+/)  // Everything except parens and commas at this level
                );
                return parenContent.atLeast(1).tie();
            }),
            
            // Optional label (can be absent)
            optionalLabel: (r) => P.alt(
                // If present: comma followed by label
                P.seq(
                    P.string(',').trim(P.optWhitespace),
                    r.label
                ).map(([_, label]) => label.trim()),
                // If absent: return null
                P.succeed(null)
            ),
            
            // Expression: everything after the colon ":"
            // GeoGebra can encode this in different ways:
            expression: () => P.seq(
                P.string(':').trim(P.optWhitespace),
                P.alt(
                    // GeoGebra concatenation format: "text" + (evaluated expression) + ""
                    // Example: "constraint(...):" + (x + y > 10) + ""
                    P.seq(
                        P.string('"').trim(P.optWhitespace),
                        P.string('+').trim(P.optWhitespace), // + for concatenation
                        P.string('('),                        // Start of expression to evaluate
                        P.regexp(/[^)]+/),                    // Expression content
                        P.string(')'),                        // End of expression
                        P.optWhitespace,
                        P.string('+').trim(P.optWhitespace), // + for concatenation
                        P.string('""')                        // Empty string at the end
                    ).map(([_, __, ___, expr]) => expr.trim()),
                    
                    // Simple text format with quotes: "constraint(...): expression"
                    // Example: "constraint(hard, ==): x < 5"
                    P.seq(
                        P.string('"'),
                        P.regexp(/[^"]+/),  // Everything except quotes
                        P.string('"')
                    ).map(([_, expr]) => expr.trim()),
                    
                    // Format without quotes: constraint(...): expression
                    // Example: constraint(hard, ==): x < 5
                    P.regexp(/.+/).map(s => s.trim())
                )
            ).map(([_, expr]) => expr),
            
            // Complete constraint parser
            constraint: (r) => P.seq(
                P.string('"constraint(').desc('"constraint("'),
                r.type,                        // hard or soft
                P.string(',').trim(P.optWhitespace),
                r.operator,                    // =, ==, <, etc.
                r.optionalLabel,               // label (optional)
                P.string(')').desc(') to close constraint'),
                r.expression                   // Expression after ":"
            ).map(([_, type, __, operator, label, ___, expression]) => ({
                type,
                operator,
                label: label || 'unnamed',     // Default label if absent
                expression
            }))
        });

        // Parse each expression found in the XML
        for (let i = 0; i < expressions.length; i++) {
            const expr = expressions[i];
            const expAttr = expr.getAttribute('exp');
            
            if (!expAttr) continue;

            // Clean the XML expression (HTML entities, line breaks, etc.)
            const cleaned = expAttr
                .replace(/&quot;/g, '"')       // Replace &quot; with "
                .replace(/&#xa;/g, '')         // Remove XML line breaks
                .replace(/\n/g, '')            // Remove \n
                .trim();

            // Skip if not a constraint
            if (!cleaned.includes('constraint(')) {
                continue;
            }

            // Parse with Parsimmon
            const result = constraintParser.constraint.parse(cleaned);

            if (result.status) {
                // Success: add the constraint
                this.constraints.push(result.value);
            } else {
                // Failure: build a detailed error message
                const errorMsg = this.buildConstraintError(cleaned, result, i + 1);
                errors.push(errorMsg);
            }
        }

        // Handle parsing errors
        if (errors.length > 0) {
            const errorDetails = errors.join('\n\n');
            throw new Error(
                `Found ${errors.length} malformed constraint(s):\n\n${errorDetails}\n\n` +
                `Expected format: "constraint(type, operator[, label]):" expression\n` +
                `- type: hard or soft\n` +
                `- operator: =, ==, <, <=, >, >=\n` +
                `- label: (optional) constraint identifier\n` +
                `- expression: the constraint expression (everything after ':')`
            );
        }

        // Check that we have at least one constraint
        if (this.constraints.length === 0) {
            throw new Error(
                'No constraints found in GeoGebra file.\n' +
                'Please add constraint definitions in text elements with the format:\n' +
                '"constraint(type, operator[, label]):" expression\n\n' +
                'Examples:\n' +
                '  "constraint(hard, ==, myConstraint):" + (x + y > 10) + ""\n' +
                '  "constraint(soft, <=): x < 5"'
            );
        }

        console.log(`Parsed ${this.constraints.length} constraint(s):`, this.constraints);
    }

    buildConstraintError(input, parseResult, expressionIndex) {
        const { index, expected } = parseResult;
        
        // Extract context around the error
        const before = input.substring(Math.max(0, index - 20), index);
        const after = input.substring(index, Math.min(input.length, index + 30));
        
        // Identify the specific error type
        let specificError = '';
        
        if (!input.startsWith('"constraint(')) {
            specificError = 'Missing opening: must start with "constraint("';
        } else if (index < 20) {
            specificError = 'Invalid or missing constraint type (expected: hard or soft)';
        } else if (expected.includes('operator')) {
            specificError = 'Invalid or missing operator (expected: =, ==, <, <=, >, >=)';
        } else if (expected.includes(') to close constraint')) {
            specificError = 'Missing closing parenthesis ")" (check for unbalanced parentheses in label)';
        } else if (expected.includes(':')) {
            specificError = 'Missing colon ":" after constraint header';
        } else {
            specificError = `Expected: ${expected.join(' or ')}`;
        }
        
        return (
            `Expression #${expressionIndex} - Malformed constraint:\n` +
            `  Error at position ${index}: ${specificError}\n` +
            `  Input: ${input}\n` +
            `  Error location: "...${before}" ← HERE → "${after}..."`
        );
    }

    /**
     * Get parsed constraints
     * @returns {Array<{type: string, operator: string, label: string, expression: string}>}
     */
    getConstraints() {
        return this.constraints;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.ggbApp = null;
        this.container = null;
        this.sliders = [];
        this.constraints = [];
        this.removeAllListeners();
    }
}
