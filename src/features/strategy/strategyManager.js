const fs = require('fs');
const path = require('path');

class StrategyManager {
    constructor() {
        this.strategiesFile = path.join(__dirname, '../../data/strategies/strategies.json');
        this.ensureStrategiesFile();
        this.currentStrategy = null;
    }

    ensureStrategiesFile() {
        if (!fs.existsSync(this.strategiesFile)) {
            const defaultStrategies = {
                default: {
                    name: 'Default Strategy',
                    description: 'Basic trading strategy with fixed parameters',
                    parameters: {
                        minLiquidity: 1000,
                        minVolume: 500,
                        maxSlippage: 1.0,
                        takeProfit: 5.0,
                        stopLoss: 3.0
                    }
                },
                aggressive: {
                    name: 'Aggressive Strategy',
                    description: 'Higher risk strategy with larger position sizes',
                    parameters: {
                        minLiquidity: 2000,
                        minVolume: 1000,
                        maxSlippage: 1.5,
                        takeProfit: 7.0,
                        stopLoss: 4.0
                    }
                },
                conservative: {
                    name: 'Conservative Strategy',
                    description: 'Lower risk strategy with smaller position sizes',
                    parameters: {
                        minLiquidity: 5000,
                        minVolume: 2000,
                        maxSlippage: 0.5,
                        takeProfit: 3.0,
                        stopLoss: 2.0
                    }
                }
            };
            fs.writeFileSync(this.strategiesFile, JSON.stringify(defaultStrategies, null, 2));
        }
    }

    loadStrategies() {
        try {
            return JSON.parse(fs.readFileSync(this.strategiesFile, 'utf8'));
        } catch (error) {
            console.error('Failed to load strategies:', error.message);
            return {};
        }
    }

    saveStrategies(strategies) {
        try {
            fs.writeFileSync(this.strategiesFile, JSON.stringify(strategies, null, 2));
        } catch (error) {
            console.error('Failed to save strategies:', error.message);
        }
    }

    getStrategy(name) {
        const strategies = this.loadStrategies();
        return strategies[name] || null;
    }

    setCurrentStrategy(name) {
        const strategy = this.getStrategy(name);
        if (strategy) {
            this.currentStrategy = strategy;
            return true;
        }
        return false;
    }

    getCurrentStrategy() {
        return this.currentStrategy;
    }

    addStrategy(name, strategy) {
        const strategies = this.loadStrategies();
        if (strategies[name]) {
            return false;
        }
        strategies[name] = strategy;
        this.saveStrategies(strategies);
        return true;
    }

    updateStrategy(name, updates) {
        const strategies = this.loadStrategies();
        if (!strategies[name]) {
            return false;
        }
        strategies[name] = {
            ...strategies[name],
            ...updates
        };
        this.saveStrategies(strategies);
        return true;
    }

    removeStrategy(name) {
        const strategies = this.loadStrategies();
        if (!strategies[name]) {
            return false;
        }
        delete strategies[name];
        this.saveStrategies(strategies);
        return true;
    }

    validateStrategy(strategy) {
        const requiredFields = ['name', 'description', 'parameters'];
        const requiredParameters = ['minLiquidity', 'minVolume', 'maxSlippage', 'takeProfit', 'stopLoss'];

        // Check required fields
        for (const field of requiredFields) {
            if (!strategy[field]) {
                return false;
            }
        }

        // Check required parameters
        for (const param of requiredParameters) {
            if (typeof strategy.parameters[param] !== 'number') {
                return false;
            }
        }

        return true;
    }
}

module.exports = new StrategyManager(); 