/**
 * @typedef {Object} ModuleProps
 * @property {Function} [localize] - Localization function (key => translated string)
 * @property {number} [row] - Grid row position
 * @property {number} [col] - Grid column position
 * @property {number} [rowSpan] - Grid row span
 * @property {number} [colSpan] - Grid column span
 * @property {string} [className] - Additional CSS classes
 * @property {Object} [style] - Additional inline styles
 */

/**
 * Base class for all UI modules in geogebra-optimizer-ui.
 * Provides common functionality for Web Components including localization,
 * grid positioning, and lifecycle management.
 *
 * @class
 * @extends HTMLElement
 *
 * @example
 * class MyModule extends BaseModule {
 *   constructor() {
 *     super();
 *     this.initProps({
 *       localize: (key) => translations[key] || key,
 *       row: 1,
 *       col: 1
 *     });
 *   }
 *
 *   render() {
 *     const t = this.t.bind(this);
 *     this.innerHTML = `
 *       <div class="my-module">
 *         <h2>${t('myModule.title')}</h2>
 *       </div>
 *     `;
 *   }
 * }
 */
export class BaseModule extends HTMLElement {
    constructor() {
        super();

        /**
         * Module properties
         * @type {ModuleProps}
         */
        this.props = {
            localize: null,
            row: null,
            col: null,
            rowSpan: null,
            colSpan: null,
            className: '',
            style: {}
        };

        /**
         * Internal state
         * @type {Object}
         */
        this.state = {};
    }

    /**
     * Initialize module properties.
     * Should be called in constructor of derived classes.
     *
     * @param {ModuleProps} props - Module properties
     * @example
     * this.initProps({
     *   localize: (key) => translations[key],
     *   row: 1,
     *   col: 2,
     *   rowSpan: 1,
     *   colSpan: 2
     * });
     */
    initProps(props) {
        this.props = { ...this.props, ...props };
        this.applyGridPosition();
        this.applyClassNames();
        this.applyStyles();
    }

    /**
     * Translate a localization key.
     * Uses the localize function from props, or returns key if not provided.
     *
     * @param {string} key - Localization key (e.g., 'variablePanel.title')
     * @param {Object} [params] - Optional parameters for string interpolation
     * @returns {string} Translated string
     * @example
     * const title = this.t('variablePanel.title');
     * const message = this.t('welcome', { name: 'John' });
     */
    t(key, params = {}) {
        if (!this.props.localize) {
            return key;
        }

        let translation = this.props.localize(key);

        // Simple string interpolation
        if (params && typeof translation === 'string') {
            Object.keys(params).forEach(paramKey => {
                translation = translation.replace(`{${paramKey}}`, params[paramKey]);
            });
        }

        return translation;
    }

    /**
     * Apply grid positioning from props.
     * Sets CSS grid properties for row/col/rowSpan/colSpan.
     * @private
     */
    applyGridPosition() {
        if (this.props.row !== null) {
            this.style.gridRow = this.props.rowSpan
                ? `${this.props.row} / span ${this.props.rowSpan}`
                : this.props.row;
        }

        if (this.props.col !== null) {
            this.style.gridColumn = this.props.colSpan
                ? `${this.props.col} / span ${this.props.colSpan}`
                : this.props.col;
        }
    }

    /**
     * Apply CSS class names from props.
     * @private
     */
    applyClassNames() {
        if (this.props.className) {
            this.className = this.props.className;
        }
    }

    /**
     * Apply inline styles from props.
     * @private
     */
    applyStyles() {
        if (this.props.style) {
            Object.assign(this.style, this.props.style);
        }
    }

    /**
     * Update module properties.
     * Merges new props with existing ones and re-applies styling.
     *
     * @param {ModuleProps} newProps - New properties to merge
     * @example
     * module.updateProps({ row: 2, col: 3 });
     */
    updateProps(newProps) {
        this.props = { ...this.props, ...newProps };
        this.applyGridPosition();
        this.applyClassNames();
        this.applyStyles();
        this.render();
    }

    /**
     * Update module state.
     * Merges new state with existing and triggers re-render.
     *
     * @param {Object} newState - New state to merge
     * @example
     * this.setState({ count: this.state.count + 1 });
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    /**
     * Render the module content.
     * Should be overridden by derived classes.
     * Use innerHTML to set content.
     *
     * @abstract
     * @example
     * render() {
     *   this.innerHTML = `
     *     <div class="my-content">
     *       <h2>${this.t('title')}</h2>
     *     </div>
     *   `;
     * }
     */
    render() {
        // Override in derived classes
    }

    /**
     * Called when element is connected to DOM.
     * Triggers initial render.
     */
    connectedCallback() {
        this.render();
    }

    /**
     * Called when element is disconnected from DOM.
     * Clean up resources here.
     */
    disconnectedCallback() {
        // Override in derived classes if cleanup needed
    }

    /**
     * Emit a custom event from this module.
     *
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail data
     * @param {Object} [options] - Event options (bubbles, composed, etc.)
     * @example
     * this.emit('value-changed', { value: 42 }, { bubbles: true });
     */
    emit(eventName, detail, options = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: options.bubbles !== false,
            composed: options.composed !== false,
            ...options
        });
        this.dispatchEvent(event);
    }

    /**
     * Add event listener helper.
     *
     * @param {string} selector - CSS selector for element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @example
     * this.on('button.start', 'click', () => this.handleStart());
     */
    on(selector, event, handler) {
        const element = typeof selector === 'string'
            ? this.querySelector(selector)
            : selector;

        if (element) {
            element.addEventListener(event, handler.bind(this));
        }
    }

    /**
     * Query selector helper.
     *
     * @param {string} selector - CSS selector
     * @returns {Element|null}
     * @example
     * const button = this.$('button.start');
     */
    $(selector) {
        return this.querySelector(selector);
    }

    /**
     * Query selector all helper.
     *
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     * @example
     * const buttons = this.$$('button');
     */
    $$(selector) {
        return this.querySelectorAll(selector);
    }
}
