const monitoring = require('./monitoring/tokenMonitor');
const trading = require('./trading/tradeExecutor');
const filtering = require('./filtering/smartFilter');
const strategy = require('./strategy/strategyManager');
const notification = require('./notification/alertSystem');

module.exports = {
    monitoring,
    trading,
    filtering,
    strategy,
    notification
}; 