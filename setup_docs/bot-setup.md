# Bot Setup and Operation Guide

This guide provides detailed steps for setting up and running the Meme Bot Flip.

## Prerequisites Checklist

- [ ] Node.js v18 or later installed
- [ ] Docker installed (for production use)
- [ ] Solana wallet with test funds
- [ ] Helius API key
- [ ] Basic understanding of Solana and token trading

## Step 1: Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd meme-bot-flip
```

2. Install dependencies:
```bash
npm install
```

3. Configure `.env` file:
```bash
# Edit .env with your values
nano .env
```

Required environment variables:
- `WALLET_PRIVATE_KEY`: Your Solana wallet private key
- `HELIUS_API_KEY`: Your Helius API key
- `SOLANA_RPC_ENDPOINT`: Your Solana RPC endpoint (can use Helius RPC)
- `MIN_LIQUIDITY`: Minimum liquidity in SOL (default: 100)
- `MAX_SLIPPAGE`: Maximum slippage percentage (default: 1.0)
- `TRADE_AMOUNT_SOL`: Amount of SOL to trade with (default: 0.1)
- `MAX_HOLD_TIME_MS`: Maximum time to hold a position (default: 150000)
- `MIN_SAFETY_SCORE`: Minimum safety score for tokens (default: 0.6)

## Step 2: Initial Testing

1. Start the bot in test mode:
```bash
npm run test
```

2. Monitor logs:
```bash
# View trade log
cat src/data/trade_log.csv

# View system log
cat src/data/logs/app.log
```

3. Test with small amounts:
- Start with 0.1 SOL for testing
- Monitor performance for at least 1 hour (configurable in `.env`)
- Gradually increase amount if performance is satisfactory

## Step 3: Trading Configuration

1. Risk Parameters:
- Set `MAX_SLIPPAGE` based on market conditions
- Adjust `MIN_SAFETY_SCORE` based on risk tolerance
- Configure `MAX_HOLD_TIME_MS` based on your trading strategy

2. Liquidity Requirements:
- Set `MIN_LIQUIDITY` to avoid low liquidity tokens
- Consider market conditions when adjusting

3. Trading Strategy:
- Review and adjust strategy parameters in `src/features/strategy/`
- Test different parameter combinations
- Document successful configurations

## Step 4: Starting the Bot

1. Verify configuration:
```bash
# Check environment variables
cat .env

# Verify wallet balance
npm run check-balance
```

2. Start trading:
```bash
# Start in production mode
npm start
```

3. Monitor performance:
- Check logs every 30 minutes
- Monitor wallet balance
- Watch for unusual activity

## Step 5: Regular Maintenance

1. Daily Tasks:
- Review trade logs
- Check system logs for errors
- Monitor wallet balance
- Verify API key status

2. Weekly Tasks:
- Backup trade logs
- Review performance metrics
- Update dependencies
- Check for new releases

## Troubleshooting

1. Common Issues:
- API key expiration
- Network connectivity
- Wallet balance issues
- Transaction failures

2. Solutions:
- Rotate API keys regularly
- Check network connection
- Monitor wallet balance
- Review transaction logs

## Emergency Procedures

1. Stop the bot:
```bash
# In Docker
docker-compose down

# Local
pkill -f "node src/bot.js"
```

2. Backup data:
```bash
# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# Backup logs
cp src/data/trade_log.csv backups/$(date +%Y-%m-%d)/
cp -r src/data/logs backups/$(date +%Y-%m-%d)/
```

## Best Practices

1. Security:
- Use dedicated wallet
- Keep API keys secure
- Regular backups
- Monitor system resources

2. Risk Management:
- Start with small amounts
- Set conservative limits
- Regular performance review
- Document all changes

3. Maintenance:
- Regular log review
- Update dependencies
- Monitor system health
- Document issues and solutions

## Support

For issues or questions:
1. Check documentation
2. Review logs
3. Contact support
4. Report bugs 