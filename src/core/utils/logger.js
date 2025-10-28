const winston = require('winston');
const path = require('path');
const config = require('../config');

class Logger {
    constructor() {
        const logsDir = path.join(config.get('DATA_DIR', './data'), 'logs');
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp(),
                        winston.format.printf(({ timestamp, level, message }) => {
                            return `[${timestamp}] ${level}: ${message}`;
                        })
                    )
                }),
                new winston.transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error'
                }),
                new winston.transports.File({
                    filename: path.join(logsDir, 'combined.log')
                })
            ]
        });
    }

    info(message) {
        this.logger.info(`ℹ️ ${message}`);
    }

    error(message, error) {
        if (error) {
            this.logger.error(`❌ ${message}:`, error);
        } else {
            this.logger.error(`❌ ${message}`);
        }
    }

    warning(message) {
        this.logger.warn(`⚠️ ${message}`);
    }

    warn(message) {
        this.warning(message);
    }

    debug(message) {
        this.logger.debug(`🔍 ${message}`);
    }

    success(message) {
        this.logger.info(`✅ ${message}`);
    }

    trade(data) {
        const { tokenSymbol, strategy, solIn, solOut, pnl, pnlPercent } = data;
        const emoji = pnl >= 0 ? '📈' : '📉';
        const message = `${emoji} Trade: ${tokenSymbol} using ${strategy} | In: ${solIn} SOL | Out: ${solOut} SOL | PnL: ${pnl.toFixed(4)} SOL (${pnlPercent.toFixed(2)}%)`;
        this.logger.info(message, data);
    }

    alert(type, message, data = {}) {
        const emojis = {
            info: 'ℹ️',
            trade: '💰',
            error: '🚨',
            balance: '💳'
        };
        const emoji = emojis[type] || 'ℹ️';
        this.logger.info(`${emoji} ${message}`, data);
    }

    performance(message, data = {}) {
        this.logger.info(`📊 ${message}`, data);
    }

    system(message, data = {}) {
        this.logger.info(`🔧 ${message}`, data);
    }
}

module.exports = new Logger(); 