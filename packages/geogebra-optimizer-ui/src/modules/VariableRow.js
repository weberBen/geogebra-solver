/**
 * Variable row renderer.
 * Factory class with static methods for rendering table rows.
 * Can be extended to customize row rendering.
 *
 * @class
 *
 * @example
 * // Default usage
 * const html = VariableRow.render(variable, true, 0.5, t);
 *
 * @example
 * // Custom renderer
 * class CustomVariableRow extends VariableRow {
 *     static renderValue(variable, t) {
 *         const color = variable.value > 5 ? 'green' : 'red';
 *         return `<td style="color: ${color}">${variable.value.toFixed(3)}</td>`;
 *     }
 * }
 */
export class VariableRow {
    /**
     * Render a complete variable row.
     *
     * @param {Object} variable - Variable data
     * @param {string} variable.name - Variable identifier
     * @param {number} variable.value - Current value
     * @param {number} variable.min - Minimum bound
     * @param {number} variable.max - Maximum bound
     * @param {boolean} isSelected - Whether variable is selected
     * @param {number|undefined} delta - Delta value from optimization
     * @param {Function} t - Translation function
     * @param {boolean} [isDisabled=false] - Whether inputs should be disabled
     * @param {number} [step=0.5] - Step value for the variable input
     * @returns {string} HTML string for the row
     *
     * @example
     * VariableRow.render(
     *   { name: 'AB', value: 5.2, min: 0, max: 10 },
     *   true,
     *   0.3,
     *   (key) => translations[key],
     *   false,
     *   0.5
     * );
     */
    static render(variable, isSelected, delta, t, isDisabled = false, step = 0.5) {
        return this.renderRow(variable, isSelected, delta, t, isDisabled, step);
    }

    /**
     * Protected method for rendering the complete row.
     * Override this to completely customize the row structure.
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {boolean} isSelected - Whether variable is selected
     * @param {number|undefined} delta - Delta value
     * @param {Function} t - Translation function
     * @param {boolean} isDisabled - Whether inputs should be disabled
     * @param {number} step - Step value for the variable input
     * @returns {string} HTML string for the row
     */
    static renderRow(variable, isSelected, delta, t, isDisabled, step) {
        return `
            <tr class="variable-panel__row" data-variable="${variable.name}">
                ${this.renderCheckbox(variable, isSelected, t)}
                ${this.renderName(variable, t)}
                ${this.renderValue(variable, isDisabled, t, step)}
                ${this.renderWeight(variable, isDisabled, t)}
                ${this.renderDelta(variable, delta, t)}
                ${this.renderBounds(variable, t)}
            </tr>
        `;
    }

    /**
     * Render the checkbox cell.
     * Override to customize checkbox appearance or behavior.
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {boolean} isSelected - Whether variable is selected
     * @param {Function} t - Translation function
     * @returns {string} HTML string for checkbox cell
     */
    static renderCheckbox(variable, isSelected, t) {
        return `
            <td>
                <input type="checkbox"
                       class="variable-panel__checkbox"
                       data-name="${variable.name}"
                       ${isSelected ? 'checked' : ''} />
            </td>
        `;
    }

    /**
     * Render the name cell.
     * Override to customize name display (e.g., add icons, tooltips).
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {Function} t - Translation function
     * @returns {string} HTML string for name cell
     */
    static renderName(variable, t) {
        return `<td class="variable-panel__name">${variable.name}</td>`;
    }

    /**
     * Render the value cell.
     * Override to customize value formatting or styling.
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {boolean} isDisabled - Whether input should be disabled
     * @param {Function} t - Translation function
     * @param {number} step - Step value for the input
     * @returns {string} HTML string for value cell
     */
    static renderValue(variable, isDisabled, t, step) {
        return `
            <td class="variable-panel__value">
                <input type="number"
                       class="variable-panel__value-input"
                       data-variable-name="${variable.name}"
                       value="${variable.value.toFixed(3)}"
                       min="${variable.min}"
                       max="${variable.max}"
                       step="${step}"
                       ${isDisabled ? 'disabled' : ''} />
            </td>
        `;
    }

    /**
     * Render the weight cell.
     * Override to customize weight display.
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {boolean} isDisabled - Whether input should be disabled
     * @param {Function} t - Translation function
     * @returns {string} HTML string for weight cell
     */
    static renderWeight(variable, isDisabled, t) {
        const weight = variable.weight !== undefined ? variable.weight : 1;
        return `
            <td class="variable-panel__weight">
                <input type="number"
                       class="variable-panel__weight-input"
                       data-variable-name="${variable.name}"
                       value="${weight}"
                       min="0"
                       step="0.1"
                       ${isDisabled ? 'disabled' : ''} />
            </td>
        `;
    }

    /**
     * Render the delta cell.
     * Override to customize delta display.
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {number|undefined} delta - Delta value
     * @param {Function} t - Translation function
     * @returns {string} HTML string for delta cell
     */
    static renderDelta(variable, delta, t) {
        const hasDeltas = delta !== undefined;
        const deltaClass = hasDeltas ? 'variable-panel__delta--visible' : '';
        const deltaText = hasDeltas
            ? (delta >= 0 ? '+' : '') + delta.toFixed(3)
            : '-';

        return `
            <td class="variable-panel__delta ${deltaClass}">
                ${deltaText}
            </td>
        `;
    }

    /**
     * Render the bounds cell.
     * Override to customize bounds display.
     *
     * @protected
     * @param {Object} variable - Variable data
     * @param {Function} t - Translation function
     * @returns {string} HTML string for bounds cell
     */
    static renderBounds(variable, t) {
        return `
            <td class="variable-panel__bounds">
                [${variable.min}, ${variable.max}]
            </td>
        `;
    }
}
