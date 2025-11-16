/**
 * Slider row renderer.
 * Factory class with static methods for rendering table rows.
 * Can be extended to customize row rendering.
 *
 * @class
 *
 * @example
 * // Default usage
 * const html = SliderRow.render(slider, true, 0.5, t);
 *
 * @example
 * // Custom renderer
 * class CustomSliderRow extends SliderRow {
 *     static renderValue(slider, t) {
 *         const color = slider.value > 5 ? 'green' : 'red';
 *         return `<td style="color: ${color}">${slider.value.toFixed(3)}</td>`;
 *     }
 * }
 */
export class SliderRow {
    /**
     * Render a complete slider row.
     *
     * @param {Object} slider - Slider data
     * @param {string} slider.name - Slider identifier
     * @param {number} slider.value - Current value
     * @param {number} slider.min - Minimum bound
     * @param {number} slider.max - Maximum bound
     * @param {boolean} isSelected - Whether slider is selected
     * @param {number|undefined} delta - Delta value from optimization
     * @param {Function} t - Translation function
     * @param {boolean} [isDisabled=false] - Whether inputs should be disabled
     * @param {number} [step=0.5] - Step value for the slider input
     * @returns {string} HTML string for the row
     *
     * @example
     * SliderRow.render(
     *   { name: 'AB', value: 5.2, min: 0, max: 10 },
     *   true,
     *   0.3,
     *   (key) => translations[key],
     *   false,
     *   0.5
     * );
     */
    static render(slider, isSelected, delta, t, isDisabled = false, step = 0.5) {
        return this.renderRow(slider, isSelected, delta, t, isDisabled, step);
    }

    /**
     * Protected method for rendering the complete row.
     * Override this to completely customize the row structure.
     *
     * @protected
     * @param {Object} slider - Slider data
     * @param {boolean} isSelected - Whether slider is selected
     * @param {number|undefined} delta - Delta value
     * @param {Function} t - Translation function
     * @param {boolean} isDisabled - Whether inputs should be disabled
     * @param {number} step - Step value for the slider input
     * @returns {string} HTML string for the row
     */
    static renderRow(slider, isSelected, delta, t, isDisabled, step) {
        return `
            <tr class="slider-panel__row" data-slider="${slider.name}">
                ${this.renderCheckbox(slider, isSelected, t)}
                ${this.renderName(slider, t)}
                ${this.renderValue(slider, isDisabled, t, step)}
                ${this.renderDelta(slider, delta, t)}
                ${this.renderBounds(slider, t)}
            </tr>
        `;
    }

    /**
     * Render the checkbox cell.
     * Override to customize checkbox appearance or behavior.
     *
     * @protected
     * @param {Object} slider - Slider data
     * @param {boolean} isSelected - Whether slider is selected
     * @param {Function} t - Translation function
     * @returns {string} HTML string for checkbox cell
     */
    static renderCheckbox(slider, isSelected, t) {
        return `
            <td>
                <input type="checkbox"
                       class="slider-panel__checkbox"
                       data-name="${slider.name}"
                       ${isSelected ? 'checked' : ''} />
            </td>
        `;
    }

    /**
     * Render the name cell.
     * Override to customize name display (e.g., add icons, tooltips).
     *
     * @protected
     * @param {Object} slider - Slider data
     * @param {Function} t - Translation function
     * @returns {string} HTML string for name cell
     */
    static renderName(slider, t) {
        return `<td class="slider-panel__name">${slider.name}</td>`;
    }

    /**
     * Render the value cell.
     * Override to customize value formatting or styling.
     *
     * @protected
     * @param {Object} slider - Slider data
     * @param {boolean} isDisabled - Whether input should be disabled
     * @param {Function} t - Translation function
     * @param {number} step - Step value for the input
     * @returns {string} HTML string for value cell
     */
    static renderValue(slider, isDisabled, t, step) {
        return `
            <td class="slider-panel__value">
                <input type="number"
                       class="slider-panel__value-input"
                       data-slider-name="${slider.name}"
                       value="${slider.value.toFixed(3)}"
                       min="${slider.min}"
                       max="${slider.max}"
                       step="${step}"
                       ${isDisabled ? 'disabled' : ''} />
            </td>
        `;
    }

    /**
     * Render the delta cell.
     * Override to customize delta display.
     *
     * @protected
     * @param {Object} slider - Slider data
     * @param {number|undefined} delta - Delta value
     * @param {Function} t - Translation function
     * @returns {string} HTML string for delta cell
     */
    static renderDelta(slider, delta, t) {
        const hasDeltas = delta !== undefined;
        const deltaClass = hasDeltas ? 'slider-panel__delta--visible' : '';
        const deltaText = hasDeltas
            ? (delta >= 0 ? '+' : '') + delta.toFixed(3)
            : '-';

        return `
            <td class="slider-panel__delta ${deltaClass}">
                ${deltaText}
            </td>
        `;
    }

    /**
     * Render the bounds cell.
     * Override to customize bounds display.
     *
     * @protected
     * @param {Object} slider - Slider data
     * @param {Function} t - Translation function
     * @returns {string} HTML string for bounds cell
     */
    static renderBounds(slider, t) {
        return `
            <td class="slider-panel__bounds">
                [${slider.min}, ${slider.max}]
            </td>
        `;
    }
}
