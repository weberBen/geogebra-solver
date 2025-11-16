import { BaseModule } from '../BaseModule.js';

/**
 * Solver parameters configuration component.
 * Allows configuration of CMA-ES algorithm parameters.
 *
 * @class
 * @extends BaseModule
 *
 * @property {number} maxiter - Maximum iterations (default: 100)
 * @property {number} popsize - Population size (default: 10)
 * @property {number} sigma - Initial step size (default: 0.5)
 * @property {number} tolfun - Function tolerance (default: 1e-6)
 *
 * @fires SolverParams#params-changed - When parameters change
 *
 * @example
 * // HTML usage with attributes
 * <solver-params maxiter="100" popsize="10" sigma="0.5"></solver-params>
 *
 * @example
 * // JavaScript usage
 * const params = document.createElement('solver-params');
 * params.setParams({ maxiter: 200, popsize: 15 });
 * console.log(params.getParams());
 */
export class SolverParams extends BaseModule {
    static get observedAttributes() {
        return ['maxiter', 'popsize', 'sigma', 'tolfun'];
    }

    constructor() {
        super();

        this.state = {
            maxiter: 100,
            popsize: 10,
            sigma: 0.5,
            tolfun: 0.000001
        };

        // Default values (can be overridden via props)
        this.defaults = {
            maxiter: 100,
            popsize: 10,
            sigma: 0.5,
            tolfun: 0.000001
        };

        // Step values (can be overridden via props)
        this.steps = {
            maxiter: 1,
            popsize: 1,
            sigma: 0.1,
            tolfun: 0.000001
        };
    }

    /**
     * Initialize props and extract configurable values.
     * @override
     */
    initProps(props) {
        super.initProps(props);

        // Override defaults if provided
        if (props.defaults) {
            this.defaults = { ...this.defaults, ...props.defaults };
            this.state = { ...this.state, ...props.defaults };
        }

        // Override steps if provided
        if (props.steps) {
            this.steps = { ...this.steps, ...props.steps };
        }
    }

    /**
     * Called when observed attributes change.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.state[name] = parseFloat(newValue);
            this.render();
        }
    }

    /**
     * Get current solver parameters.
     *
     * @returns {{maxiter: number, popsize: number, sigma: number, tolfun: number}}
     * @example
     * const params = solverParams.getParams();
     * optimizer.optimize({ solverParams: params });
     */
    getParams() {
        return { ...this.state };
    }

    /**
     * Set solver parameters.
     *
     * @param {{maxiter?: number, popsize?: number, sigma?: number, tolfun?: number}} params
     * @example
     * solverParams.setParams({ maxiter: 200, sigma: 0.3 });
     */
    setParams(params) {
        this.setState(params);
    }

    /**
     * Renders the solver parameters form.
     */
    render() {
        const t = this.t.bind(this);
        const { maxiter, popsize, sigma, tolfun } = this.state;

        this.innerHTML = `
            <div class="solver-params">
                <div class="solver-params__header">
                    <h3 class="solver-params__title">${t('solverParams.title')}</h3>
                </div>
                <div class="solver-params__content">
                    <div class="solver-params__field">
                        <label class="solver-params__label">
                            ${t('solverParams.maxiter')}
                            <input
                                type="number"
                                class="solver-params__input"
                                data-param="maxiter"
                                value="${maxiter}"
                                min="1"
                                step="${this.steps.maxiter}"
                            />
                        </label>
                    </div>
                    <div class="solver-params__field">
                        <label class="solver-params__label">
                            ${t('solverParams.popsize')}
                            <input
                                type="number"
                                class="solver-params__input"
                                data-param="popsize"
                                value="${popsize}"
                                min="1"
                                step="${this.steps.popsize}"
                            />
                        </label>
                    </div>
                    <div class="solver-params__field">
                        <label class="solver-params__label">
                            ${t('solverParams.sigma')}
                            <input
                                type="number"
                                class="solver-params__input"
                                data-param="sigma"
                                value="${sigma}"
                                min="0.01"
                                max="10"
                                step="${this.steps.sigma}"
                            />
                        </label>
                    </div>
                    <div class="solver-params__field">
                        <label class="solver-params__label">
                            ${t('solverParams.tolfun')}
                            <input
                                type="number"
                                class="solver-params__input"
                                data-param="tolfun"
                                value="${tolfun}"
                                min="0"
                                step="${this.steps.tolfun}"
                            />
                        </label>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners to inputs.
     * @private
     */
    attachEventListeners() {
        this.$$('.solver-params__input').forEach(input => {
            input.addEventListener('change', (e) => {
                const param = e.target.dataset.param;
                const value = parseFloat(e.target.value);
                this.state[param] = value;
                this.emit('params-changed', this.getParams());
            });
        });
    }
}

// Register custom element
customElements.define('solver-params', SolverParams);
