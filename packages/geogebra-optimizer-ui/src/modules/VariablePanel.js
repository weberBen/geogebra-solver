import { BaseModule } from '../BaseModule.js';
import { VariableRow } from './VariableRow.js';

/**
 * Variable control panel component.
 * Displays all available variables with selection checkboxes, values, and deltas.
 *
 * @class
 * @extends BaseModule
 *
 * @fires VariablePanel#selection-changed - When variable selection changes
 *
 * @example
 * // HTML usage
 * <variable-panel></variable-panel>
 *
 * @example
 * // JavaScript usage
 * const panel = document.createElement('variable-panel');
 * panel.initVariables(variables, ggbApi);
 * panel.addEventListener('selection-changed', (e) => {
 *   console.log('Selected:', e.detail.selectedVariables);
 * });
 */
export class VariablePanel extends BaseModule {
    constructor() {
        super();

        this.state = {
            variables: [],
            selectedVariables: new Set(),
            deltas: {},
            ggbApi: null,
            isOptimizing: false
        };

        // Default row renderer (can be customized)
        this.rowRenderer = VariableRow;

        // Default step for variable value inputs (can be overridden via props)
        this.variableValueStep = 0.5;
    }

    /**
     * Initialize props and extract variableValueStep.
     * @override
     */
    initProps(props) {
        super.initProps(props);
        if (props.variableValueStep !== undefined) {
            this.variableValueStep = props.variableValueStep;
        }
    }

    /**
     * Initialize variables from GeoGebra.
     *
     * @param {Array<Object>} variables - Array of variable objects
     * @param {Object} ggbApi - GeoGebra API instance
     * @example
     * panel.initVariables([
     *   { name: 'AB', min: 0, max: 10, value: 5, ... },
     *   { name: 'BC', min: 0, max: 10, value: 3, ... }
     * ], ggbApi);
     */
    initVariables(variables, ggbApi) {
        this.setState({
            variables,
            ggbApi,
            selectedVariables: new Set(variables.map(v => v.name))
        });
    }

    /**
     * Update delta values for variables.
     *
     * @param {Object} deltas - Object mapping variable names to delta values
     * @example
     * panel.updateDeltas({ AB: 0.5, BC: -0.3 });
     */
    updateDeltas(deltas) {
        this.setState({ deltas });
    }

    /**
     * Clear all delta values.
     * @example
     * panel.clearDeltas();
     */
    clearDeltas() {
        this.setState({ deltas: {} });
    }

    /**
     * Update variable values (for snapshot restoration).
     * Updates both GeoGebra and internal state, then re-renders.
     *
     * @param {Object} values - Object mapping variable names to new values
     * @example
     * panel.updateVariableValues({ AB: 5.234, BC: 3.456 });
     */
    updateVariableValues(values) {
        const { ggbApi, variables } = this.state;

        if (!ggbApi) {
            console.warn('Cannot update variable values: GeoGebra API not available');
            return;
        }

        // Update GeoGebra and internal state
        Object.entries(values).forEach(([name, value]) => {
            // Update GeoGebra
            ggbApi.setValue(name, value);

            // Update internal variable state
            const variable = variables.find(v => v.name === name);
            if (variable) {
                variable.value = value;
            }
        });

        // Re-render to show updated values
        this.render();
    }

    /**
     * Update variable values and deltas during optimization.
     * More efficient than full re-render - updates DOM directly.
     *
     * @param {Object} variableValues - Object mapping variable names to current values
     * @param {Object} deltas - Object mapping variable names to delta values
     * @example
     * panel.updateVariableValuesAndDeltas(
     *   { AB: 5.234, BC: 3.456 },
     *   { AB: 0.234, BC: -0.544 }
     * );
     */
    updateVariableValuesAndDeltas(variableValues, deltas) {
        if (!variableValues || !deltas) {
            return;
        }

        const { variables } = this.state;

        // Update internal state
        Object.entries(variableValues).forEach(([name, value]) => {
            const variable = variables.find(v => v.name === name);
            if (variable) {
                variable.value = value;
            }
        });

        // Update deltas in state
        this.state.deltas = deltas;

        // Update DOM directly (more efficient than full re-render)
        Object.entries(variableValues).forEach(([name, value]) => {
            const row = this.querySelector(`tr[data-variable="${name}"]`);
            if (row) {
                // Update value input
                const valueInput = row.querySelector('.variable-panel__value-input');
                if (valueInput) {
                    valueInput.value = value.toFixed(3);
                }

                // Update delta display
                const deltaCell = row.querySelector('.variable-panel__delta');
                const delta = deltas[name];
                if (deltaCell && delta !== undefined) {
                    deltaCell.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(3);
                    deltaCell.classList.add('variable-panel__delta--visible');
                }
            }
        });
    }

    /**
     * Set optimization state (enables/disables value inputs).
     *
     * @param {boolean} isOptimizing - Whether optimization is running
     * @example
     * panel.setOptimizing(true);  // Disable inputs
     * panel.setOptimizing(false); // Enable inputs
     */
    setOptimizing(isOptimizing) {
        this.setState({ isOptimizing });
    }

    /**
     * Set a custom row renderer class.
     * The renderer class must have a static render() method.
     *
     * @param {class} RendererClass - Class with static render() method
     * @example
     * class CustomVariableRow extends VariableRow {
     *     static renderValue(variable, t) {
     *         return `<td style="color: red">${variable.value}</td>`;
     *     }
     * }
     * panel.setRowRenderer(CustomVariableRow);
     */
    setRowRenderer(RendererClass) {
        this.rowRenderer = RendererClass;
        this.render(); // Re-render with new renderer
    }

    /**
     * Get selected variable names, bounds, and weights.
     *
     * @returns {{variables: string[], bounds: {min: number[], max: number[]}, weights: number[]}}
     * @example
     * const { variables, bounds, weights } = panel.getSelectedVariables();
     * console.log(variables); // ['AB', 'BC']
     * console.log(bounds);  // { min: [0, 0], max: [10, 10] }
     * console.log(weights); // [1, 2]
     */
    getSelectedVariables() {
        const selectedNames = Array.from(this.state.selectedVariables);
        const bounds = { min: [], max: [] };
        const weights = [];

        selectedNames.forEach(name => {
            const variable = this.state.variables.find(v => v.name === name);
            if (variable) {
                bounds.min.push(variable.min);
                bounds.max.push(variable.max);
                weights.push(variable.weight !== undefined ? variable.weight : 1);
            }
        });

        return { variables: selectedNames, bounds, weights };
    }

    /**
     * Renders the variable panel.
     */
    render() {
        const t = this.t.bind(this);
        const { variables, selectedVariables, deltas, isOptimizing } = this.state;

        // Filter out hidden variables for display (but keep them in selectedVariables for optimization)
        const visibleVariables = variables.filter(variable => !variable.hidden);

        this.innerHTML = `
            <div class="variable-panel">
                <div class="variable-panel__header">
                    <h2 class="variable-panel__title">${t('variablePanel.title')}</h2>
                    <div class="variable-panel__actions">
                        <button class="variable-panel__select-all">${t('variablePanel.selectAll')}</button>
                        <button class="variable-panel__deselect-all">${t('variablePanel.deselectAll')}</button>
                    </div>
                </div>
                <div class="variable-panel__content">
                    ${visibleVariables.length === 0 ? `
                        <div class="variable-panel__empty">${t('variablePanel.noVariables')}</div>
                    ` : `
                        <table class="variable-panel__table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>${t('variablePanel.name')}</th>
                                    <th>${t('variablePanel.value')}</th>
                                    <th>${t('variablePanel.weight')}</th>
                                    <th>${t('variablePanel.delta')}</th>
                                    <th>${t('variablePanel.bounds')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${visibleVariables.map(variable =>
                                    this.rowRenderer.render(
                                        variable,
                                        selectedVariables.has(variable.name),
                                        deltas[variable.name],
                                        t,
                                        isOptimizing,
                                        this.variableValueStep
                                    )
                                ).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners to checkboxes, buttons, and value inputs.
     * @private
     */
    attachEventListeners() {
        // Checkbox change
        this.$$('.variable-panel__checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const name = e.target.dataset.name;
                if (e.target.checked) {
                    this.state.selectedVariables.add(name);
                } else {
                    this.state.selectedVariables.delete(name);
                }
                this.emit('selection-changed', {
                    selectedVariables: Array.from(this.state.selectedVariables)
                });
            });
        });

        // Value input change
        this.$$('.variable-panel__value-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const variableName = e.target.dataset.variableName;
                const newValue = parseFloat(e.target.value);

                if (!isNaN(newValue) && this.state.ggbApi) {
                    // Update GeoGebra
                    this.state.ggbApi.setValue(variableName, newValue);

                    // Update internal variable state
                    const variable = this.state.variables.find(v => v.name === variableName);
                    if (variable) {
                        variable.value = newValue;
                    }
                }
            });
        });

        // Weight input change
        this.$$('.variable-panel__weight-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const variableName = e.target.dataset.variableName;
                const newWeight = parseFloat(e.target.value);

                if (!isNaN(newWeight) && newWeight >= 0) {
                    // Update internal variable state
                    const variable = this.state.variables.find(v => v.name === variableName);
                    if (variable) {
                        variable.weight = newWeight;
                    }
                }
            });
        });

        // Select all (only visible variables)
        const selectAll = this.$('.variable-panel__select-all');
        if (selectAll) {
            selectAll.addEventListener('click', () => {
                const visibleVariables = this.state.variables.filter(v => !v.hidden);
                this.state.selectedVariables = new Set(visibleVariables.map(v => v.name));
                this.render();
                this.emit('selection-changed', {
                    selectedVariables: Array.from(this.state.selectedVariables)
                });
            });
        }

        // Deselect all (only visible variables, hidden variables remain selected)
        const deselectAll = this.$('.variable-panel__deselect-all');
        if (deselectAll) {
            deselectAll.addEventListener('click', () => {
                // Remove only visible variables from selection, keep hidden variables selected
                const hiddenVariables = this.state.variables.filter(v => v.hidden);
                this.state.selectedVariables = new Set(hiddenVariables.map(v => v.name));
                this.render();
                this.emit('selection-changed', {
                    selectedVariables: Array.from(this.state.selectedVariables)
                });
            });
        }
    }
}

// Register custom element
customElements.define('variable-panel', VariablePanel);
