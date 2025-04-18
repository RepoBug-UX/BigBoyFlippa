# Meme Bot Flip

An autonomous trading bot for Solana meme coins that executes trades based on market signals and risk parameters.

## Security Considerations

⚠️ **IMPORTANT**: This bot uses dependencies with known vulnerabilities. For security, it is STRONGLY RECOMMENDED to run the bot in a Docker container or virtual machine, not directly on your personal computer.

### Security Best Practices
1. Always run the bot in an isolated environment (Docker container or VM)
2. Never run the bot on your personal computer without isolation
3. Use a dedicated wallet for bot operations
4. Set conservative risk parameters
5. Monitor your system resources and network activity
6. Keep your isolation environment updated

## Project Structure

```
meme-bot-flip/
├── src/                      # Source code
│   ├── core/                # Core domain logic
│   │   ├── config/         # Configuration management
│   │   ├── utils/          # Utility functions
│   │   └── constants.js    # Global constants
│   ├── features/           # Feature modules
│   │   ├── filtering/     # Token filtering logic
│   │   ├── monitoring/    # Token monitoring
│   │   ├── notification/  # Alert system
│   │   └── strategy/      # Trading strategies
│   ├── services/          # External services
│   │   ├── dex/          # DEX integrations
│   │   ├── market/       # Market analysis
│   │   ├── trading/      # Trade execution
│   │   └── wallet/       # Wallet management
│   ├── data/             # Data storage
│   │   ├── logs/        # Application logs
│   │   ├── models/      # Data models
│   │   └── repositories/# Data repositories
│   └── bot.js            # Main application
│
├── tests/                # Test files
├── scripts/             # Utility scripts
├── setup_docs/         # Setup documentation
├── .env                # Environment variables
└── package.json        # Project dependencies
```

## Features

- Token monitoring and discovery using Helius API
- Automated trading execution via Jupiter
- Risk management with configurable parameters
- Multiple trading strategies
- Token safety filtering
- Comprehensive logging and monitoring

## Documentation

1. **Bot Setup Guide** (`setup_docs/bot-setup.md`)
   - Step-by-step setup instructions
   - Configuration details
   - Testing procedures
   - Maintenance guidelines

2. **Docker Setup Guide** (`setup_docs/docker-setup.md`)
   - Container configuration
   - Security considerations
   - Monitoring procedures
   - Troubleshooting guide

## Quick Start

1. Review the documentation files in `setup_docs/`
2. Set up your environment (see `bot-setup.md`)
3. Configure Docker (see `docker-setup.md`)
4. Start with small amounts and monitor performance

## Risk Management

The bot includes several risk management features:
- Position size limits (configurable in `.env`)
- Daily loss limits
- Maximum concurrent trades
- Minimum liquidity requirements
- Slippage protection
- Safety score filtering

## Configuration

Key configuration parameters in `.env`:
- `TRADE_AMOUNT_SOL`: Amount of SOL to trade with (default: 0.1)
- `MIN_LIQUIDITY`: Minimum liquidity requirement (default: 100 SOL)
- `MAX_SLIPPAGE`: Maximum allowed slippage (default: 1.0%)
- `MAX_HOLD_TIME_MS`: Maximum time to hold a position (default: 150000ms)
- `MIN_SAFETY_SCORE`: Minimum safety score for tokens (default: 0.6)

## Disclaimer

This bot is provided as-is with no guarantees. Use at your own risk. Always test with small amounts first and never risk more than you can afford to lose.

## License

MIT 