import { ControlButtons } from '../src/modules/ControlButtons.js';
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';

/**
 * Create a localize function from translations
 */
function createLocalize(translations) {
    return (key) => {
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    };
}

export default {
    title: 'Components/ControlButtons',
    component: 'control-buttons',
    tags: ['autodocs'],
    argTypes: {
        ready: {
            control: 'boolean',
            description: 'Whether the optimizer is ready to start',
            defaultValue: true
        },
        running: {
            control: 'boolean',
            description: 'Whether optimization is currently running',
            defaultValue: false
        },
        locale: {
            control: 'select',
            options: ['en', 'fr'],
            description: 'Localization language',
            defaultValue: 'en'
        }
    }
};

/**
 * Default state - ready to start
 */
export const Default = {
    args: {
        ready: true,
        running: false,
        locale: 'en'
    },
    render: (args) => {
        const element = new ControlButtons();
        const localize = createLocalize(args.locale === 'fr' ? frTranslations : enTranslations);

        element.initProps({ localize });
        element.setReady(args.ready);
        element.setRunning(args.running);

        // Add event listeners for demo
        element.addEventListener('start-optimization', () => {
            console.log('Start optimization clicked');
            element.setStatus('Optimization started!', 'info');
        });

        element.addEventListener('stop-optimization', () => {
            console.log('Stop optimization clicked');
            element.setStatus('Stopped', 'warning');
        });

        element.addEventListener('reset-optimization', () => {
            console.log('Reset clicked');
            element.setStatus('Reset', 'info');
        });

        return element;
    }
};

/**
 * Running state - optimization in progress
 */
export const Running = {
    args: {
        ready: true,
        running: true,
        locale: 'en'
    },
    render: Default.render
};

/**
 * Not ready - loading
 */
export const NotReady = {
    args: {
        ready: false,
        running: false,
        locale: 'en'
    },
    render: (args) => {
        const element = new ControlButtons();
        const localize = createLocalize(args.locale === 'fr' ? frTranslations : enTranslations);

        element.initProps({ localize });
        element.setReady(args.ready);
        element.setStatus('Loading...', 'loading');

        return element;
    }
};

/**
 * French localization
 */
export const French = {
    args: {
        ready: true,
        running: false,
        locale: 'fr'
    },
    render: Default.render
};

/**
 * With status messages
 */
export const WithStatusMessages = {
    render: () => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';

        const localize = createLocalize(enTranslations);

        // Success status
        const success = new ControlButtons();
        success.initProps({ localize });
        success.setReady(true);
        success.setStatus('Optimization complete!', 'success');

        // Error status
        const error = new ControlButtons();
        error.initProps({ localize });
        error.setReady(true);
        error.setStatus('Error: Something went wrong', 'error');

        // Warning status
        const warning = new ControlButtons();
        warning.initProps({ localize });
        warning.setReady(true);
        warning.setStatus('Stopped by user', 'warning');

        container.appendChild(success);
        container.appendChild(error);
        container.appendChild(warning);

        return container;
    }
};
