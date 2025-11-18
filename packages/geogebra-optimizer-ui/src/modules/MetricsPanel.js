import { BaseModule } from '../BaseModule.js';

/**
 * Optimization metrics display component.
 * Shows real-time metrics during optimization.
 *
 * @class
 * @extends BaseModule
 *
 * @example
 * // HTML usage
 * <metrics-panel></metrics-panel>
 *
 * @example
 * // JavaScript usage
 * const metrics = document.createElement('metrics-panel');
 * metrics.updateMetrics({
 *   bestDistance: 0.123,
 *   generation: 42,
 *   evaluations: 420
 * });
 */
export class MetricsPanel extends BaseModule {
    constructor() {
        super();

        this.state = {
            currentObjective: null,
            bestObjective: null,
            currentConstraintsViolation: null,
            bestConstraintsViolation: null,
            generation: 0,
            evaluations: 0
        };
    }

    /**
     * Update metrics values.
     *
     * @param {Object} metrics - Metrics to update
     * @param {number} [metrics.currentObjective] - Current L2 objective value
     * @param {number} [metrics.bestObjective] - Best L2 objective found
     * @param {number} [metrics.currentConstraintsViolation] - Current constraints violation
     * @param {number} [metrics.bestConstraintsViolation] - Best constraints violation
     * @param {number} [metrics.generation] - Current generation
     * @param {number} [metrics.evaluations] - Total evaluations
     * @example
     * metricsPanel.updateMetrics({
     *   currentObjective: 1.234,
     *   bestConstraintsViolation: 0.0001,
     *   generation: 50,
     *   evaluations: 500
     * });
     */
    updateMetrics(metrics) {
        this.setState(metrics);
    }

    /**
     * Reset all metrics to initial state.
     * @example
     * metricsPanel.reset();
     */
    reset() {
        this.setState({
            currentObjective: null,
            bestObjective: null,
            currentConstraintsViolation: null,
            bestConstraintsViolation: null,
            generation: 0,
            evaluations: 0
        });
    }

    /**
     * Renders the metrics panel.
     */
    render() {
        const t = this.t.bind(this);
        const {
            currentObjective,
            bestObjective,
            currentConstraintsViolation,
            bestConstraintsViolation,
            generation,
            evaluations
        } = this.state;

        const formatValue = (value, precision = 6) => {
            return value !== null && value !== undefined
                ? value.toFixed(precision)
                : '-';
        };

        this.innerHTML = `
            <div class="metrics-panel">
                <div class="metrics-panel__header">
                    <h3 class="metrics-panel__title">${t('metricsPanel.title')}</h3>
                </div>
                <div class="metrics-panel__content">
                    <div class="metrics-panel__groups">
                        <div class="metrics-panel__group">
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.bestObjective')}</div>
                                <div class="metrics-panel__value metrics-panel__value--primary">
                                    ${formatValue(bestObjective)}
                                </div>
                            </div>
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.bestConstraints')}</div>
                                <div class="metrics-panel__value metrics-panel__value--primary">
                                    ${formatValue(bestConstraintsViolation)}
                                </div>
                            </div>
                        </div>
                        <div class="metrics-panel__group">
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.currentObjective')}</div>
                                <div class="metrics-panel__value">
                                    ${formatValue(currentObjective)}
                                </div>
                            </div>
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.currentConstraints')}</div>
                                <div class="metrics-panel__value">
                                    ${formatValue(currentConstraintsViolation)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="metrics-panel__grid">
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.generation')}</div>
                            <div class="metrics-panel__value">
                                ${generation}
                            </div>
                        </div>
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.evaluations')}</div>
                            <div class="metrics-panel__value">
                                ${evaluations}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Register custom element
customElements.define('metrics-panel', MetricsPanel);
