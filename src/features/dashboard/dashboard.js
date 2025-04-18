// Function to format numbers
function formatNumber(num) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
    });
}

// Function to format currency
function formatCurrency(num) {
    return num.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Function to calculate statistics
function calculateStats(data) {
    const stats = {
        totalPnL: 0,
        winningTrades: 0,
        totalTrades: data.length,
        tokenPerformance: {},
        pnlOverTime: []
    };

    data.forEach(trade => {
        const pnl = parseFloat(trade.pnl);
        stats.totalPnL += pnl;
        
        if (pnl > 0) stats.winningTrades++;
        
        // Track token performance
        if (!stats.tokenPerformance[trade.token_mint]) {
            stats.tokenPerformance[trade.token_mint] = {
                totalPnL: 0,
                trades: 0
            };
        }
        stats.tokenPerformance[trade.token_mint].totalPnL += pnl;
        stats.tokenPerformance[trade.token_mint].trades++;
        
        // Track PnL over time
        stats.pnlOverTime.push({
            timestamp: new Date(trade.timestamp),
            pnl: pnl,
            cumulativePnL: stats.totalPnL
        });
    });

    return stats;
}

// Function to update statistics display
function updateStats(stats) {
    // Update total PnL
    const totalPnLElement = document.getElementById('totalPnL');
    totalPnLElement.textContent = formatCurrency(stats.totalPnL);
    totalPnLElement.className = `stat-value ${stats.totalPnL >= 0 ? 'positive' : 'negative'}`;

    // Update win rate
    const winRate = (stats.winningTrades / stats.totalTrades) * 100;
    document.getElementById('winRate').textContent = `${winRate.toFixed(2)}%`;

    // Update average trade duration (placeholder for now)
    document.getElementById('avgDuration').textContent = 'Calculating...';
}

// Function to create PnL over time chart
function createPnLChart(stats) {
    const ctx = document.getElementById('pnlChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: stats.pnlOverTime.map(d => d.timestamp.toLocaleString()),
            datasets: [{
                label: 'Cumulative PnL',
                data: stats.pnlOverTime.map(d => d.cumulativePnL),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Cumulative Profit/Loss Over Time'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Function to create token performance chart
function createTokenChart(stats) {
    const ctx = document.getElementById('tokenChart').getContext('2d');
    const tokens = Object.keys(stats.tokenPerformance);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tokens,
            datasets: [{
                label: 'Total PnL per Token',
                data: tokens.map(token => stats.tokenPerformance[token].totalPnL),
                backgroundColor: tokens.map(token => 
                    stats.tokenPerformance[token].totalPnL >= 0 ? 'rgba(40, 167, 69, 0.5)' : 'rgba(220, 53, 69, 0.5)'
                ),
                borderColor: tokens.map(token => 
                    stats.tokenPerformance[token].totalPnL >= 0 ? 'rgb(40, 167, 69)' : 'rgb(220, 53, 69)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Token Performance'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Main function to load and process data
async function loadData() {
    try {
        const response = await fetch('../trade_log.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            complete: function(results) {
                const stats = calculateStats(results.data);
                updateStats(stats);
                createPnLChart(stats);
                createTokenChart(stats);
            }
        });
    } catch (error) {
        console.error('Error loading data:', error);
        document.body.innerHTML += '<div style="color: red; padding: 20px;">Error loading trade data. Please make sure trade_log.csv exists and contains valid data.</div>';
    }
}

// Start loading data when page loads
document.addEventListener('DOMContentLoaded', loadData); 