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
            currentMovementPenalty: null,
            currentSoftViolation: null,
            bestObjective: null,
            bestHardViolation: null,
            generation: 0,
            evaluations: 0,
            cmaesMetrics: null  // CMA-ES exact metrics
        };
    }

    /**
     * Update metrics values.
     *
     * @param {Object} metrics - Metrics to update
     * @param {number} [metrics.currentObjective] - Current objective value (movement + soft)
     * @param {number} [metrics.currentMovementPenalty] - Current movement penalty
     * @param {number} [metrics.currentSoftViolation] - Current soft constraints violation
     * @param {number} [metrics.bestObjective] - Best objective found
     * @param {number} [metrics.bestHardViolation] - Best hard constraints violation
     * @param {number} [metrics.generation] - Current generation
     * @param {number} [metrics.evaluations] - Total evaluations
     * @param {Object} [metrics.cmaesMetrics] - CMA-ES exact metrics
     * @example
     * metricsPanel.updateMetrics({
     *   currentObjective: 1.234,
     *   bestHardViolation: 0.0001,
     *   generation: 50,
     *   evaluations: 500,
     *   cmaesMetrics: { lambda: [...], mu: 1.0, alPenalty: 0.5 }
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
            currentMovementPenalty: null,
            currentSoftViolation: null,
            bestObjective: null,
            bestHardViolation: null,
            generation: 0,
            evaluations: 0,
            cmaesMetrics: null
        });
    }

    /**
     * Renders the metrics panel.
     */
    render() {
        const t = this.t.bind(this);
        const {
            currentObjective,
            currentMovementPenalty,
            currentSoftViolation,
            bestObjective,
            bestHardViolation,
            generation,
            evaluations,
            cmaesMetrics
        } = this.state;

        const formatValue = (value, precision = 6) => {
            return value !== null && value !== undefined
                ? value.toFixed(precision)
                : '-';
        };

        // CMA-ES metrics section (if available)
        const cmaesSection = cmaesMetrics ? `
            <div class="metrics-panel__group">
                <div class="metrics-panel__group-title">${t('metricsPanel.cmaesMetrics')}</div>
                <div class="metrics-panel__item">
                    <div class="metrics-panel__label">${t('metricsPanel.alPenalty')}</div>
                    <div class="metrics-panel__value">${formatValue(cmaesMetrics.alPenalty)}</div>
                </div>
                <div class="metrics-panel__item">
                    <div class="metrics-panel__label">${t('metricsPanel.hardViolation')}</div>
                    <div class="metrics-panel__value">${formatValue(cmaesMetrics.hardViolation)}</div>
                </div>
                <div class="metrics-panel__item">
                    <div class="metrics-panel__label">${t('metricsPanel.isFeasible')}</div>
                    <div class="metrics-panel__value">${cmaesMetrics.isFeasible ? '✓' : '✗'}</div>
                </div>
                <div class="metrics-panel__item">
                    <div class="metrics-panel__label">${t('metricsPanel.mu')}</div>
                    <div class="metrics-panel__value">${formatValue(cmaesMetrics.mu, 2)}</div>
                </div>
            </div>
        ` : '';

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
                                <div class="metrics-panel__label">${t('metricsPanel.bestHardViolation')}</div>
                                <div class="metrics-panel__value metrics-panel__value--primary">
                                    ${formatValue(bestHardViolation)}
                                </div>
                            </div>
                        </div>
                        <div class="metrics-panel__group">
                            <div class="metrics-panel__group-title">${t('metricsPanel.currentMetrics')}</div>
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.currentObjective')}</div>
                                <div class="metrics-panel__value">
                                    ${formatValue(currentObjective)}
                                </div>
                            </div>
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.movementPenalty')}</div>
                                <div class="metrics-panel__value">
                                    ${formatValue(currentMovementPenalty)}
                                </div>
                            </div>
                            <div class="metrics-panel__item">
                                <div class="metrics-panel__label">${t('metricsPanel.softViolation')}</div>
                                <div class="metrics-panel__value">
                                    ${formatValue(currentSoftViolation)}
                                </div>
                            </div>
                        </div>
                        ${cmaesSection}
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
