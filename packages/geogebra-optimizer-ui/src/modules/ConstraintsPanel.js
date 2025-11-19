import { BaseModule } from '../BaseModule.js';

/**
 * Constraints display component.
 * Shows hard and soft constraints parsed from GeoGebra XML.
 *
 * @class
 * @extends BaseModule
 *
 * @example
 * // HTML usage
 * <constraints-panel></constraints-panel>
 *
 * @example
 * // JavaScript usage
 * const panel = document.createElement('constraints-panel');
 * panel.updateConstraints([
 *   { type: 'hard', operator: '=', label: 'Distance A=A\'', expression: 'Distance(A, A\')' },
 *   { type: 'soft', operator: '<', label: 'Angle limit', expression: 'angle(A)' }
 * ]);
 */
export class ConstraintsPanel extends BaseModule {
    constructor() {
        super();

        this.state = {
            constraints: [],
            constraintValues: {},     // { constraintIndex: currentValue }
            l2Penalty: null,
            hardPenalty: null,
            softPenalty: null
        };
    }

    /**
     * Update constraints list.
     *
     * @param {Array<Object>} constraints - Array of constraint objects
     * @param {string} constraints[].type - Constraint type ('hard' or 'soft')
     * @param {string} constraints[].operator - Constraint operator ('=', '<', '<=', '>', '>=')
     * @param {string} constraints[].label - Human-readable label
     * @param {string} constraints[].expression - GeoGebra expression
     * @example
     * panel.updateConstraints([
     *   { type: 'hard', operator: '=', label: 'Distance', expression: 'Distance(A, A\')' }
     * ]);
     */
    updateConstraints(constraints) {
        this.setState({ constraints: constraints || [] });
    }

    /**
     * Update metrics (live values during optimization)
     *
     * @param {Object} metrics - Metrics object
     * @param {Array<number>} metrics.constraintValues - Current values for each constraint
     * @param {number} metrics.l2Penalty - L2 penalty for sliders
     * @param {number} metrics.hardPenalty - Hard constraints penalty
     * @param {number} metrics.softPenalty - Soft constraints penalty
     */
    updateMetrics(metrics) {
        const { constraintValues, l2Penalty, hardPenalty, softPenalty } = metrics;

        // Convert array to object for easier lookup
        const valuesMap = {};
        if (constraintValues) {
            constraintValues.forEach((value, index) => {
                valuesMap[index] = value;
            });
        }

        this.setState({
            constraintValues: valuesMap,
            l2Penalty: l2Penalty !== undefined ? l2Penalty : this.state.l2Penalty,
            hardPenalty: hardPenalty !== undefined ? hardPenalty : this.state.hardPenalty,
            softPenalty: softPenalty !== undefined ? softPenalty : this.state.softPenalty
        });
    }

    /**
     * Get CSS class for operator badge.
     * @private
     * @param {string} operator - Constraint operator
     * @returns {string} CSS class name
     */
    getOperatorClass(operator) {
        switch (operator) {
            case '=':
                return 'constraints-panel__operator--eq';
            case '<':
            case '<=':
                return 'constraints-panel__operator--lt';
            case '>':
            case '>=':
                return 'constraints-panel__operator--gt';
            default:
                return '';
        }
    }

    /**
     * Format constraint expression with operator and 0
     * @private
     * @param {Object} constraint - Constraint object
     * @returns {string} Formatted expression
     */
    formatExpression(constraint) {
        return `${constraint.expression} ${constraint.operator} 0`;
    }

    /**
     * Renders the constraints panel.
     */
    render() {
        const t = this.t.bind(this);
        const { constraints, constraintValues, l2Penalty, hardPenalty, softPenalty } = this.state;

        const hardConstraints = constraints.filter(c => c.type === 'hard');
        const softConstraints = constraints.filter(c => c.type === 'soft');

        const formatValue = (value) => {
            if (value === null || value === undefined) return '-';
            return value.toFixed(6);
        };

        const renderConstraintList = (constraintsList, emptyKey) => {
            if (constraintsList.length === 0) {
                return `<div class="constraints-panel__empty">${t(emptyKey)}</div>`;
            }

            return constraintsList.map((constraint, localIndex) => {
                // Find the global index of this constraint in the full constraints array
                const globalIndex = constraints.indexOf(constraint);
                const currentValue = constraintValues[globalIndex];
                const weight = constraint.weight !== undefined ? constraint.weight : 1;
                const enabled = constraint.enabled !== undefined ? constraint.enabled : true;
                const isHard = constraint.type === 'hard';

                return `
                    <div class="constraints-panel__constraint" data-constraint-index="${globalIndex}">
                        <div class="constraints-panel__constraint-header">
                            <span class="constraints-panel__operator ${this.getOperatorClass(constraint.operator)}">
                                ${constraint.operator}
                            </span>
                            <span class="constraints-panel__label">${constraint.label}</span>
                            <div class="constraints-panel__weight-container">
                                ${isHard ? `
                                    <label class="constraints-panel__enabled-label">
                                        <input type="checkbox"
                                               class="constraints-panel__enabled-checkbox"
                                               data-constraint-index="${globalIndex}"
                                               ${enabled ? 'checked' : ''} />
                                        ${t('constraintsPanel.enabled')}
                                    </label>
                                ` : `
                                    <label class="constraints-panel__weight-label">${t('constraintsPanel.weight')}:</label>
                                    <input type="number"
                                           class="constraints-panel__weight-input"
                                           data-constraint-index="${globalIndex}"
                                           value="${weight}"
                                           min="0"
                                           step="0.1" />
                                `}
                            </div>
                            ${currentValue !== undefined ? `
                                <span class="constraints-panel__value">${formatValue(currentValue)}</span>
                            ` : ''}
                        </div>
                        <div class="constraints-panel__expression">
                            ${this.formatExpression(constraint)}
                        </div>
                    </div>
                `;
            }).join('');
        };

        this.innerHTML = `
            <div class="constraints-panel">
                <div class="constraints-panel__header">
                    <h3 class="constraints-panel__title">${t('constraintsPanel.title')}</h3>
                </div>
                <div class="constraints-panel__content">
                    ${l2Penalty !== null ? `
                        <div class="constraints-panel__summary">
                            <span class="constraints-panel__summary-label">L2 (sliders):</span>
                            <span class="constraints-panel__summary-value">${formatValue(l2Penalty)}</span>
                        </div>
                    ` : ''}
                    <div class="constraints-panel__section">
                        <div class="constraints-panel__section-header">
                            <h4 class="constraints-panel__section-title">
                                ${t('constraintsPanel.hardConstraints')}
                                <span class="constraints-panel__count">(${hardConstraints.length})</span>
                            </h4>
                            ${hardPenalty !== null ? `
                                <span class="constraints-panel__penalty">Σ = ${formatValue(hardPenalty)}</span>
                            ` : ''}
                        </div>
                        <div class="constraints-panel__list">
                            ${renderConstraintList(hardConstraints, 'constraintsPanel.noHardConstraints')}
                        </div>
                    </div>
                    <div class="constraints-panel__section">
                        <div class="constraints-panel__section-header">
                            <h4 class="constraints-panel__section-title">
                                ${t('constraintsPanel.softConstraints')}
                                <span class="constraints-panel__count">(${softConstraints.length})</span>
                            </h4>
                            ${softPenalty !== null ? `
                                <span class="constraints-panel__penalty">Σ = ${formatValue(softPenalty)}</span>
                            ` : ''}
                        </div>
                        <div class="constraints-panel__list">
                            ${renderConstraintList(softConstraints, 'constraintsPanel.noSoftConstraints')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners for weight inputs and enabled checkboxes.
     * @private
     */
    attachEventListeners() {
        // Weight input change (soft constraints)
        this.$$('.constraints-panel__weight-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const constraintIndex = parseInt(e.target.dataset.constraintIndex, 10);
                const newWeight = parseFloat(e.target.value);

                if (!isNaN(newWeight) && newWeight >= 0 && !isNaN(constraintIndex)) {
                    const constraint = this.state.constraints[constraintIndex];
                    if (constraint) {
                        constraint.weight = newWeight;
                    }
                }
            });
        });

        // Enabled checkbox change (hard constraints)
        this.$$('.constraints-panel__enabled-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const constraintIndex = parseInt(e.target.dataset.constraintIndex, 10);
                const isEnabled = e.target.checked;

                if (!isNaN(constraintIndex)) {
                    const constraint = this.state.constraints[constraintIndex];
                    if (constraint) {
                        constraint.enabled = isEnabled;
                    }
                }
            });
        });
    }
}

// Register custom element
customElements.define('constraints-panel', ConstraintsPanel);
