/**
 * @typedef {Object} ModuleConfig
 * @property {string} name - Module identifier
 * @property {Function} component - Module constructor/class
 * @property {number} row - Grid row position
 * @property {number} col - Grid column position
 * @property {number} [rowSpan=1] - Grid row span
 * @property {number} [colSpan=1] - Grid column span
 * @property {Object} [props] - Additional props for the module
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {string} [gridTemplateRows] - CSS grid-template-rows
 * @property {string} [gridTemplateColumns] - CSS grid-template-columns
 * @property {string} [gap] - CSS gap
 * @property {Object} [containerStyle] - Additional container styles
 */

/**
 * Layout manager for organizing UI modules in a CSS Grid layout.
 * Handles module positioning, instantiation, and custom layout overrides.
 *
 * @class
 *
 * @example
 * const layout = new LayoutManager({
 *   gridTemplateRows: 'auto 1fr auto',
 *   gridTemplateColumns: '2fr 1fr',
 *   gap: '1rem'
 * });
 *
 * layout.setModules([
 *   { name: 'viewer', component: GeoGebraFrame, row: 1, col: 1, rowSpan: 3 },
 *   { name: 'variables', component: VariablePanel, row: 1, col: 2 }
 * ]);
 *
 * const container = layout.render(document.body);
 */
export class LayoutManager {
    /**
     * Create a new LayoutManager.
     *
     * @param {LayoutConfig} config - Layout configuration
     */
    constructor(config = {}) {
        this.config = {
            gridTemplateRows: 'auto 1fr auto',
            gridTemplateColumns: '2fr 1fr',
            gap: '1rem',
            containerStyle: {},
            ...config
        };

        /**
         * Module configurations
         * @type {ModuleConfig[]}
         */
        this.modules = [];

        /**
         * Instantiated module elements
         * @type {Map<string, HTMLElement>}
         */
        this.moduleInstances = new Map();

        /**
         * Layout container element
         * @type {HTMLElement|null}
         */
        this.container = null;
    }

    /**
     * Set or update layout configuration.
     *
     * @param {LayoutConfig} config - New layout configuration
     * @example
     * layout.setConfig({
     *   gridTemplateColumns: '1fr 1fr 1fr',
     *   gap: '2rem'
     * });
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
        if (this.container) {
            this.applyContainerStyles();
        }
    }

    /**
     * Set module configurations.
     *
     * @param {ModuleConfig[]} modules - Array of module configurations
     * @example
     * layout.setModules([
     *   {
     *     name: 'viewer',
     *     component: GeoGebraFrame,
     *     row: 1,
     *     col: 1,
     *     rowSpan: 3,
     *     props: { localize: t }
     *   },
     *   {
     *     name: 'controls',
     *     component: ControlButtons,
     *     row: 1,
     *     col: 2
     *   }
     * ]);
     */
    setModules(modules) {
        this.modules = modules;
    }

    /**
     * Add a single module to the layout.
     *
     * @param {ModuleConfig} module - Module configuration
     * @example
     * layout.addModule({
     *   name: 'custom',
     *   component: CustomModule,
     *   row: 2,
     *   col: 2
     * });
     */
    addModule(module) {
        this.modules.push(module);
        if (this.container) {
            this.instantiateModule(module);
        }
    }

    /**
     * Remove a module by name.
     *
     * @param {string} name - Module name
     * @example
     * layout.removeModule('custom');
     */
    removeModule(name) {
        const index = this.modules.findIndex(m => m.name === name);
        if (index !== -1) {
            this.modules.splice(index, 1);
        }

        const instance = this.moduleInstances.get(name);
        if (instance && instance.parentNode) {
            instance.parentNode.removeChild(instance);
        }
        this.moduleInstances.delete(name);
    }

    /**
     * Get a module instance by name.
     *
     * @param {string} name - Module name
     * @returns {HTMLElement|undefined} Module element
     * @example
     * const viewer = layout.getModule('viewer');
     * const container = viewer.getContainer();
     */
    getModule(name) {
        return this.moduleInstances.get(name);
    }

    /**
     * Get all module instances.
     *
     * @returns {Map<string, HTMLElement>} Map of module name to element
     * @example
     * const modules = layout.getAllModules();
     * modules.forEach((module, name) => {
     *   console.log(name, module);
     * });
     */
    getAllModules() {
        return this.moduleInstances;
    }

    /**
     * Instantiate a module element.
     *
     * @private
     * @param {ModuleConfig} moduleConfig - Module configuration
     * @returns {HTMLElement} Module element
     */
    instantiateModule(moduleConfig) {
        const { name, component, row, col, rowSpan, colSpan, props = {} } = moduleConfig;

        // Create module element
        const element = new component();

        // Initialize with props including grid position
        element.initProps({
            ...props,
            row,
            col,
            rowSpan: rowSpan || 1,
            colSpan: colSpan || 1
        });

        // Render the module to populate HTML and attach event listeners
        element.render();

        // Store instance
        this.moduleInstances.set(name, element);

        // Append to container if it exists
        if (this.container) {
            this.container.appendChild(element);
        }

        return element;
    }

    /**
     * Apply CSS Grid styles to container.
     *
     * @private
     */
    applyContainerStyles() {
        if (!this.container) return;

        this.container.style.display = 'grid';
        this.container.style.gridTemplateRows = this.config.gridTemplateRows;
        this.container.style.gridTemplateColumns = this.config.gridTemplateColumns;
        this.container.style.gap = this.config.gap;

        // Apply additional custom styles
        Object.assign(this.container.style, this.config.containerStyle);
    }

    /**
     * Render the layout into a container element.
     *
     * @param {HTMLElement} containerElement - Container to render into
     * @returns {HTMLElement} The container element
     * @example
     * const container = layout.render(document.getElementById('app'));
     */
    render(containerElement) {
        this.container = containerElement;

        // Clear existing content
        this.container.innerHTML = '';
        this.moduleInstances.clear();

        // Apply grid styles
        this.applyContainerStyles();

        // Instantiate and append all modules
        this.modules.forEach(moduleConfig => {
            this.instantiateModule(moduleConfig);
        });

        return this.container;
    }

    /**
     * Update layout without re-rendering all modules.
     * Only updates grid configuration.
     *
     * @example
     * layout.setConfig({ gap: '2rem' });
     * layout.updateLayout();
     */
    updateLayout() {
        if (this.container) {
            this.applyContainerStyles();
        }
    }

    /**
     * Completely re-render the layout.
     * Destroys and recreates all modules.
     *
     * @example
     * layout.rerender();
     */
    rerender() {
        if (this.container) {
            this.render(this.container);
        }
    }

    /**
     * Destroy the layout and clean up resources.
     *
     * @example
     * layout.destroy();
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.moduleInstances.clear();
        this.modules = [];
        this.container = null;
    }
}
