import { BaseModule } from '../BaseModule.js';

/**
 * GeoGebra viewer component.
 * Displays the GeoGebra applet container.
 *
 * @class
 * @extends BaseModule
 *
 * @property {string} containerId - ID for the GeoGebra container element
 *
 * @example
 * // HTML usage
 * <ggb-frame></ggb-frame>
 *
 * @example
 * // JavaScript usage with localization
 * const frame = document.createElement('ggb-frame');
 * frame.initProps({
 *   localize: (key) => translations[key],
 *   row: 1,
 *   col: 1,
 *   rowSpan: 3
 * });
 * document.body.appendChild(frame);
 */
export class GeoGebraFrame extends BaseModule {
    constructor() {
        super();

        this.state = {
            containerId: 'ggbApplet',
            loading: true
        };
        this._initialized = false;
    }

    /**
     * Renders the GeoGebra container.
     * Creates a div that will host the GeoGebra applet.
     */
    render() {
        const t = this.t.bind(this);

        // Only render once on initial load
        if (!this._initialized) {
            this.innerHTML = `
                <div class="ggb-frame">
                    <div class="ggb-frame__header">
                        <h2 class="ggb-frame__title">${t('geogebraFrame.title')}</h2>
                    </div>
                    <div class="ggb-frame__container">
                        <div id="${this.state.containerId}"></div>
                        <div class="ggb-frame__loading" style="display: block;">
                            ${t('geogebraFrame.loading')}
                        </div>
                    </div>
                </div>
            `;
            this._initialized = true;
        }

        // Always update loading visibility without destroying the container
        const loader = this.$('.ggb-frame__loading');
        if (loader) {
            loader.style.display = this.state.loading ? 'block' : 'none';
        }
    }

    /**
     * Get the GeoGebra container element.
     *
     * @returns {HTMLElement|null} Container element
     * @example
     * const container = frame.getContainer();
     * optimizer.init({ container, ... });
     */
    getContainer() {
        return this.$(`#${this.state.containerId}`);
    }

    /**
     * Set loading state.
     *
     * @param {boolean} loading - Loading state
     * @example
     * frame.setLoading(false);
     */
    setLoading(loading) {
        this.setState({ loading });
    }
}

// Register custom element
customElements.define('ggb-frame', GeoGebraFrame);
