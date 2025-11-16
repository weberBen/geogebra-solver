import { EventBus } from './EventBus.js';

/**
 * PyodideManager - Gère le chargement et l'utilisation de PyOdide
 * Émet des événements pour le suivi du chargement
 */
export class PyodideManager extends EventBus {
    constructor(options = {}) {
        super();
        this.pyodide = null;
        this.options = {
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
            packages: ['micropip', 'numpy'],
            ...options
        };
    }

    /**
     * Initialise PyOdide
     */
    async init() {
        this.emit('pyodide:loading', {});

        try {
            // Charger PyOdide
            this.pyodide = await window.loadPyodide({
                indexURL: this.options.indexURL
            });

            // Charger les packages de base
            await this.pyodide.loadPackage(this.options.packages);

            // Installer CMA-ES
            const micropip = this.pyodide.pyimport('micropip');
            await micropip.install('cma');

            this.emit('pyodide:ready', {});
            return this.pyodide;
        } catch (error) {
            this.emit('error', {
                error,
                context: 'PyodideManager.init'
            });
            throw error;
        }
    }

    /**
     * Charge les modules Python depuis du code source
     * @param {Object} pythonFiles - { optimizer: code, fitness: code }
     */
    async loadPythonModules(pythonFiles) {
        try {
            // Charger optimizer.py
            if (pythonFiles.optimizer) {
                await this.pyodide.runPythonAsync(pythonFiles.optimizer);
            }

            // Charger fitness.py
            if (pythonFiles.fitness) {
                await this.pyodide.runPythonAsync(pythonFiles.fitness);
            }

            this.emit('log', {
                message: 'Modules Python chargés avec succès',
                level: 'info',
                timestamp: new Date()
            });
        } catch (error) {
            this.emit('error', {
                error,
                context: 'PyodideManager.loadPythonModules'
            });
            throw error;
        }
    }

    /**
     * Exécute du code Python
     * @param {string} code - Code Python à exécuter
     * @returns {Promise<*>} Résultat de l'exécution
     */
    async runPython(code) {
        if (!this.pyodide) {
            throw new Error('PyOdide not initialized');
        }

        try {
            return await this.pyodide.runPythonAsync(code);
        } catch (error) {
            this.emit('error', {
                error,
                context: 'PyodideManager.runPython',
                code
            });
            throw error;
        }
    }

    /**
     * Retourne l'API PyOdide
     */
    getAPI() {
        return this.pyodide;
    }

    /**
     * Vérifie si PyOdide est prêt
     */
    isReady() {
        return this.pyodide !== null;
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        this.pyodide = null;
        this.removeAllListeners();
    }
}
