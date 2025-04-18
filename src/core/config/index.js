const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const constants = require('./constants');

class ConfigManager {
    constructor() {
        this.config = {};
        this.env = {};
        this.ensureDirectories();
        this.loadEnv();
    }

    ensureDirectories() {
        const directories = [
            constants.DATA_DIR,
            constants.LOGS_DIR,
            path.join(constants.DATA_DIR, 'repositories'),
            path.join(constants.DATA_DIR, 'models')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    loadEnv() {
        // Load default .env
        this.env = {
            ...process.env,
            ...dotenv.config().parsed
        };

        // Load strategy-specific env if exists
        const strategyEnvPath = path.join(__dirname, 'strategy.env');
        if (fs.existsSync(strategyEnvPath)) {
            this.env = {
                ...this.env,
                ...dotenv.config({ path: strategyEnvPath }).parsed
            };
        }

        // Load telegram-specific env if exists
        const telegramEnvPath = path.join(__dirname, 'telegram.env');
        if (fs.existsSync(telegramEnvPath)) {
            this.env = {
                ...this.env,
                ...dotenv.config({ path: telegramEnvPath }).parsed
            };
        }
    }

    get(key) {
        return this.config[key] || this.env[key];
    }

    set(key, value) {
        this.config[key] = value;
    }

    getApiKey(service) {
        const key = `${service.toUpperCase()}_API_KEY`;
        return this.get(key);
    }

    getStrategyConfig(strategyType) {
        return {
            minLiquidity: this.get('MIN_LIQUIDITY') || constants.MIN_LIQUIDITY,
            minVolume: this.get('MIN_VOLUME') || constants.MIN_VOLUME,
            maxSlippage: this.get('MAX_SLIPPAGE') || constants.MAX_SLIPPAGE,
            takeProfit: this.get('TAKE_PROFIT') || constants.DEFAULT_TAKE_PROFIT,
            stopLoss: this.get('STOP_LOSS') || constants.DEFAULT_STOP_LOSS,
            maxPositionSize: this.get('MAX_POSITION_SIZE') || constants.MAX_POSITION_SIZE,
            maxRiskPerTrade: this.get('MAX_RISK_PER_TRADE') || constants.MAX_RISK_PER_TRADE
        };
    }

    getNotificationConfig() {
        return {
            telegramBotToken: this.get('TELEGRAM_BOT_TOKEN'),
            telegramChatId: this.get('TELEGRAM_CHAT_ID')
        };
    }

    getWalletConfig() {
        return {
            privateKey: this.get('WALLET_PRIVATE_KEY'),
            publicKey: this.get('WALLET_PUBLIC_KEY')
        };
    }
}

module.exports = new ConfigManager(); 