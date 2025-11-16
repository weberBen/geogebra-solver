import { EventBus } from './EventBus.js';

/**
 * GeoGebraManager - Gère GeoGebra et les contraintes (sliders)
 * Émet des événements pour le suivi de l'état
 */
export class GeoGebraManager extends EventBus {
    constructor(options = {}) {
        super();
        this.ggbApp = null;
        this.sliders = [];
        this.options = {
            appName: 'geometry',
            showToolBar: true,
            showAlgebraInput: false,
            showMenuBar: false,
            enableRightClick: true,
            enableShiftDragZoom: true,
            showResetIcon: true,
            language: 'fr',
            enableLabelDrags: false,
            allowStyleBar: false,
            showZoomButtons: true,
            showFullscreenButton: true,
            ...options
        };
    }

    /**
     * Initialise GeoGebra avec un fichier XML
     * @param {HTMLElement} container - Conteneur DOM pour GeoGebra
     * @param {string} xmlContent - Contenu XML GeoGebra
     */
    async init(container, xmlContent) {
        this.emit('geogebra:loading', {});
        this.container = container; // Store container reference

        return new Promise((resolve, reject) => {
            const params = {
                ...this.options,
                scaleContainerClass: "ggb-frame__container",
                disableAutoScale: false,
                width: "100%",
                height: "100%",
                appletOnLoad: async (api) => {
                    try {
                        this.ggbApp = api;
                        console.log('GeoGebra applet chargée');

                        // Charger le XML
                        api.setXML(xmlContent);

                        // Configuration
                        setTimeout(async () => {
                            api.setRounding('6');
                            api.setPerspective('G');
                            api.setAxesVisible(false, false);
                            api.setMode(40);

                            // Extraire les sliders
                            await this.extractSliders(xmlContent);

                            // Setup resize observer for responsive sizing
                            this.setupResizeObserver();

                            this.emit('geogebra:ready', { api });
                            resolve(api);
                        }, 1000);
                    } catch (error) {
                        this.emit('error', {
                            error,
                            context: 'GeoGebraManager.init'
                        });
                        reject(error);
                    }
                }
            };

            const applet = new GGBApplet(params, true);
            applet.inject(container);
        });
    }

    /**
     * Extrait les sliders depuis le XML et l'API GeoGebra
     * @param {string} xmlContent - Contenu XML
     */
    async extractSliders(xmlContent) {
        // Récupérer tous les objets numériques (sliders)
        const numericObjects = this.ggbApp.getAllObjectNames('numeric');

        // Parser le XML pour obtenir les bornes
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        this.sliders = [];

        for (const sliderName of numericObjects) {
            const elements = xmlDoc.querySelectorAll(`element[label="${sliderName}"]`);

            for (const element of elements) {
                if (element.getAttribute('type') === 'numeric') {
                    const sliderElement = element.querySelector('slider');

                    if (sliderElement) {
                        const min = parseFloat(sliderElement.getAttribute('min'));
                        const max = parseFloat(sliderElement.getAttribute('max'));
                        const currentValue = this.ggbApp.getValue(sliderName);
                        const step = sliderName.startsWith('ag') ? 1 : 0.1;

                        // Detect if slider was hidden in GeoGebra (before we hide all sliders)
                        const wasVisible = this.ggbApp.getVisible(sliderName);

                        this.sliders.push({
                            name: sliderName,
                            label: sliderName,
                            min,
                            max,
                            value: currentValue,
                            default: currentValue,
                            step,
                            hidden: !wasVisible  // true if slider was hidden in GeoGebra
                        });
                    }
                    break;
                }
            }
        }

        // Cacher les sliders dans GeoGebra
        this.sliders.forEach(slider => {
            this.ggbApp.setVisible(slider.name, false);
        });

        this.emit('constraints:loaded', { sliders: this.sliders });
    }

    /**
     * Retourne tous les sliders
     */
    getSliders() {
        return this.sliders;
    }

    /**
     * Retourne un slider spécifique
     * @param {string} name - Nom du slider
     */
    getSlider(name) {
        return this.sliders.find(s => s.name === name);
    }

    /**
     * Retourne les valeurs actuelles de tous les sliders
     */
    getSliderValues() {
        const values = {};
        this.sliders.forEach(slider => {
            values[slider.name] = this.ggbApp.getValue(slider.name);
        });
        return values;
    }

    /**
     * Définit la valeur d'un slider
     * @param {string} name - Nom du slider
     * @param {number} value - Nouvelle valeur
     */
    setSliderValue(name, value) {
        const slider = this.getSlider(name);
        if (!slider) {
            throw new Error(`Slider "${name}" not found`);
        }

        const oldValue = this.ggbApp.getValue(name);
        this.ggbApp.setValue(name, value);

        // Mettre à jour dans notre cache
        slider.value = value;

        this.emit('slider:changed', {
            name,
            value,
            oldValue,
            allValues: this.getSliderValues()
        });
    }

    /**
     * Définit les valeurs de plusieurs sliders
     * @param {Object} values - { sliderName: value, ... }
     */
    setSliderValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            const slider = this.getSlider(name);
            if (slider) {
                this.ggbApp.setValue(name, value);
                slider.value = value;
            }
        });

        this.emit('sliders:updated', { values });
    }

    /**
     * Rafraîchit les sliders (utile si changement dans GeoGebra)
     */
    async refreshSliders(xmlContent) {
        await this.extractSliders(xmlContent);
    }

    /**
     * Enregistre un listener pour les mises à jour GeoGebra
     */
    registerUpdateListener(callback) {
        if (this.ggbApp) {
            this.ggbApp.registerUpdateListener(callback);
        }
    }

    /**
     * Calcule la distance entre deux points
     * @param {string} point1 - Nom du premier point
     * @param {string} point2 - Nom du second point
     */
    calculateDistance(point1 = 'A', point2 = "A'") {
        try {
            const x1 = this.ggbApp.getXcoord(point1);
            const y1 = this.ggbApp.getYcoord(point1);
            const x2 = this.ggbApp.getXcoord(point2);
            const y2 = this.ggbApp.getYcoord(point2);

            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        } catch (e) {
            console.error("Erreur calcul distance:", e);
            return NaN;
        }
    }

    /**
     * Cache les éléments décoratifs (pour export propre)
     * @returns {Object} État original de visibilité { objName: boolean }
     */
    hideDecorativeElements() {
        if (!this.ggbApp) {
            console.warn('GeoGebra API not ready');
            return {};
        }

        const decorativeTypes = [
            'text',       // Textes
            'numeric',    // Sliders + mesures (distance, area, slope)
            'angle',      // Angles et mesures d'angles
            'boolean',    // Checkboxes
            'button',     // Boutons
            'textfield',  // Input boxes
            'image',      // Images
            'point'       // Tous les points
        ];

        const originalVisibility = {};

        decorativeTypes.forEach(type => {
            try {
                const objects = this.ggbApp.getAllObjectNames(type);
                objects.forEach(objName => {
                    // Stocker l'état original
                    originalVisibility[objName] = this.ggbApp.getVisible(objName);

                    // Cacher l'objet
                    this.ggbApp.setVisible(objName, false);
                });
            } catch (e) {
                console.warn(`Could not hide objects of type "${type}":`, e);
            }
        });

        return originalVisibility;
    }

    /**
     * Restaure la visibilité des éléments
     * @param {Object} originalVisibility - État de visibilité { objName: boolean }
     */
    restoreVisibility(originalVisibility) {
        if (!this.ggbApp || !originalVisibility) {
            return;
        }

        Object.entries(originalVisibility).forEach(([objName, wasVisible]) => {
            try {
                this.ggbApp.setVisible(objName, wasVisible);
            } catch (e) {
                console.warn(`Could not restore visibility for "${objName}":`, e);
            }
        });
    }

    /**
     * Retourne l'API GeoGebra
     */
    getAPI() {
        return this.ggbApp;
    }

    /**
     * Vérifie si GeoGebra est prêt
     */
    isReady() {
        return this.ggbApp !== null;
    }

    /**
     * Met à jour la taille de GeoGebra basée sur le conteneur
     */
    updateSize() {
        if (this.ggbApp && this.container) {
            const width = this.container.offsetWidth;
            const height = this.container.offsetHeight;
            if (width && height) {
                this.ggbApp.setSize(width, height);
            }
        }
    }

    /**
     * Configure un observer pour détecter les changements de taille du conteneur
     */
    setupResizeObserver() {
        if (!this.container) return;

        // Disconnect previous observer if exists
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(() => {
            this.updateSize();
        });

        this.resizeObserver.observe(this.container);
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.ggbApp = null;
        this.container = null;
        this.sliders = [];
        this.removeAllListeners();
    }
}
