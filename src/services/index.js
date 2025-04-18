const market = require('./market/helius');
const dex = require('./dex/jupiterService');
const wallet = require('./wallet/walletManager');
const risk = require('./risk/riskManager');
const trading = require('./trading/tradeExecutor');

module.exports = {
    market,
    dex,
    wallet,
    risk,
    trading
}; 