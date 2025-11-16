import { EventBus } from './EventBus.js';

/**
 * GeoGebraManager - Manages GeoGebra and constraints (sliders)
 * Emits events for state tracking
 */
export class GeoGebraManager extends EventBus {
    constructor(options = {}) {
        super();
        this.ggbApp = null;
        this.sliders = [];
        this.options = {
            appName: 'geometry',
            showToolBar: true,
            showAlgebraInput: false,
            showMenuBar: false,
            enableRightClick: true,
            enableShiftDragZoom: true,
            showResetIcon: true,
            language: 'fr',
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

                            // Extract sliders
                            await this.extractSliders(xmlContent);

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
        this.removeAllListeners();
    }
}
