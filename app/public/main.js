// Import packages via import maps (defined in index.html)
import { GeoGebraOptimizer } from 'geogebra-optimizer';
import { GeoGebraOptimizerUI } from 'geogebra-optimizer-ui';

/**
 * Shell application for GeoGebra Optimizer
 * Uses packages as real NPM dependencies
 */
class App {
    constructor() {
        this.optimizer = new GeoGebraOptimizer();
        this.ui = null;
    }

    async init() {
        try {
            // Load the GeoGebra XML file
            const xmlContent = await fetch('/examples/geogebra.xml').then(r => r.text());

            // Create the user interface
            this.ui = new GeoGebraOptimizerUI({
                container: document.getElementById('app'),
                optimizer: this.optimizer,
                locale: 'fr' // or 'en'
            });

            // Initialize
            await this.ui.init({
                geogebraXML: xmlContent
            });

            console.log('✅ Application initialized successfully!');
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            // Display error on the page
            document.getElementById('app').innerHTML = `
                <div style="padding: 20px; color: red;">
                    <h2>Loading Error</h2>
                    <pre>${error.message}\n${error.stack}</pre>
                </div>
            `;
        }
    }
}

// Start the application when the page loads
window.addEventListener('load', async () => {
    const app = new App();
    await app.init();
});
