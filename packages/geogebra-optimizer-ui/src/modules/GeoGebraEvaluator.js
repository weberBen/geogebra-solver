import { BaseModule } from '../BaseModule.js';

/**
 * GeoGebra expression evaluator component.
 * Allows testing/debugging GeoGebra expressions by evaluating them in real-time.
 *
 * @class
 * @extends BaseModule
 *
 * @example
 * // HTML usage
 * <geogebra-evaluator></geogebra-evaluator>
 *
 * @example
 * // JavaScript usage
 * const evaluator = document.createElement('geogebra-evaluator');
 * evaluator.setAPI(ggbApi);
 */
export class GeoGebraEvaluator extends BaseModule {
    constructor() {
        super();

        this.state = {
            result: null,
            error: null
        };

        this.ggbApi = null;
    }

    /**
     * Set the GeoGebra API instance
     * @param {Object} api - GeoGebra API
     */
    setAPI(api) {
        this.ggbApi = api;
    }

    /**
     * Get current expression from input
     */
    getExpression() {
        const input = this.querySelector('.ggb-evaluator__input');
        return input ? input.value.trim() : '';
    }

    /**
     * Evaluate the current expression
     */
    evaluate() {
        const expression = this.getExpression();

        if (!expression) {
            this.updateResult(null, 'Please enter an expression');
            return;
        }

        if (!this.ggbApi) {
            this.updateResult(null, 'GeoGebra API not ready');
            return;
        }

        try {
            // Try to get value
            const value = this.ggbApi.getValue(expression);

            if (typeof value === 'number' && !isNaN(value)) {
                this.updateResult(value, null);
            } else {
                // Try as command/object
                const exists = this.ggbApi.exists(expression);
                if (exists) {
                    const objType = this.ggbApi.getObjectType(expression);
                    this.updateResult(`Object exists (type: ${objType})`, null);
                } else {
                    this.updateResult(null, 'Could not evaluate expression');
                }
            }
        } catch (e) {
            this.updateResult(null, e.message);
        }
    }

    /**
     * Update result without re-rendering the whole component
     */
    updateResult(result, error) {
        this.state.result = result;
        this.state.error = error;

        // Update only the result display
        const resultContainer = this.querySelector('.ggb-evaluator__results');
        if (resultContainer) {
            const t = this.t.bind(this);
            resultContainer.innerHTML = `
                ${result !== null ? `
                    <div class="ggb-evaluator__result ggb-evaluator__result--success">
                        <span class="ggb-evaluator__result-label">${t('geogebraEvaluator.result')}:</span>
                        <span class="ggb-evaluator__result-value">${result}</span>
                    </div>
                ` : ''}
                ${error ? `
                    <div class="ggb-evaluator__result ggb-evaluator__result--error">
                        <span class="ggb-evaluator__result-label">${t('geogebraEvaluator.error')}:</span>
                        <span class="ggb-evaluator__result-value">${error}</span>
                    </div>
                ` : ''}
            `;
        }
    }

    /**
     * Handle Enter key press
     */
    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.evaluate();
        }
    }

    /**
     * Renders the evaluator.
     */
    render() {
        const t = this.t.bind(this);

        this.innerHTML = `
            <div class="ggb-evaluator">
                <div class="ggb-evaluator__header">
                    <h3 class="ggb-evaluator__title">${t('geogebraEvaluator.title')}</h3>
                </div>
                <div class="ggb-evaluator__content">
                    <div class="ggb-evaluator__input-group">
                        <textarea
                            class="ggb-evaluator__input"
                            placeholder="${t('geogebraEvaluator.placeholder')}"
                            rows="2"
                        ></textarea>
                        <button class="ggb-evaluator__button">
                            ${t('geogebraEvaluator.evaluate')}
                        </button>
                    </div>
                    <div class="ggb-evaluator__results"></div>
                </div>
            </div>
        `;

        // Attach event listeners after render
        this.attachEventListeners();
    }

    /**
     * Attach event listeners to DOM elements
     */
    attachEventListeners() {
        const input = this.querySelector('.ggb-evaluator__input');
        const button = this.querySelector('.ggb-evaluator__button');

        if (input) {
            input.addEventListener('keypress', (e) => this.handleKeyPress(e));
        }

        if (button) {
            button.addEventListener('click', () => this.evaluate());
        }
    }

    /**
     * Called when element is connected to DOM
     */
    connectedCallback() {
        super.connectedCallback();
    }
}

// Register custom element
customElements.define('geogebra-evaluator', GeoGebraEvaluator);
