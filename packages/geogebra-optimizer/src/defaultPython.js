/**
 * Default Python module loader.
 * Loads Python files bundled with the package.
 *
 * @module defaultPython
 */

/**
 * Load default Python files from the package.
 *
 * @async
 * @returns {Promise<{optimizer: string, fitness: string}>} Python file contents
 * @example
 * import { loadDefaultPython } from 'geogebra-optimizer';
 * const pythonFiles = await loadDefaultPython();
 */
export async function loadDefaultPython() {
    // Load from HTTP paths (works in browser)
    const [optimizerCode, fitnessCode] = await Promise.all([
        fetch('/packages/geogebra-optimizer/python/optimizer.py').then(r => r.text()),
        fetch('/packages/geogebra-optimizer/python/fitness.py').then(r => r.text())
    ]);

    return {
        optimizer: optimizerCode,
        fitness: fitnessCode
    };
}

/**
 * Get path to default Python files.
 * Useful if you want to load them yourself.
 *
 * @returns {{optimizer: string, fitness: string}} Paths to Python files
 * @example
 * import { getDefaultPythonPaths } from 'geogebra-optimizer';
 * const paths = getDefaultPythonPaths();
 * const code = await fetch(paths.optimizer).then(r => r.text());
 */
export function getDefaultPythonPaths() {
    return {
        optimizer: '/packages/geogebra-optimizer/python/optimizer.py',
        fitness: '/packages/geogebra-optimizer/python/fitness.py'
    };
}
