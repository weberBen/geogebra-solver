import { EventBus } from './EventBus.js';

/**
 * PyodideManager - Manages PyOdide loading and usage
 * Emits events for load tracking
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
     * Initialize PyOdide
     */
    async init() {
        this.emit('pyodide:loading', {});

        try {
            // Load PyOdide
            this.pyodide = await window.loadPyodide({
                indexURL: this.options.indexURL
            });

            // Load basic packages
            await this.pyodide.loadPackage(this.options.packages);

            // Install CMA-ES
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
     * Load Python modules from source code
     * @param {Object} pythonFiles - { optimizer: code, fitness: code }
     */
    async loadPythonModules(pythonFiles) {
        try {
            // Load optimizer.py
            if (pythonFiles.optimizer) {
                await this.pyodide.runPythonAsync(pythonFiles.optimizer);
            }

            // Load fitness.py
            if (pythonFiles.fitness) {
                await this.pyodide.runPythonAsync(pythonFiles.fitness);
            }

            this.emit('log', {
                message: 'Python modules loaded successfully',
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
     * Execute Python code
     * @param {string} code - Python code to execute
     * @returns {Promise<*>} Execution result
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
     * Return the PyOdide API
     */
    getAPI() {
        return this.pyodide;
    }

    /**
     * Check if PyOdide is ready
     */
    isReady() {
        return this.pyodide !== null;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.pyodide = null;
        this.removeAllListeners();
    }
}
