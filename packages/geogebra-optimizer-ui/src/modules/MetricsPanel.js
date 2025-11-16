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
            bestDistance: null,
            currentDistance: null,
            bestFitness: null,
            regularizationPenalty: null,
            totalDelta: null,
            generation: 0,
            evaluations: 0
        };
    }

    /**
     * Update metrics values.
     *
     * @param {Object} metrics - Metrics to update
     * @param {number} [metrics.bestDistance] - Best distance found
     * @param {number} [metrics.currentDistance] - Current distance
     * @param {number} [metrics.bestFitness] - Best fitness value
     * @param {number} [metrics.regularizationPenalty] - Regularization penalty
     * @param {number} [metrics.totalDelta] - Total delta from initial
     * @param {number} [metrics.generation] - Current generation
     * @param {number} [metrics.evaluations] - Total evaluations
     * @example
     * metricsPanel.updateMetrics({
     *   bestDistance: 0.0123,
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
            bestDistance: null,
            currentDistance: null,
            bestFitness: null,
            regularizationPenalty: null,
            totalDelta: null,
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
            bestDistance,
            currentDistance,
            bestFitness,
            regularizationPenalty,
            totalDelta,
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
                    <div class="metrics-panel__grid">
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.bestDistance')}</div>
                            <div class="metrics-panel__value metrics-panel__value--primary">
                                ${formatValue(bestDistance)}
                            </div>
                        </div>
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.currentDistance')}</div>
                            <div class="metrics-panel__value">
                                ${formatValue(currentDistance)}
                            </div>
                        </div>
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.bestFitness')}</div>
                            <div class="metrics-panel__value">
                                ${formatValue(bestFitness)}
                            </div>
                        </div>
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.regularizationPenalty')}</div>
                            <div class="metrics-panel__value">
                                ${formatValue(regularizationPenalty)}
                            </div>
                        </div>
                        <div class="metrics-panel__item">
                            <div class="metrics-panel__label">${t('metricsPanel.totalDelta')}</div>
                            <div class="metrics-panel__value">
                                ${formatValue(totalDelta, 3)}
                            </div>
                        </div>
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
