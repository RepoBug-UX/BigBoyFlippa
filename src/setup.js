const fs = require('fs');
const path = require('path');
const config = require('./core/config');

// Create necessary directories
const directories = [
    'src/data',
    'src/data/trades',
    'src/data/metrics',
    'src/data/strategies'
];

directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Create necessary files
const files = [
    {
        path: path.join(process.cwd(), 'src/data/trades/trade_log.csv'),
        content: 'timestamp,token_mint,token_symbol,strategy,entry_price,exit_price,sol_in,sol_out,pnl,pnl_percent,buy_tx,sell_tx,liquidity,volume_24h,entry_reason,exit_reason,market_condition\n'
    },
    {
        path: path.join(process.cwd(), 'src/data/metrics/token_metrics.json'),
        content: '{}'
    },
    {
        path: path.join(process.cwd(), 'src/data/strategies/strategy_performance.json'),
        content: '{}'
    }
];

files.forEach(file => {
    if (!fs.existsSync(file.path)) {
        fs.writeFileSync(file.path, file.content);
        console.log(`Created file: ${file.path}`);
    }
});

console.log('Setup completed successfully!'); 