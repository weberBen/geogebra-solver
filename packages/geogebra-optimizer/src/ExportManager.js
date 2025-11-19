import { EventBus } from './EventBus.js';

/**
 * Export manager for GeoGebra constructions.
 * Provides direct exports (SVG, PNG, PDF, JSON) and webhook-based server-side processing.
 *
 * @class
 * @extends EventBus
 *
 * @fires ExportManager#export:start - When export begins
 * @fires ExportManager#export:progress - During export progress
 * @fires ExportManager#export:complete - When export completes
 * @fires ExportManager#error - When export fails
 *
 * @example
 * const exportManager = new ExportManager({
 *   geogebraManager,
 *   webhookUrl: 'http://localhost:8000/api/process' // Optional
 * });
 *
 * // Direct export
 * await exportManager.exportPNG({ dpi: 300, transparent: false });
 *
 * // Webhook export
 * await exportManager.exportViaWebhook('svg', 'http://localhost:8000/api/process', {
 *   outputFormat: 'dxf',
 *   tolerance: '0.01mm'
 * });
 */
export class ExportManager extends EventBus {
    /**
     * Create a new ExportManager instance.
     *
     * @param {Object} options - Configuration options
     * @param {Object} options.geogebraManager - GeoGebraManager instance
     * @param {string} [options.webhookUrl] - Default webhook URL for server-side processing
     */
    constructor(options = {}) {
        super();

        const { geogebraManager, webhookUrl = null } = options;

        if (!geogebraManager) {
            throw new Error('ExportManager requires a geogebraManager instance');
        }

        this.geogebraManager = geogebraManager;
        this.webhookUrl = webhookUrl;
    }

    /**
     * Get the GeoGebra API instance.
     *
     * @private
     * @returns {Object} GeoGebra API
     * @throws {Error} If GeoGebra API is not available
     */
    getGeoGebraAPI() {
        const api = this.geogebraManager.getAPI();
        if (!api) {
            throw new Error('GeoGebra API not available. Ensure GeoGebra is loaded.');
        }
        return api;
    }

    /**
     * Adjust viewport to fit all objects before export.
     * This ensures the entire construction is visible in exports.
     *
     * @private
     * @returns {Object|null} Previous coordinate system (for restoration), or null if adjustment failed
     */
    adjustViewportForExport() {
        try {
            const api = this.getGeoGebraAPI();

            // Save current coordinate system
            const prevXmin = api.getXmin();
            const prevXmax = api.getXmax();
            const prevYmin = api.getYmin();
            const prevYmax = api.getYmax();

            // Get all object names
            const allObjects = api.getAllObjectNames();

            if (!allObjects || allObjects.length === 0) {
                return null;
            }

            // Calculate bounding box of all visible objects
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let foundObjects = false;

            for (const objName of allObjects) {
                // Skip if object is not visible
                if (!api.getVisible(objName)) continue;

                const objType = api.getObjectType(objName);

                // Get coordinates based on object type
                if (objType === 'point') {
                    const x = api.getXcoord(objName);
                    const y = api.getYcoord(objName);
                    if (isFinite(x) && isFinite(y)) {
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                        foundObjects = true;
                    }
                } else {
                    // For other objects, try to get their bounding coordinates
                    try {
                        const x = api.getXcoord(objName);
                        const y = api.getYcoord(objName);
                        if (isFinite(x) && isFinite(y)) {
                            minX = Math.min(minX, x);
                            maxX = Math.max(maxX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                            foundObjects = true;
                        }
                    } catch (e) {
                        // Object doesn't have simple coordinates, skip
                    }
                }
            }

            if (!foundObjects || !isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
                return null;
            }

            // Add 10% padding around the bounding box
            const xPadding = (maxX - minX) * 0.1;
            const yPadding = (maxY - minY) * 0.1;

            minX -= xPadding;
            maxX += xPadding;
            minY -= yPadding;
            maxY += yPadding;

            // Ensure minimum viewport size
            const minSize = 1;
            if (maxX - minX < minSize) {
                const center = (minX + maxX) / 2;
                minX = center - minSize / 2;
                maxX = center + minSize / 2;
            }
            if (maxY - minY < minSize) {
                const center = (minY + maxY) / 2;
                minY = center - minSize / 2;
                maxY = center + minSize / 2;
            }

            // Set new coordinate system to fit all objects
            api.setCoordSystem(minX, maxX, minY, maxY);

            // Return previous settings for restoration
            return {
                xmin: prevXmin,
                xmax: prevXmax,
                ymin: prevYmin,
                ymax: prevYmax
            };
        } catch (error) {
            this.emit('log', {
                message: `Could not adjust viewport for export: ${error.message}`,
                level: 'warn'
            });
            return null;
        }
    }

    /**
     * Restore previous viewport settings.
     *
     * @private
     * @param {Object|null} prevCoordSystem - Previous coordinate system from adjustViewportForExport()
     */
    restoreViewport(prevCoordSystem) {
        if (!prevCoordSystem) return;

        try {
            const api = this.getGeoGebraAPI();
            api.setCoordSystem(
                prevCoordSystem.xmin,
                prevCoordSystem.xmax,
                prevCoordSystem.ymin,
                prevCoordSystem.ymax
            );
        } catch (error) {
            this.emit('log', {
                message: `Could not restore viewport: ${error.message}`,
                level: 'warn'
            });
        }
    }

    /**
     * Export construction as SVG.
     *
     * @async
     * @param {Object} [options={}] - Export options
     * @param {string} [options.filename='geogebra-export.svg'] - Output filename
     * @param {boolean} [options.download=true] - Auto-download the file
     * @param {boolean} [options.hideDecorative=false] - Hide decorative elements (text, variables, points, etc.)
     * @returns {Promise<string>} SVG content
     *
     * @example
     * const svg = await exportManager.exportSVG({ filename: 'my-figure.svg', hideDecorative: true });
     */
    async exportSVG(options = {}) {
        const {
            filename = 'geogebra-export.svg',
            download = true,
            silent = false,
            hideDecorative = false
        } = options;

        if (!silent) {
            this.emit('export:start', { format: 'svg', method: 'direct' });
        }

        let prevViewport = null;
        let originalVisibility = null;
        let decorationValue = null;
        try {
            const api = this.getGeoGebraAPI();

            // Save and disable decoration checkbox
            if (api.exists('decoration')) {
                decorationValue = api.getValue('decoration');
                api.setValue('decoration', false);
            }

            // Hide decorative elements if requested
            if (hideDecorative) {
                originalVisibility = this.geogebraManager.hideDecorativeElements();
            }

            // Adjust viewport to fit all objects
            prevViewport = this.adjustViewportForExport();

            // Wait a brief moment for GeoGebra to redraw
            await new Promise(resolve => setTimeout(resolve, 100));

            // GeoGebra's exportSVG is callback-based, wrap in Promise
            const svg = await new Promise((resolve, reject) => {
                try {
                    api.exportSVG((svgContent) => {
                        if (svgContent) {
                            resolve(svgContent);
                        } else {
                            reject(new Error('SVG export returned empty content'));
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });

            if (download) {
                this.downloadFile(svg, filename, 'image/svg+xml');
            }

            if (!silent) {
                this.emit('export:complete', { format: 'svg', data: svg, filename });
                this.emit('log', { message: `SVG exported: ${filename}`, level: 'info' });
            }

            return svg;
        } catch (error) {
            this.emit('error', { error, context: 'ExportManager.exportSVG' });
            throw error;
        } finally {
            // Restore original viewport
            this.restoreViewport(prevViewport);

            // Restore visibility of decorative elements
            if (originalVisibility) {
                this.geogebraManager.restoreVisibility(originalVisibility);
            }

            // Restore decoration checkbox
            if (decorationValue !== null) {
                const api = this.getGeoGebraAPI();
                api.setValue('decoration', decorationValue);
            }
        }
    }

    /**
     * Export construction as PNG image.
     *
     * @async
     * @param {Object} [options={}] - Export options
     * @param {number} [options.scale=1] - Scale factor (1-10)
     * @param {boolean} [options.transparent=false] - Transparent background
     * @param {string} [options.filename='geogebra-export.png'] - Output filename
     * @param {boolean} [options.download=true] - Auto-download the file
     * @param {boolean} [options.hideDecorative=false] - Hide decorative elements (text, variables, points, etc.)
     * @returns {Promise<string>} PNG as base64 string
     *
     * @example
     * const png = await exportManager.exportPNG({ scale: 2, transparent: true, hideDecorative: true });
     */
    async exportPNG(options = {}) {
        const {
            scale = 1,
            transparent = false,
            filename = 'geogebra-export.png',
            download = true,
            silent = false,
            hideDecorative = false
        } = options;

        if (!silent) {
            this.emit('export:start', { format: 'png', method: 'direct' });
        }

        let prevViewport = null;
        let originalVisibility = null;
        let decorationValue = null;
        try {
            const api = this.getGeoGebraAPI();

            // Save and disable decoration checkbox
            if (api.exists('decoration')) {
                decorationValue = api.getValue('decoration');
                api.setValue('decoration', false);
            }

            // Hide decorative elements if requested
            if (hideDecorative) {
                originalVisibility = this.geogebraManager.hideDecorativeElements();
            }

            // Validate scale parameter
            const validScale = Math.max(1, Math.min(10, scale));

            // GeoGebra's getPNGBase64 returns the base64 directly (no callback in this version)
            // DPI parameter is not supported, using default value
            const base64 = api.getPNGBase64(validScale, transparent, 72, false);

            if (!base64) {
                throw new Error('PNG export returned empty content');
            }

            if (download) {
                // Download using data URL
                const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;

                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    document.body.removeChild(link);
                }, 100);
            }

            if (!silent) {
                this.emit('export:complete', { format: 'png', data: base64, filename });
                this.emit('log', {
                    message: `PNG exported: ${filename} (scale: ${validScale})`,
                    level: 'info'
                });
            }

            return base64;
        } catch (error) {
            this.emit('error', { error, context: 'ExportManager.exportPNG' });
            throw error;
        } finally {
            // Restore original viewport
            this.restoreViewport(prevViewport);

            // Restore visibility of decorative elements
            if (originalVisibility) {
                this.geogebraManager.restoreVisibility(originalVisibility);
            }

            // Restore decoration checkbox
            if (decorationValue !== null) {
                const api = this.getGeoGebraAPI();
                api.setValue('decoration', decorationValue);
            }
        }
    }

    /**
     * Export construction as PDF document.
     *
     * @async
     * @param {Object} [options={}] - Export options
     * @param {number} [options.scale=1] - Scale factor
     * @param {string} [options.filename='geogebra-export.pdf'] - Output filename
     * @param {boolean} [options.download=true] - Auto-download the file
     * @param {boolean} [options.hideDecorative=false] - Hide decorative elements (text, variables, points, etc.)
     * @returns {Promise<void>}
     *
     * @example
     * await exportManager.exportPDF({ filename: 'my-figure.pdf', hideDecorative: true });
     */
    async exportPDF(options = {}) {
        const {
            scale = 1,
            filename = 'geogebra-export.pdf',
            download = true,
            silent = false,
            hideDecorative = false
        } = options;

        if (!silent) {
            this.emit('export:start', { format: 'pdf', method: 'direct' });
        }

        let prevViewport = null;
        let originalVisibility = null;
        let decorationValue = null;
        try {
            const api = this.getGeoGebraAPI();

            // Check if exportPDF is available
            if (typeof api.exportPDF !== 'function') {
                throw new Error('PDF export not available in this GeoGebra version');
            }

            // Save and disable decoration checkbox
            if (api.exists('decoration')) {
                decorationValue = api.getValue('decoration');
                api.setValue('decoration', false);
            }

            // Hide decorative elements if requested
            if (hideDecorative) {
                originalVisibility = this.geogebraManager.hideDecorativeElements();
            }

            // Adjust viewport to fit all objects
            prevViewport = this.adjustViewportForExport();

            // Wait a brief moment for GeoGebra to redraw
            await new Promise(resolve => setTimeout(resolve, 100));

            // exportPDF may trigger download directly or use callback
            if (download) {
                api.exportPDF(scale, filename);
            } else {
                // For non-download, we need callback version if available
                await new Promise((resolve, reject) => {
                    try {
                        api.exportPDF(scale, filename, () => resolve());
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            if (!silent) {
                this.emit('export:complete', { format: 'pdf', filename });
                this.emit('log', { message: `PDF exported: ${filename}`, level: 'info' });
            }
        } catch (error) {
            this.emit('error', { error, context: 'ExportManager.exportPDF' });
            throw error;
        } finally {
            // Restore original viewport
            this.restoreViewport(prevViewport);

            // Restore visibility of decorative elements
            if (originalVisibility) {
                this.geogebraManager.restoreVisibility(originalVisibility);
            }

            // Restore decoration checkbox
            if (decorationValue !== null) {
                const api = this.getGeoGebraAPI();
                api.setValue('decoration', decorationValue);
            }
        }
    }

    /**
     * Export construction state as XML.
     * Includes all objects, settings, and construction steps.
     *
     * @async
     * @param {Object} [options={}] - Export options
     * @param {string} [options.filename='geogebra-export.xml'] - Output filename
     * @param {boolean} [options.download=true] - Auto-download the file
     * @returns {Promise<string>} XML string
     *
     * @example
     * const xml = await exportManager.exportXML();
     */
    async exportXML(options = {}) {
        const {
            filename = 'geogebra-export.xml',
            download = true,
            silent = false
        } = options;

        if (!silent) {
            this.emit('export:start', { format: 'xml', method: 'direct' });
        }

        try {
            const api = this.getGeoGebraAPI();

            // GeoGebra uses getXML() for construction data
            const xml = api.getXML();

            if (!xml) {
                throw new Error('Failed to get GeoGebra construction XML');
            }

            if (download) {
                this.downloadFile(xml, filename, 'application/xml');
            }

            if (!silent) {
                this.emit('export:complete', { format: 'xml', data: xml, filename });
                this.emit('log', { message: `XML exported: ${filename}`, level: 'info' });
            }

            return xml;
        } catch (error) {
            this.emit('error', { error, context: 'ExportManager.exportXML' });
            throw error;
        }
    }

    /**
     * Download a text file.
     *
     * @private
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        this.downloadBlob(blob, filename);
    }

    /**
     * Download a blob.
     *
     * @private
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Clean up after a short delay to allow download to start
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Export via webhook for server-side processing.
     * Generic method that exports the construction in the specified format and sends it to a webhook URL.
     * All parameters are user-defined with no hardcoded defaults.
     *
     * @async
     * @param {string} url - Webhook URL
     * @param {string} dataType - Format to export: 'svg', 'png', 'pdf', 'xml'
     * @param {Object} [dataParams={}] - Format-specific export parameters (scale, transparent, etc.)
     * @param {Object} [params={}] - Custom server-side processing parameters
     * @returns {Promise<Blob>} Processed file as Blob
     *
     * @example
     * // SVG → DXF via vpype
     * await exportManager.exportWebhook(
     *   'http://localhost:8000/api/process',
     *   'svg',
     *   {},
     *   { outputFormat: 'dxf', tolerance: '0.01mm', optimize: true, units: 'mm' }
     * );
     *
     * @example
     * // PNG → Custom processing
     * await exportManager.exportWebhook(
     *   'http://localhost:8000/api/process',
     *   'png',
     *   { scale: 2, transparent: true },
     *   { outputFormat: 'processed-png', quality: 95 }
     * );
     */
    async exportWebhook(url, dataType, dataParams = {}, params = {}) {
        if (!url) {
            throw new Error('Webhook URL is required');
        }

        this.emit('export:start', { format: dataType, method: 'webhook' });

        try {
            // Step 1: Export from GeoGebra
            this.emit('export:progress', {
                format: dataType,
                step: 'exporting',
                progress: 0.25
            });

            let data;
            switch (dataType.toLowerCase()) {
                case 'svg':
                    data = await this.exportSVG({ ...dataParams, download: false, silent: true });
                    break;
                case 'png':
                    data = await this.exportPNG({ ...dataParams, download: false, silent: true });
                    break;
                case 'pdf':
                    data = await this.exportPDF({ ...dataParams, download: false, silent: true });
                    break;
                case 'xml':
                    data = await this.exportXML({ download: false, silent: true });
                    break;
                default:
                    throw new Error(`Unsupported data type: ${dataType}`);
            }

            // Step 2: Send to webhook
            this.emit('export:progress', {
                format: dataType,
                step: 'processing',
                progress: 0.5
            });

            // Extract outputFormat from params and restructure for server
            const { outputFormat, ...options } = params;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    format: dataType,
                    data,
                    outputFormat: outputFormat || 'dxf',
                    options
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Webhook failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            // Step 3: Download processed file
            this.emit('export:progress', {
                format: dataType,
                step: 'downloading',
                progress: 0.75
            });

            const blob = await response.blob();

            // Auto-download with filename from params or generate generic one
            const extension = outputFormat ? `.${outputFormat}` : '.bin';
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const filename = params.filename || `geogebra-export-${timestamp}${extension}`;
            this.downloadBlob(blob, filename);

            this.emit('export:complete', {
                format: dataType,
                filename,
                size: blob.size
            });

            this.emit('log', {
                message: `Webhook export complete: ${dataType} (${filename})`,
                level: 'info'
            });

            return blob;
        } catch (error) {
            this.emit('error', { error, context: 'ExportManager.exportWebhook' });
            throw error;
        }
    }

    /**
     * Set default webhook URL for server-side processing.
     *
     * @param {string} url - Webhook URL
     *
     * @example
     * exportManager.setWebhookUrl('http://localhost:8000/api/process');
     */
    setWebhookUrl(url) {
        this.webhookUrl = url;
        this.emit('log', { message: `Webhook URL set: ${url}`, level: 'info' });
    }

    /**
     * Get current webhook URL.
     *
     * @returns {string|null} Webhook URL
     */
    getWebhookUrl() {
        return this.webhookUrl;
    }
}
