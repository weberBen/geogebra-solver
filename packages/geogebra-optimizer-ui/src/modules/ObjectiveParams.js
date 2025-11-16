import { BaseModule } from '../BaseModule.js';

/**
 * Objective function parameters component.
 * Allows configuration of the objective function, primarily the regularization lambda.
 *
 * @class
 * @extends BaseModule
 *
 * @property {number} lambda - Regularization parameter (default: 0.01)
 *
 * @fires ObjectiveParams#params-changed - When parameters change
 *
 * @example
 * // HTML usage with attribute
 * <objective-params lambda="0.01"></objective-params>
 *
 * @example
 * // JavaScript usage
 * const params = document.createElement('objective-params');
 * const lambda = params.getLambda();
 * optimizer.optimize({ objectiveParams: { lambda } });
 */
export class ObjectiveParams extends BaseModule {
    static get observedAttributes() {
        return ['lambda'];
    }

    constructor() {
        super();

        this.state = {
            lambda: 0.01
        };

        // Default values (can be overridden via props)
        this.defaultLambda = 0.01;
        this.lambdaStep = 0.001;
    }

    /**
     * Initialize props and extract configurable values.
     * @override
     */
    initProps(props) {
        super.initProps(props);
        if (props.defaultLambda !== undefined) {
            this.defaultLambda = props.defaultLambda;
            this.state.lambda = props.defaultLambda;
        }
        if (props.lambdaStep !== undefined) {
            this.lambdaStep = props.lambdaStep;
        }
    }

    /**
     * Called when observed attributes change.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && name === 'lambda') {
            this.state.lambda = parseFloat(newValue);
            this.render();
        }
    }

    /**
     * Get current lambda value.
     *
     * @returns {number} Lambda value
     * @example
     * const lambda = objectiveParams.getLambda();
     */
    getLambda() {
        return this.state.lambda;
    }

    /**
     * Set lambda value.
     *
     * @param {number} lambda - New lambda value
     * @example
     * objectiveParams.setLambda(0.05);
     */
    setLambda(lambda) {
        this.setState({ lambda });
    }

    /**
     * Renders the objective parameters form.
     */
    render() {
        const t = this.t.bind(this);
        const { lambda } = this.state;

        this.innerHTML = `
            <div class="objective-params">
                <div class="objective-params__header">
                    <h3 class="objective-params__title">${t('objectiveParams.title')}</h3>
                </div>
                <div class="objective-params__content">
                    <div class="objective-params__field">
                        <label class="objective-params__label">
                            ${t('objectiveParams.lambda')}
                            <input
                                type="number"
                                class="objective-params__input"
                                value="${lambda}"
                                min="0"
                                max="1"
                                step="${this.lambdaStep}"
                            />
                        </label>
                        <p class="objective-params__description">
                            ${t('objectiveParams.lambdaDescription')}
                        </p>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners to input.
     * @private
     */
    attachEventListeners() {
        const input = this.$('.objective-params__input');
        if (input) {
            input.addEventListener('change', (e) => {
                this.state.lambda = parseFloat(e.target.value);
                this.emit('params-changed', { lambda: this.state.lambda });
            });
        }
    }
}

// Register custom element
customElements.define('objective-params', ObjectiveParams);
