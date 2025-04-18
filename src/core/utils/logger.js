const fs = require('fs');
const path = require('path');
const config = require('../config');

class Logger {
    constructor() {
        this.logDir = path.join(config.get('DATA_DIR'), 'logs');
        this.logFile = path.join(this.logDir, 'app.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const dataString = Object.keys(data).length ? JSON.stringify(data) : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message} ${dataString}\n`;
    }

    writeToFile(message) {
        fs.appendFileSync(this.logFile, message);
    }

    log(level, message, data = {}) {
        const formattedMessage = this.formatMessage(level, message, data);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    info(message, data = {}) {
        this.log('info', `ℹ️ ${message}`, data);
    }

    error(message, data = {}) {
        this.log('error', `❌ ${message}`, data);
    }

    warn(message, data = {}) {
        this.log('warn', `⚠️ ${message}`, data);
    }

    debug(message, data = {}) {
        if (process.env.DEBUG) {
            this.log('debug', `🔍 ${message}`, data);
        }
    }

    trade(data) {
        const { tokenSymbol, strategy, solIn, solOut, pnl, pnlPercent } = data;
        const emoji = pnl >= 0 ? '📈' : '📉';
        const message = `${emoji} Trade: ${tokenSymbol} using ${strategy} | In: ${solIn} SOL | Out: ${solOut} SOL | PnL: ${pnl.toFixed(4)} SOL (${pnlPercent.toFixed(2)}%)`;
        this.log('trade', message, data);
    }

    alert(type, message, data = {}) {
        const emojis = {
            info: 'ℹ️',
            trade: '💰',
            error: '🚨',
            balance: '💳'
        };
        const emoji = emojis[type] || 'ℹ️';
        this.log('alert', `${emoji} ${message}`, data);
    }

    performance(message, data = {}) {
        this.log('performance', `📊 ${message}`, data);
    }

    system(message, data = {}) {
        this.log('system', `🔧 ${message}`, data);
    }
}

module.exports = new Logger(); 