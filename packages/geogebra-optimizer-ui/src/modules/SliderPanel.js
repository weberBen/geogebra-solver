import { BaseModule } from '../BaseModule.js';
import { SliderRow } from './SliderRow.js';

/**
 * Slider control panel component.
 * Displays all available sliders with selection checkboxes, values, and deltas.
 *
 * @class
 * @extends BaseModule
 *
 * @fires SliderPanel#selection-changed - When slider selection changes
 *
 * @example
 * // HTML usage
 * <slider-panel></slider-panel>
 *
 * @example
 * // JavaScript usage
 * const panel = document.createElement('slider-panel');
 * panel.initSliders(sliders, ggbApi);
 * panel.addEventListener('selection-changed', (e) => {
 *   console.log('Selected:', e.detail.selectedSliders);
 * });
 */
export class SliderPanel extends BaseModule {
    constructor() {
        super();

        this.state = {
            sliders: [],
            selectedSliders: new Set(),
            deltas: {},
            ggbApi: null,
            isOptimizing: false
        };

        // Default row renderer (can be customized)
        this.rowRenderer = SliderRow;

        // Default step for slider value inputs (can be overridden via props)
        this.sliderValueStep = 0.5;
    }

    /**
     * Initialize props and extract sliderValueStep.
     * @override
     */
    initProps(props) {
        super.initProps(props);
        if (props.sliderValueStep !== undefined) {
            this.sliderValueStep = props.sliderValueStep;
        }
    }

    /**
     * Initialize sliders from GeoGebra.
     *
     * @param {Array<Object>} sliders - Array of slider objects
     * @param {Object} ggbApi - GeoGebra API instance
     * @example
     * panel.initSliders([
     *   { name: 'AB', min: 0, max: 10, value: 5, ... },
     *   { name: 'BC', min: 0, max: 10, value: 3, ... }
     * ], ggbApi);
     */
    initSliders(sliders, ggbApi) {
        this.setState({
            sliders,
            ggbApi,
            selectedSliders: new Set(sliders.map(s => s.name))
        });
    }

    /**
     * Update delta values for sliders.
     *
     * @param {Object} deltas - Object mapping slider names to delta values
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
     * Update slider values (for snapshot restoration).
     * Updates both GeoGebra and internal state, then re-renders.
     *
     * @param {Object} values - Object mapping slider names to new values
     * @example
     * panel.updateSliderValues({ AB: 5.234, BC: 3.456 });
     */
    updateSliderValues(values) {
        const { ggbApi, sliders } = this.state;

        if (!ggbApi) {
            console.warn('Cannot update slider values: GeoGebra API not available');
            return;
        }

        // Update GeoGebra and internal state
        Object.entries(values).forEach(([name, value]) => {
            // Update GeoGebra
            ggbApi.setValue(name, value);

            // Update internal slider state
            const slider = sliders.find(s => s.name === name);
            if (slider) {
                slider.value = value;
            }
        });

        // Re-render to show updated values
        this.render();
    }

    /**
     * Update slider values and deltas during optimization.
     * More efficient than full re-render - updates DOM directly.
     *
     * @param {Object} sliderValues - Object mapping slider names to current values
     * @param {Object} deltas - Object mapping slider names to delta values
     * @example
     * panel.updateSliderValuesAndDeltas(
     *   { AB: 5.234, BC: 3.456 },
     *   { AB: 0.234, BC: -0.544 }
     * );
     */
    updateSliderValuesAndDeltas(sliderValues, deltas) {
        if (!sliderValues || !deltas) {
            return;
        }

        const { sliders } = this.state;

        // Update internal state
        Object.entries(sliderValues).forEach(([name, value]) => {
            const slider = sliders.find(s => s.name === name);
            if (slider) {
                slider.value = value;
            }
        });

        // Update deltas in state
        this.state.deltas = deltas;

        // Update DOM directly (more efficient than full re-render)
        Object.entries(sliderValues).forEach(([name, value]) => {
            const row = this.querySelector(`tr[data-slider="${name}"]`);
            if (row) {
                // Update value input
                const valueInput = row.querySelector('.slider-panel__value-input');
                if (valueInput) {
                    valueInput.value = value.toFixed(3);
                }

                // Update delta display
                const deltaCell = row.querySelector('.slider-panel__delta');
                const delta = deltas[name];
                if (deltaCell && delta !== undefined) {
                    deltaCell.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(3);
                    deltaCell.classList.add('slider-panel__delta--visible');
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
     * class CustomSliderRow extends SliderRow {
     *     static renderValue(slider, t) {
     *         return `<td style="color: red">${slider.value}</td>`;
     *     }
     * }
     * panel.setRowRenderer(CustomSliderRow);
     */
    setRowRenderer(RendererClass) {
        this.rowRenderer = RendererClass;
        this.render(); // Re-render with new renderer
    }

    /**
     * Get selected slider names, bounds, and weights.
     *
     * @returns {{sliders: string[], bounds: {min: number[], max: number[]}, weights: number[]}}
     * @example
     * const { sliders, bounds, weights } = panel.getSelectedSliders();
     * console.log(sliders); // ['AB', 'BC']
     * console.log(bounds);  // { min: [0, 0], max: [10, 10] }
     * console.log(weights); // [1, 2]
     */
    getSelectedSliders() {
        const selectedNames = Array.from(this.state.selectedSliders);
        const bounds = { min: [], max: [] };
        const weights = [];

        selectedNames.forEach(name => {
            const slider = this.state.sliders.find(s => s.name === name);
            if (slider) {
                bounds.min.push(slider.min);
                bounds.max.push(slider.max);
                weights.push(slider.weight !== undefined ? slider.weight : 1);
            }
        });

        return { sliders: selectedNames, bounds, weights };
    }

    /**
     * Renders the slider panel.
     */
    render() {
        const t = this.t.bind(this);
        const { sliders, selectedSliders, deltas, isOptimizing } = this.state;

        // Filter out hidden sliders for display (but keep them in selectedSliders for optimization)
        const visibleSliders = sliders.filter(slider => !slider.hidden);

        this.innerHTML = `
            <div class="slider-panel">
                <div class="slider-panel__header">
                    <h2 class="slider-panel__title">${t('sliderPanel.title')}</h2>
                    <div class="slider-panel__actions">
                        <button class="slider-panel__select-all">${t('sliderPanel.selectAll')}</button>
                        <button class="slider-panel__deselect-all">${t('sliderPanel.deselectAll')}</button>
                    </div>
                </div>
                <div class="slider-panel__content">
                    ${visibleSliders.length === 0 ? `
                        <div class="slider-panel__empty">${t('sliderPanel.noSliders')}</div>
                    ` : `
                        <table class="slider-panel__table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>${t('sliderPanel.name')}</th>
                                    <th>${t('sliderPanel.value')}</th>
                                    <th>${t('sliderPanel.weight')}</th>
                                    <th>${t('sliderPanel.delta')}</th>
                                    <th>${t('sliderPanel.bounds')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${visibleSliders.map(slider =>
                                    this.rowRenderer.render(
                                        slider,
                                        selectedSliders.has(slider.name),
                                        deltas[slider.name],
                                        t,
                                        isOptimizing,
                                        this.sliderValueStep
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
        this.$$('.slider-panel__checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const name = e.target.dataset.name;
                if (e.target.checked) {
                    this.state.selectedSliders.add(name);
                } else {
                    this.state.selectedSliders.delete(name);
                }
                this.emit('selection-changed', {
                    selectedSliders: Array.from(this.state.selectedSliders)
                });
            });
        });

        // Value input change
        this.$$('.slider-panel__value-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sliderName = e.target.dataset.sliderName;
                const newValue = parseFloat(e.target.value);

                if (!isNaN(newValue) && this.state.ggbApi) {
                    // Update GeoGebra
                    this.state.ggbApi.setValue(sliderName, newValue);

                    // Update internal slider state
                    const slider = this.state.sliders.find(s => s.name === sliderName);
                    if (slider) {
                        slider.value = newValue;
                    }
                }
            });
        });

        // Weight input change
        this.$$('.slider-panel__weight-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sliderName = e.target.dataset.sliderName;
                const newWeight = parseFloat(e.target.value);

                if (!isNaN(newWeight) && newWeight >= 0) {
                    // Update internal slider state
                    const slider = this.state.sliders.find(s => s.name === sliderName);
                    if (slider) {
                        slider.weight = newWeight;
                    }
                }
            });
        });

        // Select all (only visible sliders)
        const selectAll = this.$('.slider-panel__select-all');
        if (selectAll) {
            selectAll.addEventListener('click', () => {
                const visibleSliders = this.state.sliders.filter(s => !s.hidden);
                this.state.selectedSliders = new Set(visibleSliders.map(s => s.name));
                this.render();
                this.emit('selection-changed', {
                    selectedSliders: Array.from(this.state.selectedSliders)
                });
            });
        }

        // Deselect all (only visible sliders, hidden sliders remain selected)
        const deselectAll = this.$('.slider-panel__deselect-all');
        if (deselectAll) {
            deselectAll.addEventListener('click', () => {
                // Remove only visible sliders from selection, keep hidden sliders selected
                const hiddenSliders = this.state.sliders.filter(s => s.hidden);
                this.state.selectedSliders = new Set(hiddenSliders.map(s => s.name));
                this.render();
                this.emit('selection-changed', {
                    selectedSliders: Array.from(this.state.selectedSliders)
                });
            });
        }
    }
}

// Register custom element
customElements.define('slider-panel', SliderPanel);
