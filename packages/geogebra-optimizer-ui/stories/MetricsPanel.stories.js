import { MetricsPanel } from '../src/modules/MetricsPanel.js';
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
    title: 'Components/MetricsPanel',
    component: 'metrics-panel',
    tags: ['autodocs'],
    argTypes: {
        locale: {
            control: 'select',
            options: ['en', 'fr'],
            description: 'Localization language',
            defaultValue: 'en'
        }
    }
};

/**
 * Empty state - no metrics yet
 */
export const Empty = {
    args: {
        locale: 'en'
    },
    render: (args) => {
        const element = new MetricsPanel();
        const localize = createLocalize(args.locale === 'fr' ? frTranslations : enTranslations);

        element.initProps({ localize });

        return element;
    }
};

/**
 * With metrics - during optimization
 */
export const WithMetrics = {
    args: {
        locale: 'en'
    },
    render: (args) => {
        const element = new MetricsPanel();
        const localize = createLocalize(args.locale === 'fr' ? frTranslations : enTranslations);

        element.initProps({ localize });
        element.updateMetrics({
            bestDistance: 0.001234,
            currentDistance: 0.002456,
            bestFitness: 0.012345,
            regularizationPenalty: 0.010111,
            totalDelta: 2.345,
            generation: 42,
            evaluations: 420
        });

        return element;
    }
};

/**
 * French localization
 */
export const French = {
    args: {
        locale: 'fr'
    },
    render: WithMetrics.render
};

/**
 * Live updating simulation
 */
export const LiveUpdating = {
    render: () => {
        const element = new MetricsPanel();
        const localize = createLocalize(enTranslations);

        element.initProps({ localize });

        let generation = 0;
        let bestDistance = 1.0;

        // Simulate live updates
        const interval = setInterval(() => {
            generation++;
            bestDistance = bestDistance * 0.95; // Gradually improve

            element.updateMetrics({
                bestDistance,
                currentDistance: bestDistance + Math.random() * 0.1,
                bestFitness: bestDistance + 0.01,
                regularizationPenalty: 0.01,
                totalDelta: Math.random() * 5,
                generation,
                evaluations: generation * 10
            });

            // Stop after 50 iterations
            if (generation >= 50) {
                clearInterval(interval);
            }
        }, 100);

        // Clean up on story unmount
        setTimeout(() => clearInterval(interval), 10000);

        return element;
    }
};

/**
 * High precision values
 */
export const HighPrecision = {
    render: () => {
        const element = new MetricsPanel();
        const localize = createLocalize(enTranslations);

        element.initProps({ localize });
        element.updateMetrics({
            bestDistance: 0.000001234,
            currentDistance: 0.000002456,
            bestFitness: 0.000012345,
            regularizationPenalty: 0.000010111,
            totalDelta: 0.000123,
            generation: 999,
            evaluations: 9999
        });

        return element;
    }
};
