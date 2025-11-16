// Import des packages via import maps (défini dans index.html)
import { GeoGebraOptimizer } from 'geogebra-optimizer';
import { GeoGebraOptimizerUI } from 'geogebra-optimizer-ui';

/**
 * Application coquille pour GeoGebra Optimizer
 * Utilise les packages comme de vraies dépendances NPM
 */
class App {
    constructor() {
        this.optimizer = new GeoGebraOptimizer();
        this.ui = null;
    }

    async init() {
        try {
            // Charger le fichier GeoGebra XML
            const xmlContent = await fetch('/examples/geogebra.xml').then(r => r.text());

            // Créer l'interface utilisateur
            this.ui = new GeoGebraOptimizerUI({
                container: document.getElementById('app'),
                optimizer: this.optimizer,
                locale: 'fr' // ou 'en'
            });

            // Initialiser
            await this.ui.init({
                geogebraXML: xmlContent
            });

            console.log('✅ Application initialisée avec succès !');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            // Afficher l'erreur dans la page
            document.getElementById('app').innerHTML = `
                <div style="padding: 20px; color: red;">
                    <h2>Erreur de chargement</h2>
                    <pre>${error.message}\n${error.stack}</pre>
                </div>
            `;
        }
    }
}

// Démarrer l'application au chargement de la page
window.addEventListener('load', async () => {
    const app = new App();
    await app.init();
});
