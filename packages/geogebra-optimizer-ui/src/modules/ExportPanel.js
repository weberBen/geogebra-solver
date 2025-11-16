import { BaseModule } from '../BaseModule.js';

/**
 * Export panel component.
 * Provides buttons for direct exports (SVG, PNG, PDF) and webhook-based server processing.
 *
 * @class
 * @extends BaseModule
 *
 * @fires ExportPanel#export-svg - When SVG export is requested
 * @fires ExportPanel#export-png - When PNG export is requested
 * @fires ExportPanel#export-pdf - When PDF export is requested
 * @fires ExportPanel#export-json - When JSON export is requested
 * @fires ExportPanel#export-webhook - When webhook export is requested
 *
 * @example
 * const panel = document.createElement('export-panel');
 * panel.webhookConfig = {
 *   fields: [
 *     { name: 'outputFormat', type: 'select', label: 'Output Format',
 *       options: [{value: 'dxf', label: 'DXF'}], defaultValue: 'dxf' }
 *   ],
 *   messages: [
 *     { level: 'warning', text: 'Warning message here...' }
 *   ]
 * };
 */
export class ExportPanel extends BaseModule {
    constructor() {
        super();

        // Webhook configuration (can be set via props)
        this.webhookConfig = {
            allowedInputFormats: [],
            params: {},
            paramLabels: {},
            description: '',
            info: '',
            warning: ''
        };

        this.state = {
            webhookUrl: '',
            webhookConfigVisible: false,
            pngSettingsVisible: false,
            pngScale: 1,
            pngTransparent: false,
            hideDecorative: false,
            // Webhook-specific state
            selectedSourceFormat: 'svg',
            sourceFormatSettingsVisible: false,
            webhookParams: {},
            // Export status
            isExporting: false,
            exportError: null
        };

        // Step values for inputs (can be overridden via props)
        this.pngScaleStep = 0.5;
        this.webhookParamStep = 0.001;
    }

    /**
     * Initialize props and extract configurable values.
     * @override
     */
    initProps(props) {
        super.initProps(props);

        // Override webhook config if provided
        if (props.webhookConfig) {
            this.webhookConfig = props.webhookConfig;

            // Initialize state for webhook params (without triggering render)
            const webhookParams = { ...this.webhookConfig.params };
            const selectedSourceFormat = this.webhookConfig.allowedInputFormats[0] || 'svg';
            this.state = {
                ...this.state,
                webhookParams,
                selectedSourceFormat
            };
        }

        // Override step values if provided
        if (props.pngScaleStep !== undefined) {
            this.pngScaleStep = props.pngScaleStep;
        }
        if (props.webhookParamStep !== undefined) {
            this.webhookParamStep = props.webhookParamStep;
        }
    }

    /**
     * Set webhook configuration.
     *
     * @param {Object} config - Webhook configuration
     * @param {Array} config.allowedInputFormats - Allowed source formats (e.g., ['svg', 'png', 'xml'])
     * @param {Object} config.params - Server parameters with default values
     * @param {Object} config.paramLabels - Labels and descriptions for each param
     * @param {string} config.description - Webhook description
     * @param {string} config.info - Info message
     * @param {string} config.warning - Warning message
     */
    setWebhookConfig(config) {
        this.webhookConfig = config || {
            allowedInputFormats: [],
            params: {},
            paramLabels: {},
            description: '',
            info: '',
            warning: ''
        };

        // Initialize state for webhook params
        const webhookParams = { ...this.webhookConfig.params };
        const selectedSourceFormat = this.webhookConfig.allowedInputFormats[0] || 'svg';

        this.setState({ webhookParams, selectedSourceFormat });
    }

    /**
     * Set webhook URL.
     *
     * @param {string} url - Webhook URL
     */
    setWebhookUrl(url) {
        this.setState({ webhookUrl: url });
    }

    /**
     * Set export loading state.
     *
     * @param {boolean} isExporting - Whether export is in progress
     */
    setExporting(isExporting) {
        this.setState({ isExporting, exportError: isExporting ? null : this.state.exportError });
    }

    /**
     * Set export error.
     *
     * @param {string|null} error - Error message or null to clear
     */
    setExportError(error) {
        this.setState({ exportError: error, isExporting: false });
    }

    /**
     * Get current export settings.
     *
     * @returns {Object} Export settings
     */
    getSettings() {
        return {
            hideDecorative: this.state.hideDecorative,
            png: {
                scale: this.state.pngScale,
                transparent: this.state.pngTransparent
            },
            webhook: {
                url: this.state.webhookUrl,
                sourceFormat: this.state.selectedSourceFormat,
                ...this.state.webhookParams
            }
        };
    }

    /**
     * Render server parameter dynamically from paramLabels.
     *
     * @private
     * @param {string} paramName - Parameter name
     * @param {*} paramValue - Parameter value
     * @returns {string} HTML string
     */
    renderServerParam(paramName, paramValue) {
        const paramLabel = this.webhookConfig.paramLabels[paramName] || { label: paramName, description: '' };
        const value = this.state.webhookParams[paramName] !== undefined ? this.state.webhookParams[paramName] : paramValue;

        // Determine input type based on value type
        if (typeof value === 'boolean') {
            return `
                <label class="export-panel__checkbox-label">
                    <input type="checkbox" class="export-panel__checkbox" data-webhook-param="${paramName}"
                           ${value ? 'checked' : ''}>
                    ${paramLabel.label}
                    ${paramLabel.description ? `<span class="export-panel__param-description">${paramLabel.description}</span>` : ''}
                </label>
            `;
        } else if (typeof value === 'number') {
            return `
                <label class="export-panel__label">
                    ${paramLabel.label}:
                    <input type="number" class="export-panel__input" data-webhook-param="${paramName}"
                           value="${value}" step="${this.webhookParamStep}">
                    ${paramLabel.description ? `<div class="export-panel__param-description">${paramLabel.description}</div>` : ''}
                </label>
            `;
        } else {
            // Text input for strings
            return `
                <label class="export-panel__label">
                    ${paramLabel.label}:
                    <input type="text" class="export-panel__input" data-webhook-param="${paramName}"
                           value="${value}">
                    ${paramLabel.description ? `<div class="export-panel__param-description">${paramLabel.description}</div>` : ''}
                </label>
            `;
        }
    }

    /**
     * Render format-specific settings (PNG, SVG, etc.).
     *
     * @private
     * @param {string} format - Format name
     * @returns {string} HTML string
     */
    renderFormatSettings(format) {
        const t = this.t.bind(this);
        const { pngScale, pngTransparent, sourceFormatSettingsVisible } = this.state;

        switch (format.toLowerCase()) {
            case 'png':
                return sourceFormatSettingsVisible ? `
                    <div class="export-panel__settings">
                        <label class="export-panel__label">
                            ${t('exportPanel.pngScale')}:
                            <input type="number" class="export-panel__input" data-format-setting="pngScale"
                                   value="${pngScale}" min="1" max="10" step="${this.pngScaleStep}">
                        </label>
                        <label class="export-panel__checkbox-label">
                            <input type="checkbox" class="export-panel__checkbox" data-format-setting="pngTransparent"
                                   ${pngTransparent ? 'checked' : ''}>
                            ${t('exportPanel.pngTransparent')}
                        </label>
                    </div>
                ` : '';

            case 'svg':
            case 'pdf':
            case 'xml':
            default:
                // No special settings for these formats currently
                return '';
        }
    }

    /**
     * Render webhook messages from config (info, warning).
     *
     * @private
     * @returns {string} HTML string
     */
    renderWebhookMessages() {
        const messages = [];

        if (this.webhookConfig.info) {
            messages.push({
                level: 'info',
                text: this.webhookConfig.info
            });
        }

        if (this.webhookConfig.warning) {
            messages.push({
                level: 'warning',
                text: this.webhookConfig.warning
            });
        }

        if (messages.length === 0) return '';

        return messages.map(msg => `
            <div class="export-panel__message export-panel__message--${msg.level}">
                <span class="export-panel__message-icon">
                    ${msg.level === 'error' ? '❌' : msg.level === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div class="export-panel__message-text">${msg.text}</div>
            </div>
        `).join('');
    }

    /**
     * Render the export panel.
     */
    render() {
        const t = this.t.bind(this);
        const {
            webhookUrl,
            webhookConfigVisible,
            pngSettingsVisible,
            pngScale,
            pngTransparent,
            hideDecorative,
            selectedSourceFormat,
            sourceFormatSettingsVisible,
            isExporting,
            exportError
        } = this.state;

        this.innerHTML = `
            <div class="export-panel">
                <div class="export-panel__header">
                    <h2 class="export-panel__title">${t('exportPanel.title')}</h2>
                </div>

                <div class="export-panel__content">
                    <!-- Direct Export Section -->
                    <div class="export-panel__section">
                        <h3 class="export-panel__section-title">${t('exportPanel.directExports')}</h3>
                        <div class="export-panel__buttons">
                            <button class="export-panel__button export-panel__button--svg" data-action="export-svg">
                                <span class="export-panel__icon">📄</span>
                                ${t('exportPanel.exportSVG')}
                            </button>
                            <div class="export-panel__button-with-toggle">
                                <button class="export-panel__button export-panel__button--png" data-action="export-png">
                                    <span class="export-panel__icon">🖼️</span>
                                    ${t('exportPanel.exportPNG')}
                                </button>
                                <button class="export-panel__toggle export-panel__toggle--png" data-action="toggle-png-settings">
                                    ${pngSettingsVisible ? '▼' : '▶'}
                                </button>
                            </div>
                            <button class="export-panel__button export-panel__button--pdf" data-action="export-pdf">
                                <span class="export-panel__icon">📑</span>
                                ${t('exportPanel.exportPDF')}
                            </button>
                            <button class="export-panel__button export-panel__button--json" data-action="export-json">
                                <span class="export-panel__icon">📋</span>
                                ${t('exportPanel.exportXML')}
                            </button>
                        </div>

                        <!-- PNG Settings -->
                        ${pngSettingsVisible ? `
                            <div class="export-panel__settings">
                                <label class="export-panel__label">
                                    ${t('exportPanel.pngScale')}:
                                    <input type="number" class="export-panel__input" data-setting="pngScale"
                                           value="${pngScale}" min="1" max="10" step="0.5">
                                </label>
                                <label class="export-panel__checkbox-label">
                                    <input type="checkbox" class="export-panel__checkbox" data-setting="pngTransparent"
                                           ${pngTransparent ? 'checked' : ''}>
                                    ${t('exportPanel.pngTransparent')}
                                </label>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Webhook Export Section -->
                    ${this.webhookConfig.allowedInputFormats.length > 0 ? `
                        <div class="export-panel__section">
                            <h3 class="export-panel__section-title">
                                ${this.webhookConfig.description || t('exportPanel.webhookExport')}
                                <button class="export-panel__toggle" data-action="toggle-webhook-config">
                                    ${webhookConfigVisible ? '▼' : '▶'}
                                </button>
                            </h3>

                            ${webhookConfigVisible ? `
                                <div class="export-panel__webhook-config">
                                    <label class="export-panel__label">
                                        ${t('exportPanel.webhookUrl')}:
                                        <input type="text" class="export-panel__input" data-setting="webhookUrl"
                                               value="${webhookUrl}" placeholder="http://myserver.com/api/process">
                                    </label>

                                    <!-- Source Format Selector -->
                                    <div class="export-panel__format-selector">
                                        <label class="export-panel__label">
                                            ${t('exportPanel.sourceFormat')}:
                                            <select class="export-panel__select" data-setting="selectedSourceFormat">
                                                ${this.webhookConfig.allowedInputFormats.map(format =>
                                                    `<option value="${format}" ${selectedSourceFormat === format ? 'selected' : ''}>${format.toUpperCase()}</option>`
                                                ).join('')}
                                            </select>
                                        </label>
                                        ${selectedSourceFormat === 'png' ? `
                                            <button class="export-panel__toggle" data-action="toggle-source-format-settings">
                                                ${sourceFormatSettingsVisible ? '▼' : '▶'}
                                            </button>
                                        ` : ''}
                                    </div>

                                    <!-- Format-Specific Settings -->
                                    ${this.renderFormatSettings(selectedSourceFormat)}

                                    <!-- Server Parameters -->
                                    ${Object.keys(this.webhookConfig.params || {}).length > 0 ? `
                                        <div class="export-panel__server-params">
                                            <h4 class="export-panel__subsection-title">${t('exportPanel.serverParams')}</h4>
                                            ${Object.entries(this.webhookConfig.params).map(([paramName, paramValue]) =>
                                                this.renderServerParam(paramName, paramValue)
                                            ).join('')}
                                        </div>
                                    ` : ''}

                                    <!-- Messages (info, warning) -->
                                    ${this.renderWebhookMessages()}

                                    <!-- Loading indicator -->
                                    ${isExporting ? `
                                        <div class="export-panel__status export-panel__status--loading">
                                            <span class="export-panel__spinner">⏳</span>
                                            <span>Export en cours...</span>
                                        </div>
                                    ` : ''}

                                    <!-- Error message -->
                                    ${exportError ? `
                                        <div class="export-panel__status export-panel__status--error">
                                            <span class="export-panel__error-icon">❌</span>
                                            <span>${exportError}</span>
                                            <button class="export-panel__error-close" data-action="close-error">✕</button>
                                        </div>
                                    ` : ''}

                                    <button class="export-panel__button export-panel__button--webhook"
                                            data-action="export-webhook"
                                            ${isExporting ? 'disabled' : ''}>
                                        <span class="export-panel__icon">${isExporting ? '⏳' : '🔄'}</span>
                                        ${isExporting ? 'Export en cours...' : t('exportPanel.exportViaWebhook')}
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <!-- Hide Decorative Elements - Global Option -->
                    <div class="export-panel__global-option">
                        <label class="export-panel__checkbox-label">
                            <input type="checkbox" class="export-panel__checkbox" data-setting="hideDecorative"
                                   ${hideDecorative ? 'checked' : ''}>
                            ${t('exportPanel.hideDecorative')}
                        </label>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners.
     *
     * @private
     */
    attachEventListeners() {
        // Export buttons
        this.$$('[data-action="export-svg"]').forEach(btn => {
            btn.addEventListener('click', () => this.handleExport('svg'));
        });

        this.$$('[data-action="export-png"]').forEach(btn => {
            btn.addEventListener('click', () => this.handleExport('png'));
        });

        this.$$('[data-action="export-pdf"]').forEach(btn => {
            btn.addEventListener('click', () => this.handleExport('pdf'));
        });

        this.$$('[data-action="export-json"]').forEach(btn => {
            btn.addEventListener('click', () => this.handleExport('json'));
        });

        this.$$('[data-action="export-webhook"]').forEach(btn => {
            btn.addEventListener('click', () => this.handleExport('webhook'));
        });

        // Toggle PNG settings
        this.$$('[data-action="toggle-png-settings"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ pngSettingsVisible: !this.state.pngSettingsVisible });
            });
        });

        // Toggle webhook config
        this.$$('[data-action="toggle-webhook-config"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ webhookConfigVisible: !this.state.webhookConfigVisible });
            });
        });

        // Close error message
        this.$$('[data-action="close-error"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ exportError: null });
            });
        });

        // Toggle source format settings
        this.$$('[data-action="toggle-source-format-settings"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ sourceFormatSettingsVisible: !this.state.sourceFormatSettingsVisible });
            });
        });

        // Settings inputs (PNG settings, webhook URL, selected source format)
        this.$$('[data-setting]').forEach(input => {
            const setting = input.dataset.setting;

            if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: e.target.checked });
                });
            } else if (input.type === 'number') {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: parseFloat(e.target.value) });
                });
            } else if (input.tagName === 'SELECT') {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: e.target.value });
                });
            } else {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: e.target.value });
                });
            }
        });

        // Format-specific settings (for webhook source format)
        this.$$('[data-format-setting]').forEach(input => {
            const setting = input.dataset.formatSetting;

            if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: e.target.checked });
                });
            } else if (input.type === 'number') {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: parseFloat(e.target.value) });
                });
            } else {
                input.addEventListener('change', (e) => {
                    this.setState({ [setting]: e.target.value });
                });
            }
        });

        // Webhook param inputs (dynamic server parameters)
        this.$$('[data-webhook-param]').forEach(input => {
            const paramName = input.dataset.webhookParam;

            if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => {
                    const webhookParams = { ...this.state.webhookParams };
                    webhookParams[paramName] = e.target.checked;
                    this.setState({ webhookParams });
                });
            } else if (input.type === 'number') {
                input.addEventListener('change', (e) => {
                    const webhookParams = { ...this.state.webhookParams };
                    webhookParams[paramName] = parseFloat(e.target.value);
                    this.setState({ webhookParams });
                });
            } else {
                input.addEventListener('change', (e) => {
                    const webhookParams = { ...this.state.webhookParams };
                    webhookParams[paramName] = e.target.value;
                    this.setState({ webhookParams });
                });
            }
        });
    }

    /**
     * Handle export action.
     *
     * @private
     * @param {string} type - Export type
     */
    handleExport(type) {
        const { pngScale, pngTransparent, hideDecorative, webhookUrl, selectedSourceFormat, webhookParams } = this.state;

        switch (type) {
            case 'svg':
                this.emit('export-svg', { options: { hideDecorative } });
                break;

            case 'png':
                this.emit('export-png', {
                    options: { scale: pngScale, transparent: pngTransparent, hideDecorative }
                });
                break;

            case 'pdf':
                this.emit('export-pdf', { options: { hideDecorative } });
                break;

            case 'json':
                this.emit('export-json', { options: {} });
                break;

            case 'webhook':
                if (!webhookUrl) {
                    alert(this.t('exportPanel.webhookUrlRequired'));
                    return;
                }

                // Prepare format-specific params (dataParams)
                const dataParams = { hideDecorative };
                if (selectedSourceFormat === 'png') {
                    dataParams.scale = pngScale;
                    dataParams.transparent = pngTransparent;
                }

                this.emit('export-webhook', {
                    webhookUrl,
                    dataType: selectedSourceFormat,
                    dataParams,
                    params: webhookParams
                });
                break;
        }
    }
}

// Register custom element
customElements.define('export-panel', ExportPanel);
